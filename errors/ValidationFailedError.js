class ValidationFailedError extends Error {
  constructor(info, errors) {
    super("Validation failed");
    this.name = "ValidationFailedError";
    this.info = info;
    this.errors = errors;
    this.status = 400;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ValidationFailedError;
