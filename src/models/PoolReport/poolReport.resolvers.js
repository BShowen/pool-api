// npm modules
import { GraphQLError } from "graphql";
import { fileTypeStream } from "file-type";
import mongoose from "mongoose";

import { validateMongooseId } from "../../utils/validateMongooseId.js";
import { serverStorage } from "../../utils/serverStorage.js";

export default {
  Query: {
    getPoolReportList: async (_, __, { user, models }) => {
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

        // Instantiate the pool report.
        // Note: The DateTime is being saved as the server's DateTime. This may
        // present an issue if the timezone of the server and user are different.
        // This can be resolved by setting the DateTime on the client.
        const poolReport = new PoolReport({
          ...input,
          date: new Date().getTime(),
          companyId: user.c_id,
          technician: user.u_id,
        });
        await poolReport.save();

        // Get the chemicalLog that belongs to this report.
        await ChemicalLog.findOneAndUpdate(
          {
            _id: new mongoose.Types.ObjectId(input.chemicalLog), //Chemical log id
            companyId: new mongoose.Types.ObjectId(user.c_id),
            customerAccountId: new mongoose.Types.ObjectId(
              input.customerAccountId
            ),
          },
          { $set: { poolReportId: poolReport.id } }
        );

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

        return poolReport;
      } catch (error) {
        console.log(error);
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
        const poolReport =
          (await PoolReport.findOne({
            _id: poolReportId,
            companyId: user.c_id,
          })) ||
          (() => {
            throw new Error(
              "Cannot delete pool report. Pool report not found."
            );
          })();

        // Delete the images associated with the poolReport
        if (poolReport.awsImageKeys && poolReport.awsImageKeys.length > 0) {
          await s3.deleteObjects({ awsKeyList: poolReport.awsImageKeys });
          // const { deleteCountRequested, deleteCountActual } =
          //   await poolReport.deleteImages({
          //     awsKeyList: poolReport.awsImageKeys,
          //   });
          // if (deleteCountRequested != deleteCountActual) {
          //   throw new GraphQLError(
          //     "Delete count requested does not equal delete count actual."
          //   );
          // }
        }

        // Delete the chemicalLog associated with the poolReport.
        if (poolReport.chemicalLog) {
          await ChemicalLog.findOneAndRemove({
            _id: poolReport.chemicalLog.id,
          });
        }

        // Delete the poolReport. This is reached once the images and
        // chemicalLog have successfully been deleted.
        return !!(await PoolReport.findOneAndRemove({
          _id: poolReportId,
          companyId: companyId,
        }));
      } catch (error) {
        console.error(error);
        return false;
      }
    },
  },
  PoolReport: {
    images: async (parent, _, { s3 }, info) => {
      // If the poolReport doesn't have images then no need to continue.
      if (!parent.awsImageKeys) return [];

      // Get the fields that the client requested in the query.
      // fieldSelection can be both ["awsKey", "src"] or one or the other.
      const fieldSelection = info.fieldNodes[0].selectionSet.selections.map(
        (selection) => selection.name.value
      );

      if (fieldSelection.includes("url")) {
        // If the field selection includes "src" then obtain the presigned url.
        try {
          return await s3.getObjects({
            awsKeyList: parent.awsImageKeys,
          });
        } catch (error) {
          console.log(error);
          return [];
        }
      } else {
        // If the src is not requested then return the awsKey.
        // No need to obtain a presigned url from AWS.
        return parent.awsImageKeys.map((key) => ({ key }));
      }
    },
  },
};
