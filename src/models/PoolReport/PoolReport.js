// npm modules
import mongoose from "mongoose";
const Schema = mongoose.Schema;
import { _intersection } from "../../utils/lodashCherries.js";

import { s3storage } from "../../utils/s3storage.js";

const poolReportSchema = new Schema({
  customerAccountId: {
    type: mongoose.Types.ObjectId,
    ref: "CustomerAccount",
    required: [true, "Pool report customer account is required."],
  },
  companyId: {
    type: mongoose.Types.ObjectId,
    ref: "Company",
    required: [true, "A company is required to create a pool report."],
  },
  date: {
    type: Date,
  },
  chemicalLog: {
    type: mongoose.Types.ObjectId,
    ref: "ChemicalLog",
    required: [true, "A chemical log is required on a pool report."],
  },
  workLog: {
    workLogItems: [
      {
        name: String,
        description: String,
      },
    ],
  },
  customerNotes: {
    type: String,
    trim: true,
  },
  technicianNotes: {
    type: String,
    trim: true,
  },
  awsImageKeys: [String],
  technician: {
    type: mongoose.Types.ObjectId,
    ref: "Technician",
    required: [true, "A pool report technician is required."],
  },
});

poolReportSchema.post("save", async function (doc, next) {
  // After a PoolReport is saved, populate it's chemicalLog field.
  await doc.populate("chemicalLog");
  next();
});
poolReportSchema.post("find", async function (docs, next) {
  // For each pooReport found, populate it's "chemicalLog" field.
  if (docs.length > 0) {
    for (const doc of docs) {
      await doc.populate("chemicalLog");
      await doc.populate("technician");
    }
  }
  next();
});
poolReportSchema.post("findOne", async function (doc, next) {
  // If there is a pool report (doc) populate it's "chemicalLog" field.
  if (doc) {
    await doc.populate("chemicalLog");
    await doc.populate("technician");
  }
  next();
});

// This method validates a list of AWS image keys, filtering out any keys that
// don't exist in the current instance's awsKeyList property and returning the
// keys that exist on the current instance's awsKeyList property.
poolReportSchema.methods.validateAwsKeys = function ({ awsKeyList }) {
  // Return the keys that are present in this.awsImageKeys AND awsKeyList
  return _intersection(this.awsImageKeys, awsKeyList);
};

poolReportSchema.methods.getImages = async function ({ awsKeyList }) {
  return await s3storage.getObjects({
    awsKeyList: this.validateAwsKeys({ awsKeyList }),
  });
};

export default mongoose.model("PoolReport", poolReportSchema);
