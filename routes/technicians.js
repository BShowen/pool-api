// npm modules
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

// Local modules
const { Company, Technician, CustomerAccount } = require("../models");
const {
  apiResponse,
  formatErrors,
  verifyJwt,
  authorizeRoles,
  roles,
} = require("../helpers");

router.post("/new", [
  verifyJwt,
  authorizeRoles(roles.MANAGER),
  async (req, res, next) => {
    /**
     * Hash the password, if it was provided.
     * If no password was provided then this middleware gets skipped and
     * mongoose validation will handle the missing password.
     */
    if (!req.body.password) return next();

    try {
      req.body.password = await bcrypt.hash(req.body.password, 10);
      next();
    } catch (err) {
      return res.status(500).json(
        apiResponse({
          errors: [{ message: "Error hashing password" }],
        })
      );
    }
  },
  async (req, res) => {
    try {
      const companyId = new mongoose.Types.ObjectId(req.token.c_id);
      const company = await Company.countDocuments({ _id: companyId });

      if (!company) {
        // The company isn't in the DB. This can happen when a company is
        // deleted and then the same apiToken is still used.
        throw new Error("Cannot find that company.");
      }
      const techs = await Technician.countDocuments({
        emailAddress: req.body.emailAddress,
      });
      if (techs > 0) {
        throw new Error("A technician with that email already exists.");
      }
      const newTechnician = new Technician(req.body);
      await newTechnician.save();
      return res.status(200).json(
        apiResponse({
          message: "Successfully created a new technician.",
        })
      );
    } catch (err) {
      console.log(err);
      const errorList = formatErrors(err);
      return res.status(400).json(apiResponse({ errors: errorList }));
    }
  },
]);

router.get(
  "/all",
  [verifyJwt, authorizeRoles(roles.MANAGER)],
  async (req, res) => {
    try {
      const companyId = new mongoose.Types.ObjectId(req.token.c_id);
      const technicianList = await Technician.find(
        { companyId: companyId },
        "-_id firstName lastName"
      );
      if (!technicianList) {
        // The company isn't in the DB. This can happen when a company is
        // deleted and then the same apiToken is still used.
        throw new Error("Cannot find that company.");
      }

      res
        .status(200)
        .json(apiResponse({ data: { technicians: technicianList } }));
    } catch (error) {
      res
        .status(500)
        .json(apiResponse({ errors: [{ message: error.message }] }));
    }
  }
);

router.post("/routes/add", [
  verifyJwt,
  authorizeRoles(roles.ADMIN),
  async (req, res, next) => {
    // find the technician. return error if not found.
    try {
      const technicianId = new mongoose.Types.ObjectId(req.body.technicianId);
      const technician = await Technician.findById(technicianId);
      if (!technician) {
        next(new Error("That technician doesn't exist."));
      }
    } catch (error) {
      next(new Error("Invalid technician id."));
    }
    // find the customer account. return error if not found.
    try {
      const customerAccountId = new mongoose.Types.ObjectId(
        req.body.customerAccountId
      );
      const customerAccountExists = CustomerAccount.countDocuments({
        id: customerAccountId,
      });
      if (!customerAccountExists) {
        next(new Error("That customer account doesn't exist."));
      }
    } catch (error) {
      next(new Error("Invalid customer account id."));
    }
    // check for duplicate addition. return error if duplicate.

    next();
  },
  (req, res, next) => {
    next();
  },
  (req, res) => {
    res.send("Not implemented");
  },
  (err, req, res, next) => {
    res.json(apiResponse({ errors: formatErrors(err) }));
  },
]);

module.exports = router;
