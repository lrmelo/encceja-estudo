const { expect, test } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const screenshotDir = path.join('test-results', 'screenshots');
const STORAGE_KEY = 'encceja-2020-progress-v2';
const payload = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'data', 'exams.json'), 'utf8'));
const questions = payload.exams.flatMap((exam) =>
  exam.questions.map((question) => ({
    ...question,
    examId: exam.id,
  }))
);

function captureRuntimeErrors(page) {
  const runtimeErrors = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      runtimeErrors.push(message.text());
    }
  });

  page.on('pageerror', (error) => {
    runtimeErrors.push(error.message);
  });

  return runtimeErrors;
}

async function openFreshApp(page) {
  const runtimeErrors = captureRuntimeErrors(page);

  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page.locator('#question-title')).toHaveText(/Questão 1/);
  await expect(page.locator('#page-preview')).toHaveJSProperty('complete', true);

  return runtimeErrors;
}

function getAlternateOption(question) {
  return question.options.find((option) => option.id !== question.answer)?.id || question.answer;
}

function buildAnswers({ onlyExamId = null } = {}) {
  return Object.fromEntries(
    questions.map((question, index) => {
      const shouldAnswer = !onlyExamId || question.examId === onlyExamId;
      const shouldMiss = shouldAnswer && index % 4 === 0;
      const selected = shouldAnswer
        ? shouldMiss
          ? getAlternateOption(question)
          : question.answer
        : '';

      return [
        question.id,
        {
          selected,
          confirmed: shouldAnswer,
          isCorrect: shouldAnswer && selected === question.answer,
          revealed: shouldAnswer,
        },
      ];
    })
  );
}

async function openSeededApp(page, state) {
  const runtimeErrors = captureRuntimeErrors(page);

  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.clear();
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    { key: STORAGE_KEY, value: state }
  );
  await page.goto('/');

  return runtimeErrors;
}

async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => {
    const documentElement = document.documentElement;
    const body = document.body;
    return Math.max(documentElement.scrollWidth, body.scrollWidth) - documentElement.clientWidth;
  });

  expect(overflow).toBeLessThanOrEqual(1);
}

async function expectTouchTargets(page) {
  const tooSmallTargets = await page.locator('button, a[href]').evaluateAll((elements) =>
    elements
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          (rect.width > 0 || rect.height > 0) &&
          !element.disabled &&
          (rect.width < 44 || rect.height < 44)
        );
      })
      .map((element) => ({
        text: element.textContent.trim().replace(/\s+/g, ' ').slice(0, 60),
        width: Math.round(element.getBoundingClientRect().width),
        height: Math.round(element.getBoundingClientRect().height),
      }))
  );

  expect(tooSmallTargets).toEqual([]);
}

test('quiz UI is usable and stable across breakpoints', async ({ page }, testInfo) => {
  const runtimeErrors = await openFreshApp(page);
  const projectName = testInfo.project.name;

  await expect(page.locator('.app-shell')).toBeVisible();
  await expect(page.locator('.summary-strip')).toBeVisible();
  await expect(page.locator('.question-layout')).toBeVisible();
  await expect(page.locator('.option-button')).toHaveCount(4);

  await expectNoHorizontalOverflow(page);
  await expectTouchTargets(page);

  await page.addStyleTag({ content: '.skip-link { display: none !important; }' });
  await page.screenshot({
    path: path.join(screenshotDir, `${projectName}-initial.png`),
    fullPage: true,
  });

  await page.getByRole('button', { name: 'Escuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('#theme-dark-button')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#theme-light-button')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#theme-help')).toContainText('Tema escuro ativo');

  await expectNoHorizontalOverflow(page);
  await expectTouchTargets(page);
  await page.screenshot({
    path: path.join(screenshotDir, `${projectName}-initial-dark.png`),
    fullPage: true,
  });

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('#question-title')).toHaveText(/Quest.*1/);

  await page.locator('.option-button').first().click();
  await expect(page.locator('.option-button').first()).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#confirm-button').click();
  await expect(page.locator('#feedback')).toBeVisible();
  await expect(page.locator('#summary-progress-fill')).toHaveAttribute('style', /width:\s*1%/);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: path.join(screenshotDir, `${projectName}-answered.png`),
    fullPage: true,
  });

  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('revela o resultado');
    await dialog.dismiss();
  });
  await page.locator('#mode-immediate-button').click();
  await expect(page.locator('#mode-immediate-button')).toHaveAttribute('aria-pressed', 'false');

  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });
  await page.locator('#mode-immediate-button').click();
  await expect(page.locator('#mode-immediate-button')).toHaveAttribute('aria-pressed', 'true');

  await page.reload();
  await expect(page.locator('#question-title')).toHaveText(/Questão 1/);
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await expect(page.locator('.skip-link')).toBeInViewport();

  expect(runtimeErrors).toEqual([]);
});

test('exam review screen is usable and stable across breakpoints', async ({ page }, testInfo) => {
  const projectName = testInfo.project.name;
  const reviewExam = payload.exams[0];
  const runtimeErrors = await openSeededApp(page, {
    currentIndex: 0,
    currentView: 'exam-review',
    reviewExamId: reviewExam.id,
    correctionMode: 'exam-end',
    answers: buildAnswers({ onlyExamId: reviewExam.id }),
  });

  await expect(page.locator('#summary-view')).toBeVisible();
  await expect(page.getByText('Resultado da prova')).toBeVisible();
  await expect(page.locator('.summary-overview')).toBeVisible();
  await expect(page.locator('.review-card')).toHaveCount(reviewExam.questions.length);

  await expectNoHorizontalOverflow(page);
  await expectTouchTargets(page);

  await page.addStyleTag({ content: '.skip-link { display: none !important; }' });
  await page.screenshot({
    path: path.join(screenshotDir, `${projectName}-exam-review.png`),
    fullPage: true,
  });

  await page.getByRole('button', { name: 'Escuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expectNoHorizontalOverflow(page);
  await expectTouchTargets(page);
  await page.screenshot({
    path: path.join(screenshotDir, `${projectName}-exam-review-dark.png`),
    fullPage: true,
  });

  await page.locator('[data-review-question-id]').first().click();
  await expect(page.locator('#quiz-view')).toBeVisible();
  await expect(page.locator('.review-return-banner')).toContainText('Voltar ao resultado da prova');
  await expect(page.getByRole('button', { name: 'Voltar ao resultado da prova' })).toBeVisible();

  await expectNoHorizontalOverflow(page);
  await expectTouchTargets(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: path.join(screenshotDir, `${projectName}-review-return.png`),
    fullPage: true,
  });

  await page.getByRole('button', { name: 'Voltar ao resultado da prova' }).click();
  await expect(page.locator('#summary-view')).toBeVisible();
  await expect(page.locator('#summary-view .question-context')).toHaveText('Resultado da prova');

  await page.getByRole('button', { name: 'Revisar erros desta prova' }).click();
  await expect(page.locator('#quiz-view')).toBeVisible();
  await expect(page.locator('.wrong-review-banner')).toBeVisible();
  await expect(page.locator('#confirm-button')).toHaveText(/Erro 1\/\d+/);
  await expect(page.getByRole('button', { name: /Voltar/ })).toBeVisible();

  await expectNoHorizontalOverflow(page);
  await expectTouchTargets(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: path.join(screenshotDir, `${projectName}-wrong-review.png`),
    fullPage: true,
  });

  expect(runtimeErrors).toEqual([]);
});

test('final summary screen is usable and stable across breakpoints', async ({ page }, testInfo) => {
  const projectName = testInfo.project.name;
  const runtimeErrors = await openSeededApp(page, {
    currentIndex: questions.length - 1,
    currentView: 'final-summary',
    reviewExamId: null,
    correctionMode: 'exam-end',
    answers: buildAnswers(),
  });

  await expect(page.locator('#summary-view')).toBeVisible();
  await expect(page.getByText('Resultado final')).toBeVisible();
  await expect(page.getByText('Resumo de desempenho')).toBeVisible();
  await expect(page.locator('.summary-stat')).toHaveCount(4);
  await expect(page.locator('.summary-exam')).toHaveCount(payload.exams.length);

  await expectNoHorizontalOverflow(page);
  await expectTouchTargets(page);

  await page.addStyleTag({ content: '.skip-link { display: none !important; }' });
  await page.screenshot({
    path: path.join(screenshotDir, `${projectName}-final-summary.png`),
    fullPage: true,
  });

  await page.getByRole('button', { name: 'Escuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expectNoHorizontalOverflow(page);
  await expectTouchTargets(page);
  await page.screenshot({
    path: path.join(screenshotDir, `${projectName}-final-summary-dark.png`),
    fullPage: true,
  });

  await page.getByRole('button', { name: 'Revisar todos os erros' }).click();
  await expect(page.locator('#quiz-view')).toBeVisible();
  await expect(page.locator('.wrong-review-banner')).toContainText('Todos os erros');
  await expect(page.locator('#next-button')).toHaveText(/Próximo erro|Concluir revisão/);

  await page.locator('#next-button').click();
  await expect(page.locator('#confirm-button')).toHaveText(/Erro 2\/\d+/);

  await page.getByRole('button', { name: 'Voltar ao resultado' }).click();
  await expect(page.locator('#summary-view')).toBeVisible();
  await expect(page.getByText('Resumo de desempenho')).toBeVisible();

  await expectNoHorizontalOverflow(page);
  await expectTouchTargets(page);

  expect(runtimeErrors).toEqual([]);
});
