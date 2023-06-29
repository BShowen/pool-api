import { GraphQLError } from "graphql";
import bcrypt from "bcrypt";

import { ERROR_CODES } from "../../utils/ERROR_CODES.js";
import signJwt from "../../utils/signJwt.js";

export default {
  Mutation: {
    login: async (_, { input }, { models }) => {
      /**
       * Authenticate the user using email and password.
       * Return a JWT if valid.
       * Return error message with reason if not valid.
       */

      const { User } = models;
      const { email, password } = input;

      // Find the user by email. If not found, throw error
      const user = await User.findByEmail({ emailAddress: email });
      if (!user) {
        throw new GraphQLError("Invalid email.", {
          extensions: {
            code: ERROR_CODES.INVALID_LOGIN_CREDENTIAL,
            field: "email",
          },
        });
      }

      // Authenticate the user with the password. Throw error if invalid.
      if (user.authenticate({ password })) {
        return signJwt(
          {
            u_id: user._id,
            c_id: user.company._id,
            roles: user.roles,
            c_email: user.company.email,
          },
          { expiresIn: process.env.JWT_MAX_AGE }
        );
      } else {
        throw new GraphQLError("Invalid password", {
          extensions: {
            code: ERROR_CODES.INVALID_LOGIN_CREDENTIAL,
            field: "password",
          },
        });
      }
    },
    signUp: async (_, { signUpInput }, { models }) => {
      const { Company, User, Technician } = models;
      // Check to make sure company email isn't in use.
      const companyCount = await Company.countDocuments({
        email: signUpInput.email.toLowerCase(),
      });
      if (companyCount > 0) {
        throw new GraphQLError("That company email is already in use.");
      }

      // Check to make sure user email isn't in use.
      const userCount = await User.countDocuments({
        emailAddress: signUpInput.owner.emailAddress.toLowerCase(),
      });
      if (userCount > 0) {
        throw new GraphQLError("That email is already in use.");
      }

      // -----------------------------------------------------------------------
      // Create the User (Business owner)
      const ownerInput = { ...signUpInput.owner, roles: ["ADMIN"] };
      const owner = await new Technician(ownerInput);
      // -----------------------------------------------------------------------

      // -----------------------------------------------------------------------
      // Create Company
      const companyInput = { ...signUpInput, owner: owner._id };
      const company = await new Company(companyInput);
      owner.set({ company: company._id });
      await Promise.all([owner.save(), company.save()]);
      const apiToken = signJwt(
        {
          u_id: owner._id,
          c_id: company._id,
          roles: owner.roles,
          c_email: company.email,
        },
        {
          expiresIn: process.env.JWT_MAX_AGE,
        }
      );
      // -----------------------------------------------------------------------
      return apiToken;
    },
  },
};
