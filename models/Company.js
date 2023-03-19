// npm modules
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Local modules
const { preSaveFormatter, roles } = require("../helpers");

const companySchema = new Schema({
  // owner: {
  //   type: mongoose.Types.ObjectId,
  //   ref: "User",
  //   required: [true, "Company owner is required."],
  // },
  owner: {
    firstName: {
      type: String,
      required: [true, "First name is required."],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required."],
    },
    password: {
      type: String,
      required: [true, "Password is required."],
    },
    roles: {
      type: [String],
      default: ["ADMIN"],
      validate: {
        validator: function (roles) {
          return !!roles.length;
        },
        message: "Role is required.",
      },
      enum: {
        values: roles.all,
        message: "{VALUE} is not a supported role.",
      },
    },
  },
  name: {
    type: String,
    required: [true, "Company name is required."],
  },
  email: {
    type: String,
    validate: {
      validator: function (v) {
        return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
      },
      message: (props) => `${props.value} is not a valid email.`,
    },
    required: [true, "Email is required."],
  },
  phoneNumber: {
    type: String,
    required: [true, "Phone number is required."],
  },
  address: { type: String, required: [true, "Company address is required."] },
  accounts: [
    {
      //<CustomerAccount>
      accountName: {
        type: String,
        required: [true, "Account name is required."],
      },
      accountOwners: [
        {
          // <Customer>
          firstName: {
            type: String,
            required: [true, "Customer first name is required."],
          },
          lastName: {
            type: String,
            required: [true, "Customer last name is required."],
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
          },
          phoneNumber: {
            type: String,
            required: [true, "Customer phone number is required."],
          },
        },
      ],
      address: {
        type: String,
        required: [true, "Customer address is required."],
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
    },
  ],
});

companySchema.pre("validate", function () {
  preSaveFormatter(this._doc);
});

module.exports = mongoose.model("Company", companySchema);
