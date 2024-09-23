const Joi = require("joi");
const ValidationFailedError = require("../errors/ValidationFailedError");

const validateInputs = (schema, minimumFields = 1) => {
  return (req, res, next) => {
    const joiSchema = Joi.object(schema);
    const { error } = joiSchema.validate(req.body, {
      abortEarly: false,
    });

    if (error) {
      const formattedErrors = error.details.reduce((acc, currentError) => {
        acc[currentError.path[0]] = currentError.message.replaceAll('"', "");
        return acc;
      }, {});

      throw new ValidationFailedError("Invalid inputs", formattedErrors);
    }

    next();
  };
};

module.exports = validateInputs;
