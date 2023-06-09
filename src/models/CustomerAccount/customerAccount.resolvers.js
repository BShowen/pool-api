import mongoose from "mongoose";
import { GraphQLError } from "graphql";
export default {
  Query: {
    getCustomerAccountList: async (parent, args, context, info) => {
      const { user } = context;
      user.authenticateAndAuthorize({ role: "TECH" });
      const results = await context.models.CustomerAccount.find();
      return results;
    },
    getCustomerAccount: async (paren, { id }, { user, models }, info) => {
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
    deleteCustomerAccount: async (parent, { id }, { user, models }, info) => {
      user.authenticateAndAuthorize({ role: "MANAGER" });
      const { CustomerAccount } = models;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        // Make sure provided account id is valid mongoose id.
        throw new GraphQLError("Invalid customer account id.");
      }

      const deletedDocument = await CustomerAccount.findOneAndRemove({
        _id: id,
        companyId: user.c_id,
      });

      return (
        deletedDocument || new GraphQLError(`Cannot find account with id ${id}`)
      );
    },
    updateCustomerAccount: async (parent, args, { user, models }, info) => {
      user.authenticateAndAuthorize({ role: "MANAGER" });
      const { customerAccountInput } = args;
      const { CustomerAccount } = models;
      if (!mongoose.Types.ObjectId.isValid(customerAccountInput.id)) {
        // Make sure provided account id is valid mongoose id.
        throw new GraphQLError("Invalid customer account id.");
      }

      if (
        "technicianId" in customerAccountInput &&
        Number.parseInt(customerAccountInput.technicianId) === 0
      ) {
        // If the technicianId is zero then the user is removing the technicianId
        customerAccountInput.technicianId = null;
      }

      // Retrieve the account from the DB.
      const customerAccount = await CustomerAccount.findOne({
        companyId: user.c_id,
        _id: customerAccountInput.id,
      });

      // ------------------------------------------------------------------
      // Sanitize the input
      // When updating the customerAccount.accountOwners array, you have to
      // supply the _id field and not the "id" field. Otherwise the sub-docs
      // will get a new _id which will cause duplicate data in ApolloClient
      // cache.
      // Map over the customerAccount.accountOwners and replace the id field
      // with _id and then remove the id field.
      if (customerAccountInput.accountOwners) {
        customerAccountInput.accountOwners =
          customerAccountInput.accountOwners.map((accountOwnerDoc) => {
            accountOwnerDoc._id = accountOwnerDoc.id;
            delete accountOwnerDoc.id;
            return accountOwnerDoc;
          });
      }
      // ------------------------------------------------------------------

      // Update the document
      console.log(customerAccountInput);
      customerAccount.set(customerAccountInput);

      // Save and return the document
      const savedCustomerAccount = await customerAccount.save();
      return savedCustomerAccount;
    },
  },
  CustomerAccount: {
    id: (parent) => {
      return parent._id;
    },
  },
  AccountOwner: {
    id: (parent) => {
      return parent._id;
    },
  },
};
