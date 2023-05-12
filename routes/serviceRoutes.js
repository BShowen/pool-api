// npm modules
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// Local modules
const apiResponse = require("../helpers/apiResponse");
const verifyJwt = require("../helpers/verifyJwt");
const authorizeRoles = require("../helpers/authorizeRoles");
const roles = require("../helpers/roles");

// Models
const CustomerAccount = require("../models/CustomerAccount");
const Technician = require("../models/Technician");

/**
 * Get the service route for a particular technician.
 * Returns a list of customers grouped by customerAccount.serviceDay
 * Success: Return status 200 with a list of customerAccounts.
 * Error: Return status 400.
 */
router.get("/:id", [
  verifyJwt,
  authorizeRoles(roles.TECH),
  async (req, res, next) => {
    try {
      const companyId = new mongoose.Types.ObjectId(req.token.c_id);
      const technicianId = new mongoose.Types.ObjectId(req.params.id);
      const routes = await CustomerAccount.aggregate([
        { $match: { technicianId, companyId } },
        {
          $group: {
            _id: "$serviceDay",
            customers: { $push: "$$ROOT" },
            total: { $sum: "$price" },
            count: { $sum: 1 },
          },
        },
      ]);
      res.status(200).json(apiResponse({ data: { routes } }));
    } catch (error) {
      console.log(error);
      res.status(400);
      next(error);
    }
  },
]);

module.exports = router;
