// npm modules
import mongoose from "mongoose";
const Schema = mongoose.Schema;

// Local modules
import User from "../User/User.js";
import roles from "../../utils/roles.js";
import { validateMongooseId } from "../../utils/validateMongooseId.js";

const technicianSchema = new Schema({
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

technicianSchema.statics.validate = async function ({ input }, options = {}) {
  const { pathsToSkip = [] } = options;
  return await new this(input).validate({ pathsToSkip });
};

technicianSchema.statics.getTechnicianList = async function ({ companyId }) {
  validateMongooseId(companyId);
  return await this.find({
    company: new mongoose.Types.ObjectId(companyId),
  });
};

technicianSchema.statics.getTechnician = async function ({
  technicianId,
  companyId,
}) {
  validateMongooseId([technicianId, companyId]);
  return await this.findOne({
    company: new mongoose.Types.ObjectId(companyId),
    _id: new mongoose.Types.ObjectId(technicianId),
  });
};

technicianSchema.statics.getRegistrationTechnician = async function ({
  registrationSecret,
  technicianId,
}) {
  validateMongooseId([registrationSecret, technicianId]);
  const technician = await this.findOne({
    _id: new mongoose.Types.ObjectId(technicianId),
    registrationSecret: new mongoose.Types.ObjectId(registrationSecret),
  });
  return technician || new GraphQLError("Cannot find that user.");
};

technicianSchema.statics.updateTechnician = async function ({
  companyId,
  input,
}) {
  const { id: technicianId } = input;
  validateMongooseId(technicianId);

  // Query the DB for the old Technician.
  const oldTechnician = await this.findOne({
    company: new mongoose.Types.ObjectId(companyId),
    _id: new mongoose.Types.ObjectId(technicianId),
  });
  oldTechnician.set(input);
  return await oldTechnician.save();
};

technicianSchema.statics.deleteTechnician = async function ({
  technicianId,
  companyId,
}) {
  validateMongooseId(technicianId);
  return await this.findOneAndDelete({
    _id: new mongoose.Types.ObjectId(technicianId),
    company: new mongoose.Types.ObjectId(companyId),
  });
};

export default User.discriminator("Technician", technicianSchema);
