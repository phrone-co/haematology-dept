class UnauthorizedError extends Error {
  constructor(info, errors) {
    super("AUthorization Failed");
    this.name = "UnauthorizedError";
    this.info = info;
    this.errors = errors;
    this.status = 401;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = UnauthorizedError;
