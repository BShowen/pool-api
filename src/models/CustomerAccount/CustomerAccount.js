// npm modules
import mongoose from "mongoose";
const Schema = mongoose.Schema;

import { validateMongooseModel } from "../../utils/validateMongooseModel.js";

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
  },
  companyId: {
    type: mongoose.Types.ObjectId,
    ref: "Company",
    required: [true, "Account company is required."],
  },
  accountOwners: {
    type: [
      {
        // <Customer>
        firstName: {
          type: String,
          required: [true, "Customer first name is required."],
          lowercase: true,
          trim: true,
        },
        lastName: {
          type: String,
          required: [true, "Customer last name is required."],
          lowercase: true,
          trim: true,
        },
        emailAddress: {
          type: String,
          validate: {
            validator: function (v) {
              return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
            },
            message: (props) => `${props.value} is not a valid email.`,
          },
          required: [true, "Customer email is required."],
          lowercase: true,
          trim: true,
        },
        phoneNumber: {
          type: String,
          required: [true, "Customer phone number is required."],
          lowercase: true,
          trim: true,
        },
      },
    ],
    validate: {
      validator: function (value) {
        return !(value.length == 0);
      },
      message: "At least one account owner is required.",
    },
  },
  address: {
    type: String,
    required: [true, "Account address is required."],
    lowercase: true,
    trim: true,
  },
  userId: {
    type: mongoose.Types.ObjectId,
    ref: "User",
    required: false,
  },
  pool: {
    // <SwimmingPool>
    type: {
      enum: {
        values: ["Salt", "Chlorine"],
      },
      gallons: {
        type: Number,
        required: [true, "Pool gallons is required."],
      },
      // equipment info in the future.
    },
  },
  poolReports: [
    {
      // <PoolReport>
      date: Date,
      chemicalsTested: {
        chlorine: Number,
        pH: Number,
        alkalinity: Number,
        stabilizer: Number,
        calciumHardness: Number,
        salt: Number,
        phosphates: Number,
      },
      chemicalsAdded: {
        chlorine: String,
        acid: Number,
        sodiumBicarb: Number,
        stabilizer: Number,
        calciumHardness: Number,
        salt: Number,
        tablets: Number,
        phosphateRemover: Number,
        diatomaceousEarth: Number,
      },
      workPerformed: {
        brush: Boolean,
        skimmerBasket: Boolean,
        pumpBasket: Boolean,
        filter: Boolean,
      },
      notes: String,
    },
  ],
});

customerAccountSchema.pre("validate", validateMongooseModel);

export default mongoose.model("CustomerAccount", customerAccountSchema);
