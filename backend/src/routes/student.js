// Routes any logged-in user can call.
// Each key is "METHOD /path" and must match an event in template.yaml.
import * as student from '../controllers/student.js';

export const studentRoutes = {
  'GET /quizzes': student.listQuizzes,
  'POST /quizzes/{quizId}/start': student.startQuiz,
  'PUT /quizzes/{quizId}/answers': student.saveAnswer,
  'POST /quizzes/{quizId}/submit': student.submitQuiz,
  'GET /quizzes/{quizId}/result': student.getMyResult,
};
