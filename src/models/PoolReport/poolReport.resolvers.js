// npm modules
import { GraphQLError } from "graphql";
import { fileTypeStream } from "file-type";
import mongoose from "mongoose";

import { validateMongooseId } from "../../utils/validateMongooseId.js";
import { serverStorage } from "../../utils/serverStorage.js";

export default {
  Query: {
    getPoolReportList: async (_, __, { user, models, s3 }) => {
      // Verify the user is logged in and authorized to query pool reports.
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
    getPoolReportsByCustomer: async (_, args, { user, models, s3 }) => {
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

      return poolReportList;
    },
    getPoolReport: async (_, args, { user, models, s3 }) => {
      // Verify the user is logged in and authorized to make pool reports.
      user.authenticateAndAuthorize({ role: "TECH" });

      const { poolReportId, customerAccountId } = args;
      // Validate the customerAccountId.
      validateMongooseId(customerAccountId);

      try {
        const { PoolReport } = models;
        const poolReport = await PoolReport.findOne({
          customerAccountId: new mongoose.Types.ObjectId(customerAccountId),
          _id: new mongoose.Types.ObjectId(poolReportId),
          companyId: new mongoose.Types.ObjectId(user.c_id),
        });
        return poolReport;
      } catch (error) {
        console.log({ error });
        throw error;
      }
    },
  },
  Mutation: {
    createPoolReport: async (_, { input }, { user, models, s3 }) => {
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

        if (input?.images?.length > 0) {
          // Make sure the files have a mimeType that start with "image/".
          const validFiles = await serverStorage.validateFiles({
            files: input.images,
            mimeType: "image/", //The mimeType that is allowed.
          });
          // storedFiles is a list of files stored locally in the uploads dir.
          const storedFiles = await serverStorage.storeImagesLocally({
            files: validFiles,
          });
          // Upload the files to s3.
          const awsKeys = await s3.putObjects({ fileList: storedFiles });
          serverStorage.deleteUploadDir();
          // Store the awsKeys in the poolReport model
          poolReport.awsImageKeys = awsKeys;
          await poolReport.save();
        }
        // Set the DateTime on the pool report.
        // Note: The DateTime is being saved as the server's DateTime. This may
        // present an issue if the timezone of the server and user are different.
        // This can be resolved by setting the DateTime on the client.
        poolReport.set({ date: new Date().getTime() });
        // Set the companyId on the pool report.
        poolReport.set({ companyId: user.c_id });
        // Set the technician on the pool report
        poolReport.set({ technician: new mongoose.Types.ObjectId(user.u_id) });
        // Save and the pool report.
        return await poolReport.save();
      } catch (error) {
        throw new GraphQLError(error.message);
      }
    },
    deletePoolReport: async (_, { poolReportId }, { user, models, s3 }) => {
      // Verify the user is logged in and authorized to make pool reports.
      user.authenticateAndAuthorize({ role: "MANAGER" });
      // Validate the customerAccountId.
      validateMongooseId([poolReportId]);
      const { PoolReport, ChemicalLog } = models;
      const companyId = new mongoose.Types.ObjectId(user.c_id);
      try {
        // Get the pool report.
        const poolReport = await PoolReport.findOne({
          _id: poolReportId,
          companyId,
        });
        if (!poolReport) {
          throw new GraphQLError("Cannot find that pool report.");
        }
        // Delete the chemicalLog
        await ChemicalLog.delete({
          id: poolReport.chemicalLog.id,
        });
        // Delete pool report and store deleted report for further processing
        const report = await PoolReport.delete({ companyId, poolReportId });
        // Delete the pool report photo from s3.
        if (report?.photo) {
          await s3.deleteObject({ key: poolReport.photo });
        }
        // If this is reached, the deletion was successful.
        return true;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
  PoolReport: {
    images: async (parent, _, { s3 }, info) => {
      // If the poolReport doesn't have a photo, then no need to continue.
      // Return the awsKey and the src
      if (!parent.photo) return { awsKey: "", src: "" };

      // Get the fields that the client requested in the query.
      // fieldSelection can be both ["awsKey", "src"] or one or the other.
      const fieldSelection = info.fieldNodes[0].selectionSet.selections.map(
        (selection) => selection.name.value
      );

      if (fieldSelection.includes("src")) {
        // If the field selection includes "src" then obtain the presigned url.
        try {
          const presignedUrl = await s3.getObject({ key: parent.photo });
          if (presignedUrl) {
            return { awsKey: parent.photo, src: presignedUrl };
          } else {
            parent.set({ photo: null });
            await parent.save();
            return { awsKey: "", src: "" };
          }
        } catch (error) {
          return "";
        }
      } else {
        // If the src is not requested, then validate and return the awsKey. No
        // need to obtain a presigned url from AWS.
        try {
          if (await s3.validateAwsKey({ key: parent.photo })) {
            return { awsKey: parent.photo };
          } else {
            // That key doesn't exist in the s3 bucket. Remove the key from the doc.
            parent.set({ photo: null });
            await parent.save();
            return "";
          }
        } catch (error) {
          return "";
        }
      }
    },
  },
};
