/**
 * Receive a mongoose validation error list and format them as an array of
 * object literals with the format {message: <mongoose error message>}
 * Returns an array of objects.
 */
module.exports = function formatMongooseErrors(mongooseError) {
  const errors = mongooseError.errors;
  const errorMessageList = [];
  for (const key in errors) {
    errorMessageList.push({
      message: errors[key].message,
    });
  }
  return errorMessageList;
};
