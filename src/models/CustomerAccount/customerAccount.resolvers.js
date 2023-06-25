import { GraphQLError } from "graphql";
import { ERROR_CODES } from "../../utils/ERROR_CODES.js";
import { MongooseUtil } from "../../utils/MongooseUtil.js";
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
          validationErrors.set(
            "customerAccount",
            MongooseUtil.formatMongooseError(error)
          );
        } else {
          throw error;
        }
      }

      // Validate the the accountOwners using the custom static method "validate"
      try {
        // Add the company id to the accountOwner documents
        input.accountOwners = input.accountOwners.map((accountOwner) => {
          return {
            ...accountOwner,
            company: user.c_id,
          };
        });
        // validate each accountOwner
        await Customer.validate(
          { customerInputList: input.accountOwners },
          {
            // account field will be set once the account is saved and the _id
            // can be extracted from the saved account.
            pathsToSkip: ["account"],
          }
        );
      } catch (error) {
        // The error returned from Customer.validate will be a Map of mongoose
        // validation errors. It will not be an instance of any Error class.
        if (error.name === "ValidationError") {
          validationErrors.set(
            "accountOwner",
            MongooseUtil.formatMongooseError(error)
          );
        } else if (error instanceof Map) {
          const formattedErrors = {};
          for (const [index, err] of error.entries()) {
            formattedErrors[index] = MongooseUtil.formatMongooseError(err);
          }
          validationErrors.set("accountOwners", formattedErrors);
        } else {
          throw error;
        }
      }

      // Stop execution and throw errors, if any.
      if (validationErrors.size > 0) {
        throw new GraphQLError(ERROR_CODES.MONGOOSE_VALIDATION_ERROR, {
          extensions: {
            code: ERROR_CODES.MONGOOSE_VALIDATION_ERROR,
            fields: Object.fromEntries(validationErrors.entries()),
          },
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
          })),
        });
        // Everything was successful. Return the saved document.
        return await account.populate("accountOwners");
      } catch (error) {
        // The error returned from Customer.createCustomers will be a Map of
        // mongoose validation errors. It will not be an instance of any Error
        // class.
        if (error.name === "ValidationError") {
          throw new GraphQLError(ERROR_CODES.MONGOOSE_VALIDATION_ERROR, {
            extensions: {
              code: ERROR_CODES.MONGOOSE_VALIDATION_ERROR,
              fields: MongooseUtil.formatMongooseError(error),
            },
          });
        } else if (error instanceof Map) {
          const formattedErrors = {};
          for (const [index, err] of error.entries()) {
            formattedErrors[index] = MongooseUtil.formatMongooseError(err);
          }
          throw new GraphQLError(ERROR_CODES.MONGOOSE_VALIDATION_ERROR, {
            extensions: {
              code: ERROR_CODES.MONGOOSE_VALIDATION_ERROR,
              fields: formattedErrors,
            },
          });
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
          throw new GraphQLError(ERROR_CODES.MONGOOSE_VALIDATION_ERROR, {
            extensions: {
              code: ERROR_CODES.MONGOOSE_VALIDATION_ERROR,
              fields: MongooseUtil.formatMongooseError(error),
            },
          });
        } else {
          // If the error is not a ValidationError then something else went
          // wrong. Most likely a user with the supplied ID couldn't be found.
          // Either way, there is no need to format the error.
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
