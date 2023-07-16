// npm modules
import mongoose from "mongoose";
const Schema = mongoose.Schema;

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
          if (!this.isModified("email")) return true;

          const userCount = await mongoose.models.User.countDocuments({
            emailAddress,
          });

          const companyCount = await mongoose.models.Company.countDocuments({
            email: emailAddress,
          });
          return userCount + companyCount === 0;
        },
        message: (props) => `${props.value} is taken.`,
      },
    ],
    required: [true, "Company email is required."],
    lowercase: true,
    trim: true,
  },
  phoneNumber: {
    type: String,
    required: [true, "Company phone number is required."],
    trim: true,
  },
  address: {
    type: String,
    required: [true, "Company address is required."],
    lowercase: true,
    trim: true,
  },
});

companySchema.statics.validate = async function ({ input }, options = {}) {
  const { pathsToSkip = [] } = options;
  return await new this(input).validate({ pathsToSkip });
};

export default mongoose.model("Company", companySchema);
