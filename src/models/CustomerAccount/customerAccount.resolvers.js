import mongoose from "mongoose";
import { GraphQLError } from "graphql";
export default {
  Query: {
    customerAccountList: async (_, __, context) => {
      const { user } = context;
      user.authenticateAndAuthorize({ role: "TECH" });
      const results = await context.models.CustomerAccount.find({
        companyId: user.c_id,
      });
      return results;
    },
    customerAccount: async (_, { id }, { user, models }) => {
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
      _,
      { customerAccountInput },
      { user, models }
    ) => {
      user.authenticateAndAuthorize({ role: "MANAGER" });
      const { CustomerAccount } = models;
      customerAccountInput.companyId = user.c_id;
      const newCustomerAccount = new CustomerAccount(customerAccountInput);
      const savedCustomerAccount = await newCustomerAccount.save();
      return savedCustomerAccount;
    },
    deleteCustomerAccount: async (_, args, { user, models }) => {
      user.authenticateAndAuthorize({ role: "MANAGER" });
      const { CustomerAccount } = models;
      const { accountId } = args;

      if (!mongoose.Types.ObjectId.isValid(accountId)) {
        // Make sure provided account id is valid mongoose id.
        throw new GraphQLError("Invalid customer account id.");
      }

      const deletedDocument = await CustomerAccount.findOneAndRemove({
        _id: accountId,
        companyId: user.c_id,
      });

      return (
        deletedDocument ||
        new GraphQLError(`Cannot find account with id ${accountId}`)
      );
    },
    updateCustomerAccount: async (_, args, { user, models }) => {
      user.authenticateAndAuthorize({ role: "MANAGER" });
      const { customerAccountInput } = args;
      const { CustomerAccount } = models;
      if (!mongoose.Types.ObjectId.isValid(customerAccountInput.id)) {
        // Make sure provided account id is valid mongoose id.
        throw new GraphQLError("Invalid customer account id.");
      }

      if (
        "userId" in customerAccountInput &&
        Number.parseInt(customerAccountInput.userId) === 0
      ) {
        // If the userId is zero then the user is removing the userId
        customerAccountInput.userId = null;
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
