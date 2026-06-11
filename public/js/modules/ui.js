import {
  CORRECTION_MODE_EXAM_END,
  CORRECTION_MODE_IMMEDIATE,
} from './quiz-store.js';

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

function truncateText(text, maxLength = 180) {
  if (!text || text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}...`;
}

export class QuizUI {
  constructor(store) {
    this.store = store;
    this.lastRenderedView = null;

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
      summaryView: document.querySelector('#summary-view'),
      zoomButton: document.querySelector('#zoom-button'),
    };
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (viewKey === 'quiz' && this.lastRenderedView && this.lastRenderedView !== 'quiz') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }

  handleResetExam(examId) {
    const exam = this.store.examById.get(examId);

    if (!this.store.hasExamProgress(examId)) {
      this.store.setNotice(`A prova ${exam.shortTitle} ainda nao tem respostas para apagar.`, 'info');
      this.render();
      return;
    }

    const confirmed = window.confirm(
      `Deseja reiniciar a prova ${exam.shortTitle}?\n\nIsso apaga todas as respostas marcadas dessa prova e volta para a primeira questao.`
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
      this.store.setCorrectionMode(CORRECTION_MODE_IMMEDIATE);
      this.render();
    });

    this.elements.modeExamEndButton.addEventListener('click', () => {
      this.store.setCorrectionMode(CORRECTION_MODE_EXAM_END);
      this.render();
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
    this.elements.dialogTitle.textContent = `${question.examShortTitle} - Questao ${question.number}`;
    this.elements.dialog.showModal();
  }

  closePreviewDialog() {
    if (this.elements.dialog.open) {
      this.elements.dialog.close();
    }
  }

  getOptionLabel(question, optionId) {
    if (!optionId) {
      return 'Nao respondida';
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

    return { className: 'is-empty', label: 'Nao respondida' };
  }

  render() {
    const currentView = this.getCurrentViewKey();
    const hasViewChanged = currentView !== this.lastRenderedView;

    this.renderSidebar();

    if (this.store.isExamReviewVisible()) {
      this.renderExamReview();
      this.elements.quizView.hidden = true;
      this.elements.summaryView.hidden = false;
      if (hasViewChanged) {
        this.handleViewChange(currentView);
      }
      this.lastRenderedView = currentView;
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
      return;
    }

    this.elements.quizView.hidden = false;
    this.elements.summaryView.hidden = true;
    this.renderQuestion();
    if (hasViewChanged) {
      this.handleViewChange(currentView);
    }
    this.lastRenderedView = currentView;
  }

  renderSidebar() {
    const answered = this.store.getAnsweredCount();
    const correct = this.store.getCorrectCount();
    const accuracy = this.store.getAccuracyRate();
    const currentQuestion = this.store.getCurrentQuestion();
    const hasPendingResults = this.store.hasPendingResults();

    this.elements.answeredCount.textContent = `${answered}/${this.store.questions.length}`;
    this.elements.correctCount.textContent = String(correct);
    this.elements.accuracyRate.textContent = formatPercent(accuracy);
    this.elements.correctLabel.textContent = hasPendingResults ? 'Acertos exibidos' : 'Acertos';
    this.elements.accuracyLabel.textContent = hasPendingResults ? 'Taxa exibida' : 'Taxa';
    this.elements.currentExamLabel.textContent = currentQuestion.examShortTitle;

    this.renderCorrectionMode();
    this.renderExamNav();
    this.renderQuestionMap();
    this.renderCurrentExamActions();
  }

  renderCurrentExamActions() {
    const currentExam = this.store.getCurrentExam();
    const hasProgress = this.store.hasExamProgress(currentExam.id);

    this.elements.resetCurrentExamButton.disabled = !hasProgress;
    this.elements.resetCurrentExamButton.textContent = `Reiniciar ${currentExam.shortTitle}`;
    this.elements.resetCurrentExamHelp.textContent = hasProgress
      ? 'Apaga as respostas desta prova e volta para a primeira questao.'
      : 'Essa prova ainda nao tem respostas marcadas.';
  }

  renderCorrectionMode() {
    const isImmediateMode = this.store.isImmediateMode();
    const currentExam = this.store.getCurrentExam();

    this.elements.modeImmediateButton.classList.toggle('is-active', isImmediateMode);
    this.elements.modeExamEndButton.classList.toggle('is-active', !isImmediateMode);

    if (isImmediateMode) {
      this.elements.modeHelp.textContent =
        'Cada questao mostra na hora se a resposta esta certa ou errada.';
      return;
    }

    if (this.store.hasPendingResults()) {
      this.elements.modeHelp.textContent = `As respostas da prova ${currentExam.shortTitle} aparecem quando voce terminar essa prova.`;
      return;
    }

    this.elements.modeHelp.textContent =
      'As respostas ficam guardadas e sao mostradas juntas no final de cada prova.';
  }

  renderExamNav() {
    const currentExamId = this.store.getCurrentQuestion().examId;

    this.elements.examNav.innerHTML = this.store.exams
      .map((exam) => {
        const stats = this.store.getExamStats(exam.id);
        const classes = ['exam-nav-button'];
        let meta = `${stats.answered}/${stats.total} respondidas`;

        if (exam.id === currentExamId) {
          classes.push('is-active');
        }

        if (stats.pendingReview) {
          meta += ' - gabarito no fim da prova';
        } else if (stats.revealedAnswered > 0) {
          meta += ` - ${stats.correct} acertos`;
        }

        return `
          <button class="${classes.join(' ')}" type="button" data-exam-id="${exam.id}">
            <span class="exam-nav-button-title">${escapeHtml(exam.shortTitle)}</span>
            <span class="exam-nav-button-meta">${escapeHtml(meta)}</span>
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

        if (question.id === currentQuestion.id) {
          classes.push('is-current');
        }

        if (record.confirmed && record.revealed && record.isCorrect) {
          classes.push('is-correct');
        } else if (record.confirmed && record.revealed && !record.isCorrect) {
          classes.push('is-wrong');
        } else if (record.confirmed) {
          classes.push('is-answered');
        } else if (record.selected) {
          classes.push('is-selected');
        }

        return `
          <button
            class="${classes.join(' ')}"
            type="button"
            data-question-id="${question.id}"
            aria-label="Questao ${question.number}"
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

    this.elements.questionContext.textContent = `${question.examTitle} - questao ${examPosition} de ${examQuestions.length} nesta prova`;
    this.elements.questionTitle.textContent = `Questao ${question.number}`;
    this.elements.pageBadge.textContent = `Pagina ${question.pageNumber}`;
    this.elements.pagePreview.src = question.pageImage;
    this.elements.pagePreview.alt = `Pagina ${question.pageNumber} da prova ${question.examShortTitle}`;
    this.elements.questionStem.innerHTML = question.stem
      .split('\n')
      .map((line) => `<p>${escapeHtml(line)}</p>`)
      .join('');

    this.renderFeedback(question, record);
    this.renderOptions(question, record);
    this.renderControls(record);
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
        'Resposta salva. O gabarito desta prova sera mostrado no final dela.';
      return;
    }

    this.elements.feedback.className = `feedback ${record.isCorrect ? 'is-correct' : 'is-wrong'}`;
    this.elements.feedback.textContent = record.isCorrect
      ? 'Resposta correta.'
      : `Resposta incorreta. Gabarito: ${question.answer}.`;
  }

  renderOptions(question, record) {
    this.elements.options.innerHTML = question.options
      .map((option) => {
        const classes = ['option-button'];
        const showText = Boolean(option.text);

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

        return `
          <button class="${classes.join(' ')}" type="button" data-option-id="${option.id}" ${
            record.confirmed ? 'disabled' : ''
          }>
            <span class="option-badge">${option.id}</span>
            ${showText ? `<span class="option-text">${escapeHtml(option.text)}</span>` : ''}
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
    this.elements.previousButton.disabled = this.store.state.currentIndex === 0;
    this.elements.confirmButton.disabled = !record.selected || record.confirmed;
    this.elements.nextButton.disabled = !record.confirmed;

    if (this.store.shouldOpenExamReviewOnNext()) {
      this.elements.nextButton.textContent = 'Finalizar prova';
      return;
    }

    this.elements.nextButton.textContent = this.store.isCurrentQuestionLast()
      ? 'Ver resultado geral'
      : 'Proxima';
  }

  renderExamReview() {
    const exam = this.store.getReviewExam();
    const stats = this.store.getExamStats(exam.id);
    const nextExamId = this.store.getNextExamId(exam.id);

    this.elements.summaryView.innerHTML = `
      <div class="summary-header">
        <p class="question-context">Resultado da prova</p>
        <h2>${escapeHtml(exam.title)}</h2>
        <p class="summary-copy">
          Voce terminou esta prova. Consulte abaixo cada questao para ver a resposta marcada e o gabarito correto.
        </p>
      </div>

      <section class="summary-overview">
        <article class="summary-stat">
          <span class="summary-label">Questoes respondidas</span>
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

      <section class="review-list">
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
                    <p class="review-card-title">Questao ${question.number}</p>
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
                    Abrir questao
                  </button>
                </div>
              </article>
            `;
          })
          .join('')}
      </section>

      <div class="summary-actions">
        <button class="summary-action" type="button" data-review-action="open-exam" data-exam-id="${exam.id}">
          Revisar no caderno
        </button>
        <button class="summary-action" type="button" data-review-action="reset-exam" data-exam-id="${exam.id}">
          Reiniciar esta prova
        </button>
        <button class="primary-button" type="button" data-review-action="continue">
          ${nextExamId ? 'Ir para a proxima prova' : 'Ver resultado geral'}
        </button>
      </div>
    `;

    this.elements.summaryView.querySelectorAll('[data-review-question-id]').forEach((button) => {
      button.addEventListener('click', () => {
        this.store.goToQuestionById(button.dataset.reviewQuestionId);
        this.render();
      });
    });

    this.elements.summaryView.querySelectorAll('[data-review-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.reviewAction;

        if (action === 'open-exam') {
          this.store.goToFirstQuestionOfExam(button.dataset.examId);
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

    this.elements.summaryView.innerHTML = `
      <div class="summary-header">
        <p class="question-context">Resultado final</p>
        <h2>Resumo de desempenho</h2>
        <p class="summary-copy">
          Aqui esta o resultado geral das tres provas. Voce tambem pode abrir a revisao de cada prova para consultar questao por questao.
        </p>
      </div>

      <section class="summary-overview">
        <article class="summary-stat">
          <span class="summary-label">Questoes respondidas</span>
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

      <section class="summary-breakdown">
        <h3>Por prova</h3>
        ${this.store.exams
          .map((exam) => {
            const stats = this.store.getExamStats(exam.id);
            const hasProgress = this.store.hasExamProgress(exam.id);
            const wrongLabel = stats.wrongNumbers.length
              ? `Erros nas questoes: ${stats.wrongNumbers.join(', ')}`
              : 'Erros nas questoes: nenhum';

            return `
              <article class="summary-exam">
                <div class="summary-exam-top">
                  <p class="summary-exam-title">${escapeHtml(exam.title)}</p>
                  <strong>${stats.correct}/${stats.total} - ${formatPercent(stats.accuracy)}</strong>
                </div>
                <p class="summary-errors">${escapeHtml(wrongLabel)}</p>
                <div class="summary-exam-actions">
                  <button class="summary-action" type="button" data-summary-open-review="${exam.id}">
                    Abrir revisao desta prova
                  </button>
                  <button class="summary-action" type="button" data-summary-reset-exam="${exam.id}" ${
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
        <button class="summary-action" type="button" data-summary-action="review">
          Revisar desde a primeira questao
        </button>
        <button class="primary-button" type="button" data-summary-action="restart">Reiniciar</button>
      </div>
    `;

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

        if (action === 'restart') {
          this.store.restart();
        }

        this.render();
      });
    });
  }
}
