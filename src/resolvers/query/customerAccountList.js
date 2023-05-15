export default async (parent, args, context, info) => {
  const { user } = context;
  user.authenticateAndAuthorize({ role: "MANAGER" });
  const results = await context.models.CustomerAccount.find();
  return results;
};

export const fieldResolvers = {
  CustomerAccount: {
    technician: async (parent, args, context, info) => {
      if (!parent.technicianId) {
        return null;
      }

      const technician = await context.models.Technician.findById({
        _id: parent.technicianId,
      });
      return technician;
    },
  },
};
