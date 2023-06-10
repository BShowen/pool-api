import mongoose from "mongoose";
export default {
  Query: {
    serviceRouteList: async (_, __, context) => {
      const companyId = new mongoose.Types.ObjectId(context.user.c_id);
      const data = await context.models.CustomerAccount.aggregate([
        { $match: { companyId } },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "technician",
          },
        },
        {
          $group: {
            _id: {
              $mergeObjects: {
                $arrayElemAt: ["$technician", 0],
              },
            },
            customerAccounts: { $push: "$$ROOT" },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            technician: {
              $mergeObjects: "$_id",
            },
            customerAccounts: 1,
            count: 1,
          },
        },
        { $sort: { "technician.firstName": 1 } },
      ]);
      return data;
    },
    serviceRouteListGrouped: async (_, __, context) => {
      const { user, models } = context;

      user.authenticateAndAuthorize({ role: "TECH" });

      const routes = await models.CustomerAccount.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(user.u_id),
            companyId: new mongoose.Types.ObjectId(user.c_id),
          },
        },
        {
          $group: {
            _id: "$serviceDay",
            customerAccounts: { $push: "$$ROOT" },
            total: { $sum: "$price" },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            serviceDay: "$_id",
            customerAccounts: 1,
            total: 1,
            count: 1,
          },
        },
      ]);
      return routes;
    },
    getServiceRoute: async (_, __, context) => {
      const { user, models } = context;
      const formatter = new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
      });
      // today = "06/07/2023" or "01/13/2023" etc
      const today = formatter.format(new Date()).toLowerCase();

      user.authenticateAndAuthorize({ role: "TECH" });

      // Get all customers
      // where serviceDay === today
      // where technicianId === technicianId
      const customerAccounts = await models.CustomerAccount.find({
        // serviceDay: "wednesday" or "sunday" or "friday" etc.
        serviceDay: new Intl.DateTimeFormat([], { weekday: "long" })
          .format() //This formats today's date.
          .toLowerCase(),
        userId: user.u_id,
      });
      // Filter the results and remove all customers where
      // customerAccount.poolReport.date === todaysDate
      const filtered = customerAccounts.filter((customerAccount) => {
        // Get the most recent pool report.
        const poolReport =
          customerAccount.poolReports[customerAccount.poolReports.length - 1];
        // No pool report, keep this customer. We need to create a pool report
        if (!poolReport) return true;

        // There is a pool report. If the date on the pool report is todays date
        // then we don't want to keep this customer as they have already been
        // serviced today.
        const poolReportDate = formatter.format(poolReport.date);
        if (poolReportDate === today) {
          return false; //Remove this customer
        } else {
          return true; //Keep this customer
        }
      });

      const technician = await models.User.findOne({ _id: user.u_id });
      const count = customerAccounts.length;

      return {
        customerAccounts: filtered,
        technician,
        count,
      };
    },
  },
  ServiceRouteGrouped: {
    total: (parent) => {
      return Number.parseFloat(parent.total).toFixed(2);
    },
  },
};
