// Business logic for finishing an attempt. Used by both the student and admin controllers.
import * as questionModel from '../models/question.js';
import * as resultModel from '../models/result.js';
import { grade, isExpired } from '../utils/grading.js';

// Grade the answers and mark the attempt SUBMITTED. Safe to call twice: the second call
// just returns what the first one saved.
export async function submitAttempt(attempt, answers, questions, autoSubmitted) {
  const scores = grade(questions, answers);
  const updated = await resultModel.markSubmitted(attempt, answers, scores, autoSubmitted);
  return updated ?? resultModel.get(attempt.quizId, attempt.userId);
}

// Auto-submit: if the time ran out and the student never submitted (e.g. closed the browser),
// grade their last saved answers now. Called whenever an attempt is read, so there is no
// scheduled job: the first person to look (student or admin) triggers the grading.
export async function finishIfExpired(attempt, questions) {
  if (!isExpired(attempt)) return attempt;
  questions ??= await questionModel.listByQuiz(attempt.quizId);
  return submitAttempt(attempt, attempt.answers ?? {}, questions, true);
}
