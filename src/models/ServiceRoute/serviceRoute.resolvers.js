import mongoose from "mongoose";
export default {
  Query: {
    getServiceRouteList: async (parent, args, context, info) => {
      const { user } = context;
      user.authenticateAndAuthorize({ role: "MANAGER" });
      const results = await context.models.Technician.find();
      return results.map((tech) => {
        return { technician: tech };
      });
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
            customers: { $push: "$$ROOT" },
            total: { $sum: "$price" },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            serviceDay: "$_id",
            customers: 1,
            total: 1,
            count: 1,
          },
        },
      ]);
      return routes;
    },
  },
  ServiceRoute: {
    customers: async (parent, args, context, info) => {
      const technicianId = parent.technician._id;
      const customers = await context.models.CustomerAccount.find({
        technicianId,
      });
      return customers;
    },
  },
};
