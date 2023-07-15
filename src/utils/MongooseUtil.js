import { GraphQLError } from "graphql";
import mongoose from "mongoose";
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
}
