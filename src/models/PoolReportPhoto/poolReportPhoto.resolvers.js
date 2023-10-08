import mongoose from "mongoose";
export default {
  Query: {
    getPoolReportPhotoUrl: async (_, { input }, { models, user, s3 }) => {
      // Verify the user is logged in and authorized to get a presigned url.
      user.authenticateAndAuthorize({ role: "CUSTOMER" });

      const { awsKey, poolReportId, customerAccountId } = input;
      const { PoolReport } = models;

      try {
        // Find the poolReport by poolReportId, customerAccountId and companyId.
        const poolReport = await PoolReport.findOne({
          _id: new mongoose.Types.ObjectId(poolReportId),
          customerAccountId: new mongoose.Types.ObjectId(customerAccountId),
          companyId: new mongoose.Types.ObjectId(user.c_id),
        }).select(["photo"]);

        // Verify that poolReport.awsKey === args.awsKey
        if (poolReport && poolReport.photo === awsKey) {
          // Return presigned url.
          return await s3.getObject({ key: awsKey });
        } else {
          return "";
        }
      } catch (error) {
        return "";
      }
    },
  },
  Mutation: {
    removePhotoFromAWS: async (_, { input }, { user, s3, models }) => {
      //  Verify use is logged in and authorized to delete an s3 object (image)
      user.authenticateAndAuthorize({ role: "MANAGER" });
      const { awsKey, poolReportId, customerAccountId } = input;
      const { PoolReport } = models;

      try {
        // Find the poolReport by poolReportId, customerAccountId and companyId.
        const poolReport = await PoolReport.findOne({
          _id: new mongoose.Types.ObjectId(poolReportId),
          customerAccountId: new mongoose.Types.ObjectId(customerAccountId),
          companyId: new mongoose.Types.ObjectId(user.c_id),
        });
        console.log({ poolReport });
        // Verify that poolReport.awsKey === args.awsKey
        if (poolReport && poolReport.photo === awsKey) {
          // Delete image from s3
          const response = await s3.deleteObject({ key: awsKey });
          const responseCode = response?.$metadata?.httpStatusCode;
          if (responseCode === 204) {
            // Update mongoose document.
            poolReport.set({ photo: null });
            return !!(await poolReport.save());
          } else {
            throw new Error("Unsuccessful response from AWS-S3", {
              httpStatusCode: responseCode,
            });
          }
        } else {
          return false;
        }
      } catch (error) {
        console.log(
          "Error: poolReportPhoto.Mutation.removePhotoFromAWS",
          error
        );
        throw error;
      }
    },
  },
};
