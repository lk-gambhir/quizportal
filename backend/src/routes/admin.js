// Routes only users in the Cognito "Admin" group can call (checked in index.js).
// Each key is "METHOD /path" and must match an event in template.yaml.
import * as admin from '../controllers/admin.js';

export const adminRoutes = {
  'GET /admin/quizzes': admin.listQuizzes,
  'POST /admin/quizzes': admin.createQuiz,
  'GET /admin/quizzes/{quizId}': admin.getQuiz,
  'PATCH /admin/quizzes/{quizId}': admin.updateQuiz,
  'DELETE /admin/quizzes/{quizId}': admin.deleteQuiz,
  'POST /admin/quizzes/{quizId}/questions': admin.addQuestion,
  'PUT /admin/quizzes/{quizId}/questions/{questionId}': admin.updateQuestion,
  'DELETE /admin/quizzes/{quizId}/questions/{questionId}': admin.deleteQuestion,
  'POST /admin/quizzes/{quizId}/upload-url': admin.getUploadUrl,
  'GET /admin/quizzes/{quizId}/results': admin.getQuizResults,
};
