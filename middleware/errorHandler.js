const ValidationFailedError = require("../errors/ValidationFailedError");

const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err instanceof Error) {
    return res
      .status(err.status)
      .json({ type: err.name, info: err.info, error: err.errors });
  }

  console.error(err);
  res.status(500).json({ errors: { general: "An unexpected error occurred" } });
};

module.exports = errorHandler;
