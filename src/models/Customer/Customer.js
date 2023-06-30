/**
 * The Customer model is stored in the "users" collection as it's own document.
 * The Customer._id is stored in the CustomerAccount.accountOwners array so that
 * the CustomerAccount can reference the Customer model.
 */

// npm modules
import mongoose from "mongoose";
const Schema = mongoose.Schema;

// Local modules
import User from "../User/User.js";
import roles from "../../utils/roles.js";
import { MongooseUtil } from "../../utils/MongooseUtil.js";

const customerSchema = new Schema({
  phoneNumber: {
    type: String,
    required: [true, "Phone number is required."],
    trim: true,
  },
  account: {
    type: mongoose.Types.ObjectId,
    ref: "Account",
    required: [true, "Account id is required."],
  },
  roles: {
    type: [String],
    default: ["CUSTOMER"],
    validate: {
      validator: function (roles) {
        return !!roles.length;
      },
      message: "Role is required.",
    },
    enum: {
      values: roles.ALL,
      message: "{VALUE} is not a supported role.",
    },
  },
});

/**
 * All static methods on this model will attempt to perform their respective
 * process. Errors are not handled or even detected. If the static method fails,
 * the error will propagate up to the caller, which is the resolver function.
 * The resolver is responsible for handling and formatting all errors.
 */

/**
 * Validate a customer.
 * customerDocumentList is an array of instantiated Customer documents
 * Return undefined if valid.
 * Throw error if invalid.
 */
customerSchema.statics.validate = async function (
  { customerDocumentList },
  options = {}
) {
  // Validation paths to skip, if any.
  const { pathsToSkip = [] } = options;
  // Store validation errors before throwing them. This allows document
  // validation to continue executing after an object has thrown a
  // validation error.
  const errorMap = new Map();
  // Iterate through customerInputList and validate each document, storing
  // any errors in errorMap
  for (const [index, customer] of customerDocumentList.entries()) {
    if (!(customer instanceof this)) {
      throw new Error("Input must be instance of Customer.");
    }
    // Validate document.
    try {
      await customer.validate({ pathsToSkip });
    } catch (validationError) {
      // Store the error.
      errorMap.set(index, validationError);
    }
  }

  // Throw validation errors, if any.
  if (errorMap.size > 0) {
    throw errorMap;
  }
};

/**
 * Create new customers
 * No return value if successful.
 * Throw error if unsuccessful.
 */
customerSchema.statics.createCustomers = async function ({
  customerInputList,
}) {
  /**
   * Convert the customerInputList from an array of input objects to an array
   * of instantiated customer documents
   */
  const customerDocumentList = customerInputList.map((input) => {
    return new this(input);
  });
  /**
   * Validate input. This will throw a list of errors, if any, and the
   * resolver will handle it.
   */
  await this.validate({ customerDocumentList });
  /**
   * Iterate through the customerInputList and create a new customer for each
   * object in the list
   */
  return await Promise.all(
    customerInputList.map(async (customer) => {
      return await new this(customer).save();
    })
  );
};

/**
 * Delete a single customer
 * Return the deleted document if successful.
 * Throw error if unsuccessful.
 */
customerSchema.statics.deleteCustomer = async function ({
  companyId,
  customerId,
}) {
  MongooseUtil.validateMongooseId([companyId, customerId]);

  // Delete the customer
  const document = await this.findOneAndDelete({
    company: new mongoose.Types.ObjectId(companyId),
    _id: new mongoose.Types.ObjectId(customerId),
  });

  if (document) {
    return document;
  }

  throw new Error("A customer with that id cannot be found.");
};

/**
 * Update a list of customers.
 * Return the updated documents if successfully updated.
 * Throw a list of errors if there are any errors.
 */
customerSchema.statics.updateCustomers = async function ({
  customerInputList,
  company,
}) {
  // Validate ALL customer id's first.
  MongooseUtil.validateMongooseId(
    customerInputList.map((customer) => customer.id)
  );

  // Store customer input list in a map in order to maintain document position
  // as the list gets processed.
  const customerInputMap = new Map(Object.entries(customerInputList));

  // Retrieve the customers from the db and store them in a map in order to
  // maintain document position in the list as the list gets processed.
  const customerDocMap = new Map(
    Object.entries(
      await this.findManyByIdOrThrow({
        customerIdList: customerInputList.map((customer) => customer.id),
        company,
      })
    )
  );

  // Apply the update to each customer.
  for (const [index, customerInput] of customerInputMap.entries()) {
    const document = customerDocMap.get(index);
    // Apply the update to the mongoose document.
    document.set(customerInput);
    // Validate the mongoose document
    // await document.validate();
  }

  await this.validate({
    customerDocumentList: Array.from(customerDocMap.values()),
  });

  // No error.
  // Save the customer updates and return the documents to the client
  for (const document of customerDocMap.values()) {
    await document.save();
  }
  return Array.from(customerDocMap.values());
};

/**
 * Find all documents using the provided list of id's.
 * If error(s) throw an error.
 * If no errors, return a list of documents.
 */
customerSchema.statics.findManyByIdOrThrow = async function ({
  customerIdList,
  company,
}) {
  // This is a map that stores the results during the execution of this function.
  // "fulfilled" is initiated as an empty array and is used to store documents
  // that have been retrieved from the db.
  // "rejected" is initiated as an empty array and is used to store errors that
  // accumulate during the execution of this function. The errors stored in this
  // array are from (potentially) invalid id's being sent from the client.
  const results = new Map([
    ["fulfilled", []], // document list
    ["rejected", []], // error list
  ]);

  // This is an array of settled promises.
  // The promises can be either fulfilled or rejected.
  const resultList = await Promise.allSettled(
    customerIdList.map(async (customerId) => {
      return await this.findOneByIdOrThrow({
        id: customerId,
        company,
      });
    })
  );

  // Sort the results.
  // fulfilled promises into documentList.
  // rejected promises into errorList.
  resultList.forEach((result) => {
    const { status } = result;
    results.set(status, [...results.get(status), result]);
  });

  if (results.get("rejected").length > 0) {
    // Combine all error messages into one string.
    throw new Error(
      results
        .get("rejected")
        .map((result) => result.reason)
        .join(" ")
    );
  } else {
    // Return an array of documents.
    return results.get("fulfilled").map((result) => result.value);
  }
};

// Find a customer or throw an error if not found.
customerSchema.statics.findOneByIdOrThrow = async function ({ id, company }) {
  return new Promise(async (resolve, reject) => {
    const doc = await this.findOne({
      _id: new mongoose.Types.ObjectId(id),
      company,
    });
    if (doc) {
      resolve(doc);
    } else {
      reject(`A document with ${id} could not be found.`);
    }
  });
};

export default User.discriminator("Customer", customerSchema);
