// npm modules
import { GraphQLError } from "graphql";

import { validateMongooseId } from "../../utils/validateMongooseId.js";
import mongoose, { Mongoose } from "mongoose";

export default {
  Query: {
    getPoolReportList: async (_, __, { user, models }) => {
      // Verify the user is logged in and authorized to make pool reports.
      user.authenticateAndAuthorize({ role: "TECH" });

      try {
        const { PoolReport } = models;
        return await PoolReport.find({
          companyId: new mongoose.Types.ObjectId(user.c_id),
        });
      } catch (error) {
        throw new GraphQLError(error.message);
      }
    },
    getPoolReportListForCustomerAccount: async (
      _,
      { accountId },
      { user, models }
    ) => {
      // Verify the user is logged in and authorized to make pool reports.
      user.authenticateAndAuthorize({ role: "TECH" });

      // Validate the customerAccountId.
      validateMongooseId(accountId);

      try {
        const { PoolReport } = models;
        return await PoolReport.find({
          customerAccountId: new mongoose.Types.ObjectId(accountId),
          companyId: new mongoose.Types.ObjectId(user.c_id),
        });
      } catch (error) {
        throw new GraphQLError(error.message);
      }
    },
    getLatestPoolReportForCustomerAccount: async (
      _,
      { accountId },
      { user, models }
    ) => {
      // Verify the user is logged in and authorized to make pool reports.
      user.authenticateAndAuthorize({ role: "TECH" });

      // Validate the customerAccountId.
      validateMongooseId(accountId);

      try {
        const { PoolReport } = models;
        return await PoolReport.findOne({
          customerAccountId: new mongoose.Types.ObjectId(accountId),
          companyId: new mongoose.Types.ObjectId(user.c_id),
        }).sort({ date: -1 });
      } catch (error) {
        throw new GraphQLError(error.message);
      }
    },
  },
  Mutation: {
    createChemicalLog: async (_, { input }, { user, models }) => {
      // Verify the user is logged in and authorized to make pool reports.
      user.authenticateAndAuthorize({ role: "TECH" });

      // Validate the customerAccountId.
      validateMongooseId(input.customerAccountId);

      try {
        const { PoolReport, CustomerAccount } = models;
        // Verify that the ID belongs to a customerAccount
        const customerAccountExists = await CustomerAccount.exists({
          query: {
            company: new mongoose.Types.ObjectId(user.c_id),
            _id: new mongoose.Types.ObjectId(input.customerAccountId),
          },
        });
        if (!customerAccountExists) {
          throw new Error(
            `Customer account id "${input.customerAccountId}" is not valid.`
          );
        }
        // Instantiate the pool report.
        const poolReport = new PoolReport(input);
        // Set the DateTime on the pool report.
        // Note: The DateTime is being saved as the server's DateTime. This may
        // present an issue if the timezone of the server and user are different.
        poolReport.set({ date: new Date().getTime() });
        // Set the companyId on the pool report.
        poolReport.set({ companyId: user.c_id });
        // Save and return the pool report.
        return await poolReport.save();
      } catch (error) {
        throw new GraphQLError(error.message);
      }
    },
  },
};
