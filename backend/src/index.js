// Lambda entry points. The same code is deployed as two functions (see template.yaml):
//   quiz-portal-student → studentHandler    quiz-portal-admin → adminHandler
// Each function has its own IAM role, so the student one cannot change quizzes even if our code had a bug.
//
// Flow: API Gateway (checks login token) → handler → routes → controller → model → DynamoDB
import { studentRoutes } from './routes/student.js';
import { adminRoutes } from './routes/admin.js';
import { getUser } from './utils/auth.js';
import { parseBody, successResponse, errorResponse } from './utils/http.js';
import { HttpError } from './utils/HttpError.js';

export const studentHandler = (event) => handle(event, studentRoutes, false);
export const adminHandler = (event) => handle(event, adminRoutes, true);

async function handle(event, routes, adminOnly) {
  const startedAt = Date.now();
  const routeKey = `${event.httpMethod} ${event.resource}`; // e.g. "POST /quizzes/{quizId}/start"
  const user = getUser(event);

  let response;
  try {
    const controller = routes[routeKey];
    if (!controller) throw new HttpError(404, 'NOT_FOUND', 'Route not found');
    if (adminOnly && !user.isAdmin) throw new HttpError(403, 'FORBIDDEN', 'Only admins can do this');

    const data = await controller({ user, params: event.pathParameters ?? {}, body: parseBody(event.body) });
    response = successResponse(data);
  } catch (err) {
    response = errorResponse(err);
  }

  // One log line per request (never log tokens or passwords).
  console.log({ route: routeKey, userId: user.sub, status: response.statusCode, ms: Date.now() - startedAt });
  return response;
}
