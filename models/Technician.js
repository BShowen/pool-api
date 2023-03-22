// npm modules
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// local modules
const { roles } = require("../helpers");

function toLowerCase(value) {
  return value.trim().toLowerCase();
}

const technicianSchema = new Schema(
  {
    firstName: {
      type: String,
      required: [true, "Technician first name is required."],
      set: toLowerCase,
    },
    lastName: {
      type: String,
      required: [true, "Technician last name is required."],
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
      required: [true, "Technician email is required."],
      set: toLowerCase,
    },
    password: {
      type: String,
      required: [true, "Technician password is required."],
    },
    roles: {
      type: [String],
      default: ["TECH"],
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
    companyId: {
      type: mongoose.Types.ObjectId,
      ref: "Company",
      required: [true, "Technician employer is required."],
    },
    serviceRoute: {
      type: [
        {
          type: mongoose.Types.ObjectId,
          ref: "CustomerAccount",
        },
      ],
    },
  },
  {
    virtuals: {
      fullName: {
        get() {
          return `${this.firstName} ${this.lastName}`;
        },
      },
    },
  }
);

module.exports = mongoose.model("Technician", technicianSchema);
