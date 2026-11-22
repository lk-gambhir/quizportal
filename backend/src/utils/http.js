// Turning Lambda events into input, and results or errors into HTTP responses.
import { HttpError } from './HttpError.js';

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*', // CORS: the website is on a different domain than the API
};

export function parseBody(rawBody) {
  if (!rawBody) return {};
  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Request body must be valid JSON');
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Request body must be a JSON object');
  }
  return body;
}

export function successResponse(data) {
  if (data === undefined) return { statusCode: 204, headers: HEADERS, body: '' };
  return { statusCode: 200, headers: HEADERS, body: JSON.stringify(data) };
}

export function errorResponse(err) {
  if (err instanceof HttpError) {
    return { statusCode: err.status, headers: HEADERS, body: JSON.stringify({ error: { code: err.code, message: err.message } }) };
  }
  // Unexpected error: full details go to CloudWatch, the user only sees a generic message.
  console.error(err);
  return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } }) };
}
