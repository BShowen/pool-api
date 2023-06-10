// npm modules
import mongoose from "mongoose";
const Schema = mongoose.Schema;
import bcrypt from "bcrypt";

// local modules
import roles from "../../utils/roles.js";

const companySchema = new Schema({
  owner: {
    type: mongoose.Types.ObjectId,
    ref: "User",
    required: [true, "Company owner is required."],
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
    required: [true, "Company email is required."],
    lowercase: true,
    trim: true,
  },
  phoneNumber: {
    type: String,
    required: [true, "Company phone number is required."],
  },
  address: {
    type: String,
    required: [true, "Company address is required."],
    lowercase: true,
    trim: true,
  },
});

export default mongoose.model("Company", companySchema);
