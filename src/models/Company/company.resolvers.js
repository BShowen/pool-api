import { GraphQLError } from "graphql";
import bcrypt from "bcrypt";
import signJwt from "../../utils/signJwt.js";

export default {
  Mutation: {
    login: async (_, args, context) => {
      // Get the email and password from request.
      const email = args.email?.toLowerCase();
      const password = args.password;

      // Find the user in the DB.
      const user = await context.models.User.findOne({ emailAddress: email });
      if (!user) {
        throw new GraphQLError("Invalid email.", {
          extensions: {
            code: "INVALID_LOGIN_CREDENTIAL",
            field: "email",
          },
        });
      }

      // Compare passwords.
      if (bcrypt.compareSync(password, user.password)) {
        // Return 200 status with api key if matched
        const apiToken = signJwt(
          {
            u_id: user._id,
            c_id: user.companyId,
            roles: user.roles,
            c_email: email,
          },
          { expiresIn: process.env.JWT_MAX_AGE }
        );
        return apiToken;
      } else {
        throw new GraphQLError("Invalid password.", {
          extensions: {
            code: "INVALID_LOGIN_CREDENTIAL",
            field: "password",
          },
        });
      }
    },
    signUp: async (_, { signUpInput }, context) => {
      // Check to make sure company email isn't in use.
      const companyEmailTaken = await context.models.Company.findOne({
        email: signUpInput.email,
      });
      if (!!companyEmailTaken) {
        throw new GraphQLError("That company email is already in use.");
      }

      // Check to make sure user email isn't in use.
      const userEmailTaken = await context.models.User.findOne({
        emailAddress: signUpInput.owner.emailAddress,
      });
      if (!!userEmailTaken) {
        throw new GraphQLError("That email is already in use.");
      }

      // -----------------------------------------------------------------------
      // Create the User (Business owner)
      signUpInput.owner.roles = signUpInput.owner.roles || ["ADMIN"];
      const owner = await new context.models.User(signUpInput.owner).save();
      // -----------------------------------------------------------------------

      // -----------------------------------------------------------------------
      // Create Company
      signUpInput.owner = owner._id;
      const company = await new context.models.Company(signUpInput).save();
      owner.companyId = company._id;
      await owner.save();
      const apiToken = signJwt(
        {
          u_id: owner._id,
          c_id: company._id,
          roles: company.owner.roles,
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
