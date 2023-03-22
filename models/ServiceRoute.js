const mongoose = require("mongoose");
const Schema = mongoose.Schema;

function toLowerCase(value) {
  return value.trim().toLowerCase();
}

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
    set: toLowerCase,
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
