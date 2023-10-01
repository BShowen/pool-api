// npm modules
import mongoose from "mongoose";
const Schema = mongoose.Schema;

const poolReportSchema = new Schema({
  customerAccountId: {
    type: mongoose.Types.ObjectId,
    ref: "CustomerAccount",
    required: [true, "Pool report customer account is required."],
  },
  companyId: {
    type: mongoose.Types.ObjectId,
    ref: "Company",
    required: [true, "A company is required to create a chemical log."],
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
  notes: {
    type: String,
    trim: true,
  },
  // Consider storing the aws keys in this array, then create a virtual which
  // generates presigned urls for the images in this array
  photo: { type: String },
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
    }
  }
  next();
});
poolReportSchema.post("findOne", async function (doc, next) {
  // If there is a pool report (doc) populate it's "chemicalLog" field.
  if (doc) {
    await doc.populate("chemicalLog");
  }
  next();
});

export default mongoose.model("PoolReport", poolReportSchema);
