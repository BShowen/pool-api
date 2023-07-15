import { ValidationError } from "../../utils/ValidationError.js";
export default {
  Query: {
    customerAccountList: async (_, __, { models, user }) => {
      const { CustomerAccount } = models;
      user.authenticateAndAuthorize({ role: "TECH" });
      return await CustomerAccount.getCustomerAccountList({
        companyId: user.c_id,
      });
    },
    customerAccount: async (_, { accountId }, { models, user }) => {
      user.authenticateAndAuthorize({ role: "TECH" });
      const { CustomerAccount } = models;

      return await CustomerAccount.getCustomerAccountById({
        companyId: user.c_id,
        accountId,
      });
    },
  },
  Mutation: {
    newCustomerAccount: async (_, { input }, { user, models }) => {
      /**
       * This resolver method has a lot going on. This is a high level overview
       * of the logic in this resolver.
       *
       * Parameters:
       * This method receives an input object from the client. That input has
       * two fields, "account" and "accountOwners". The "account" field stores
       * an object with user input which has the values for the CustomerAccount
       * model. The "accountOwners" field is an array of objects, each object
       * holding the values for the Customer model.
       *
       * Steps:
       * First - Validation.
       * This function iterates through each input object and validates the
       * input. If input is invalid then an error is thrown, caught, and stored
       * in a Map object. After all validation is done, all caught errors will
       * be thrown. This allows ALL input to be validated BEFORE attempting to
       * save anything. This is because this function attempts to save two
       * models synchronously and I want to guarantee, as much as possible, that
       * both models will save successfully. If either model fails validation
       * then an error is thrown and returned to the client.
       *
       * Second - Persisting data.
       * After validation, each model is instantiated and saved. If an error
       * occurs at this stage then any data saved will be persisted and an error
       * will be thrown and returned to the client.
       */

      user.authenticateAndAuthorize({ role: "MANAGER" });
      const { Customer, CustomerAccount } = models;

      // Validation errors to be returned, if any.
      const validationErrors = new Map();

      // Validate the customerAccount.
      try {
        // Add the company id to the account input.
        input.account = {
          ...input.account,
          company: user.c_id,
        };
        await CustomerAccount.validate({ customerAccountInput: input.account });
      } catch (error) {
        // Handle validation errors. Throw any other errors
        if (error.name === "ValidationError") {
          validationErrors.set("customerAccount", error);
        } else {
          throw error;
        }
      }

      // Validate the the accountOwners using the custom static method "validate"
      try {
        // Add the company id to the accountOwner documents
        // validate each accountOwner
        await Customer.validate(
          {
            customerDocumentList: input.accountOwners.map((accountOwner) => {
              return new Customer({ ...accountOwner });
            }),
          },
          {
            // account and company fields will be set once the account is saved
            pathsToSkip: ["account", "company"],
          }
        );
      } catch (error) {
        // The error returned from Customer.validate will be a Map of mongoose
        // validation errors. It will not be an instance of any Error class.
        if (error instanceof Map) {
          validationErrors.set("accountOwners", error);
        } else {
          throw error;
        }
      }

      // Stop execution and throw errors, if any.
      if (validationErrors.size > 0) {
        throw new ValidationError({
          error: validationErrors,
        });
      }

      try {
        // Save the new Customer Account.
        const account = await CustomerAccount.createCustomerAccount({
          customerAccountInput: input.account,
        });
        // Create and save the customer account owners.
        await Customer.createCustomers({
          // Add the account id to each accountOwner document before saving
          customerInputList: input.accountOwners.map((customerInput) => ({
            ...customerInput,
            account: account._id,
            company: user.c_id,
          })),
        });
        // Everything was successful. Return the saved document.
        return await account.populate("accountOwners");
      } catch (error) {
        if (error.name === "ValidationError" || error instanceof Map) {
          // Customer.createCustomers() will throw a map of errors. Each entry
          // is an error for one document that failed validation.
          // CustomerAccount.createCustomerAccount() will throw a validationError
          throw new ValidationError({ error });
        } else {
          throw error;
        }
      }
    },
    deleteCustomerAccount: async (_, { accountId }, { user, models }) => {
      user.authenticateAndAuthorize({ role: "MANAGER" });
      const { CustomerAccount } = models;
      // Delete the account and return the deleted document
      return await CustomerAccount.deleteAccount({
        companyId: user.c_id,
        accountId,
      });
    },
    updateCustomerAccount: async (_, { input }, { user, models }) => {
      user.authenticateAndAuthorize({ role: "MANAGER" });
      const { CustomerAccount } = models;

      try {
        return await CustomerAccount.updateCustomerAccount({
          input,
          companyId: user.c_id,
        });
      } catch (error) {
        if (error.name === "ValidationError") {
          // A ValidationError is thrown when the user supplied input doesn't
          // satisfy the mongoose model's requirements.
          throw new ValidationError({ error });
        } else {
          // If the error is not a ValidationError then something else went
          // wrong. Most likely a user with the supplied ID couldn't be found.
          throw error;
        }
      }
    },
  },
  CustomerAccount: {
    id: (parent) => {
      return parent._id;
    },
  },
  Customer: {
    id: (parent) => {
      return parent._id;
    },
  },
  Technician: {
    id: (parent) => {
      return parent.id;
    },
  },
};
