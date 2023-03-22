// npm modules
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const async = require("async");

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
      res.status(500);
      next(new Error("Error hashing password."));
    }
  },
  async (req, res, next) => {
    try {
      const alreadyExists = await Technician.countDocuments({
        emailAddress: req.body.emailAddress,
      });
      if (alreadyExists) {
        throw new Error("A technician with that email already exists.");
      }
      const newTechnician = new Technician(req.body);
      await newTechnician.save();
      return res.status(200).json(
        apiResponse({
          data: {
            technician: {
              id: newTechnician._id.toString(),
              firstName: newTechnician.firstName,
              lastName: newTechnician.lastName,
            },
          },
          message: "Successfully created a new technician.",
        })
      );
    } catch (err) {
      const errorList = formatErrors(err);
      res.status(400);
      next(new Error(errorList));
    }
  },
]);

router.get("/all", [
  verifyJwt,
  authorizeRoles(roles.MANAGER),
  async (req, res, next) => {
    try {
      const companyId = new mongoose.Types.ObjectId(req.token.c_id);
      const technicianList = await Technician.find(
        { companyId: companyId },
        "-_id firstName lastName"
      );
      res
        .status(200)
        .json(apiResponse({ data: { technicians: technicianList } }));
    } catch (error) {
      const errorList = formatErrors(error);
      next(errorList);
    }
  },
]);

router.post("/delete", [
  verifyJwt,
  authorizeRoles(roles.ADMIN),
  async (req, res, next) => {
    try {
      const techId = new mongoose.Types.ObjectId(req.body.technicianId);
      const result = await Technician.deleteOne({ _id: techId });
      if (result.deletedCount > 0) {
        res.status(200).json(
          apiResponse({
            message: "Successfully deleted a technician.",
          })
        );
      } else {
        res.status(200).json(
          apiResponse({
            message: "Could not find a technician with that id.",
          })
        );
      }
    } catch (error) {
      res.status(400);
      next(new Error("Invalid technician id."));
    }
  },
]);

module.exports = router;
