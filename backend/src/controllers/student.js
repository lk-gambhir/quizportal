// Student actions: see quizzes, start, save answers, submit, see result.
// Every function receives { user, params, body } and returns data (or throws HttpError).
import * as quizModel from '../models/quiz.js';
import * as questionModel from '../models/question.js';
import * as resultModel from '../models/result.js';
import { finishIfExpired, submitAttempt } from '../services/attempt.js';
import { getImageUrl } from '../services/image.js';
import { GRACE_MS, cleanAnswers, isExpired } from '../utils/grading.js';
import { validateAnswer } from '../utils/validation.js';
import { HttpError } from '../utils/HttpError.js';

const alreadySubmitted = () => new HttpError(409, 'ALREADY_SUBMITTED', 'You have already submitted this quiz');
const notStarted = () => new HttpError(404, 'NOT_FOUND', 'You have not started this quiz');

// GET /quizzes: published quizzes + this student's attempts.
export async function listQuizzes({ user }) {
  const [quizzes, myAttempts] = await Promise.all([quizModel.list(), resultModel.listByUser(user.sub)]);
  const quizById = Object.fromEntries(quizzes.map((quiz) => [quiz.quizId, quiz]));

  const attempts = [];
  for (let attempt of myAttempts) {
    const quiz = quizById[attempt.quizId];
    if (!quiz) continue;
    // The index has no answers, so read the full attempt before auto-submitting it.
    if (isExpired(attempt)) attempt = await finishIfExpired(await resultModel.get(attempt.quizId, user.sub));
    const showScore = quiz.resultsPublished && attempt.status === 'SUBMITTED';
    attempts.push({
      quizId: quiz.quizId,
      title: quiz.title,
      status: attempt.status,
      autoSubmitted: Boolean(attempt.autoSubmitted),
      submittedAt: attempt.submittedAt,
      resultsPublished: Boolean(quiz.resultsPublished),
      score: showScore ? attempt.score : undefined,
      totalMarks: showScore ? attempt.totalMarks : undefined,
    });
  }

  const available = quizzes
    .filter((quiz) => quiz.status === 'PUBLISHED')
    .map(({ quizId, title, description, durationMinutes, questionCount, totalMarks }) =>
      ({ quizId, title, description, durationMinutes, questionCount, totalMarks }));

  return { quizzes: available, attempts };
}

// POST /quizzes/{quizId}/start: start a new attempt, or resume the one in progress.
export async function startQuiz({ user, params }) {
  const quiz = await quizModel.get(params.quizId);
  if (quiz.status === 'DRAFT') throw new HttpError(404, 'NOT_FOUND', 'Quiz not found');

  let attempt = await resultModel.get(quiz.quizId, user.sub);
  if (!attempt) {
    if (quiz.status !== 'PUBLISHED') throw new HttpError(409, 'QUIZ_NOT_OPEN', 'This quiz is closed');
    attempt = newAttempt(quiz, user);
    const created = await resultModel.create(attempt);
    if (!created) attempt = await resultModel.get(quiz.quizId, user.sub); // Start was clicked twice
  }

  const questions = await questionModel.listByQuiz(quiz.quizId);
  attempt = await finishIfExpired(attempt, questions);
  if (attempt.status === 'SUBMITTED') throw alreadySubmitted();

  return {
    quiz: { quizId: quiz.quizId, title: quiz.title, durationMinutes: quiz.durationMinutes },
    deadline: attempt.deadline,
    serverTime: new Date().toISOString(), // lets the browser correct for a wrong local clock
    answers: attempt.answers,
    // correctOptionIndex is deliberately left out.
    questions: await Promise.all(questions.map(async (question) => ({
      questionId: question.questionId,
      text: question.text,
      options: question.options,
      marks: question.marks,
      imageUrl: await getImageUrl(question.imageKey),
    }))),
  };
}

// PUT /quizzes/{quizId}/answers: save one answer as soon as it is clicked.
export async function saveAnswer({ user, params, body }) {
  const { questionId, optionIndex } = validateAnswer(body);
  const cutoff = new Date(Date.now() - GRACE_MS).toISOString();
  const saved = await resultModel.saveAnswer(params.quizId, user.sub, questionId, optionIndex, cutoff);
  if (saved) return { saved: true };

  // Not saved: work out why.
  const attempt = await resultModel.get(params.quizId, user.sub);
  if (!attempt) throw notStarted();
  if (attempt.status === 'SUBMITTED') throw alreadySubmitted();
  throw new HttpError(409, 'TIME_UP', 'Time is up for this quiz');
}

// POST /quizzes/{quizId}/submit: grade the attempt.
export async function submitQuiz({ user, params, body }) {
  const attempt = await resultModel.get(params.quizId, user.sub);
  if (!attempt) throw notStarted();
  if (attempt.status === 'SUBMITTED') throw alreadySubmitted();

  const [quiz, questions] = await Promise.all([quizModel.get(params.quizId), questionModel.listByQuiz(params.quizId)]);
  // Too late: ignore what the browser sent and grade the answers saved before the deadline.
  const late = isExpired(attempt);
  const answers = late ? attempt.answers ?? {} : cleanAnswers(body.answers, questions);
  const submitted = await submitAttempt(attempt, answers, questions, late);
  return resultView(submitted, quiz, questions);
}

// GET /quizzes/{quizId}/result: the student's own result.
export async function getMyResult({ user, params }) {
  let attempt = await resultModel.get(params.quizId, user.sub);
  if (!attempt) throw notStarted();
  attempt = await finishIfExpired(attempt);
  if (attempt.status === 'IN_PROGRESS') return { status: 'IN_PROGRESS' };
  return resultView(attempt, await quizModel.get(params.quizId));
}

// ---------- helpers ----------

function newAttempt(quiz, user) {
  const startedAt = new Date();
  const deadline = new Date(startedAt.getTime() + quiz.durationMinutes * 60 * 1000);
  return {
    quizId: quiz.quizId,
    userId: user.sub,
    // Copied from the login token so the admin results page needs no user lookup.
    studentName: user.name,
    studentEmail: user.email,
    rollNo: user.rollNo,
    status: 'IN_PROGRESS',
    startedAt: startedAt.toISOString(),
    deadline: deadline.toISOString(),
    answers: {},
    totalMarks: quiz.totalMarks,
  };
}

// Score and per-question review are only shown after the admin publishes results.
async function resultView(attempt, quiz, questions) {
  const view = {
    status: attempt.status,
    autoSubmitted: Boolean(attempt.autoSubmitted),
    submittedAt: attempt.submittedAt,
    resultsPublished: Boolean(quiz.resultsPublished),
  };
  if (!quiz.resultsPublished) return view;

  questions ??= await questionModel.listByQuiz(quiz.quizId);
  const review = await Promise.all(questions.map(async (question) => {
    const yourAnswer = attempt.answers?.[question.questionId] ?? null;
    return {
      questionId: question.questionId,
      text: question.text,
      options: question.options,
      imageUrl: await getImageUrl(question.imageKey),
      yourAnswer,
      correctOptionIndex: question.correctOptionIndex,
      marks: question.marks,
      earned: yourAnswer === question.correctOptionIndex ? question.marks : 0,
    };
  }));

  return {
    ...view,
    score: attempt.score,
    totalMarks: attempt.totalMarks,
    correctCount: attempt.correctCount,
    questionCount: attempt.questionCount,
    review,
  };
}
