// npm modules
import mongoose from "mongoose";
const Schema = mongoose.Schema;

// Local modules
import User from "../User/User.js";
import roles from "../../utils/roles.js";

const technicianSchema = new Schema({
  companyId: {
    type: mongoose.Types.ObjectId,
    ref: "Company",
    required: [true, "Employer is required."],
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
});

export default User.discriminator("Technician", technicianSchema);
