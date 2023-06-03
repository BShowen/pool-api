import { GraphQLError } from "graphql";
import mongoose, { model } from "mongoose";

import sendTechnicianSignupEmail from "../../utils/courier.js";
import { ERROR_CODES } from "../../utils/ERROR_CODES.js";

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
    getRegistrationTechnician: async (
      _,
      { id, registrationSecret },
      { models }
    ) => {
      const technician = await models.Technician.findOne({
        _id: new mongoose.Types.ObjectId(id),
        registrationSecret: new mongoose.Types.ObjectId(registrationSecret),
      });
      return technician || new GraphQLError("Cannot find that technician.");
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
        throw new GraphQLError(ERROR_CODES.INVALID_USER_INPUT, {
          extensions: {
            fields: {
              emailAddress: `A technician with "${technician.emailAddress}" already exists.`,
            },
            code: ERROR_CODES.INVALID_USER_INPUT,
          },
        });
      }
      // Associate the technician to the currently logged in company account
      technician.companyId = context.user.c_id;
      // Create the technician registration secret.
      technician.registrationSecret = new mongoose.Types.ObjectId();
      // Create and save the new technician.
      const newTechnician = new context.models.Technician(technician);
      await newTechnician.save();

      // ------------------------------------------------------------
      // Send email confirmation
      // This string is not saved in the DB. It is added to the technician
      // object AFTER saving to the DB. The registrationUrl is needed by the
      // sendTechnicianSignupEmail function.
      technician.registrationUrl += `?q=${newTechnician._id}-${newTechnician.registrationSecret}`;
      console.log({ tech: technician });
      await sendTechnicianSignupEmail({
        technician: technician,
        companyEmail: context.user.c_email,
      });
      // ------------------------------------------------------------

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

      // If the technician email is changing we need to make sure that the
      // desired email isn't already in use.

      // Query the DB for the old technician.
      const oldTechnician = await models.Technician.findOne({
        companyId: user.c_id,
        _id: updateTechnicianInput.id,
      });

      // If email isn't being changed then proceed with the update.
      const isChangingEmail =
        oldTechnician.emailAddress !==
        updateTechnicianInput.emailAddress.toLowerCase();
      // If email is being changed then see if desired email is currently in use.
      if (isChangingEmail) {
        const emailInUse = await context.models.Technician.countDocuments({
          emailAddress: updateTechnicianInput.emailAddress,
        });
        if (emailInUse) {
          throw new GraphQLError(ERROR_CODES.INVALID_USER_INPUT, {
            extensions: {
              fields: {
                emailAddress: `A technician with "${updateTechnicianInput.emailAddress}" already exists.`,
              },
              code: ERROR_CODES.INVALID_USER_INPUT,
            },
          });
        }
      }

      oldTechnician.set(updateTechnicianInput);

      const savedTechnician = await oldTechnician.save();

      return savedTechnician;
    },
    registerTechnician: async (parent, args, context, info) => {
      const { models } = context;
      const { technician: technicianInput } = args;
      // Make sure the password is provided.
      if (!technicianInput.password) {
        throw new GraphQLError(ERROR_CODES.MONGOOSE_VALIDATION_ERROR, {
          extensions: {
            code: ERROR_CODES.MONGOOSE_VALIDATION_ERROR,
            fields: { password: "Password is required." },
          },
        });
      }

      // Password has been provided. Proceed with registration.
      const technician = await models.Technician.findOne({
        _id: technicianInput.id,
        registrationSecret: technicianInput.registrationSecret,
      });
      // Remove the "registrationSecret".
      technicianInput.registrationSecret = null;
      // Update the technician with provided inputs.
      technician.set({ ...technicianInput });
      // Save the technician to the db.
      const registeredTechnician = await technician.save();
      // return the saved technician.
      return registeredTechnician;
    },
  },
  Technician: {
    firstName: (parent) => {
      return parent.firstName ? parent.firstName : "unassigned";
    },
    lastName: (parent) => {
      return parent.lastName ? parent.lastName : "unassigned";
    },
    id: (parent) => {
      const id = parent._id ? new mongoose.Types.ObjectId(parent._id) : null;
      return id;
    },
  },
};
