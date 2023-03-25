/**
 * Extract the message from a mongoose validation error or from an Error.
 * Return a list of errors with each error in the format
 * {message: <error message>}
 */
module.exports = function formatErrors(errorList) {
  if (!Array.isArray(errorList)) {
    errorList = [errorList];
  }
  return errorList
    .map((err) => {
      if (err.name === "ValidationError") {
        const errors = err.errors;
        const mongooseMessages = [];
        for (const key in errors) {
          mongooseMessages.push(errors[key].message);
        }
        return mongooseMessages.join("|");
      } else {
        return err.message;
      }
    })
    .join("|");
};
