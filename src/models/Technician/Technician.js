// npm modules
import mongoose from "mongoose";
const Schema = mongoose.Schema;
import bcrypt from "bcrypt";

// local modules
import roles from "../../utils/roles.js";
import { validateMongooseModel } from "../../utils/validateMongooseModel.js";

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
      values: roles.ALL,
      message: "{VALUE} is not a supported role.",
    },
  },
  companyId: {
    type: mongoose.Types.ObjectId,
    ref: "Company",
    required: [true, "Technician employer is required."],
  },
  registrationSecret: {
    type: mongoose.Types.ObjectId,
  },
});

technicianSchema.pre("save", async function (next) {
  if (this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

technicianSchema.pre("validate", validateMongooseModel);

export default mongoose.model("Technician", technicianSchema);
