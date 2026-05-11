function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatPercent(value) {
  return `${value}%`;
}

export class QuizUI {
  constructor(store) {
    this.store = store;

    this.elements = {
      accuracyRate: document.querySelector('#accuracy-rate'),
      answeredCount: document.querySelector('#answered-count'),
      closeDialogButton: document.querySelector('#close-dialog-button'),
      confirmButton: document.querySelector('#confirm-button'),
      correctCount: document.querySelector('#correct-count'),
      currentExamLabel: document.querySelector('#current-exam-label'),
      dialog: document.querySelector('#image-dialog'),
      dialogImage: document.querySelector('#dialog-image'),
      dialogTitle: document.querySelector('#dialog-title'),
      examNav: document.querySelector('#exam-nav'),
      feedback: document.querySelector('#feedback'),
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
      summaryView: document.querySelector('#summary-view'),
      zoomButton: document.querySelector('#zoom-button'),
    };
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

  render() {
    this.renderSidebar();

    if (this.store.isSummaryVisible()) {
      this.renderSummary();
      this.elements.quizView.hidden = true;
      this.elements.summaryView.hidden = false;
      return;
    }

    this.elements.quizView.hidden = false;
    this.elements.summaryView.hidden = true;
    this.renderQuestion();
  }

  renderSidebar() {
    const answered = this.store.getAnsweredCount();
    const correct = this.store.getCorrectCount();
    const accuracy = this.store.getAccuracyRate();
    const currentQuestion = this.store.getCurrentQuestion();

    this.elements.answeredCount.textContent = `${answered}/${this.store.questions.length}`;
    this.elements.correctCount.textContent = String(correct);
    this.elements.accuracyRate.textContent = formatPercent(accuracy);
    this.elements.currentExamLabel.textContent = currentQuestion.examShortTitle;

    this.renderExamNav();
    this.renderQuestionMap();
  }

  renderExamNav() {
    const currentExamId = this.store.getCurrentQuestion().examId;

    this.elements.examNav.innerHTML = this.store.exams
      .map((exam) => {
        const stats = this.store.getExamStats(exam.id);
        const classes = ['exam-nav-button'];
        if (exam.id === currentExamId) {
          classes.push('is-active');
        }

        return `
          <button class="${classes.join(' ')}" type="button" data-exam-id="${exam.id}">
            <span class="exam-nav-button-title">${escapeHtml(exam.shortTitle)}</span>
            <span class="exam-nav-button-meta">${stats.answered}/${stats.total} respondidas • ${stats.correct} acertos</span>
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

        if (record.confirmed && record.isCorrect) {
          classes.push('is-correct');
        } else if (record.confirmed && !record.isCorrect) {
          classes.push('is-wrong');
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

    this.elements.questionContext.textContent = `${question.examTitle} • ${this.store.state.currentIndex + 1} de ${this.store.questions.length}`;
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
    if (!record.confirmed) {
      this.elements.feedback.hidden = true;
      this.elements.feedback.className = 'feedback';
      this.elements.feedback.textContent = '';
      return;
    }

    this.elements.feedback.hidden = false;
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

        if (record.confirmed && option.id === question.answer) {
          classes.push('is-correct');
        } else if (record.confirmed && record.selected === option.id && option.id !== question.answer) {
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
    this.elements.nextButton.textContent = this.store.isCurrentQuestionLast() ? 'Ver resumo' : 'Proxima';
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
            const wrongLabel = stats.wrongNumbers.length
              ? `Erros: ${stats.wrongNumbers.join(', ')}`
              : 'Erros: nenhum';

            return `
              <article class="summary-exam">
                <div class="summary-exam-top">
                  <p class="summary-exam-title">${escapeHtml(exam.title)}</p>
                  <strong>${stats.correct}/${stats.total} • ${formatPercent(stats.accuracy)}</strong>
                </div>
                <p class="summary-errors">${wrongLabel}</p>
              </article>
            `;
          })
          .join('')}
      </section>

      <div class="summary-actions">
        <button class="summary-action" type="button" data-summary-action="review">Revisar questoes</button>
        <button class="primary-button" type="button" data-summary-action="restart">Reiniciar</button>
      </div>
    `;

    this.elements.summaryView.querySelectorAll('[data-summary-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.summaryAction;

        if (action === 'review') {
          this.store.closeSummary();
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
