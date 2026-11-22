// Pure grading logic: no database, so it is easy to test.

// Saves and submissions are still accepted this long after the deadline (network delay).
export const GRACE_MS = 60 * 1000;

// answers looks like { questionId: chosenOptionIndex }.
export function grade(questions, answers) {
  let score = 0;
  let totalMarks = 0;
  let correctCount = 0;
  for (const question of questions) {
    totalMarks += question.marks;
    if (answers[question.questionId] === question.correctOptionIndex) {
      score += question.marks;
      correctCount++;
    }
  }
  return { score, totalMarks, correctCount, questionCount: questions.length };
}

// An attempt is expired when it is still in progress after deadline + grace.
export function isExpired(attempt, now = Date.now()) {
  return attempt.status === 'IN_PROGRESS' && now > Date.parse(attempt.deadline) + GRACE_MS;
}

// Keep only answers for this quiz's questions that are whole numbers.
export function cleanAnswers(answers, questions) {
  const clean = {};
  if (!answers || typeof answers !== 'object') return clean;
  for (const question of questions) {
    const value = answers[question.questionId];
    if (Number.isInteger(value) && value >= 0) clean[question.questionId] = value;
  }
  return clean;
}
