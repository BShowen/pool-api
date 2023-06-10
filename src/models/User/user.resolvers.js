import { GraphQLError } from "graphql";
import mongoose from "mongoose";

import sendUserSignupEmail from "../../utils/courier.js";
import { ERROR_CODES } from "../../utils/ERROR_CODES.js";

export default {
  Query: {
    userList: async (_, args, { user, models }) => {
      user.authenticateAndAuthorize({ role: "MANAGER" });
      const filter = args.roles ? args : {};
      filter.companyId = user.c_id;
      const results = await models.User.find(filter);
      return results;
    },
    user: async (_, { userId, registrationSecret }, { user, models }) => {
      if (registrationSecret) {
        const user = await models.User.findOne({
          _id: new mongoose.Types.ObjectId(userId),
          registrationSecret: new mongoose.Types.ObjectId(registrationSecret),
        });
        return user || new GraphQLError("Cannot find that user.");
      } else {
        user.authenticateAndAuthorize({ role: "MANAGER" });
        const result = await models.User.findOne({
          companyId: user.c_id,
          _id: userId,
        });
        return result || null;
      }
    },
  },
  Mutation: {
    newUser: async (_, { user: userInput }, { user, models }) => {
      user.authenticateAndAuthorize({ role: "MANAGER" });
      const alreadyExists = await models.User.countDocuments({
        emailAddress: userInput.emailAddress,
      });
      if (alreadyExists) {
        throw new GraphQLError(ERROR_CODES.INVALID_USER_INPUT, {
          extensions: {
            fields: {
              emailAddress: `A user with "${userInput.emailAddress}" already exists.`,
            },
            code: ERROR_CODES.INVALID_USER_INPUT,
          },
        });
      }
      // Associate the user to the currently logged in company account
      userInput.companyId = user.c_id;
      // Create the user registration secret.
      userInput.registrationSecret = new mongoose.Types.ObjectId();
      // Create and save the new user.
      const newUser = new models.User(userInput);
      await newUser.save();

      // ------------------------------------------------------------
      // Send email confirmation
      // This string is not saved in the DB. It is added to the user
      // object AFTER saving to the DB. The registrationUrl is needed by the
      // sendUserSignupEmail function.
      userInput.registrationUrl += `?q=${newUser._id}-${newUser.registrationSecret}`;
      await sendUserSignupEmail({
        user: userInput,
        companyEmail: userInput.c_email,
      });
      // ------------------------------------------------------------

      return newUser;
    },
    deleteUser: async (_, { userId }, { user, models }) => {
      user.authenticateAndAuthorize({ role: "ADMIN" });

      // Validate the userId
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new GraphQLError("Invalid user id.");
      }

      // Check that user isn't assigned to customer accounts.
      const customerCount = await models.CustomerAccount.find({
        companyId: user.c_id,
        userId: new mongoose.Types.ObjectId(userId),
      }).countDocuments();

      if (customerCount > 0) {
        throw new GraphQLError(
          "You must unassign this user from all customers first."
        );
      }

      // Can't delete company owner
      const company = await models.Company.findOne({ _id: user.c_id });
      if (company.owner.toString() === user.u_id.toString()) {
        throw new GraphQLError("Cannot delete company owner.");
      }

      // Run the deletion query.
      const result = await models.User.deleteOne({ _id: userId });

      if (result.deletedCount > 0) {
        return true;
      } else {
        throw new GraphQLError("A user with that id could not be found.");
      }
    },
    updateUser: async (_, { updateUserInput }, { user, models }) => {
      user.authenticateAndAuthorize({ role: "TECH" });

      // If the user email is changing we need to make sure that the
      // desired email isn't already in use.

      // Query the DB for the old user.
      const oldUser = await models.User.findOne({
        companyId: user.c_id,
        _id: updateUserInput.id,
      });

      oldUser.set(updateUserInput);

      // If email is being changed then see if desired email is currently in use.
      if (oldUser.isModified("emailAddress")) {
        const emailInUse = await models.User.countDocuments({
          emailAddress: updateUserInput.emailAddress,
        });
        if (emailInUse) {
          throw new GraphQLError(ERROR_CODES.INVALID_USER_INPUT, {
            extensions: {
              fields: {
                emailAddress: `A user with "${updateUserInput.emailAddress}" already exists.`,
              },
              code: ERROR_CODES.INVALID_USER_INPUT,
            },
          });
        }
      }

      const savedUser = await oldUser.save();

      return savedUser;
    },
    registerUser: async (_, args, { models }) => {
      const { user: userInput } = args;
      // Make sure the password is provided.
      if (!userInput.password) {
        throw new GraphQLError(ERROR_CODES.MONGOOSE_VALIDATION_ERROR, {
          extensions: {
            code: ERROR_CODES.MONGOOSE_VALIDATION_ERROR,
            fields: { password: "Password is required." },
          },
        });
      }

      // Password has been provided. Proceed with registration.
      const user = await models.User.findOne({
        _id: userInput.id,
        registrationSecret: userInput.registrationSecret,
      });
      // Remove the "registrationSecret".
      userInput.registrationSecret = null;
      // Update the user with provided inputs.
      user.set({ ...userInput });
      // Save the user to the db.
      const registeredUser = await user.save();
      // return the saved user.
      return registeredUser;
    },
  },
  User: {
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
