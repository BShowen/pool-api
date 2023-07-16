import { GraphQLError } from "graphql";

import { ERROR_CODES } from "../../utils/ERROR_CODES.js";
import signJwt from "../../utils/signJwt.js";

import { ValidationError } from "../../utils/ValidationError.js";

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
      const { Company, Technician } = models;

      const validationErrors = new Map();

      const companyInput = { ...signUpInput.company };
      const ownerInput = signUpInput.owner;

      // Validate the company input
      try {
        await Company.validate(
          { input: companyInput },
          { pathsToSkip: ["owner"] }
        );
      } catch (error) {
        validationErrors.set("company", error);
      }

      try {
        await Technician.validate(
          { input: ownerInput },
          { pathsToSkip: ["roles", "company"] }
        );
      } catch (error) {
        validationErrors.set("owner", error);
      }

      if (validationErrors.size > 0) {
        return new ValidationError({ error: validationErrors });
      }

      try {
        // Create the User (Business owner)
        const owner = await new Technician({ ...ownerInput, roles: ["ADMIN"] });
        // Create Company
        const company = await new Company({
          ...companyInput,
          owner: owner._id,
        });
        owner.set({ company: company._id });

        await Promise.allSettled([owner.save(), company.save()]);

        // return the JWT token
        return signJwt(
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
      } catch (error) {
        return new ValidationError({ error });
      }
    },
  },
};
