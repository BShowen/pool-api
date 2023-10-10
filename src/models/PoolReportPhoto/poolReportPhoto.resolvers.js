import mongoose from "mongoose";
import { GraphQLError } from "graphql";
import { validateMongooseId } from "../../utils/validateMongooseId.js";
import { _difference } from "../../utils/lodashCherries.js";

export default {
  Query: {
    getImages: async (_, args, { models, user }) => {
      // Verify the user is logged in and authorized to get a presigned url.
      user.authenticateAndAuthorize({ role: "MANAGER" });

      const { awsKeyList, poolReportId } = args;
      const { PoolReport } = models;

      try {
        validateMongooseId([poolReportId]);
        return (
          await PoolReport.findOne({
            _id: poolReportId,
            companyId: user.c_id,
          }).select(["awsImageKeys"])
        ).getImages({ awsKeyList });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
  Mutation: {
    deleteSomeImages: async (_, { input }, { user, models, s3 }) => {
      //  Verify use is logged in and authorized to delete an s3 object (image)
      user.authenticateAndAuthorize({ role: "MANAGER" });
      const { awsKeyList, poolReportId } = input;
      const { PoolReport } = models;
      const reportNotFoundMessage = "Cannot find pool report to delete images.";
      try {
        validateMongooseId([poolReportId]);

        // Find the poolReport by poolReportId, customerAccountId and companyId.
        // Throw error if not found.
        const poolReport =
          (await PoolReport.findOne({
            _id: new mongoose.Types.ObjectId(poolReportId),
            companyId: new mongoose.Types.ObjectId(user.c_id),
          }).select(["awsImageKeys", "_id", "companyId"])) ||
          (() => {
            throw new GraphQLError(reportNotFoundMessage);
          })();

        // Sanitize the awsKeyList and store only the valid keys
        const validImageKeys = poolReport.validateAwsKeys({ awsKeyList });

        // Delete the images and store the response from aws.
        const s3Response = await s3.deleteObjects({
          awsKeyList: validImageKeys,
        });

        if (s3Response?.$metadata?.httpStatusCode === 200) {
          // update poolReport.awsImageKeys

          // keysDeleted = keys that aws returned as successfully deleted.
          const keysDeleted = (s3Response?.Deleted || []).map(
            (deleteObj) => deleteObj.Key
          );

          // remainingKeys = poolReport.awsImageKeys - keysDeleted
          const remainingKeys = _difference(
            poolReport.awsImageKeys,
            keysDeleted
          );

          if (remainingKeys.length == 0) {
            poolReport.set({ awsImageKeys: null });
          } else {
            poolReport.set({ awsImageKeys: remainingKeys });
          }
          await poolReport.save();
        }

        return {
          deleteCountRequested: awsKeyList.length,
          deleteCountActual: s3Response?.Deleted?.length || 0,
          keysDeleted: (s3Response?.Deleted || []).map(
            (deleteObj) => deleteObj.Key
          ),
          keysNotDeleted: [
            // keysNotDeleted = [(awsKeyList - validIMageKeys) + s3Response.Errors]
            ..._difference(awsKeyList, validImageKeys),
            ...(s3Response?.Errors || []).map((errObj) => errObj.Key),
          ],
        };
      } catch (error) {
        console.log(error);
        if (error.message === reportNotFoundMessage) {
          throw new GraphQLError(
            "Something went wrong. Please try that again."
          );
        } else {
          throw error;
        }
      }
    },
  },
};
