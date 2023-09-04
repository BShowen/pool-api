// npm modules
import { GraphQLError } from "graphql";

import { validateMongooseId } from "../../utils/validateMongooseId.js";
import mongoose, { Mongoose } from "mongoose";

export default {
  Query: {},
  Mutation: {
    createPoolReport: async (_, { input }, { user, models }) => {
      // Verify the user is logged in and authorized to make pool reports.
      user.authenticateAndAuthorize({ role: "TECH" });

      // Validate the customerAccountId.
      validateMongooseId([input.customerAccountId, input.chemicalLog]);

      try {
        const { PoolReport, CustomerAccount, ChemicalLog } = models;

        // Verify that the ID belongs to a customerAccount
        const customerAccountExists = await CustomerAccount.exists({
          query: {
            company: new mongoose.Types.ObjectId(user.c_id),
            _id: new mongoose.Types.ObjectId(input.customerAccountId),
          },
        });
        if (!customerAccountExists) {
          throw new Error(
            `A CustomerAccount with id "${input.customerAccountId}" does not exist.`
          );
        }

        // Verify that the ChemicalLog exists.
        const chemicalLogExists = await ChemicalLog.exists({
          query: {
            companyId: new mongoose.Types.ObjectId(user.c_id),
            _id: new mongoose.Types.ObjectId(input.chemicalLog), //Chemical log ID
          },
        });
        if (!chemicalLogExists) {
          throw new Error(
            `A chemical log with id ${input.chemicalLog} does not exist.`
          );
        }

        // Verify that the ChemicalLog belongs to the CustomerAccount
        const chemicalLogBelongsToCustomerAccount = await ChemicalLog.exists({
          query: {
            companyId: new mongoose.Types.ObjectId(user.c_id),
            _id: new mongoose.Types.ObjectId(input.chemicalLog), //Chemical log id
            customerAccountId: new mongoose.Types.ObjectId(
              input.customerAccountId
            ),
          },
        });
        if (!chemicalLogBelongsToCustomerAccount) {
          throw new Error(
            `Chemical log with id ${input.chemicalLog} does not belong to customer with id ${input.customerAccountId}.`
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
        // Save and the pool report.
        return await poolReport.save();
      } catch (error) {
        throw new GraphQLError(error.message);
      }
    },
  },
};
