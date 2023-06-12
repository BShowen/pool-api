/**
 * The User model is the base model that Customer, Technician inherit from. All
 * commons fields are defined in this schema. Model specific fields are defined
 * in the respective schemas.
 */

// npm modules
import mongoose from "mongoose";
const Schema = mongoose.Schema;
import bcrypt from "bcrypt";

// local modules
import roles from "../../utils/roles.js";
import { validateMongooseModel } from "../../utils/validateMongooseModel.js";

const userSchema = new Schema(
  {
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
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required."],
      trim: true,
    },
    password: {
      type: String,
      trim: true,
    },
    registrationSecret: {
      type: mongoose.Types.ObjectId,
    },
  },
  { discriminatorKey: "type" }
);

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

userSchema.pre("validate", validateMongooseModel);

export default mongoose.model("User", userSchema);
