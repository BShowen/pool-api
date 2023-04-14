// npm modules
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// Local modules
const Technician = require("../models/Technician");
const apiResponse = require("../helpers/apiResponse");
const verifyJwt = require("../helpers/verifyJwt");
const authorizeRoles = require("../helpers/authorizeRoles");
const roles = require("../helpers/roles");
const validateReferentialIntegrity = require("../helpers/validateReferentialIntegrity");
const ExtendedError = require("../helpers/ExtendedError");

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
      res.status(400);
      next(err);
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
        "firstName lastName"
      );
      res
        .status(200)
        .json(apiResponse({ data: { technicians: technicianList } }));
    } catch (error) {
      res.status(400);
      next(error);
    }
  },
]);

router.get("/:id", [
  verifyJwt,
  authorizeRoles(roles.TECH),
  async (req, res, next) => {
    try {
      const companyId = new mongoose.Types.ObjectId(req.token.c_id);
      const technicianId = new mongoose.Types.ObjectId(req.params.id);
      const technicianAccount = await Technician.findOne(
        { companyId: companyId, _id: technicianId },
        "-password"
      );
      if (!technicianAccount) {
        throw new Error("Cannot find that customer.");
      }
      res
        .status(200)
        .json(apiResponse({ data: { technician: technicianAccount } }));
    } catch (error) {
      res.status(400);
      next(error);
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
    if (!req.body.technicianId) {
      // Verify that required param has been sent.
      next(new ExtendedError("Technician id is required.", "technicianId"));
    }

    if (!mongoose.Types.ObjectId.isValid(req.body.technicianId)) {
      // Validate the technicianId
      next(new ExtendedError("Invalid technician id.", "technicianId"));
    }

    try {
      const techId = new mongoose.Types.ObjectId(req.body.technicianId);
      const result = await Technician.deleteOne({ _id: techId });
      if (result.deletedCount > 0) {
        res.sendStatus(204);
      } else {
        res.status(404);
        next(
          new ExtendedError(
            "A technician with that id could not be found.",
            "technicianId"
          )
        );
      }
    } catch (error) {
      res.status(400);
      next(error);
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
    if (!req.body.technicianId) {
      // Verify that required param has been sent.
      res.status(400);
      return next(
        new ExtendedError("Technician id is required.", "technicianId")
      );
    }

    if (!mongoose.Types.ObjectId.isValid(req.body.technicianId)) {
      // Validate the technicianId
      res.status(400);
      return next(new ExtendedError("Invalid technician id.", "technicianId"));
    }

    try {
      const techId = new mongoose.Types.ObjectId(req.body.technicianId);
      const results = await Technician.findOneAndUpdate(
        { _id: techId },
        req.body,
        { new: true }
      );
      if (results) {
        res.status(200);
        delete results._doc.password;
        delete results._doc.companyId;
        delete results._doc.__v;
        res.json(apiResponse({ data: results }));
      } else {
        res.sendStatus(400);
      }
    } catch (error) {
      res.status(400);
      next(error);
    }
  },
]);

module.exports = router;
