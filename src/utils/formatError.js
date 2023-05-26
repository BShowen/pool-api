import { GraphQLError } from "graphql";
import { ERROR_CODES } from "./ERROR_CODES.js";
export function formatError(error) {
  if (error.extensions?.code === ERROR_CODES.MONGOOSE_VALIDATION_ERROR) {
    // Extract the invalid fields along with their error messages.
    const fields = Object.fromEntries(
      error.message
        .slice(error.message.indexOf(":") + 1)
        .trim()
        .split(", ")
        .map((msg) => msg.split(": "))
    );
    return new GraphQLError(error.extensions.code, {
      extensions: { fields },
    });
  }
  return error;
}
