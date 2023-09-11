// npm modules
import { GraphQLError } from "graphql";
import mongoose from "mongoose";

// Local modules
import { ValidationError } from "../../utils/ValidationError.js";

export default {
  Query: {
    getAllServices: async (_, __, { models, user }) => {
      // Verify the user is logged in and authorized to query services.
      user.authenticateAndAuthorize({ role: "ADMIN" });

      const { Service } = models;

      try {
        return await Service.find({
          companyId: new mongoose.Types.ObjectId(user.c_id),
        });
      } catch (error) {
        throw new GraphQLError(error.message);
      }
    },
  },
  Mutation: {
    createNewService: async (_, { input }, { models, user }) => {
      // Verify the user is logged in and authorized to create services.
      user.authenticateAndAuthorize({ role: "ADMIN" });
      const { Service } = models;
      try {
        const newService = new Service({
          ...input,
          companyId: new mongoose.Types.ObjectId(user.c_id),
        });
        return await newService.save();
      } catch (error) {
        if (error.name === "ValidationError") {
          throw new ValidationError({ error });
        } else {
          throw new GraphQLError(error.message);
        }
      }
    },
  },
};
