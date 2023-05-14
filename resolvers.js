// Resolvers define how to fetch the types defined in your schema.
// This resolver retrieves books from the "books" array above.
const resolvers = {
  Query: {
    customerAccounts: async (parent, args, context, info) => {
      const results = await context.models.CustomerAccount.find();
      return results;
    },
    technicians: async (parent, args, context, info) => {
      const results = await context.models.Technician.find();
      return results;
    },
    serviceRoutes: async (parent, args, context, info) => {
      const results = await context.models.Technician.find();
      return results.map((tech) => {
        return { technician: tech };
      });
    },
  },
  ServiceRoute: {
    async customers(parent, args, context, info) {
      const technicianId = parent.technician._id;
      const customers = await context.models.CustomerAccount.find({
        technicianId,
      });
      return customers;
    },
  },
  CustomerAccount: {
    async technician(parent, args, context, info) {
      if (!parent.technicianId) {
        null;
      }

      const technician = await context.models.Technician.findById({
        _id: parent.technicianId,
      });
      return technician;
    },
  },
};

export default resolvers;
