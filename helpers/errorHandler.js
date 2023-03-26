// local modules
const apiResponse = require("./apiResponse");

module.exports = (err, req, res, next) => {
  if (!Array.isArray(err)) {
    err = [err];
  }

  res.json(apiResponse({ errors: buildErrorList(err) }));
};

function buildErrorList(errList) {
  return errList.map((err) => extractErrorContent(err)).flat();
}

function extractErrorContent(err) {
  switch (err.name) {
    case "ValidationError":
      return formatMongooseError(err);
    case "Error":
      return { message: err.message };
    case "ExtendedError":
      return err.message;
  }
}

/**
 * Extract the message from a mongoose validation error.
 * Return a list of errors in the format...
 * [ {message: <error message>, field: <field name>}, ... ]
 */
function formatMongooseError(err) {
  const errors = err.errors;
  const messageList = [];
  for (const key in errors) {
    messageList.push({ message: errors[key].message, field: key });
  }
  return messageList;
}
