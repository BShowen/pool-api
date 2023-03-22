// npm modules
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// local modules
const { roles } = require("../helpers");

function toLowerCase(value) {
  return value.trim().toLowerCase();
}

const companySchema = new Schema({
  owner: {
    firstName: {
      type: String,
      required: [true, "First name is required."],
      set: toLowerCase,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required."],
      set: toLowerCase,
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
        set: toLowerCase,
      },
    },
  },
  name: {
    type: String,
    required: [true, "Company name is required."],
    set: toLowerCase,
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
    set: toLowerCase,
  },
  phoneNumber: {
    type: String,
    required: [true, "Phone number is required."],
  },
  address: {
    type: String,
    required: [true, "Company address is required."],
    set: toLowerCase,
  },
  accounts: {
    type: [
      {
        type: mongoose.Types.ObjectId,
        ref: "CustomerAccount",
      },
    ],
  },
  technicians: {
    type: [
      {
        type: mongoose.Types.ObjectId,
        ref: "Technician",
      },
    ],
  },
});

module.exports = mongoose.model("Company", companySchema);
