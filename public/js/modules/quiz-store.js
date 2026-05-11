const STORAGE_KEY = 'encceja-2020-progress-v1';

function buildInitialAnswers(questions) {
  return Object.fromEntries(
    questions.map((question) => [
      question.id,
      {
        selected: '',
        confirmed: false,
        isCorrect: false,
      },
    ])
  );
}

function clampIndex(index, max) {
  return Math.max(0, Math.min(index, max));
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
    this.examById = new Map(this.exams.map((exam) => [exam.id, exam]));
    this.state = this.loadState();
  }

  createInitialState() {
    return {
      currentIndex: 0,
      summaryVisible: false,
      answers: buildInitialAnswers(this.questions),
    };
  }

  loadState() {
    const fallback = this.createInitialState();

    try {
      const rawState = window.localStorage.getItem(STORAGE_KEY);
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
        };
      }

      return {
        currentIndex: clampIndex(Number(parsedState.currentIndex) || 0, this.questions.length - 1),
        summaryVisible: Boolean(parsedState.summaryVisible),
        answers,
      };
    } catch {
      return fallback;
    }
  }

  save() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  getCurrentQuestion() {
    return this.questions[this.state.currentIndex];
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

  selectOption(optionId) {
    const question = this.getCurrentQuestion();
    const record = this.getQuestionRecord(question.id);

    if (record.confirmed) {
      return;
    }

    record.selected = optionId;
    this.save();
  }

  confirmCurrentAnswer() {
    const question = this.getCurrentQuestion();
    const record = this.getQuestionRecord(question.id);

    if (!record.selected || record.confirmed) {
      return false;
    }

    record.confirmed = true;
    record.isCorrect = record.selected === question.answer;
    this.save();

    return true;
  }

  goToQuestion(index) {
    this.state.currentIndex = clampIndex(index, this.questions.length - 1);
    this.state.summaryVisible = false;
    this.save();
  }

  goToQuestionById(questionId) {
    const index = this.questions.findIndex((question) => question.id === questionId);
    if (index >= 0) {
      this.goToQuestion(index);
    }
  }

  goToFirstQuestionOfExam(examId) {
    const index = this.questions.findIndex((question) => question.examId === examId);
    if (index >= 0) {
      this.goToQuestion(index);
    }
  }

  previous() {
    this.goToQuestion(this.state.currentIndex - 1);
  }

  next() {
    if (this.state.currentIndex >= this.questions.length - 1) {
      this.state.summaryVisible = true;
      this.save();
      return;
    }

    this.goToQuestion(this.state.currentIndex + 1);
  }

  openSummary() {
    this.state.summaryVisible = true;
    this.save();
  }

  closeSummary() {
    this.state.summaryVisible = false;
    this.save();
  }

  restart() {
    this.state = this.createInitialState();
    this.save();
  }

  isSummaryVisible() {
    return this.state.summaryVisible;
  }

  isCurrentQuestionLast() {
    return this.state.currentIndex === this.questions.length - 1;
  }

  getAnsweredCount() {
    return this.questions.filter((question) => this.getQuestionRecord(question.id).confirmed).length;
  }

  getCorrectCount() {
    return this.questions.filter((question) => this.getQuestionRecord(question.id).isCorrect).length;
  }

  getAccuracyRate() {
    const answered = this.getAnsweredCount();
    if (!answered) {
      return 0;
    }

    return Math.round((this.getCorrectCount() / answered) * 100);
  }

  getExamStats(examId) {
    const exam = this.examById.get(examId);
    const detailedQuestions = exam.questions.map((question) => ({
      ...question,
      record: this.getQuestionRecord(question.id),
    }));

    const answered = detailedQuestions.filter((entry) => entry.record.confirmed).length;
    const correct = detailedQuestions.filter((entry) => entry.record.isCorrect).length;
    const wrongQuestions = detailedQuestions.filter(
      (entry) => entry.record.confirmed && !entry.record.isCorrect
    );

    return {
      answered,
      correct,
      total: detailedQuestions.length,
      accuracy: answered ? Math.round((correct / answered) * 100) : 0,
      wrongNumbers: wrongQuestions.map((entry) => entry.number),
    };
  }

  getCurrentExamQuestions() {
    const currentExamId = this.getCurrentQuestion().examId;
    return this.questions.filter((question) => question.examId === currentExamId);
  }
}
