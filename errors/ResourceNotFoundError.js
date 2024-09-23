class ResourceNotFoundError extends Error {
  constructor(info, errors) {
    super("AUthorization Failed");
    this.name = "ResourceNotFoundError";
    this.info = info;
    this.errors = errors;
    this.status = 404;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ResourceNotFoundError;
