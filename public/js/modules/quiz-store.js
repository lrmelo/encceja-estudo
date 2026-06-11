const STORAGE_KEY = 'encceja-2020-progress-v2';
const LEGACY_STORAGE_KEY = 'encceja-2020-progress-v1';

const VIEW_QUIZ = 'quiz';
const VIEW_EXAM_REVIEW = 'exam-review';
const VIEW_FINAL_SUMMARY = 'final-summary';

export const CORRECTION_MODE_IMMEDIATE = 'immediate';
export const CORRECTION_MODE_EXAM_END = 'exam-end';

function createEmptyAnswerRecord() {
  return {
    selected: '',
    confirmed: false,
    isCorrect: false,
    revealed: false,
  };
}

function buildInitialAnswers(questions) {
  return Object.fromEntries(
    questions.map((question) => [
      question.id,
      createEmptyAnswerRecord(),
    ])
  );
}

function clampIndex(index, max) {
  return Math.max(0, Math.min(index, max));
}

function normalizeView(view) {
  if ([VIEW_QUIZ, VIEW_EXAM_REVIEW, VIEW_FINAL_SUMMARY].includes(view)) {
    return view;
  }

  return VIEW_QUIZ;
}

export class QuizStore {
  constructor(payload) {
    this.payload = payload;
    this.exams = payload.exams;
    this.questions = this.exams.flatMap((exam) =>
      exam.questions.map((question) => ({
        ...question,
        examId: exam.id,
        examTitle: exam.title,
        examShortTitle: exam.shortTitle,
      }))
    );

    this.questionById = new Map(this.questions.map((question) => [question.id, question]));
    this.questionIndexById = new Map(this.questions.map((question, index) => [question.id, index]));
    this.examById = new Map(this.exams.map((exam) => [exam.id, exam]));
    this.notice = null;
    this.state = this.loadState();
  }

  createInitialState() {
    return {
      currentIndex: 0,
      currentView: VIEW_QUIZ,
      reviewExamId: null,
      correctionMode: CORRECTION_MODE_EXAM_END,
      answers: buildInitialAnswers(this.questions),
    };
  }

  loadState() {
    const fallback = this.createInitialState();

    try {
      const rawState =
        window.localStorage.getItem(STORAGE_KEY) || window.localStorage.getItem(LEGACY_STORAGE_KEY);

      if (!rawState) {
        return fallback;
      }

      const parsedState = JSON.parse(rawState);
      const answers = buildInitialAnswers(this.questions);

      for (const question of this.questions) {
        const saved = parsedState.answers?.[question.id];
        if (!saved) {
          continue;
        }

        answers[question.id] = {
          selected: saved.selected || '',
          confirmed: Boolean(saved.confirmed),
          isCorrect: Boolean(saved.isCorrect),
          // Old sessions used immediate feedback only, so confirmed answers were already visible.
          revealed:
            'revealed' in saved ? Boolean(saved.revealed) : Boolean(saved.confirmed),
        };
      }

      const correctionMode =
        parsedState.correctionMode === CORRECTION_MODE_EXAM_END
          ? CORRECTION_MODE_EXAM_END
          : parsedState.correctionMode === CORRECTION_MODE_IMMEDIATE
            ? CORRECTION_MODE_IMMEDIATE
            : CORRECTION_MODE_EXAM_END;

      const currentView = normalizeView(
        parsedState.currentView || (parsedState.summaryVisible ? VIEW_FINAL_SUMMARY : VIEW_QUIZ)
      );

      const reviewExamId = this.examById.has(parsedState.reviewExamId)
        ? parsedState.reviewExamId
        : null;

      return {
        currentIndex: clampIndex(Number(parsedState.currentIndex) || 0, this.questions.length - 1),
        currentView: currentView === VIEW_EXAM_REVIEW && !reviewExamId ? VIEW_QUIZ : currentView,
        reviewExamId: currentView === VIEW_EXAM_REVIEW ? reviewExamId : null,
        correctionMode,
        answers,
      };
    } catch {
      return fallback;
    }
  }

  save() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  }

  setNotice(message, type = 'info') {
    this.notice = { message, type };
  }

  clearNotice() {
    this.notice = null;
  }

  getNotice() {
    return this.notice;
  }

  getCurrentQuestion() {
    return this.questions[this.state.currentIndex];
  }

  getQuestionById(questionId) {
    return this.questionById.get(questionId);
  }

  getQuestionRecord(questionId) {
    return this.state.answers[questionId];
  }

  getCurrentRecord() {
    return this.getQuestionRecord(this.getCurrentQuestion().id);
  }

  getCurrentExam() {
    return this.examById.get(this.getCurrentQuestion().examId);
  }

  getCurrentExamQuestions() {
    return this.getExamQuestions(this.getCurrentQuestion().examId);
  }

  getExamQuestions(examId) {
    return this.questions.filter((question) => question.examId === examId);
  }

  getFirstQuestionIndexOfExam(examId) {
    return this.questions.findIndex((question) => question.examId === examId);
  }

  getFirstUnconfirmedQuestionIndexInExam(examId) {
    return this.getExamQuestions(examId).reduce((foundIndex, question) => {
      if (foundIndex !== -1) {
        return foundIndex;
      }

      return this.getQuestionRecord(question.id).confirmed ? -1 : this.questionIndexById.get(question.id);
    }, -1);
  }

  getUnconfirmedCountForExam(examId) {
    return this.getExamQuestions(examId).filter(
      (question) => !this.getQuestionRecord(question.id).confirmed
    ).length;
  }

  hasExamProgress(examId) {
    return this.getExamQuestions(examId).some((question) => {
      const record = this.getQuestionRecord(question.id);
      return Boolean(record.selected) || record.confirmed;
    });
  }

  getNextExamId(examId) {
    const examIndex = this.exams.findIndex((exam) => exam.id === examId);
    return this.exams[examIndex + 1]?.id || null;
  }

  getReviewExam() {
    return this.state.reviewExamId ? this.examById.get(this.state.reviewExamId) : null;
  }

  isImmediateMode() {
    return this.state.correctionMode === CORRECTION_MODE_IMMEDIATE;
  }

  hasPendingResults() {
    return this.questions.some((question) => {
      const record = this.getQuestionRecord(question.id);
      return record.confirmed && !record.revealed;
    });
  }

  isQuestionRevealed(questionOrId) {
    const questionId = typeof questionOrId === 'string' ? questionOrId : questionOrId.id;
    return this.getQuestionRecord(questionId).revealed;
  }

  isExamFullyRevealed(examId) {
    return this.getExamQuestions(examId).every((question) => {
      const record = this.getQuestionRecord(question.id);
      return !record.confirmed || record.revealed;
    });
  }

  isCurrentQuestionLast() {
    return this.state.currentIndex === this.questions.length - 1;
  }

  isLastQuestionOfExam(question = this.getCurrentQuestion()) {
    const nextQuestion = this.questions[this.questionIndexById.get(question.id) + 1];
    return !nextQuestion || nextQuestion.examId !== question.examId;
  }

  shouldOpenExamReviewOnNext() {
    const question = this.getCurrentQuestion();
    return (
      this.state.correctionMode === CORRECTION_MODE_EXAM_END &&
      this.isLastQuestionOfExam(question) &&
      !this.isExamFullyRevealed(question.examId)
    );
  }

  revealAllConfirmedAnswers() {
    for (const question of this.questions) {
      const record = this.getQuestionRecord(question.id);
      if (record.confirmed) {
        record.revealed = true;
      }
    }
  }

  revealExamResults(examId) {
    for (const question of this.getExamQuestions(examId)) {
      const record = this.getQuestionRecord(question.id);
      if (record.confirmed) {
        record.revealed = true;
      }
    }
  }

  setCorrectionMode(mode) {
    if (![CORRECTION_MODE_IMMEDIATE, CORRECTION_MODE_EXAM_END].includes(mode)) {
      return;
    }

    if (this.state.correctionMode === mode) {
      return;
    }

    this.state.correctionMode = mode;

    if (mode === CORRECTION_MODE_IMMEDIATE) {
      this.revealAllConfirmedAnswers();
    }

    this.save();
  }

  selectOption(optionId) {
    const question = this.getCurrentQuestion();
    const record = this.getQuestionRecord(question.id);

    if (record.confirmed) {
      return;
    }

    this.clearNotice();
    record.selected = optionId;
    this.save();
  }

  confirmCurrentAnswer() {
    const question = this.getCurrentQuestion();
    const record = this.getQuestionRecord(question.id);

    if (!record.selected || record.confirmed) {
      return false;
    }

    this.clearNotice();
    record.confirmed = true;
    record.isCorrect = record.selected === question.answer;
    record.revealed = this.state.correctionMode === CORRECTION_MODE_IMMEDIATE;
    this.save();

    return true;
  }

  goToQuestion(index) {
    this.clearNotice();
    this.state.currentIndex = clampIndex(index, this.questions.length - 1);
    this.state.currentView = VIEW_QUIZ;
    this.state.reviewExamId = null;
    this.save();
  }

  goToQuestionById(questionId) {
    const index = this.questionIndexById.get(questionId);
    if (index !== undefined) {
      this.goToQuestion(index);
    }
  }

  goToFirstQuestionOfExam(examId) {
    const index = this.getFirstQuestionIndexOfExam(examId);
    if (index >= 0) {
      this.goToQuestion(index);
    }
  }

  previous() {
    this.goToQuestion(this.state.currentIndex - 1);
  }

  openExamReview(examId) {
    this.clearNotice();
    this.revealExamResults(examId);
    this.state.currentView = VIEW_EXAM_REVIEW;
    this.state.reviewExamId = examId;
    this.save();
  }

  openFinalSummary() {
    this.clearNotice();
    this.revealAllConfirmedAnswers();
    this.state.currentView = VIEW_FINAL_SUMMARY;
    this.state.reviewExamId = null;
    this.save();
  }

  next() {
    this.clearNotice();
    const currentQuestion = this.getCurrentQuestion();
    const currentExamId = currentQuestion.examId;

    if (this.isLastQuestionOfExam(currentQuestion)) {
      const unconfirmedCount = this.getUnconfirmedCountForExam(currentExamId);

      if (unconfirmedCount > 0) {
        const firstUnconfirmedIndex = this.getFirstUnconfirmedQuestionIndexInExam(currentExamId);
        if (firstUnconfirmedIndex >= 0) {
          this.goToQuestion(firstUnconfirmedIndex);
          this.setNotice(
            `Faltam ${unconfirmedCount} questoes desta prova para finalizar. Complete essas respostas antes de ver o gabarito.`,
            'warning'
          );
        }

        return { type: 'exam-incomplete', remaining: unconfirmedCount };
      }

      if (this.shouldOpenExamReviewOnNext()) {
        this.openExamReview(currentExamId);
        return { type: 'exam-review', examId: currentExamId };
      }
    }

    if (this.isCurrentQuestionLast()) {
      this.openFinalSummary();
      return { type: 'final-summary' };
    }

    this.goToQuestion(this.state.currentIndex + 1);
    return { type: 'next-question' };
  }

  continueAfterExamReview() {
    const examId = this.state.reviewExamId;
    const nextExamId = this.getNextExamId(examId);

    if (nextExamId) {
      this.goToFirstQuestionOfExam(nextExamId);
      return;
    }

    this.openFinalSummary();
  }

  closeSummary() {
    this.clearNotice();
    this.state.currentView = VIEW_QUIZ;
    this.state.reviewExamId = null;
    this.save();
  }

  restart() {
    this.clearNotice();
    this.state = this.createInitialState();
    this.save();
  }

  resetExam(examId) {
    this.clearNotice();

    for (const question of this.getExamQuestions(examId)) {
      this.state.answers[question.id] = createEmptyAnswerRecord();
    }

    const firstQuestionIndex = this.getFirstQuestionIndexOfExam(examId);
    this.state.currentIndex = firstQuestionIndex >= 0 ? firstQuestionIndex : 0;
    this.state.currentView = VIEW_QUIZ;
    this.state.reviewExamId = null;

    const exam = this.examById.get(examId);
    this.setNotice(`Prova ${exam.shortTitle} reiniciada. Voce pode responder novamente desde a primeira questao.`, 'info');
    this.save();
  }

  isExamReviewVisible() {
    return this.state.currentView === VIEW_EXAM_REVIEW;
  }

  isFinalSummaryVisible() {
    return this.state.currentView === VIEW_FINAL_SUMMARY;
  }

  getAnsweredCount() {
    return this.questions.filter((question) => this.getQuestionRecord(question.id).confirmed).length;
  }

  getVisibleAnsweredCount() {
    return this.questions.filter((question) => {
      const record = this.getQuestionRecord(question.id);
      return record.confirmed && record.revealed;
    }).length;
  }

  getCorrectCount() {
    return this.questions.filter((question) => {
      const record = this.getQuestionRecord(question.id);
      return record.confirmed && record.revealed && record.isCorrect;
    }).length;
  }

  getAccuracyRate() {
    const visibleAnswered = this.getVisibleAnsweredCount();
    if (!visibleAnswered) {
      return 0;
    }

    return Math.round((this.getCorrectCount() / visibleAnswered) * 100);
  }

  getExamStats(examId) {
    const detailedQuestions = this.getExamQuestions(examId).map((question) => ({
      ...question,
      record: this.getQuestionRecord(question.id),
    }));

    const answered = detailedQuestions.filter((entry) => entry.record.confirmed).length;
    const revealedAnswered = detailedQuestions.filter(
      (entry) => entry.record.confirmed && entry.record.revealed
    ).length;
    const correct = detailedQuestions.filter(
      (entry) => entry.record.confirmed && entry.record.revealed && entry.record.isCorrect
    ).length;
    const wrongQuestions = detailedQuestions.filter(
      (entry) => entry.record.confirmed && entry.record.revealed && !entry.record.isCorrect
    );

    return {
      answered,
      revealedAnswered,
      correct,
      total: detailedQuestions.length,
      unansweredCount: detailedQuestions.length - answered,
      accuracy: revealedAnswered ? Math.round((correct / revealedAnswered) * 100) : 0,
      wrongNumbers: wrongQuestions.map((entry) => entry.number),
      pendingReview: answered > revealedAnswered,
    };
  }

  getQuestionStatus(question) {
    const record = this.getQuestionRecord(question.id);

    if (!record.confirmed) {
      return 'unanswered';
    }

    if (!record.revealed) {
      return 'pending';
    }

    return record.isCorrect ? 'correct' : 'wrong';
  }
}
