// npm modules
const mongoose = require("mongoose");

// local modules
const models = {
  Company: require("../models/Company"),
  CustomerAccount: require("../models/CustomerAccount"),
  ServiceRoute: require("../models/ServiceRoute"),
  Technician: require("../models/Technician"),
};

/**
 * A function that receives a mongooseId, and model name
 * Returns boolean indicating existence of the model in the DB.
 */
async function validateReferentialIntegrity(mongooseId, modelName) {
  // Verify that the mongooseId is valid
  if (mongoose.Types.ObjectId.isValid(mongooseId)) {
    // Create a mongooseId from the provided id.
    const modelId = new mongoose.Types.ObjectId(mongooseId);
    // Get the correct model to perform a query.
    const Model = models[modelName];
    // Query and get a count of matching documents.
    const count = await Model.countDocuments({ _id: modelId });
    // Return boolean indicating documents exists or not.
    return count > 0;
  }

  // If the mongooseId is not valid.
  return false;
}

module.exports = validateReferentialIntegrity;
