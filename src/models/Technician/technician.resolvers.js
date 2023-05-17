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
      technician.companyId = context.user.c_id;
      technician.registrationSecret = new mongoose.Types.ObjectId();
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
  },
};
