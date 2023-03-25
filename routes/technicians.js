// npm modules
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const async = require("async");

// Local modules
const Technician = require("../models/Technician");
const Company = require("../models/Company");

const apiResponse = require("../helpers/apiResponse");
const formatErrors = require("../helpers/formatErrors");
const verifyJwt = require("../helpers/verifyJwt");
const authorizeRoles = require("../helpers/authorizeRoles");
const roles = require("../helpers/roles");
const validateReferentialIntegrity = require("../helpers/validateReferentialIntegrity");

router.post("/new", [
  verifyJwt,
  authorizeRoles(roles.MANAGER),
  async (req, res, next) => {
    const companyExists = await validateReferentialIntegrity(
      req.token.c_id,
      "Company"
    );
    if (companyExists) return next();

    return next(new Error("Invalid token id."));
  },
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

      /*-------------------------------------------------*/
      const companyExists = await validateReferentialIntegrity(
        req.token.c_id,
        "Company"
      );
      if (!companyExists) {
        delete req.body.companyId;
      }
      /*-------------------------------------------------*/
      req.body.companyId = req.token.c_id;
      const newTechnician = new Technician(req.body);
      await newTechnician.save();
      return res.status(201).json(
        apiResponse({
          data: {
            technician: {
              id: newTechnician._id.toString(),
              firstName: newTechnician.firstName,
              lastName: newTechnician.lastName,
            },
          },
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
    const companyExists = await validateReferentialIntegrity(
      req.token.c_id,
      "Company"
    );
    if (companyExists) return next();

    return next(new Error("Invalid token id."));
  },
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
      res.status(400);
      const errorList = formatErrors(error);
      next(new Error(errorList));
    }
  },
]);

router.post("/delete", [
  verifyJwt,
  authorizeRoles(roles.ADMIN),
  async (req, res, next) => {
    const companyExists = await validateReferentialIntegrity(
      req.token.c_id,
      "Company"
    );
    if (companyExists) return next();

    return next(new Error("Invalid token id."));
  },
  async (req, res, next) => {
    try {
      const techId = new mongoose.Types.ObjectId(req.body.technicianId);
      const result = await Technician.deleteOne({ _id: techId });
      if (result.deletedCount > 0) {
        res.sendStatus(204);
      } else {
        res.status(404);
        next(new Error("A technician with that id could not be found."));
      }
    } catch (error) {
      res.status(400);
      next(new Error("Invalid technician id."));
    }
  },
]);

router.post("/update", [
  verifyJwt,
  authorizeRoles(roles.MANAGER),
  async (req, res, next) => {
    const companyExists = await validateReferentialIntegrity(
      req.token.c_id,
      "Company"
    );
    if (companyExists) return next();

    return next(new Error("Invalid token id."));
  },
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
      const techId = new mongoose.Types.ObjectId(req.body.technicianId);
      const results = await Technician.findOneAndUpdate(
        { _id: techId },
        req.body
      );

      if (!results) {
        throw new Error("Unable to update the technician.");
      }

      res.sendStatus(200);
    } catch (error) {
      res.status(400);
      next(new Error("Invalid technician id."));
    }
  },
]);

module.exports = router;
