const fs = require('node:fs/promises');
const path = require('node:path');
const { PDFParse } = require('pdf-parse');

const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DATA_DIR = path.join(PUBLIC_DIR, 'data');
const PAGES_DIR = path.join(PUBLIC_DIR, 'assets', 'pages');
const FORCE_IMAGES = process.argv.includes('--force-images');

const EXAMS = [
  {
    id: 'ciencias-natureza',
    title: 'Ciencias da Natureza e suas Tecnologias',
    shortTitle: 'Ciencias da Natureza',
    provaFile: '2020_PV_EM_ciencias_natureza.pdf',
    gabaritoFile: '2020_GB_EM_ciencias_natureza.pdf',
    firstQuestion: 1,
    lastQuestion: 30,
  },
  {
    id: 'linguagens',
    title: 'Linguagens, Codigos e suas Tecnologias',
    shortTitle: 'Linguagens',
    provaFile: '2020_PV_EM_linguagens.pdf',
    gabaritoFile: '2020_GB_EM_linguagens.pdf',
    firstQuestion: 1,
    lastQuestion: 30,
  },
  {
    id: 'matematica',
    title: 'Matematica e suas Tecnologias',
    shortTitle: 'Matematica',
    provaFile: '2020_PV_EM_matematica.pdf.pdf',
    gabaritoFile: '2020_GB_EM_matematica.pdf',
    firstQuestion: 31,
    lastQuestion: 60,
  },
];

function normalizeLine(line) {
  return line.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanPageText(text) {
  return text
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter((line) => line && !line.includes('ENCCEJA 2020') && !/^\*[A-Z0-9]+\*$/.test(line))
    .join('\n');
}

function extractQuestionBlocks(text) {
  const regex = /QUEST.O\s+(\d+)/g;
  const matches = [...text.matchAll(regex)];

  return matches.map((match, index) => {
    const nextMatch = matches[index + 1];
    return {
      number: Number(match[1]),
      block: text.slice(match.index, nextMatch ? nextMatch.index : text.length).trim(),
    };
  });
}

function findLastOptionSequence(lines) {
  const candidates = { A: [], B: [], C: [], D: [] };

  lines.forEach((line, index) => {
    const match = line.match(/^([A-D])(?:\s+.*)?$/);
    if (match) {
      candidates[match[1]].push(index);
    }
  });

  let bestSequence = null;

  for (const aIndex of candidates.A) {
    const bIndex = candidates.B.find((index) => index > aIndex);
    const cIndex = candidates.C.find((index) => index > bIndex);
    const dIndex = candidates.D.find((index) => index > cIndex);

    if (bIndex !== undefined && cIndex !== undefined && dIndex !== undefined) {
      bestSequence = { A: aIndex, B: bIndex, C: cIndex, D: dIndex };
    }
  }

  return bestSequence;
}

function sanitizeOptionText(text) {
  const normalized = text.replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return '';
  }

  const segments = normalized.split(/(?<=[.!?])\s+/);
  if (segments.length > 1) {
    const tail = segments.slice(1).join(' ');
    const tailLooksLikeGraphicNoise =
      /\b\d+\b/.test(tail) ||
      /(tempo|min|preco|ano|casos|incidencia|superficie|camada|ionosfera|estratosfera|troposfera|uva|uvb|uvc|220v)/i.test(
        tail
      );

    if (tailLooksLikeGraphicNoise && segments[0].length <= 100) {
      return segments[0].trim();
    }
  }

  return normalized;
}

function shouldHideOptionText(options) {
  const values = options.map((option) => option.text);

  if (values.some((value) => !value)) {
    return true;
  }

  const joined = values.join(' ');
  const alphaWordCount = (joined.match(/[A-Za-zÀ-ÿ]{2,}/g) || []).length;
  const graphicHints =
    (joined.match(/\b\d+\b/g) || []).length >= 8 ||
    /(?:\b[A-Z]{1,3}\b\s+){4,}/.test(joined) ||
    /\d{2,4}\s*V/i.test(joined);

  return graphicHints && alphaWordCount < 6;
}

function parseQuestionBlock(block) {
  const lines = block.split(/\r?\n/).map(normalizeLine).filter(Boolean);
  const questionHeading = lines.shift() || '';
  const sequence = findLastOptionSequence(lines);
  const letters = ['A', 'B', 'C', 'D'];

  let stemLines = lines;
  let options = letters.map((letter) => ({ id: letter, text: '' }));

  if (sequence) {
    stemLines = lines.slice(0, sequence.A);
    const indexes = [sequence.A, sequence.B, sequence.C, sequence.D, lines.length];

    options = letters.map((letter, index) => {
      const start = indexes[index];
      const end = indexes[index + 1];
      const segment = lines.slice(start, end);
      const firstLine = segment.shift() || '';
      const text = [firstLine.replace(new RegExp(`^${letter}\\s*`), '').trim(), ...segment]
        .filter(Boolean)
        .join(' ');

      return {
        id: letter,
        text: sanitizeOptionText(text),
      };
    });
  } else {
    const firstChoiceIndex = lines.findIndex((line) => /^[A-D](?:\s+.*)?$/.test(line));
    stemLines = firstChoiceIndex === -1 ? lines : lines.slice(0, firstChoiceIndex);
  }

  if (shouldHideOptionText(options)) {
    options = letters.map((letter) => ({ id: letter, text: '' }));
  }

  return {
    heading: questionHeading,
    stem: stemLines.join('\n').trim(),
    options,
  };
}

function parseAnswerKey(text, firstQuestion, lastQuestion) {
  const answerMap = {};

  for (const match of text.matchAll(/(\d{1,2})\s+([A-D])/g)) {
    answerMap[Number(match[1])] = match[2];
  }

  for (let number = firstQuestion; number <= lastQuestion; number += 1) {
    if (!answerMap[number]) {
      throw new Error(`Gabarito incompleto para a questao ${number}.`);
    }
  }

  return answerMap;
}

function getQuestionStartPages(pages) {
  const startPages = new Map();

  for (const page of pages) {
    for (const match of page.text.matchAll(/QUEST.O\s+(\d+)/g)) {
      startPages.set(Number(match[1]), page.num);
    }
  }

  return startPages;
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writePageScreenshots(parser, examId, pageNumbers) {
  const examPageDir = path.join(PAGES_DIR, examId);
  await ensureDir(examPageDir);

  const missingPages = [];
  for (const pageNumber of pageNumbers) {
    const pagePath = path.join(examPageDir, `page-${String(pageNumber).padStart(2, '0')}.png`);
    if (FORCE_IMAGES || !(await fileExists(pagePath))) {
      missingPages.push(pageNumber);
    }
  }

  if (!missingPages.length) {
    return;
  }

  const screenshotResult = await parser.getScreenshot({
    partial: missingPages,
    desiredWidth: 1200,
    imageBuffer: true,
    imageDataUrl: false,
  });

  for (const page of screenshotResult.pages) {
    const fileName = `page-${String(page.pageNumber).padStart(2, '0')}.png`;
    const filePath = path.join(examPageDir, fileName);
    await fs.writeFile(filePath, page.data);
  }
}

async function buildExam(config) {
  const provaPath = path.join(ROOT_DIR, config.provaFile);
  const gabaritoPath = path.join(ROOT_DIR, config.gabaritoFile);
  const provaBuffer = await fs.readFile(provaPath);
  const gabaritoBuffer = await fs.readFile(gabaritoPath);

  const provaParser = new PDFParse({ data: provaBuffer });
  const gabaritoParser = new PDFParse({ data: gabaritoBuffer });

  try {
    const [provaTextResult, gabaritoTextResult] = await Promise.all([
      provaParser.getText(),
      gabaritoParser.getText(),
    ]);

    const cleanedPages = provaTextResult.pages.map((page) => ({
      num: page.num,
      text: cleanPageText(page.text),
    }));

    const combinedText = cleanedPages.map((page) => page.text).filter(Boolean).join('\n');
    const blocks = extractQuestionBlocks(combinedText);
    const answers = parseAnswerKey(gabaritoTextResult.text, config.firstQuestion, config.lastQuestion);
    const startPages = getQuestionStartPages(cleanedPages);

    const questions = [];
    for (const block of blocks) {
      if (block.number < config.firstQuestion || block.number > config.lastQuestion) {
        continue;
      }

      const parsed = parseQuestionBlock(block.block);
      const pageNumber = startPages.get(block.number);

      questions.push({
        id: `${config.id}-${String(block.number).padStart(2, '0')}`,
        number: block.number,
        pageNumber,
        pageImage: `./assets/pages/${config.id}/page-${String(pageNumber).padStart(2, '0')}.png`,
        stem: parsed.stem,
        options: parsed.options,
        answer: answers[block.number],
      });
    }

    const expectedTotal = config.lastQuestion - config.firstQuestion + 1;
    if (questions.length !== expectedTotal) {
      throw new Error(
        `Quantidade de questoes inesperada em ${config.provaFile}: ${questions.length}/${expectedTotal}.`
      );
    }

    const uniquePages = [...new Set(questions.map((question) => question.pageNumber))].sort((a, b) => a - b);
    await writePageScreenshots(provaParser, config.id, uniquePages);

    return {
      id: config.id,
      title: config.title,
      shortTitle: config.shortTitle,
      totalQuestions: questions.length,
      firstQuestion: config.firstQuestion,
      lastQuestion: config.lastQuestion,
      questions,
    };
  } finally {
    await Promise.all([provaParser.destroy(), gabaritoParser.destroy()]);
  }
}

async function main() {
  await ensureDir(DATA_DIR);
  await ensureDir(PAGES_DIR);

  const exams = [];
  for (const examConfig of EXAMS) {
    console.log(`Processando ${examConfig.title}...`);
    exams.push(await buildExam(examConfig));
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    totalExams: exams.length,
    totalQuestions: exams.reduce((sum, exam) => sum + exam.totalQuestions, 0),
    exams,
  };

  const outputPath = path.join(DATA_DIR, 'exams.json');
  await fs.writeFile(outputPath, JSON.stringify(payload, null, 2), 'utf8');

  console.log(`Base gerada em ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
