// npm modules
import mongoose from "mongoose";
const Schema = mongoose.Schema;

const serviceSchema = new Schema({
  name: {
    type: String,
    trim: true,
    lowercase: true,
    required: [true, "Service name is required."],
  },
  description: {
    type: String,
    lowercase: true,
    trim: true,
  },
  companyId: {
    required: true,
    type: mongoose.Types.ObjectId,
  },
});

export default mongoose.model("Service", serviceSchema);
