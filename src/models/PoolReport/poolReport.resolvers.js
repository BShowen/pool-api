// npm modules
import { GraphQLError } from "graphql";

import { validateMongooseId } from "../../utils/validateMongooseId.js";
import mongoose from "mongoose";

export default {
  Mutation: {
    createChemicalLog: async (_, { input }, { user, models }) => {
      // Verify the user is logged in and authorized to make pool reports.
      user.authenticateAndAuthorize({ role: "MANAGER" });
      // Validate the customerAccountId.
      const { customerAccountId } = input;
      validateMongooseId([customerAccountId]);

      const { PoolReport, CustomerAccount } = models;
      try {
        // Verify that the ID belongs to a customerAccount
        const customerAccountExists = await CustomerAccount.exists({
          query: {
            company: new mongoose.Types.ObjectId(user.c_id),
            _id: new mongoose.Types.ObjectId(customerAccountId),
          },
        });
        if (!customerAccountExists) {
          throw new Error(
            `A customer account with ID ${customerAccountId} cannot be found.`
          );
        }
        // Create the pool report.
        const poolReport = new PoolReport(input);
        await poolReport.set({ date: new Date().getTime() });
        // Save the pool report.
        return await poolReport.save();
      } catch (error) {
        throw new GraphQLError(error.message);
      }
    },
  },
};
