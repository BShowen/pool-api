// npm modules
import { GraphQLError } from "graphql";
import { fileTypeFromFile } from "file-type";

import { validateMongooseId } from "../../utils/validateMongooseId.js";
import mongoose from "mongoose";
import { serverStorage } from "../../utils/serverStorage.js";
import { s3storage } from "../../utils/s3storage.js";

export default {
  Query: {
    getPoolReportList: async (_, __, { user, models }) => {
      // Verify the user is logged in and authorized to make pool reports.
      user.authenticateAndAuthorize({ role: "MANAGER" });

      const { PoolReport } = models;
      try {
        return await PoolReport.find({
          companyId: new mongoose.Types.ObjectId(user.c_id),
        });
      } catch (error) {
        console.log(error);
        return new GraphQLError(error.message);
      }
    },
    getPoolReportsByCustomer: async (_, args, { user, models }) => {
      // Verify the user is logged in and authorized to make pool reports.
      user.authenticateAndAuthorize({ role: "TECH" });

      const { customerAccountId } = args;
      // Validate the customerAccountId.
      validateMongooseId(customerAccountId);

      const { PoolReport } = models;
      const poolReportList = await PoolReport.find({
        customerAccountId: new mongoose.Types.ObjectId(customerAccountId),
        companyId: new mongoose.Types.ObjectId(user.c_id),
      }).sort({ date: -1 });

      const s3 = s3storage();
      for (const poolReport of poolReportList) {
        const { photo } = poolReport;
        if (photo) {
          const presignedUrl = await s3.getObject({ key: photo });
          if (presignedUrl) {
            poolReport.photo = presignedUrl;
          } else {
            // Update the document and to remove the awsKey as it is stale.
            poolReport.photo = null;
            await poolReport.save();
          }
        }
      }

      return poolReportList;
    },
  },
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
        const poolReport = new PoolReport({ ...input, photo: null });

        if (input.photo) {
          try {
            const storage = serverStorage(input.photo);
            const s3 = s3storage();
            const { storedFileUrl } = await storage.storePhoto();
            const { mime } = await fileTypeFromFile(storedFileUrl);
            if (mime.startsWith("image/")) {
              // upload to s3.
              const { Key } = await s3.putObject({
                filePathUrl: storedFileUrl,
                mime: mime,
              });
              // attach the aws key to the pool report.
              poolReport.photo = Key;
            }
            // Always delete upload dir to reduce server load.
            // Do not await upload.deleteUploadDir in oder to optimize client
            // response time.
            storage.deleteUploadDir();
          } catch (error) {
            console.log({ error });
          }
        }
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
