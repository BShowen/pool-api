// npm modules
import mongoose from "mongoose";
import { GraphQLError } from "graphql";

import sendUserSignupEmail from "../../utils/courier.js";
import { validateMongooseId } from "../../utils/validateMongooseId.js";
import { ValidationError } from "../../utils/ValidationError.js";

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
          companyId: user.c_id,
        });
      }
    },
  },
  Mutation: {
    newTechnician: async (_, { input }, { user, models }) => {
      user.authenticateAndAuthorize({ role: "MANAGER" });
      // Associate the user to the currently logged in company account
      input.company = user.c_id;
      // Create the user registration secret.
      input.registrationSecret = new mongoose.Types.ObjectId();
      // Create and save the new user.
      const technician = new models.Technician(input);
      try {
        await technician.save();
      } catch (error) {
        throw new ValidationError({ error });
      }

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
        throw new ValidationError({ error });
      }
    },
    deleteTechnician: async (_, { technicianId }, { user, models }) => {
      user.authenticateAndAuthorize({ role: "ADMIN" });
      const { Technician, CustomerAccount } = models;
      // Check that technician isn't assigned to customer accounts.
      validateMongooseId([user.c_id, technicianId]);
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
