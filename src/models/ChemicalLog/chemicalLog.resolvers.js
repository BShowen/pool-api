// npm modules
import { GraphQLError } from "graphql";

import { validateMongooseId } from "../../utils/validateMongooseId.js";
import mongoose from "mongoose";

export default {
  Query: {
    getChemicalLogList: async (_, __, { user, models }) => {
      // Verify the user is logged in and authorized to make chemical logs.
      user.authenticateAndAuthorize({ role: "TECH" });

      try {
        const { ChemicalLog } = models;
        return await ChemicalLog.find({
          companyId: new mongoose.Types.ObjectId(user.c_id),
        });
      } catch (error) {
        throw new GraphQLError(error.message);
      }
    },
    getChemicalLogListForCustomerAccount: async (
      _,
      { accountId },
      { user, models }
    ) => {
      // Verify the user is logged in and authorized to make chemical logs.
      user.authenticateAndAuthorize({ role: "TECH" });

      // Validate the customerAccountId.
      validateMongooseId(accountId);

      try {
        const { ChemicalLog } = models;
        return await ChemicalLog.find({
          customerAccountId: new mongoose.Types.ObjectId(accountId),
          companyId: new mongoose.Types.ObjectId(user.c_id),
        });
      } catch (error) {
        throw new GraphQLError(error.message);
      }
    },
    getLatestChemicalLogForCustomerAccount: async (
      _,
      { accountId },
      { user, models }
    ) => {
      // Verify the user is logged in and authorized to make chemical logs.
      user.authenticateAndAuthorize({ role: "TECH" });

      // Validate the customerAccountId.
      validateMongooseId(accountId);

      try {
        const { ChemicalLog } = models;
        return await ChemicalLog.findOne({
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
      // Verify the user is logged in and authorized to make chemical logs.
      user.authenticateAndAuthorize({ role: "TECH" });

      // Validate the customerAccountId.
      validateMongooseId(input.customerAccountId);

      try {
        const { ChemicalLog, CustomerAccount } = models;
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
        // Instantiate the chemical log.
        const chemicalLog = new ChemicalLog({
          ...input,
          technician: user.c_id,
        });
        // Set the DateTime on the chemical log.
        // Note: The DateTime is being saved as the server's DateTime. This may
        // present an issue if the timezone of the server and user are different.
        chemicalLog.set({ date: new Date().getTime() });
        // Set the companyId on the chemical log.
        chemicalLog.set({ companyId: user.c_id });
        // Save and return the chemical log.
        return await chemicalLog.save();
      } catch (error) {
        throw new GraphQLError(error.message);
      }
    },
  },
};
