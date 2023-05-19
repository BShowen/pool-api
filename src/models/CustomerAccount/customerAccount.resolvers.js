import mongoose from "mongoose";

export default {
  Query: {
    customerAccountList: async (parent, args, context, info) => {
      const { user } = context;
      user.authenticateAndAuthorize({ role: "MANAGER" });
      const results = await context.models.CustomerAccount.find();
      return results;
    },
    customerAccount: async (paren, { id }, { user, models }, info) => {
      user.authenticateAndAuthorize({ role: "TECH" });
      const { CustomerAccount } = models;
      const companyId = new mongoose.Types.ObjectId(user.c_id);
      const customerId = new mongoose.Types.ObjectId(id);
      const customerAccount = await CustomerAccount.findOne(
        { companyId: companyId, _id: customerId },
        "-password"
      );
      if (!customerAccount) {
        // A customer matching that id in this company wasn't found.
        return null;
      }

      return customerAccount;
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
