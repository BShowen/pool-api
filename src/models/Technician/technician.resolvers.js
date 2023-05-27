import { GraphQLError } from "graphql";
import mongoose from "mongoose";

import sendTechnicianSignupEmail from "../../utils/courier.js";

export default {
  Query: {
    getTechnicianList: async (parent, args, context, info) => {
      const { user } = context;
      user.authenticateAndAuthorize({ role: "MANAGER" });
      const results = await context.models.Technician.find();
      return results;
    },
    getTechnician: async (_, { id }, { models, user }) => {
      user.authenticateAndAuthorize({ role: "MANAGER" });
      const technician = await models.Technician.findOne({
        companyId: user.c_id,
        _id: id,
      });
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

      // Check that technician isn't assigned to customer accounts.
      const customerCount = await context.models.CustomerAccount.find({
        companyId: user.c_id,
        technicianId: techId,
      }).countDocuments();

      if (customerCount > 0) {
        throw new GraphQLError(
          "You must unassign this technician from all customers first."
        );
      }

      // Run the deletion query.
      const result = await context.models.Technician.deleteOne({ _id: techId });

      if (result.deletedCount > 0) {
        return true;
      } else {
        throw new GraphQLError("A technician with that id could not be found.");
      }
    },
    updateTechnician: async (parent, args, context, info) => {
      const { updateTechnicianInput } = args;
      const { user, models } = context;

      user.authenticateAndAuthorize({ role: "TECH" });

      const technician = await models.Technician.findOne({
        companyId: user.c_id,
        _id: updateTechnicianInput.id,
      });

      technician.set(updateTechnicianInput);

      const savedTechnician = await technician.save();

      return savedTechnician;
    },
  },
};
