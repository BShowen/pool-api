const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const serviceRouteSchema = new Schema({
  companyId: {
    type: mongoose.Types.ObjectId,
    ref: "Company",
    required: [true, "Company is required."],
  },
  technician: {
    type: mongoose.Types.ObjectId,
    ref: "Technician",
    required: [true, "Route technician is required."],
  },
  day: {
    type: String, // monday, tuesday, wednesday et.
    lowercase: true,
    trim: true,
  },
  customerAccounts: {
    type: [
      {
        type: mongoose.Types.ObjectId,
        ref: "CustomerAccount",
      },
    ],
  },
});

module.exports = mongoose.model("ServiceRoute", serviceRouteSchema);
