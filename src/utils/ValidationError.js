// npm packages
import { GraphQLError } from "graphql";

// local packages
import { ERROR_CODES } from "./ERROR_CODES.js";

export class ValidationError {
  #error = new GraphQLError(ERROR_CODES.MONGOOSE_VALIDATION_ERROR, {
    extensions: {
      code: ERROR_CODES.MONGOOSE_VALIDATION_ERROR,
    },
  });
  constructor({ error }) {
    if (!error) {
      throw new Error("Error or must be supplied.");
    } else if (error instanceof Map) {
      this.#error.extensions.fields = Object.fromEntries(
        Array.from(error.entries()).map((validationObj) => {
          const [position, validationError] = validationObj;
          if (validationError instanceof Map) {
            return [position, this.#formatMapError({ error: validationError })];
          } else {
            return [
              position,
              this.#formatMongooseError({ error: validationError }),
            ];
          }
        })
      );
    } else {
      this.#error.extensions.fields = this.#formatMongooseError({ error });
    }

    return this.#error;
  }

  /**
   * Extract the message from a mongoose validation error.
   * Return a single object with the invalid field as the key and the message as
   * the value. For example...
   * exampleResponse = {
   *   firstName: "First name is required.",
   *   lastName: "Last name is required.",
   * }
   */
  #formatMongooseError({ error }) {
    // Format ValidationErrors only.
    if (!error.name === "ValidationError") return error;

    const errors = error.errors;
    const messageList = [];

    for (const key in errors) {
      messageList.push({ [key]: errors[key].message });
    }

    return messageList.reduce((accumulator, error) => {
      return { ...accumulator, ...error };
    }, {});
  }

  #formatMapError({ error }) {
    if (!(error instanceof Map)) {
      throw new Error("Error must be instance of Map.");
    }
    const formattedErrors = {};
    for (const [index, err] of error.entries()) {
      formattedErrors[index] = this.#formatMongooseError({ error: err });
    }
    return formattedErrors;
  }
}
