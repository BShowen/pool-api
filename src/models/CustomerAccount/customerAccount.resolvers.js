export default {
  Query: {
    customerAccountList: async (parent, args, context, info) => {
      const { user } = context;
      user.authenticateAndAuthorize({ role: "MANAGER" });
      const results = await context.models.CustomerAccount.find();
      return results;
    },
  },
  Mutation: {
    createNewCustomerAccount: async (
      parent,
      { customerAccountInput },
      { user, models },
      info
    ) => {
      user.authenticateAndAuthorize({ role: "MANAGER" });

      const { CustomerAccount } = models;

      customerAccountInput.companyId = user.c_id;

      // When this was a rest API I had to parse the accountOwners because it
      // was sent as a string.
      // customerAccountInput.accountOwners = JSON.parse(
      //   customerAccountInput.accountOwners || "[]"
      // );

      const newCustomerAccount = new CustomerAccount(customerAccountInput);
      const savedCustomerAccount = await newCustomerAccount.save();
      return savedCustomerAccount;
    },
  },
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
