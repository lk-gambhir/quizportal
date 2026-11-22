// Input checks for request bodies. Each throws a 400 error with a clear message.
import { HttpError } from './HttpError.js';

export const MAX_QUESTIONS = 100;

const IMAGE_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

const ALLOWED_STATUS_CHANGES = {
  DRAFT: ['PUBLISHED'],
  PUBLISHED: ['CLOSED'],
  CLOSED: ['PUBLISHED'],
};

export function check(ok, message) {
  if (!ok) throw new HttpError(400, 'VALIDATION_ERROR', message);
}

const isText = (value, min, max) =>
  typeof value === 'string' && value.trim().length >= min && value.trim().length <= max;

const isWholeNumber = (value, min, max) =>
  Number.isInteger(value) && value >= min && value <= max;

// partial = true when editing: only the fields that were sent are checked.
export function validateQuiz(body, partial = false) {
  const quiz = {};
  if (!partial || body.title !== undefined) {
    check(isText(body.title, 3, 120), 'title must be 3-120 characters');
    quiz.title = body.title.trim();
  }
  if (body.description !== undefined) {
    check(isText(body.description, 0, 1000), 'description must be at most 1000 characters');
    quiz.description = body.description.trim();
  } else if (!partial) {
    quiz.description = '';
  }
  if (!partial || body.durationMinutes !== undefined) {
    check(isWholeNumber(body.durationMinutes, 1, 180), 'durationMinutes must be a whole number from 1 to 180');
    quiz.durationMinutes = body.durationMinutes;
  }
  return quiz;
}

export function validateQuestion(body, quizId) {
  check(isText(body.text, 1, 1000), 'text must be 1-1000 characters');
  check(Array.isArray(body.options) && body.options.length >= 2 && body.options.length <= 6, 'options must have 2-6 items');
  check(body.options.every((option) => isText(option, 1, 300)), 'each option must be 1-300 characters');
  check(isWholeNumber(body.correctOptionIndex, 0, body.options.length - 1), 'correctOptionIndex must point to one of the options');
  check(isWholeNumber(body.marks, 1, 10), 'marks must be a whole number from 1 to 10');
  if (body.imageKey != null) {
    // Only accept image keys created by this quiz's upload-url route.
    check(typeof body.imageKey === 'string' && body.imageKey.startsWith(`questions/${quizId}/`) && body.imageKey.length < 200,
      'imageKey must come from this quiz\'s upload-url');
  }
  return {
    text: body.text.trim(),
    options: body.options.map((option) => option.trim()),
    correctOptionIndex: body.correctOptionIndex,
    marks: body.marks,
    imageKey: body.imageKey ?? undefined,
  };
}

export function validateAnswer(body) {
  const { questionId, optionIndex } = body;
  check(typeof questionId === 'string' && questionId.length > 0 && questionId.length <= 100, 'questionId is required');
  check(optionIndex === null || isWholeNumber(optionIndex, 0, 5), 'optionIndex must be a whole number from 0 to 5, or null');
  return { questionId, optionIndex };
}

// Returns the file extension for an allowed image type.
export function validateImageType(contentType) {
  check(IMAGE_TYPES[contentType] !== undefined, 'contentType must be image/png, image/jpeg or image/webp');
  return IMAGE_TYPES[contentType];
}

export function checkStatusChange(from, to) {
  if (!ALLOWED_STATUS_CHANGES[from]?.includes(to)) {
    throw new HttpError(409, 'INVALID_STATUS_CHANGE', `Cannot change status from ${from} to ${to}`);
  }
}
