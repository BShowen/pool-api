// npm modules
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcrypt");

// local modules
const roles = require("../helpers/roles");

const technicianSchema = new Schema({
  firstName: {
    type: String,
    required: [true, "First name is required."],
    lowercase: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: [true, "Last name is required."],
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
    required: [true, "Email is required."],
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    trim: true,
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
  registrationSecret: {
    type: String,
  },
});

technicianSchema.pre("save", async function (next) {
  if (this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

module.exports = mongoose.model("Technician", technicianSchema);
