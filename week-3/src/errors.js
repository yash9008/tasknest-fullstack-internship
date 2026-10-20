export class ApiError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    Object.assign(this, { status, code, fields });
  }
}
export const notFound = () => new ApiError(404, 'NOT_FOUND', 'The requested resource was not found.');
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.parse.failed') error = new ApiError(400, 'INVALID_JSON', 'The request body must be valid JSON.');
  if (error.type === 'entity.too.large') error = new ApiError(413, 'BODY_TOO_LARGE', 'The request body exceeds 16 KB.');
  if (error.type === 'charset.unsupported' || error.type === 'encoding.unsupported') error = new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use UTF-8 JSON without compression.');
  if (error.code === '23505') error = new ApiError(409, 'EMAIL_EXISTS', 'An account with this email already exists.');
  if (!(error instanceof ApiError)) {
    // Never log request bodies, cookies, SQL parameters, or stack traces containing them.
    req.app.locals.logError?.({ requestId: req.id, type: 'UNEXPECTED_ERROR' });
    error = new ApiError(500, 'INTERNAL_ERROR', 'An unexpected server error occurred.');
  }
  res.status(error.status).json({ error: { code: error.code, message: error.message,
    ...(error.fields ? { fields: error.fields } : {}), requestId: req.id } });
}
