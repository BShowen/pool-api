// npm modules
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

function toLowerCase(value) {
  return value.trim().toLowerCase();
}

const customerAccountSchema = new Schema({
  accountName: {
    type: String,
    required: [true, "Account name is required."],
    set: toLowerCase,
  },
  service: {
    type: {
      type: String, //Full service
      required: false,
      set: toLowerCase,
      default: "full service",
    },
    day: {
      type: String, //monday, tuesday, etc.
      required: false,
      set: toLowerCase,
    },
    frequency: {
      type: String, //weekly, bi-weekly, etc.
      required: true,
      set: toLowerCase,
      default: "weekly",
    },
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
          set: toLowerCase,
        },
        lastName: {
          type: String,
          required: [true, "Customer last name is required."],
          set: toLowerCase,
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
          set: toLowerCase,
        },
        phoneNumber: {
          type: String,
          required: [true, "Customer phone number is required."],
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
    set: toLowerCase,
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

module.exports = mongoose.model("CustomerAccount", customerAccountSchema);
