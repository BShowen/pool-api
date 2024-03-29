// npm modules
import mongoose from "mongoose";
const Schema = mongoose.Schema;

import { validateMongooseId } from "../../utils/validateMongooseId.js";

const customerAccountSchema = new Schema({
  accountName: {
    type: String,
    required: [true, "Account name is required."],
    lowercase: true,
    trim: true,
  },
  serviceType: {
    type: String, //Full service
    required: [true, "Service type is required."],
    lowercase: true,
    trim: true,
  },
  serviceDay: {
    type: String, //monday, tuesday, etc.
    required: [true, "Service day is required."],
    lowercase: true,
    trim: true,
  },
  serviceFrequency: {
    type: String, //weekly, bi-weekly, etc.
    required: [true, "Service frequency is required."],
    lowercase: true,
    trim: true,
  },
  price: {
    type: Number,
    required: [true, "Monthly price is required."],
    min: [1, "Price is required."],
  },
  company: {
    type: mongoose.Types.ObjectId,
    ref: "Company",
    required: [true, "Account company is required."],
  },
  address: {
    type: String,
    required: [true, "Account address is required."],
    lowercase: true,
    trim: true,
  },
  technician: {
    type: mongoose.Types.ObjectId,
    ref: "User",
    required: false,
  },
  // pool: {
  //   // <SwimmingPool>
  //   type: {
  //     enum: {
  //       values: ["Salt", "Chlorine"],
  //     },
  //     gallons: {
  //       type: Number,
  //       required: [true, "Pool gallons is required."],
  //     },
  //     // equipment info in the future.
  //   },
  // },
});

customerAccountSchema.virtual("accountOwners", {
  ref: "User",
  localField: "_id",
  foreignField: "account",
  justOne: false,
});

customerAccountSchema.virtual("latestChemicalLog", {
  ref: "ChemicalLog", // Reference to the ChemicalLog model
  localField: "_id", // Field in the CustomerAccount model
  foreignField: "customerAccountId", // Field in the ChemicalLog model
  options: {
    sort: {
      date: -1,
    },
    limit: 1,
  }, // Sort by date in descending order and limit to 1
  justOne: true, // Return only one document
});

customerAccountSchema.virtual("chemicalLogs", {
  ref: "ChemicalLog", // Reference to the ChemicalLog model
  localField: "_id", // Field in the CustomerAccount model
  foreignField: "customerAccountId", // Field in the ChemicalLog model
  options: {
    sort: {
      date: -1,
    },
  }, // Sort by date in descending order
});

customerAccountSchema.virtual("latestPoolReport", {
  ref: "PoolReport", // Reference to the PoolReport model
  localField: "_id", // Field in the PoolReport model
  foreignField: "customerAccountId", // Field in the PoolReport model
  options: {
    sort: {
      date: -1,
    },
  }, // Sort by date in descending order
  justOne: true, // Return only one document
});

/**
 * All static methods on this model will attempt to perform their respective
 * process. Errors are not handled or even detected. If the static method fails,
 * the error will propagate up to the caller, which is the resolver function.
 * The resolver is responsible for handling and formatting all errors.
 */

/**
 * Validate a customer account.
 * Return undefined inf valid.
 * Throw error if invalid.
 */
customerAccountSchema.static(
  "validate",
  async function ({ customerAccountInput }, options = {}) {
    const { pathsToSkip = [] } = options;
    const customerAccount = new this(customerAccountInput);
    await customerAccount.validate({ pathsToSkip });
  }
);

/**
 * Create, save, and return a new customer account.
 * Throw error if there is an error.
 */
customerAccountSchema.static(
  "createCustomerAccount",
  async function ({ customerAccountInput }) {
    return await new this(customerAccountInput).save();
  }
);

/**
 * Return a list of customer accounts associated with the current user.
 */
customerAccountSchema.static(
  "getCustomerAccountList",
  async function ({ companyId }) {
    validateMongooseId(companyId);
    return await this.find({
      company: new mongoose.Types.ObjectId(companyId),
    });
  }
);

/**
 * Find and return a customer account by id.
 * Throw error if no customer account found.
 */
customerAccountSchema.static(
  "getCustomerAccountById",
  async function ({ companyId, accountId }) {
    validateMongooseId([accountId, companyId]);
    const customerAccount = await this.findOne({
      company: new mongoose.Types.ObjectId(companyId),
      _id: new mongoose.Types.ObjectId(accountId),
    });

    if (customerAccount) {
      return customerAccount;
    }

    throw new Error("An account with that id could not be found.");
  }
);

/**
 * Delete an account.
 * Return the deleted document if no errors.
 * Throw error if there is an error.
 */
customerAccountSchema.static(
  "deleteAccount",
  async function ({ companyId, accountId }) {
    validateMongooseId(accountId);
    // Delete and return the customer account
    const deletedDoc = await this.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(accountId),
      company: new mongoose.Types.ObjectId(companyId),
    });

    if (deletedDoc) {
      return deletedDoc;
    }

    throw new Error("A customer account with that id could not be found.");
  }
);

/**
 * Update a customer account.
 * Return the updated document. if no errors.
 * Throw error if there is an error.
 */
customerAccountSchema.static(
  "updateCustomerAccount",
  async function ({ input, companyId }) {
    validateMongooseId(input.id);
    // Retrieve the account from the DB to perform the update.
    const customerAccount = await this.getCustomerAccountById({
      companyId,
      accountId: input.id,
    });

    if ("technician" in input && input.technician == 0) {
      // If the technician is zero then the user is removing the technician
      input.technician = null;
    } else if ("technician" in input && input.technician != 0) {
      // Validate the technician id.
      validateMongooseId(input.technician);
      // verify technician exists.
      const count = await mongoose.models.Technician.countDocuments({
        _id: new mongoose.Types.ObjectId(input.technician),
        company: new mongoose.Types.ObjectId(companyId),
      });
      if (count == 0) {
        throw new Error(
          `A technician with ${input.technician} cannot be found.`
        );
      }
    }

    // Update the document
    customerAccount.set(input);

    // Save and return the document
    return await customerAccount.save();
  }
);

// Check if a customerAccount exists.
// Return true or false.
// query is the query to be applied to the search.
// {query: { company: "companyId", id: "customerAccountId" } }
customerAccountSchema.statics.exists = async function ({ query }) {
  if (!query) return 0; // Do not execute a search without a query.
  return (await this.countDocuments(query)) > 0;
};

customerAccountSchema.post("deleteAccount", async function (account, next) {
  /**
   * Delete each accountOwner associated with this account AFTER the static
   * method "deleteAccount" is called.
   */
  try {
    await mongoose.models.Customer.deleteMany({
      company: new mongoose.Types.ObjectId(account.company),
      account: new mongoose.Types.ObjectId(account._id),
    });
    next();
  } catch (error) {
    throw new Error("Error deleting account owners.");
  }
});
customerAccountSchema.pre("findOneAndDelete", async function (next) {
  this.populate("accountOwners");
  this.populate("technician");
  next();
});
customerAccountSchema.post("findOne", async function (doc, next) {
  if (doc) {
    await doc.populate("accountOwners");
    await doc.populate("technician");
    await doc.populate("chemicalLogs");
    await doc.populate("latestChemicalLog");
    await doc.populate("latestPoolReport");
  }
  next();
});
customerAccountSchema.post("find", async function (docs, next) {
  if (docs.length > 0) {
    for (const doc of docs) {
      await doc.populate("accountOwners");
      await doc.populate("technician");
      await doc.populate("chemicalLogs");
      await doc.populate("latestChemicalLog");
      await doc.populate("latestPoolReport");
    }
  }
  next();
});
customerAccountSchema.post("save", async function (doc, next) {
  await doc.populate("accountOwners");
  await doc.populate("technician");
  next();
});

export default mongoose.model("CustomerAccount", customerAccountSchema);
