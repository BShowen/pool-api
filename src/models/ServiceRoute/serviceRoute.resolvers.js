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
  },
  ServiceRouteGrouped: {
    total: (parent) => {
      return Number.parseFloat(parent.total).toFixed(2);
    },
  },
};
