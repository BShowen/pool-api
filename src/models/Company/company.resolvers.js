import { GraphQLError } from "graphql";
import bcrypt from "bcrypt";
import signJwt from "../../utils/signJwt.js";

export default {
  Mutation: {
    login: async (parent, args, context, info) => {
      // Get the email and password from request.
      const email = args.email?.toLowerCase();
      const password = args.password;

      // Retrieve just the email and password for the company owner.
      const company = await context.models.Company.findOne({ email });
      if (!company) {
        throw new GraphQLError("Invalid email.");
      }

      // Compare passwords.
      if (bcrypt.compareSync(password, company.owner.password)) {
        // Return 200 status with api key if matched
        const apiToken = signJwt(
          { c_id: company._id, roles: company.owner.roles, c_email: email },
          { expiresIn: process.env.JWT_MAX_AGE }
        );
        return apiToken;
      } else {
        throw new GraphQLError("Invalid password.");
      }
    },
  },
};
