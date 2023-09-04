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
    brushPool: Boolean,
    emptySkimmerBasket: Boolean,
    emptyPumpBasket: Boolean,
    cleanFilter: Boolean,
    cleanTile: Boolean,
  },
  notes: {
    type: String,
    trim: true,
  },
});

poolReportSchema.post("save", async function (doc, next) {
  // After a PoolReport is saved, populate it's chemicalLog field.
  await doc.populate("chemicalLog");
  next();
});

export default mongoose.model("PoolReport", poolReportSchema);
