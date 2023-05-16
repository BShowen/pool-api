// npm modules
import mongoose from "mongoose";
const Schema = mongoose.Schema;
import bcrypt from "bcrypt";

// local modules
import roles from "../../utils/roles.js";

const companySchema = new Schema({
  owner: {
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
    password: {
      type: String,
      required: [true, "Password is required."],
      trim: true,
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
        values: roles.ALL,
        message: "{VALUE} is not a supported role.",
      },
    },
  },
  name: {
    type: String,
    required: [true, "Company name is required."],
    lowercase: true,
    trim: true,
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
    lowercase: true,
    trim: true,
  },
  phoneNumber: {
    type: String,
    required: [true, "Phone number is required."],
  },
  address: {
    type: String,
    required: [true, "Company address is required."],
    lowercase: true,
    trim: true,
  },
  accounts: {
    type: [
      {
        type: mongoose.Types.ObjectId,
        ref: "CustomerAccount",
      },
    ],
  },
});

companySchema.pre("save", async function (next) {
  this.owner.password = await bcrypt.hash(this.owner.password, 10);
  next();
});

export default mongoose.model("Company", companySchema);
