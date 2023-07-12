// npm modules
import mongoose from "mongoose";
import { GraphQLError } from "graphql";

import sendUserSignupEmail from "../../utils/courier.js";
import { ERROR_CODES } from "../../utils/ERROR_CODES.js";
import { MongooseUtil } from "../../utils/MongooseUtil.js";

export default {
  Query: {
    technicianList: async (_, __, { user, models }) => {
      user.authenticateAndAuthorize({ role: "MANAGER" });
      const { Technician } = models;
      return await Technician.getTechnicianList({ companyId: user.c_id });
    },
    technician: async (
      _,
      { technicianId, registrationSecret },
      { user, models }
    ) => {
      const { Technician } = models;
      if (registrationSecret) {
        return await Technician.getRegistrationTechnician({
          registrationSecret,
          technicianId,
        });
      } else {
        user.authenticateAndAuthorize({ role: "MANAGER" });
        return await Technician.getTechnician({
          technicianId,
          companyId: c._id,
        });
      }
    },
  },
  Mutation: {
    newTechnician: async (_, { input }, { user, models }) => {
      user.authenticateAndAuthorize({ role: "MANAGER" });
      const alreadyExists = await models.Technician.countDocuments({
        emailAddress: input.emailAddress,
      });
      if (alreadyExists) {
        throw new GraphQLError(ERROR_CODES.INVALID_USER_INPUT, {
          extensions: {
            fields: {
              emailAddress: `A technician with "${input.emailAddress}" already exists.`,
            },
            code: ERROR_CODES.INVALID_USER_INPUT,
          },
        });
      }
      // Associate the user to the currently logged in company account
      input.company = user.c_id;
      // Create the user registration secret.
      input.registrationSecret = new mongoose.Types.ObjectId();
      // Create and save the new user.
      const technician = new models.Technician(input);
      await technician.save();

      // ------------------------------------------------------------
      // Send email confirmation
      // This string is not saved in the DB. It is added to the user
      // object AFTER saving to the DB. The registrationUrl is needed by the
      // sendUserSignupEmail function.
      input.registrationUrl += `?q=${technician._id}-${technician.registrationSecret}`;
      await sendUserSignupEmail({
        user: input,
        companyEmail: input.c_email,
      });
      // ------------------------------------------------------------

      return technician;
    },
    updateTechnician: async (_, { input }, { user, models }) => {
      user.authenticateAndAuthorize({ role: "TECH" });
      const { Technician } = models;
      try {
        return await Technician.updateTechnician({
          companyId: user.c_id,
          input,
        });
      } catch (error) {
        throw new GraphQLError(ERROR_CODES.MONGOOSE_VALIDATION_ERROR, {
          extensions: {
            code: ERROR_CODES.MONGOOSE_VALIDATION_ERROR,
            fields: MongooseUtil.formatMongooseError(error),
          },
        });
      }
    },
    deleteTechnician: async (_, { technicianId }, { user, models }) => {
      user.authenticateAndAuthorize({ role: "ADMIN" });
      const { Technician, CustomerAccount } = models;
      // Check that technician isn't assigned to customer accounts.
      MongooseUtil.validateMongooseId([user.c_id, technicianId]);
      const exists = await CustomerAccount.exists({
        query: {
          company: new mongoose.Types.ObjectId(user.c_id),
          technician: new mongoose.Types.ObjectId(technicianId),
        },
      });

      if (exists) {
        throw new GraphQLError(
          "You must unassign the technician from all customers first."
        );
      }

      // Delete the technician
      const deletedTechnician = await Technician.deleteTechnician({
        technicianId,
        companyId: user.c_id,
      });

      return (
        deletedTechnician ||
        new GraphQLError("A technician with that id could not be found.")
      );
    },
  },
};
