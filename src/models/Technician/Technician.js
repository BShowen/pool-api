// npm modules
import mongoose from "mongoose";
const Schema = mongoose.Schema;

// Local modules
import User from "../User/User.js";
import roles from "../../utils/roles.js";
import { MongooseUtil } from "../../utils/MongooseUtil.js";

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

technicianSchema.statics.getTechnicianList = async function ({ companyId }) {
  MongooseUtil.validateMongooseId(companyId);
  return await this.find({
    company: new mongoose.Types.ObjectId(companyId),
  });
};

technicianSchema.statics.getTechnician = async function ({
  technicianId,
  companyId,
}) {
  MongooseUtil.validateMongooseId([technicianId, companyId]);
  return await this.findOne({
    company: new mongoose.Types.ObjectId(companyId),
    _id: new mongoose.Types.ObjectId(technicianId),
  });
};

technicianSchema.statics.getRegistrationTechnician = async function ({
  registrationSecret,
  technicianId,
}) {
  MongooseUtil.validateMongooseId([registrationSecret, technicianId]);
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
  MongooseUtil.validateMongooseId(technicianId);

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
  MongooseUtil.validateMongooseId(technicianId);
  return await this.findOneAndDelete({
    _id: new mongoose.Types.ObjectId(technicianId),
    company: new mongoose.Types.ObjectId(companyId),
  });
};

export default User.discriminator("Technician", technicianSchema);
