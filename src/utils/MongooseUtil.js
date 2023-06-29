import { GraphQLError } from "graphql";
import mongoose from "mongoose";

import { ERROR_CODES } from "./ERROR_CODES.js";
export class MongooseUtil {
  /**
   * Validate a list of mongoose id's.
   * If valid, nothing is returned.
   * If invalid, throws graphQLError.
   */
  static validateMongooseId(mongooseId) {
    if (!Array.isArray(mongooseId)) {
      mongooseId = [mongooseId];
    }
    mongooseId.forEach((id) => {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new GraphQLError(`${id || null} is not a valid id.`);
      }
    });
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
  static formatMongooseError(error) {
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
}
