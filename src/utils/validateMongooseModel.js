import { GraphQLError } from "graphql";

import { ERROR_CODES } from "./ERROR_CODES.js";

export function validateMongooseModel(next) {
  const validationError = this.validateSync();
  if (validationError) {
    throw new GraphQLError(ERROR_CODES.MONGOOSE_VALIDATION_ERROR, {
      extensions: {
        code: ERROR_CODES.MONGOOSE_VALIDATION_ERROR,
        fields: formatMongooseError(validationError),
      },
    });
  }
  next();
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
