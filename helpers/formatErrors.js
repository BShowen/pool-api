/**
 * Extract the message from a mongoose validation error or from an Error.
 * Return a list of errors with each error in the format
 * {message: <error message>}
 */
module.exports = function formatErrors(errorObj) {
  const errorMessageList = [];
  if (errorObj.name === "ValidationError") {
    const errors = errorObj.errors;
    for (const key in errors) {
      errorMessageList.push({
        message: errors[key].message,
      });
    }
  } else {
    errorMessageList.push({ message: errorObj.message });
  }
  return errorMessageList;
};
