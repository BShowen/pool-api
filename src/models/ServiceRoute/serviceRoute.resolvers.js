import mongoose from "mongoose";
export default {
  Query: {
    getServiceRouteList: async (parent, args, context, info) => {
      const companyId = new mongoose.Types.ObjectId(context.user.c_id);
      const data = await context.models.CustomerAccount.aggregate([
        { $match: { companyId } },
        {
          $lookup: {
            from: "technicians",
            localField: "technicianId",
            foreignField: "_id",
            as: "technician",
          },
        },
        {
          $group: {
            _id: {
              technicianId: { $arrayElemAt: ["$technician._id", 0] },
              firstName: { $arrayElemAt: ["$technician.firstName", 0] },
              lastName: { $arrayElemAt: ["$technician.lastName", 0] },
            },
            customerAccounts: { $push: "$$ROOT" },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            technician: {
              _id: "$_id.technicianId",
              firstName: "$_id.firstName",
              lastName: "$_id.lastName",
            },
            customerAccounts: 1,
            count: 1,
          },
        },
        { $sort: { "technician.firstName": 1 } },
      ]);
      return data;
    },
    getGroupedServiceRoute: async (parent, args, context, info) => {
      const { user, models } = context;
      const { id: technicianId } = args;

      user.authenticateAndAuthorize({ role: "TECH" });

      const routes = await models.CustomerAccount.aggregate([
        {
          $match: {
            technicianId: new mongoose.Types.ObjectId(technicianId),
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
    getServiceRoute: async (parent, args, context, info) => {
      const { user, models } = context;
      const { u_id: userId } = user;
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
        technicianId: userId,
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

      const technician = await models.Technician.findOne({ _id: userId });
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
