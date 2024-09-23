class ForbiddenError extends Error {
  constructor(info, errors) {
    super("Forbidden error");
    this.name = "ForbiddenError";
    this.info = info;
    this.errors = errors;
    this.status = 403;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ForbiddenError;
