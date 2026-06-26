import {
  CORRECTION_MODE_EXAM_END,
  CORRECTION_MODE_IMMEDIATE,
} from './quiz-store.js';

const THEME_STORAGE_KEY = 'encceja-2020-theme';
const THEME_DARK = 'dark';
const THEME_LIGHT = 'light';

function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatPercent(value) {
  return `${value}%`;
}

function getScrollBehavior(preferredBehavior = 'smooth') {
  const reduceMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return reduceMotion ? 'auto' : preferredBehavior;
}

function truncateText(text, maxLength = 180) {
  if (!text || text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}...`;
}

function normalizeTheme(theme) {
  return theme === THEME_DARK ? THEME_DARK : THEME_LIGHT;
}

export class QuizUI {
  constructor(store) {
    this.store = store;
    this.lastRenderedView = null;
    this.lastRenderedQuestionId = null;
    this.currentTheme = this.loadTheme();

    this.elements = {
      accuracyLabel: document.querySelector('#accuracy-label'),
      accuracyRate: document.querySelector('#accuracy-rate'),
      answeredCount: document.querySelector('#answered-count'),
      closeDialogButton: document.querySelector('#close-dialog-button'),
      confirmButton: document.querySelector('#confirm-button'),
      correctCount: document.querySelector('#correct-count'),
      correctLabel: document.querySelector('#correct-label'),
      currentExamLabel: document.querySelector('#current-exam-label'),
      dialog: document.querySelector('#image-dialog'),
      dialogImage: document.querySelector('#dialog-image'),
      dialogTitle: document.querySelector('#dialog-title'),
      examNav: document.querySelector('#exam-nav'),
      feedback: document.querySelector('#feedback'),
      modeExamEndButton: document.querySelector('#mode-exam-end-button'),
      modeHelp: document.querySelector('#mode-help'),
      modeImmediateButton: document.querySelector('#mode-immediate-button'),
      nextButton: document.querySelector('#next-button'),
      options: document.querySelector('#options'),
      pageBadge: document.querySelector('#page-badge'),
      pagePreview: document.querySelector('#page-preview'),
      pagePreviewButton: document.querySelector('#page-preview-button'),
      previousButton: document.querySelector('#previous-button'),
      questionContext: document.querySelector('#question-context'),
      questionMap: document.querySelector('#question-map'),
      questionStem: document.querySelector('#question-stem'),
      questionTitle: document.querySelector('#question-title'),
      quizView: document.querySelector('#quiz-view'),
      resetCurrentExamButton: document.querySelector('#reset-current-exam-button'),
      resetCurrentExamHelp: document.querySelector('#reset-current-exam-help'),
      reviewReturnBanner: document.querySelector('#review-return-banner'),
      summaryProgressFill: document.querySelector('#summary-progress-fill'),
      summaryProgressLabel: document.querySelector('#summary-progress-label'),
      summaryView: document.querySelector('#summary-view'),
      themeDarkButton: document.querySelector('#theme-dark-button'),
      themeHelp: document.querySelector('#theme-help'),
      themeLightButton: document.querySelector('#theme-light-button'),
      wrongReviewBanner: document.querySelector('#wrong-review-banner'),
      zoomButton: document.querySelector('#zoom-button'),
    };

    this.applyTheme(this.currentTheme);
  }

  getCurrentViewKey() {
    if (this.store.isExamReviewVisible()) {
      return 'exam-review';
    }

    if (this.store.isFinalSummaryVisible()) {
      return 'final-summary';
    }

    return 'quiz';
  }

  handleViewChange(viewKey) {
    if (viewKey === 'exam-review' || viewKey === 'final-summary') {
      window.scrollTo({ top: 0, behavior: getScrollBehavior() });
      this.focusMainContent();
      return;
    }

    if (viewKey === 'quiz' && this.lastRenderedView && this.lastRenderedView !== 'quiz') {
      window.scrollTo({ top: 0, behavior: 'auto' });
      this.focusMainContent();
    }
  }

  focusMainContent() {
    const mainContent = document.querySelector('#main-content');
    mainContent?.focus({ preventScroll: true });
  }

  focusQuestionTitle() {
    this.elements.questionTitle.focus({ preventScroll: true });
  }

  loadTheme() {
    try {
      return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
    } catch {
      return THEME_LIGHT;
    }
  }

  saveTheme(theme) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // If storage is unavailable, keep the in-memory theme for this session.
    }
  }

  applyTheme(theme) {
    this.currentTheme = normalizeTheme(theme);
    document.documentElement.dataset.theme = this.currentTheme;
    document.documentElement.style.colorScheme = this.currentTheme;
  }

  setTheme(theme) {
    this.applyTheme(theme);
    this.saveTheme(this.currentTheme);
    this.renderThemeToggle();
  }

  handleResetExam(examId) {
    const exam = this.store.examById.get(examId);

    if (!this.store.hasExamProgress(examId)) {
      this.store.setNotice(`A prova ${exam.shortTitle} ainda não tem respostas para apagar.`, 'info');
      this.render();
      return;
    }

    const confirmed = window.confirm(
      `Deseja reiniciar a prova ${exam.shortTitle}?\n\nIsso apaga todas as respostas marcadas dessa prova e volta para a primeira questão.`
    );

    if (!confirmed) {
      return;
    }

    this.store.resetExam(examId);
    this.render();
  }

  bindEvents() {
    this.elements.confirmButton.addEventListener('click', () => {
      if (this.store.confirmCurrentAnswer()) {
        this.render();
      }
    });

    this.elements.previousButton.addEventListener('click', () => {
      this.store.previous();
      this.render();
    });

    this.elements.nextButton.addEventListener('click', () => {
      this.store.next();
      this.render();
    });

    this.elements.modeImmediateButton.addEventListener('click', () => {
      if (!this.store.isImmediateMode() && this.store.hasPendingResults()) {
        const confirmed = window.confirm(
          'Mostrar o gabarito na hora?\n\nIsso revela o resultado das respostas já confirmadas. Depois de revelado, o app não oculta esse gabarito novamente.'
        );

        if (!confirmed) {
          return;
        }
      }

      this.store.setCorrectionMode(CORRECTION_MODE_IMMEDIATE);
      this.render();
    });

    this.elements.modeExamEndButton.addEventListener('click', () => {
      this.store.setCorrectionMode(CORRECTION_MODE_EXAM_END);
      this.render();
    });

    this.elements.themeLightButton.addEventListener('click', () => {
      this.setTheme(THEME_LIGHT);
    });

    this.elements.themeDarkButton.addEventListener('click', () => {
      this.setTheme(THEME_DARK);
    });

    this.elements.resetCurrentExamButton.addEventListener('click', () => {
      this.handleResetExam(this.store.getCurrentQuestion().examId);
    });

    this.elements.zoomButton.addEventListener('click', () => this.openPreviewDialog());
    this.elements.pagePreviewButton.addEventListener('click', () => this.openPreviewDialog());
    this.elements.closeDialogButton.addEventListener('click', () => this.closePreviewDialog());
    this.elements.dialog.addEventListener('click', (event) => {
      const bounds = this.elements.dialog.getBoundingClientRect();
      const clickedOutside =
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom;

      if (clickedOutside) {
        this.closePreviewDialog();
      }
    });
  }

  openPreviewDialog() {
    const question = this.store.getCurrentQuestion();
    this.elements.dialogImage.src = question.pageImage;
    this.elements.dialogImage.alt = `Página ${question.pageNumber} da prova ${question.examShortTitle}, ampliada`;
    this.elements.dialogTitle.textContent = `${question.examShortTitle} - Questão ${question.number}`;
    this.elements.dialog.showModal();
  }

  closePreviewDialog() {
    if (this.elements.dialog.open) {
      this.elements.dialog.close();
    }
  }

  getOptionLabel(question, optionId) {
    if (!optionId) {
      return 'Não respondida';
    }

    const option = question.options.find((entry) => entry.id === optionId);
    if (!option || !option.text) {
      return optionId;
    }

    return `${optionId} - ${option.text}`;
  }

  getStatusBadge(status) {
    if (status === 'correct') {
      return { className: 'is-correct', label: 'Acertou' };
    }

    if (status === 'wrong') {
      return { className: 'is-wrong', label: 'Errou' };
    }

    if (status === 'pending') {
      return { className: 'is-pending', label: 'Resultado pendente' };
    }

    return { className: 'is-empty', label: 'Não respondida' };
  }

  render() {
    const currentView = this.getCurrentViewKey();
    const hasViewChanged = currentView !== this.lastRenderedView;
    const isInitialRender = this.lastRenderedView === null;
    const currentQuestionId = this.store.getCurrentQuestion().id;
    const hasQuestionChanged = currentQuestionId !== this.lastRenderedQuestionId;

    this.renderSidebar();

    if (this.store.isExamReviewVisible()) {
      this.renderExamReview();
      this.elements.quizView.hidden = true;
      this.elements.summaryView.hidden = false;
      if (hasViewChanged) {
        this.handleViewChange(currentView);
      }
      this.lastRenderedView = currentView;
      this.lastRenderedQuestionId = null;
      return;
    }

    if (this.store.isFinalSummaryVisible()) {
      this.renderSummary();
      this.elements.quizView.hidden = true;
      this.elements.summaryView.hidden = false;
      if (hasViewChanged) {
        this.handleViewChange(currentView);
      }
      this.lastRenderedView = currentView;
      this.lastRenderedQuestionId = null;
      return;
    }

    this.elements.quizView.hidden = false;
    this.elements.summaryView.hidden = true;
    this.renderQuestion();
    if (hasViewChanged) {
      this.handleViewChange(currentView);
    }
    if (!isInitialRender && (hasViewChanged || hasQuestionChanged)) {
      this.focusQuestionTitle();
    }
    this.lastRenderedView = currentView;
    this.lastRenderedQuestionId = currentQuestionId;
  }

  renderSidebar() {
    const answered = this.store.getAnsweredCount();
    const correct = this.store.getCorrectCount();
    const accuracy = this.store.getAccuracyRate();
    const currentQuestion = this.store.getCurrentQuestion();
    const hasPendingResults = this.store.hasPendingResults();
    const progressRate = Math.round((answered / this.store.questions.length) * 100);

    this.elements.answeredCount.textContent = `${answered}/${this.store.questions.length}`;
    this.elements.correctCount.textContent = String(correct);
    this.elements.accuracyRate.textContent = formatPercent(accuracy);
    this.elements.correctLabel.textContent = hasPendingResults ? 'Acertos exibidos' : 'Acertos';
    this.elements.accuracyLabel.textContent = hasPendingResults ? 'Taxa exibida' : 'Taxa';
    this.elements.currentExamLabel.textContent = currentQuestion.examShortTitle;
    this.elements.summaryProgressFill.style.width = `${progressRate}%`;
    this.elements.summaryProgressLabel.textContent = `${answered} de ${this.store.questions.length} questões respondidas`;

    this.renderCorrectionMode();
    this.renderThemeToggle();
    this.renderExamNav();
    this.renderQuestionMap();
    this.renderCurrentExamActions();
  }

  renderThemeToggle() {
    const isDark = this.currentTheme === THEME_DARK;

    this.elements.themeDarkButton.classList.toggle('is-active', isDark);
    this.elements.themeLightButton.classList.toggle('is-active', !isDark);
    this.elements.themeDarkButton.setAttribute('aria-pressed', String(isDark));
    this.elements.themeLightButton.setAttribute('aria-pressed', String(!isDark));
    this.elements.themeHelp.textContent = isDark
      ? 'Tema escuro ativo. Use o tema claro se quiser mais brilho na leitura.'
      : 'Tema claro ativo. Use o tema escuro para estudar com menos brilho.';
  }

  renderCurrentExamActions() {
    const currentExam = this.store.getCurrentExam();
    const hasProgress = this.store.hasExamProgress(currentExam.id);

    this.elements.resetCurrentExamButton.disabled = !hasProgress;
    this.elements.resetCurrentExamButton.textContent = `Reiniciar ${currentExam.shortTitle}`;
    this.elements.resetCurrentExamHelp.textContent = hasProgress
      ? 'Apaga as respostas desta prova e volta para a primeira questão.'
      : 'Essa prova ainda não tem respostas marcadas.';
  }

  renderCorrectionMode() {
    const isImmediateMode = this.store.isImmediateMode();
    const currentExam = this.store.getCurrentExam();

    this.elements.modeImmediateButton.classList.toggle('is-active', isImmediateMode);
    this.elements.modeExamEndButton.classList.toggle('is-active', !isImmediateMode);
    this.elements.modeImmediateButton.setAttribute('aria-pressed', String(isImmediateMode));
    this.elements.modeExamEndButton.setAttribute('aria-pressed', String(!isImmediateMode));

    if (isImmediateMode) {
      this.elements.modeHelp.textContent =
        'Cada questão mostra na hora se a resposta está certa ou errada.';
      return;
    }

    if (this.store.hasPendingResults()) {
      this.elements.modeHelp.textContent = `As respostas da prova ${currentExam.shortTitle} aparecem quando você terminar essa prova.`;
      return;
    }

    this.elements.modeHelp.textContent =
      'As respostas ficam guardadas e são mostradas juntas no final de cada prova.';
  }

  renderExamNav() {
    const currentExamId = this.store.getCurrentQuestion().examId;

    this.elements.examNav.innerHTML = this.store.exams
      .map((exam) => {
        const stats = this.store.getExamStats(exam.id);
        const classes = ['exam-nav-button'];
        let meta = `${stats.answered}/${stats.total} respondidas`;
        const progress = Math.round((stats.answered / stats.total) * 100);
        const isActive = exam.id === currentExamId;

        if (isActive) {
          classes.push('is-active');
        }

        if (stats.pendingReview) {
          meta += ' - gabarito no fim da prova';
        } else if (stats.revealedAnswered > 0) {
          meta += ` - ${stats.correct} acertos`;
        }

        const ariaLabel = `${exam.shortTitle}: ${meta}`;
        const activeAttribute = isActive ? ' aria-current="page"' : '';

        return `
          <button
            class="${classes.join(' ')}"
            type="button"
            data-exam-id="${exam.id}"
            aria-label="${escapeHtml(ariaLabel)}"
            ${activeAttribute}
          >
            <span class="exam-nav-button-title">${escapeHtml(exam.shortTitle)}</span>
            <span class="exam-nav-button-meta">${escapeHtml(meta)}</span>
            <span class="exam-progress" aria-hidden="true">
              <span style="width: ${progress}%"></span>
            </span>
          </button>
        `;
      })
      .join('');

    this.elements.examNav.querySelectorAll('[data-exam-id]').forEach((button) => {
      button.addEventListener('click', () => {
        this.store.goToFirstQuestionOfExam(button.dataset.examId);
        this.render();
      });
    });
  }

  renderQuestionMap() {
    const currentQuestion = this.store.getCurrentQuestion();
    const questions = this.store.getCurrentExamQuestions();

    this.elements.questionMap.innerHTML = questions
      .map((question) => {
        const record = this.store.getQuestionRecord(question.id);
        const classes = ['question-map-button'];
        const statusLabels = [];

        if (question.id === currentQuestion.id) {
          classes.push('is-current');
          statusLabels.push('questão atual');
        }

        if (record.confirmed && record.revealed && record.isCorrect) {
          classes.push('is-correct');
          statusLabels.push('correta');
        } else if (record.confirmed && record.revealed && !record.isCorrect) {
          classes.push('is-wrong');
          statusLabels.push('errada');
        } else if (record.confirmed) {
          classes.push('is-answered');
          statusLabels.push(record.revealed ? 'respondida' : 'respondida, gabarito pendente');
        } else if (record.selected) {
          classes.push('is-selected');
          statusLabels.push('alternativa marcada, ainda não confirmada');
        } else {
          statusLabels.push('não respondida');
        }

        const ariaLabel = `Questão ${question.number}: ${statusLabels.join(', ')}`;
        const currentAttribute = question.id === currentQuestion.id ? ' aria-current="step"' : '';

        return `
          <button
            class="${classes.join(' ')}"
            type="button"
            data-question-id="${question.id}"
            aria-label="${escapeHtml(ariaLabel)}"
            title="${escapeHtml(ariaLabel)}"
            ${currentAttribute}
          >
            ${question.number}
          </button>
        `;
      })
      .join('');

    this.elements.questionMap.querySelectorAll('[data-question-id]').forEach((button) => {
      button.addEventListener('click', () => {
        this.store.goToQuestionById(button.dataset.questionId);
        this.render();
      });
    });
  }

  renderQuestion() {
    const question = this.store.getCurrentQuestion();
    const record = this.store.getCurrentRecord();
    const examQuestions = this.store.getCurrentExamQuestions();
    const examPosition = examQuestions.findIndex((entry) => entry.id === question.id) + 1;

    document.title = `Questão ${question.number} - ${question.examShortTitle} | ENCCEJA 2020`;
    this.elements.questionContext.textContent = `${question.examTitle} - questão ${examPosition} de ${examQuestions.length} nesta prova`;
    this.elements.questionTitle.textContent = `Questão ${question.number}`;
    this.elements.pageBadge.textContent = `Página ${question.pageNumber}`;
    this.elements.pagePreview.src = question.pageImage;
    this.elements.pagePreview.alt = `Página ${question.pageNumber} da prova ${question.examShortTitle}`;
    this.elements.pagePreviewButton.setAttribute(
      'aria-label',
      `Ampliar página ${question.pageNumber} da prova ${question.examShortTitle}`
    );
    this.elements.questionStem.innerHTML = question.stem
      .split('\n')
      .map((line) => `<p>${escapeHtml(line)}</p>`)
      .join('');

    this.renderWrongReviewBanner();
    this.renderReviewReturnBanner();
    this.renderFeedback(question, record);
    this.renderOptions(question, record);
    this.renderControls(record);
  }

  renderWrongReviewBanner() {
    const wrongReview = this.store.getWrongReviewState();

    if (!wrongReview) {
      this.elements.wrongReviewBanner.hidden = true;
      this.elements.wrongReviewBanner.innerHTML = '';
      return;
    }

    this.elements.reviewReturnBanner.hidden = true;
    this.elements.reviewReturnBanner.innerHTML = '';

    const sourceExam = wrongReview.sourceExamId
      ? this.store.examById.get(wrongReview.sourceExamId)
      : null;
    const scopeLabel = sourceExam ? `Erros de ${sourceExam.shortTitle}` : 'Todos os erros';
    const returnLabel =
      wrongReview.returnView === 'exam-review' ? 'Voltar à revisão' : 'Voltar ao resultado';

    this.elements.wrongReviewBanner.hidden = false;
    this.elements.wrongReviewBanner.innerHTML = `
      <div>
        <p class="wrong-review-kicker">${escapeHtml(scopeLabel)}</p>
        <p class="wrong-review-copy">
          Erro ${wrongReview.position} de ${wrongReview.total}. Compare sua resposta com o gabarito e avance apenas pelos erros.
        </p>
      </div>
      <button class="summary-action" type="button" data-wrong-review-action="exit">
        ${escapeHtml(returnLabel)}
      </button>
    `;

    this.elements.wrongReviewBanner
      .querySelector('[data-wrong-review-action="exit"]')
      .addEventListener('click', () => {
        this.store.endWrongReview();
        this.render();
      });
  }

  renderReviewReturnBanner() {
    const exam = this.store.getExamReviewReturnState();

    if (!exam) {
      this.elements.reviewReturnBanner.hidden = true;
      this.elements.reviewReturnBanner.innerHTML = '';
      return;
    }

    this.elements.reviewReturnBanner.hidden = false;
    this.elements.reviewReturnBanner.innerHTML = `
      <div>
        <p class="review-return-kicker">Aberta a partir do resultado da prova</p>
        <p class="review-return-copy">
          Você está revisando ${escapeHtml(exam.shortTitle)} no caderno. Volte ao resultado para consultar a lista completa.
        </p>
      </div>
      <button class="summary-action" type="button" data-review-return-action="exam-review">
        Voltar ao resultado da prova
      </button>
    `;

    this.elements.reviewReturnBanner
      .querySelector('[data-review-return-action="exam-review"]')
      .addEventListener('click', () => {
        this.store.openExamReview(exam.id);
        this.render();
      });
  }

  renderFeedback(question, record) {
    const notice = this.store.getNotice();

    if (notice) {
      this.elements.feedback.hidden = false;
      this.elements.feedback.className = `feedback ${
        notice.type === 'warning' ? 'is-warning' : 'is-pending'
      }`;
      this.elements.feedback.textContent = notice.message;
      return;
    }

    if (!record.confirmed) {
      this.elements.feedback.hidden = true;
      this.elements.feedback.className = 'feedback';
      this.elements.feedback.textContent = '';
      return;
    }

    this.elements.feedback.hidden = false;

    if (!record.revealed) {
      this.elements.feedback.className = 'feedback is-pending';
      this.elements.feedback.textContent =
        'Resposta salva. O gabarito desta prova será mostrado no final dela.';
      return;
    }

    this.elements.feedback.className = `feedback ${record.isCorrect ? 'is-correct' : 'is-wrong'}`;
    this.elements.feedback.textContent = record.isCorrect
      ? 'Resposta correta.'
      : `Resposta incorreta. Gabarito: ${question.answer}.`;
  }

  getOptionStateLabel(question, record, option) {
    if (record.revealed && option.id === question.answer && record.selected === option.id) {
      return 'Resposta correta';
    }

    if (record.revealed && option.id === question.answer) {
      return 'Gabarito';
    }

    if (record.revealed && record.selected === option.id) {
      return 'Sua resposta';
    }

    if (record.confirmed && !record.revealed && record.selected === option.id) {
      return 'Resposta salva';
    }

    if (record.selected === option.id) {
      return 'Selecionada';
    }

    return '';
  }

  renderOptions(question, record) {
    this.elements.options.innerHTML = question.options
      .map((option) => {
        const classes = ['option-button'];
        const showText = Boolean(option.text);
        const stateLabel = this.getOptionStateLabel(question, record, option);
        const readableText = option.text || 'Consulte a página da prova.';

        if (!showText) {
          classes.push('is-textless');
        }

        if (record.selected === option.id) {
          classes.push('is-selected');
        }

        if (record.confirmed && !record.revealed && record.selected === option.id) {
          classes.push('is-answered');
        }

        if (record.revealed && option.id === question.answer) {
          classes.push('is-correct');
        } else if (record.revealed && record.selected === option.id && option.id !== question.answer) {
          classes.push('is-wrong');
        }

        const stateMarkup = stateLabel
          ? `<span class="option-state">${escapeHtml(stateLabel)}</span>`
          : '';
        const optionTextClass = showText ? 'option-text' : 'option-text is-muted';
        const ariaLabel = `Alternativa ${option.id}. ${readableText}${
          stateLabel ? `. ${stateLabel}` : ''
        }`;

        return `
          <button
            class="${classes.join(' ')}"
            type="button"
            data-option-id="${option.id}"
            aria-pressed="${record.selected === option.id}"
            aria-label="${escapeHtml(ariaLabel)}"
            ${record.confirmed ? 'disabled' : ''}
          >
            <span class="option-badge">${option.id}</span>
            <span class="option-content">
              <span class="${optionTextClass}">${escapeHtml(readableText)}</span>
              ${stateMarkup}
            </span>
          </button>
        `;
      })
      .join('');

    this.elements.options.querySelectorAll('[data-option-id]').forEach((button) => {
      button.addEventListener('click', () => {
        this.store.selectOption(button.dataset.optionId);
        this.render();
      });
    });
  }

  renderControls(record) {
    const wrongReview = this.store.getWrongReviewState();

    this.elements.previousButton.textContent = 'Anterior';
    this.elements.confirmButton.textContent = 'Confirmar';

    if (wrongReview) {
      this.elements.previousButton.disabled = !wrongReview.hasPrevious;
      this.elements.confirmButton.disabled = true;
      this.elements.nextButton.disabled = false;
      this.elements.previousButton.textContent = 'Erro anterior';
      this.elements.confirmButton.textContent = `Erro ${wrongReview.position}/${wrongReview.total}`;
      this.elements.nextButton.textContent = wrongReview.hasNext ? 'Próximo erro' : 'Concluir revisão';
      this.elements.previousButton.setAttribute(
        'aria-label',
        wrongReview.hasPrevious ? 'Ir para o erro anterior' : 'Este é o primeiro erro da revisão'
      );
      this.elements.confirmButton.setAttribute(
        'aria-label',
        `Revisando erro ${wrongReview.position} de ${wrongReview.total}`
      );
      this.elements.nextButton.setAttribute(
        'aria-label',
        wrongReview.hasNext
          ? 'Ir para o próximo erro'
          : 'Concluir revisão de erros e voltar ao resultado'
      );
      return;
    }

    this.elements.previousButton.disabled = this.store.state.currentIndex === 0;
    this.elements.confirmButton.disabled = !record.selected || record.confirmed;
    this.elements.nextButton.disabled = !record.confirmed;
    this.elements.previousButton.setAttribute(
      'aria-label',
      this.store.state.currentIndex === 0 ? 'Questão anterior indisponível' : 'Ir para a questão anterior'
    );
    this.elements.confirmButton.setAttribute(
      'aria-label',
      record.confirmed
        ? 'Resposta já confirmada'
        : record.selected
          ? 'Confirmar resposta selecionada'
          : 'Selecione uma alternativa antes de confirmar'
    );
    this.elements.nextButton.setAttribute(
      'aria-label',
      record.confirmed ? 'Continuar para a próxima etapa' : 'Confirme a resposta antes de avançar'
    );

    if (this.store.shouldOpenExamReviewOnNext()) {
      this.elements.nextButton.textContent = 'Finalizar prova';
      this.elements.nextButton.setAttribute('aria-label', 'Finalizar prova e abrir resultado');
      return;
    }

    this.elements.nextButton.textContent = this.store.isCurrentQuestionLast()
      ? 'Ver resultado geral'
      : 'Próxima';
  }

  renderExamReview() {
    const exam = this.store.getReviewExam();
    const stats = this.store.getExamStats(exam.id);
    const nextExamId = this.store.getNextExamId(exam.id);
    const hasWrongAnswers = stats.wrongNumbers.length > 0;

    this.elements.summaryView.innerHTML = `
      <div class="summary-header">
        <p class="question-context">Resultado da prova</p>
        <h2 tabindex="-1">${escapeHtml(exam.title)}</h2>
        <p class="summary-copy">
          Você terminou esta prova. Consulte abaixo cada questão ou revise apenas os erros para focar no que precisa estudar.
        </p>
      </div>

      <section class="summary-overview" aria-label="Resumo desta prova">
        <article class="summary-stat">
          <span class="summary-label">Questões respondidas</span>
          <strong>${stats.answered}/${stats.total}</strong>
        </article>
        <article class="summary-stat">
          <span class="summary-label">Acertos</span>
          <strong>${stats.correct}</strong>
        </article>
        <article class="summary-stat">
          <span class="summary-label">Erros</span>
          <strong>${stats.answered - stats.correct}</strong>
        </article>
        <article class="summary-stat">
          <span class="summary-label">Taxa de acerto</span>
          <strong>${formatPercent(stats.accuracy)}</strong>
        </article>
      </section>

      <section class="review-list" aria-label="Revisão das questões">
        ${this.store
          .getExamQuestions(exam.id)
          .map((question) => {
            const record = this.store.getQuestionRecord(question.id);
            const status = this.store.getQuestionStatus(question);
            const badge = this.getStatusBadge(status);
            const snippet = truncateText(question.stem.replaceAll('\n', ' '));

            return `
              <article class="review-card">
                <div class="review-card-top">
                  <div>
                    <p class="review-card-title">Questão ${question.number}</p>
                    <p class="review-card-snippet">${escapeHtml(snippet)}</p>
                  </div>
                  <span class="status-badge ${badge.className}">${badge.label}</span>
                </div>

                <div class="review-answer-list">
                  <div class="review-answer-row">
                    <span class="review-answer-label">Sua resposta</span>
                    <span>${escapeHtml(this.getOptionLabel(question, record.selected))}</span>
                  </div>
                  <div class="review-answer-row">
                    <span class="review-answer-label">Resposta certa</span>
                    <span>${escapeHtml(this.getOptionLabel(question, question.answer))}</span>
                  </div>
                </div>

                <div class="review-card-actions">
                  <button class="summary-action" type="button" data-review-question-id="${question.id}">
                    Abrir questão
                  </button>
                </div>
              </article>
            `;
          })
          .join('')}
      </section>

      <div class="summary-actions">
        ${
          hasWrongAnswers
            ? `<button class="primary-button" type="button" data-review-action="wrong-review" data-exam-id="${exam.id}">
                Revisar erros desta prova
              </button>`
            : ''
        }
        <button class="summary-action" type="button" data-review-action="open-exam" data-exam-id="${exam.id}">
          Revisar no caderno
        </button>
        <button class="summary-action danger-button" type="button" data-review-action="reset-exam" data-exam-id="${exam.id}">
          Reiniciar esta prova
        </button>
        <button class="${hasWrongAnswers ? 'summary-action' : 'primary-button'}" type="button" data-review-action="continue">
          ${nextExamId ? 'Ir para a próxima prova' : 'Ver resultado geral'}
        </button>
      </div>
    `;

    this.elements.summaryView.querySelectorAll('[data-review-question-id]').forEach((button) => {
      button.addEventListener('click', () => {
        this.store.goToQuestionById(button.dataset.reviewQuestionId, {
          reviewReturnExamId: exam.id,
        });
        this.render();
      });
    });

    this.elements.summaryView.querySelectorAll('[data-review-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.reviewAction;

        if (action === 'open-exam') {
          this.store.goToFirstQuestionOfExam(button.dataset.examId, {
            reviewReturnExamId: button.dataset.examId,
          });
        }

        if (action === 'wrong-review') {
          this.store.startWrongReview({
            examId: button.dataset.examId,
            returnView: 'exam-review',
            returnExamId: button.dataset.examId,
          });
        }

        if (action === 'continue') {
          this.store.continueAfterExamReview();
        }

        if (action === 'reset-exam') {
          this.handleResetExam(button.dataset.examId);
          return;
        }

        this.render();
      });
    });
  }

  renderSummary() {
    const answered = this.store.getAnsweredCount();
    const correct = this.store.getCorrectCount();
    const wrong = answered - correct;
    const accuracy = this.store.getAccuracyRate();
    const hasWrongAnswers = this.store.getWrongQuestions().length > 0;

    this.elements.summaryView.innerHTML = `
      <div class="summary-header">
        <p class="question-context">Resultado final</p>
        <h2 tabindex="-1">Resumo de desempenho</h2>
        <p class="summary-copy">
          Aqui está o resultado geral das três provas. Use a revisão de erros para transformar o resultado em estudo direcionado.
        </p>
      </div>

      <section class="summary-overview" aria-label="Resumo geral de desempenho">
        <article class="summary-stat">
          <span class="summary-label">Questões respondidas</span>
          <strong>${answered}/${this.store.questions.length}</strong>
        </article>
        <article class="summary-stat">
          <span class="summary-label">Acertos</span>
          <strong>${correct}</strong>
        </article>
        <article class="summary-stat">
          <span class="summary-label">Erros</span>
          <strong>${wrong}</strong>
        </article>
        <article class="summary-stat">
          <span class="summary-label">Taxa de acerto</span>
          <strong>${formatPercent(accuracy)}</strong>
        </article>
      </section>

      <section class="summary-breakdown" aria-label="Resultado por prova">
        <h3>Por prova</h3>
        ${this.store.exams
          .map((exam) => {
            const stats = this.store.getExamStats(exam.id);
            const hasProgress = this.store.hasExamProgress(exam.id);
            const wrongLabel = stats.wrongNumbers.length
              ? `Erros nas questões: ${stats.wrongNumbers.join(', ')}`
              : 'Erros nas questões: nenhum';

            return `
              <article class="summary-exam">
                <div class="summary-exam-top">
                  <p class="summary-exam-title">${escapeHtml(exam.title)}</p>
                  <strong>${stats.correct}/${stats.total} - ${formatPercent(stats.accuracy)}</strong>
                </div>
                <p class="summary-errors">${escapeHtml(wrongLabel)}</p>
                <div class="summary-exam-actions">
                  ${
                    stats.wrongNumbers.length
                      ? `<button class="summary-action" type="button" data-summary-review-errors="${exam.id}">
                          Revisar erros desta prova
                        </button>`
                      : ''
                  }
                  <button class="summary-action" type="button" data-summary-open-review="${exam.id}">
                    Abrir revisão desta prova
                  </button>
                  <button class="summary-action danger-button" type="button" data-summary-reset-exam="${exam.id}" ${
                    hasProgress ? '' : 'disabled'
                  }>
                    Reiniciar esta prova
                  </button>
                </div>
              </article>
            `;
          })
          .join('')}
      </section>

      <div class="summary-actions">
        ${
          hasWrongAnswers
            ? `<button class="primary-button" type="button" data-summary-action="wrong-review">
                Revisar todos os erros
              </button>`
            : ''
        }
        <button class="summary-action" type="button" data-summary-action="review">
          Revisar desde a primeira questão
        </button>
        <button class="summary-action danger-button" type="button" data-summary-action="restart">Reiniciar</button>
      </div>
    `;

    this.elements.summaryView.querySelectorAll('[data-summary-review-errors]').forEach((button) => {
      button.addEventListener('click', () => {
        this.store.startWrongReview({
          examId: button.dataset.summaryReviewErrors,
          returnView: 'final-summary',
        });
        this.render();
      });
    });

    this.elements.summaryView.querySelectorAll('[data-summary-open-review]').forEach((button) => {
      button.addEventListener('click', () => {
        this.store.openExamReview(button.dataset.summaryOpenReview);
        this.render();
      });
    });

    this.elements.summaryView.querySelectorAll('[data-summary-reset-exam]').forEach((button) => {
      button.addEventListener('click', () => {
        this.handleResetExam(button.dataset.summaryResetExam);
      });
    });

    this.elements.summaryView.querySelectorAll('[data-summary-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.summaryAction;

        if (action === 'review') {
          this.store.goToQuestion(0);
        }

        if (action === 'wrong-review') {
          this.store.startWrongReview({ returnView: 'final-summary' });
        }

        if (action === 'restart') {
          this.store.restart();
        }

        this.render();
      });
    });
  }
}
