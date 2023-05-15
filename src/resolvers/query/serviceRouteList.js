export default async (parent, args, context, info) => {
  const { user } = context;
  user.authenticateAndAuthorize({ role: "MANAGER" });
  const results = await context.models.Technician.find();
  return results.map((tech) => {
    return { technician: tech };
  });
};

export const fieldResolvers = {
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
