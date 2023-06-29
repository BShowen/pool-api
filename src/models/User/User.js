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
import { ERROR_CODES } from "../../utils/ERROR_CODES.js";

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
      validate: [
        {
          validator: function (v) {
            return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
          },
          message: (props) => `${props.value} is not a valid email.`,
        },
        {
          validator: async function (emailAddress) {
            // If the email field isn't modified then no need to check for
            // uniqueness since the email isn't changing.
            // This rule is here for updating documents.
            if (!this.isModified("emailAddress")) return true;

            const count = await mongoose.models.User.countDocuments({
              emailAddress,
            });
            return count === 0;
          },
          message: (props) => `${props.value} is taken.`,
        },
      ],
      required: [true, "Email is required."],
      lowercase: true,
      trim: true,
      unique: true, //Create an index on the "emailAddress" field
    },
    password: {
      type: String,
      trim: true,
    },
    registrationSecret: {
      type: mongoose.Types.ObjectId,
    },
    roles: {
      type: [String],
      default: [],
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
    company: {
      type: mongoose.Types.ObjectId,
      ref: "Company",
      required: [true, "Company id is required."],
    },
  },
  { discriminatorKey: "type" }
);

userSchema.statics.findByEmail = function ({ emailAddress }) {
  return this.findOne({
    emailAddress: emailAddress.toLowerCase(),
  }).populate({ path: "company", select: "_id email" });
};

/**
 * Authenticates the user by verifying the password.
 * Return true / false
 */
userSchema.methods.authenticate = function ({ password }) {
  return bcrypt.compareSync(password, this.password);
};

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

export default mongoose.model("User", userSchema);
