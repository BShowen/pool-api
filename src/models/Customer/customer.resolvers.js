import mongoose from "mongoose";
import { GraphQLError } from "graphql";
import { ERROR_CODES } from "../../utils/ERROR_CODES.js";
import { MongooseUtil } from "../../utils/MongooseUtil.js";
export default {
  Mutation: {
    updateCustomers: async (_, { input }, { user, models }) => {
      user.authenticateAndAuthorize({ role: "MANAGER" });
      const { Customer } = models;

      try {
        const documentList = await Customer.updateCustomers({
          customerInputList: input,
          company: user.c_id,
        });
        return documentList;
      } catch (error) {
        if (error instanceof Map) {
          throw new GraphQLError(ERROR_CODES.MONGOOSE_VALIDATION_ERROR, {
            extensions: {
              code: ERROR_CODES.MONGOOSE_VALIDATION_ERROR,
              fields: Object.fromEntries(error.entries()),
            },
          });
        } else {
          throw error;
        }
      }
    },
    newCustomers: async (_, { input }, { user, models }) => {
      user.authenticateAndAuthorize({ role: "MANAGER" });
      const { customerList, account: accountId } = input;
      const { Customer } = models;

      /**
       * Validate that the customerAccount (Parent document) exists.
       */
      MongooseUtil.validateMongooseId(accountId);
      const count = await mongoose.models.CustomerAccount.countDocuments({
        _id: new mongoose.Types.ObjectId(accountId),
      });
      if (count == 0) {
        throw new Error(`An account with ${input.account} cannot be found.`);
      }

      try {
        // Save and return the customer
        return await Customer.createCustomers({
          customerInputList: customerList.map((customerInput) => ({
            ...customerInput,
            account: accountId, // Add the account id to the customer.
            company: user.c_id, // Add the company id to the customer.
          })),
        });
      } catch (error) {
        // The error returned from Customer.createCustomers will be a Map of
        // mongoose validation errors. It will not be an instance of any Error
        // class.
        if (error instanceof Map) {
          throw new GraphQLError(ERROR_CODES.MONGOOSE_VALIDATION_ERROR, {
            extensions: {
              code: ERROR_CODES.MONGOOSE_VALIDATION_ERROR,
              fields: Object.fromEntries(
                Array.from(error.entries()).map((validationObj) => {
                  const [position, validationError] = validationObj;
                  return [
                    position,
                    MongooseUtil.formatMongooseError(validationError),
                  ];
                })
              ),
            },
          });
        } else {
          throw error;
        }
      }
    },
    deleteCustomer: async (_, { customerId }, { user, models }) => {
      user.authenticateAndAuthorize({ role: "ADMIN" });
      const { Customer } = models;
      return await Customer.deleteCustomer({
        companyId: user.c_id,
        customerId,
      });
    },
  },
};