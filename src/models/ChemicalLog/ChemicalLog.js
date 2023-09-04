// npm modules
import mongoose from "mongoose";
const Schema = mongoose.Schema;

const chemicalLogSchema = new Schema({
  customerAccountId: {
    type: mongoose.Types.ObjectId,
    ref: "CustomerAccount",
    required: [true, "Chemical log customer account is required."],
  },
  companyId: {
    type: mongoose.Types.ObjectId,
    ref: "Company",
    required: [true, "A company is required to create a chemical log."],
  },
  alkalinity: {
    test: { type: Number, trim: true, min: 0 },
    add: {
      quantity: { type: Number, min: 0, trim: true },
      unit: { type: String, trim: true },
    },
  },
  calcium: {
    test: { type: Number, trim: true, min: 0 },
    add: {
      quantity: { type: Number, min: 0, trim: true },
      unit: { type: String, trim: true },
    },
  },
  chlorine: {
    test: { type: Number, trim: true, min: 0 },
    add: {
      quantity: { type: Number, min: 0, trim: true },
      unit: { type: String, trim: true },
    },
  },
  pH: {
    test: { type: Number, trim: true, min: 0 },
    add: {
      quantity: { type: Number, min: 0, trim: true },
      unit: { type: String, trim: true },
    },
  },
  salt: {
    test: { type: Number, trim: true, min: 0 },
    add: {
      quantity: { type: Number, min: 0, trim: true },
      unit: { type: String, trim: true },
    },
  },
  stabilizer: {
    test: { type: Number, trim: true, min: 0 },
    add: {
      quantity: { type: Number, min: 0, trim: true },
      unit: { type: String, trim: true },
    },
  },
  tablets: {
    test: { type: Number, trim: true, min: 0 },
    add: {
      quantity: { type: Number, min: 0, trim: true },
      unit: { type: String, trim: true },
    },
  },
  notes: {
    type: String,
    trim: true,
  },
  date: {
    type: Date,
  },
});

// Check if a chemicalLog exists.
// Return true or false.
// query is the query to be applied to the search.
// {query: { company: "companyId", id: "chemicalLogId" } }
chemicalLogSchema.statics.exists = async function ({ query }) {
  if (!query) return 0; // Do not execute a search without a query.
  return (await this.countDocuments(query)) > 0;
};

export default mongoose.model("ChemicalLog", chemicalLogSchema);
