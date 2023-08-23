// npm modules
import mongoose from "mongoose";
const Schema = mongoose.Schema;

const poolReportSchema = new Schema({
  customerAccountId: {
    type: mongoose.Types.ObjectId,
    ref: "CustomerAccount",
    required: [true, "Pool report customer account is required."],
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
  ph: {
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
});

export default mongoose.model("PoolReport", poolReportSchema);
