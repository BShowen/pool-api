export default async (parent, args, context, info) => {
  const { user } = context;
  user.authenticateAndAuthorize({ role: "MANAGER" });
  const results = await context.models.Technician.find();
  return results;
};
