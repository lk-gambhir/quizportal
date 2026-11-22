// Admin (faculty) actions: manage quizzes and questions, upload images, view and publish results.
// index.js has already checked that the user is in the Admin group.
import { randomUUID } from 'node:crypto';
import * as quizModel from '../models/quiz.js';
import * as questionModel from '../models/question.js';
import * as resultModel from '../models/result.js';
import { finishIfExpired } from '../services/attempt.js';
import { getUploadUrl as signUploadUrl, withImageUrls } from '../services/image.js';
import {
  MAX_QUESTIONS, check, checkStatusChange, validateImageType, validateQuestion, validateQuiz,
} from '../utils/validation.js';
import { HttpError } from '../utils/HttpError.js';

const notDraft = () => new HttpError(409, 'NOT_DRAFT', 'Only draft quizzes can be changed like this');

// Questions can only change while the quiz is a draft, so every student is graded on the same questions.
async function getDraftQuiz(quizId) {
  const quiz = await quizModel.get(quizId);
  if (quiz.status !== 'DRAFT') throw notDraft();
  return quiz;
}

// ---------- Quizzes ----------

// GET /admin/quizzes
export async function listQuizzes() {
  const quizzes = await quizModel.list();
  return { quizzes: quizzes.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) };
}

// POST /admin/quizzes
export async function createQuiz({ user, body }) {
  const now = new Date().toISOString();
  const quiz = {
    quizId: randomUUID(),
    ...validateQuiz(body),
    status: 'DRAFT',
    resultsPublished: false,
    questionCount: 0,
    totalMarks: 0,
    createdBy: user.email,
    createdAt: now,
    updatedAt: now,
  };
  await quizModel.save(quiz);
  return quiz;
}

// GET /admin/quizzes/{quizId}: the quiz with all questions, including correct answers.
export async function getQuiz({ params }) {
  const [quiz, questions] = await Promise.all([quizModel.get(params.quizId), questionModel.listByQuiz(params.quizId)]);
  return { quiz, questions: await withImageUrls(questions) };
}

// PATCH /admin/quizzes/{quizId}: edit details, change status, publish or hide results.
export async function updateQuiz({ params, body }) {
  const quiz = await quizModel.get(params.quizId);
  const changes = validateQuiz(body, true);

  if (changes.durationMinutes !== undefined && quiz.status !== 'DRAFT') throw notDraft();

  if (body.resultsPublished !== undefined) {
    check(typeof body.resultsPublished === 'boolean', 'resultsPublished must be true or false');
    changes.resultsPublished = body.resultsPublished;
  }

  if (body.status !== undefined && body.status !== quiz.status) {
    checkStatusChange(quiz.status, body.status);
    if (quiz.status === 'DRAFT') {
      // Publishing for the first time: questions are now locked, so record the totals.
      const questions = await questionModel.listByQuiz(quiz.quizId);
      if (questions.length === 0) {
        throw new HttpError(409, 'INVALID_STATUS_CHANGE', 'A quiz needs at least one question before publishing');
      }
      changes.questionCount = questions.length;
      changes.totalMarks = questions.reduce((sum, question) => sum + question.marks, 0);
    }
    changes.status = body.status;
  }

  const updated = { ...quiz, ...changes, updatedAt: new Date().toISOString() };
  await quizModel.save(updated);
  return updated;
}

// DELETE /admin/quizzes/{quizId}: drafts only. Students cannot start drafts, so no results are lost.
export async function deleteQuiz({ params }) {
  const quiz = await getDraftQuiz(params.quizId);
  const questions = await questionModel.listByQuiz(quiz.quizId);
  // One at a time to stay inside the table's small free write capacity.
  // ponytail: images stay in S3 (a few KB each); add S3 deletes if storage ever matters.
  for (const question of questions) {
    await questionModel.remove(quiz.quizId, question.questionId);
  }
  await quizModel.remove(quiz.quizId);
}

// ---------- Questions ----------

// POST /admin/quizzes/{quizId}/questions
export async function addQuestion({ params, body }) {
  const quiz = await getDraftQuiz(params.quizId);
  const fields = validateQuestion(body, quiz.quizId);
  const existing = await questionModel.listByQuiz(quiz.quizId);
  check(existing.length < MAX_QUESTIONS, `A quiz can have at most ${MAX_QUESTIONS} questions`);

  const question = { quizId: quiz.quizId, questionId: randomUUID(), ...fields, createdAt: new Date().toISOString() };
  await questionModel.save(question);
  const [withUrl] = await withImageUrls([question]);
  return withUrl;
}

// PUT /admin/quizzes/{quizId}/questions/{questionId}: replace a question.
export async function updateQuestion({ params, body }) {
  const quiz = await getDraftQuiz(params.quizId);
  const existing = await questionModel.get(quiz.quizId, params.questionId);
  const question = {
    quizId: quiz.quizId,
    questionId: existing.questionId,
    createdAt: existing.createdAt, // keeps its position in the list
    ...validateQuestion(body, quiz.quizId),
  };
  await questionModel.save(question);
  const [withUrl] = await withImageUrls([question]);
  return withUrl;
}

// DELETE /admin/quizzes/{quizId}/questions/{questionId}
export async function deleteQuestion({ params }) {
  const quiz = await getDraftQuiz(params.quizId);
  await questionModel.remove(quiz.quizId, params.questionId);
}

// POST /admin/quizzes/{quizId}/upload-url: a 5-minute link to upload one image to S3.
export async function getUploadUrl({ params, body }) {
  const quiz = await getDraftQuiz(params.quizId);
  const extension = validateImageType(body.contentType);
  const imageKey = `questions/${quiz.quizId}/${randomUUID()}.${extension}`;
  return { uploadUrl: await signUploadUrl(imageKey, body.contentType), imageKey };
}

// ---------- Results ----------

// GET /admin/quizzes/{quizId}/results: every attempt, always visible to admins.
export async function getQuizResults({ params }) {
  const [quiz, questions, attempts] = await Promise.all([
    quizModel.get(params.quizId),
    questionModel.listByQuiz(params.quizId),
    resultModel.listByQuiz(params.quizId),
  ]);

  // Auto-submit any attempts whose time ran out (one at a time to stay inside free capacity).
  const results = [];
  for (const attempt of attempts) {
    const { answers, ...row } = await finishIfExpired(attempt, questions); // answers not needed in the table
    results.push(row);
  }

  return {
    quiz: { quizId: quiz.quizId, title: quiz.title, status: quiz.status, totalMarks: quiz.totalMarks, resultsPublished: quiz.resultsPublished },
    results,
  };
}
