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

/**
 * Return an array of routes.
 * Each element in the array is a route-object.
 * A route object has a technician field and a customers field.
 * The technician field is an object with _id, firstName, lastName.
 * The customers field is an array of customer-accounts.
 * [
 *   {
 *     technician: {_id, firstName, lastName},
 *     customers: [{customerAccount}, {customerAccount}, ... ]
 *   },
 *   {
 *     technician: {_id, firstName, lastName},
 *     customers: [{customerAccount}, {customerAccount}, ... ]
 *   },
 *   ...
 * ]
 */
router.get("/all", [
  verifyJwt,
  authorizeRoles(roles.ADMIN),
  async (req, res, next) => {
    try {
      const companyId = new mongoose.Types.ObjectId(req.token.c_id);
      const routes = await CustomerAccount.aggregate([
        { $match: { companyId } },
        {
          $lookup: {
            from: "technicians",
            localField: "technicianId",
            foreignField: "_id",
            as: "technician",
          },
        },
        {
          $group: {
            _id: {
              technicianId: { $arrayElemAt: ["$technician._id", 0] },
              firstName: { $arrayElemAt: ["$technician.firstName", 0] },
              lastName: { $arrayElemAt: ["$technician.lastName", 0] },
            },
            customers: { $push: "$$ROOT" },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            technician: {
              _id: "$_id.technicianId",
              firstName: "$_id.firstName",
              lastName: "$_id.lastName",
            },
            customers: 1,
            count: 1,
          },
        },
      ]);
      return res.status(200).json(apiResponse({ data: { routes } }));
    } catch (error) {
      console.log(error);
      res.status(400);
      next(error);
    }
  },
]);

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
