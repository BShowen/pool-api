/**
 * The Customer model is stored in the "users" collection as it's own document.
 * The Customer._id is stored in the CustomerAccount.accountOwners array so that
 * the CustomerAccount can reference the Customer model.
 *
 * This model does NOT have it's own graphQL resolvers or queries. To query this
 * model you will query the CustomerAccount collection. At the time of this
 * writing I don't have a business need that requires me to have mutations or
 * queries directly on this model. All querying and mutating is done through the
 * CustomerAccount model.
 */

// npm modules
import mongoose from "mongoose";
const Schema = mongoose.Schema;

// Local modules
import User from "../User/User.js";
import roles from "../../utils/roles.js";

const customerSchema = new Schema({
  account: {
    type: mongoose.Types.ObjectId,
    ref: "Account",
    required: true,
  },
  roles: {
    type: [String],
    default: ["CUSTOMER"],
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

export default User.discriminator("Customer", customerSchema);
