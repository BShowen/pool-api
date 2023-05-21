import { GraphQLError } from "graphql";
import mongoose from "mongoose";

import sendTechnicianSignupEmail from "../../utils/courier.js";

export default {
  Query: {
    technicianList: async (parent, args, context, info) => {
      const { user } = context;
      user.authenticateAndAuthorize({ role: "MANAGER" });
      const results = await context.models.Technician.find();
      return results;
    },
    technician: async (_, { id }, { models, user }) => {
      user.authenticateAndAuthorize({ role: "MANAGER" });
      const technician = await models.Technician.findById(
        new mongoose.Types.ObjectId(id)
      );
      return technician || null;
    },
  },
  Mutation: {
    createNewTechnician: async (parent, args, context, info) => {
      context.user.authenticateAndAuthorize({ role: "MANAGER" });
      const { technician } = args;
      const alreadyExists = await context.models.Technician.countDocuments({
        emailAddress: technician.emailAddress,
      });
      if (alreadyExists) {
        throw new GraphQLError(
          `A technician with "${technician.emailAddress}" already exists.`
        );
      }
      // Associate the technician to the currently logged in company account
      technician.companyId = context.user.c_id;
      // Create the technician registration secret.
      technician.registrationSecret = new mongoose.Types.ObjectId();
      // Create and save the new technician.
      const newTechnician = new context.models.Technician(technician);
      await newTechnician.save();
      // Send email confirmation
      technician.registrationUrl += `?q=${newTechnician._id}-${newTechnician.registrationSecret}`;
      await sendTechnicianSignupEmail({
        technician: technician,
        companyEmail: context.user.c_email,
      });
      return newTechnician;
    },
    deleteTechnician: async (parent, { technicianId }, context, info) => {
      const { user } = context;
      user.authenticateAndAuthorize({ role: "ADMIN" });

      // Validate the technicianId
      if (!mongoose.Types.ObjectId.isValid(technicianId)) {
        throw new GraphQLError("Invalid technician id.");
      }

      // Cast technicianId into mongoose ObjectId
      const techId = new mongoose.Types.ObjectId(technicianId);
      // Run the deletion query.
      const result = await context.models.Technician.deleteOne({ _id: techId });

      if (result.deletedCount > 0) {
        return true;
      } else {
        throw new GraphQLError("A technician with that id could not be found.");
      }
    },
  },
};
