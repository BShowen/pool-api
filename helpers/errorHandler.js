// local modules
const apiResponse = require("./apiResponse");

module.exports = (err, req, res, next) => {
  if (!Array.isArray(err)) {
    err = [err];
  }

  res.json(apiResponse({ errors: buildErrorList(err) }));
};

function buildErrorList(errList) {
  return errList.reduce((accumulator, err) => {
    return { ...accumulator, ...extractErrorContent(err) };
  }, {});
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
 * Return a single object with the invalid field as the key and the message as
 * the value.
 * For mongoose validation errors that have sub-documents, an array of objects
 * is returned. For example...
 * exampleResponse = {
 *   firstName: "First name is required.",
 *   lastName: "Last name is required.",
 *   vehicles: [
 *     {
 *       "model": "Vehicle model is required",
 *       "color": "Vehicle color is required",
 *     },
 *     {
 *       "model": "Vehicle model is required",
 *       "color": "Vehicle color is required",
 *     }
 *   ]
 * }
 */
function formatMongooseError(err) {
  const errors = err.errors;
  const messageList = [];
  const regex = /\.\d+\./;

  for (const key in errors) {
    messageList.push({ [key]: errors[key].message });
  }

  return messageList.reduce((accumulator, error) => {
    for (const [key, value] of Object.entries(error)) {
      if (regex.test(key)) {
        const [_, index, subKey] = key.split(".");
        accumulator.accountOwners = accumulator.accountOwners || [{}];
        accumulator.accountOwners[index] =
          { ...accumulator.accountOwners[index] } || {};
        accumulator.accountOwners[index][subKey] = value;
        return accumulator;
      }
    }

    return { ...accumulator, ...error };
  }, {});
}
