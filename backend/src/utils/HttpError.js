// An error that becomes an HTTP response, e.g. new HttpError(404, 'NOT_FOUND', 'Quiz not found').
export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
