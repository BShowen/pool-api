// npm modules
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// Local modules
const ServiceRoute = require("../models/ServiceRoute");
const apiResponse = require("../helpers/apiResponse");
const verifyJwt = require("../helpers/verifyJwt");
const authorizeRoles = require("../helpers/authorizeRoles");
const roles = require("../helpers/roles");
const validateReferentialIntegrity = require("../helpers/validateReferentialIntegrity");
const ExtendedError = require("../helpers/ExtendedError");

router.post("/new", [
  verifyJwt,
  authorizeRoles(roles.ADMIN),
  async (req, res, next) => {
    // verify existence of the company in the jwt.
    const companyExists = await validateReferentialIntegrity(
      req.token.c_id,
      "Company"
    );
    if (companyExists) return next();

    return next(new Error("Invalid token id."));
  },
  async (req, res, next) => {
    // Validate model existence.
    const errorList = [];

    const technicianValid = await validateReferentialIntegrity(
      req.body.technicianId,
      "Technician"
    );
    if (!technicianValid) {
      errorList.push(new ExtendedError("Invalid technician.", "technicianId"));
    }

    const customerAccountValid = await validateReferentialIntegrity(
      req.body.customerAccountId,
      "CustomerAccount"
    );
    if (!customerAccountValid) {
      errorList.push(
        new ExtendedError("Invalid customer account.", "customerAccountId")
      );
    }

    if (errorList.length) {
      res.status(400);
      next(errorList);
    } else {
      next();
    }
  },
  async (req, res, next) => {
    // Try to create a new service route.
    try {
      const {
        technicianId: technician,
        customerAccountId: customerAccounts,
        day,
      } = req.body;
      const newRoute = new ServiceRoute({
        companyId: req.token.c_id,
        technician,
        customerAccounts,
        day,
      });
      await newRoute.save();
      delete newRoute._doc.companyId;
      delete newRoute._doc.__v;
      res.status(201);
      res.json(apiResponse({ data: newRoute }));
    } catch (error) {
      res.status(400);
      next(error);
    }
  },
]);

router.get("/all", [
  verifyJwt,
  authorizeRoles(roles.TECH), //Authorize for techs and higher.
  async (req, res, next) => {
    // Verify the existence of the company in the jwt.
    const companyExists = await validateReferentialIntegrity(
      req.token.c_id,
      "Company"
    );
    if (companyExists) return next();

    return next(new Error("Invalid token id."));
  },
  async (req, res, next) => {
    // Try to retrieve a list of service routes from the db.
    try {
      const companyId = req.token.c_id;
      const serviceRouteList = await ServiceRoute.find({
        companyId: companyId,
      })
        .populate({
          path: "technician",
          select: "-_id firstName lastName",
        })
        .populate({
          path: "customerAccounts",
          select: "accountName",
        });
      res
        .status(200)
        .json(apiResponse({ data: { serviceRoutes: serviceRouteList } }));
    } catch (error) {
      const errorList = formatErrors(error);
      res.status(400);
      next(new Error(errorList));
    }
  },
]);

router.post("/update", [
  verifyJwt,
  authorizeRoles(roles.MANAGER),
  async (req, res, next) => {
    // Verify the existence of the company in the jwt.
    const companyExists = await validateReferentialIntegrity(
      req.token.c_id,
      "Company"
    );
    if (companyExists) return next();

    return next(new Error("Invalid token id."));
  },
  async (req, res, next) => {
    // Verify existence of the service route.
    const modelExists = await validateReferentialIntegrity(
      req.body?.serviceRouteId,
      "ServiceRoute"
    );
    if (modelExists) return next();

    next(new ExtendedError("Invalid service route.", "serviceRouteId"));
  },
  async (req, res, next) => {
    // Try to perform the mongoose update.
    try {
      const serviceRouteId = new mongoose.Types.ObjectId(
        req.body.serviceRouteId
      );
      const companyId = new mongoose.Types.ObjectId(req.token.c_id);
      const serviceRoute = await ServiceRoute.findOne({
        _id: serviceRouteId,
        companyId,
      });

      /*----------------------------------------------------------------------*/
      // Update the customer accounts array only if customerAccounts field
      // was provided.
      if (Object.hasOwn(req.body, "customerAccounts")) {
        // Update the customer accounts array.

        if (!Array.isArray(req.body.customerAccounts)) {
          // Convert customerAccount to array if its not an array.
          req.body.customerAccounts = [req.body.customerAccounts];
        }

        if (req.body.customerAccounts.length === 0) {
          // Remove all customer accounts if empty array was provided.
          serviceRoute.customerAccounts = [];
        } else {
          // Insert provided customer accounts into customer accounts array.
          req.body.customerAccounts.forEach((newAccount) => {
            if (mongoose.Types.ObjectId.isValid(newAccount)) {
              serviceRoute.customerAccounts.push(newAccount);
            } else {
              throw new ExtendedError(
                "Invalid customer account id.",
                "customerAccounts"
              );
            }
          });
        }

        // Remove customer accounts field. Its no longer needed.
        delete req.body.customerAccounts;
      }
      /*----------------------------------------------------------------------*/

      serviceRoute.set({ ...req.body });
      const updatedDoc = await serviceRoute.save().then((results) => {
        return results.populate({
          path: "customerAccounts",
          select: "accountName",
        });
      });
      if (updatedDoc) {
        delete updatedDoc._doc.companyId;
        delete updatedDoc._doc.__v;
        res.status(200);
        res.json(apiResponse({ data: updatedDoc }));
      } else {
        res.sendStatus(400);
      }
    } catch (error) {
      next(error);
    }
  },
]);

router.post("/delete", [
  verifyJwt,
  authorizeRoles(roles.ADMIN),
  async (req, res, next) => {
    // Verify the existence of the company in the jwt.
    const companyExists = await validateReferentialIntegrity(
      req.token.c_id,
      "Company"
    );
    if (companyExists) return next();

    return next(new Error("Invalid token id."));
  },
  async (req, res, next) => {
    // Verify the existence of the company in the jwt.
    const modelExists = await validateReferentialIntegrity(
      req.body.serviceRouteId,
      "ServiceRoute"
    );
    if (modelExists) return next();

    return next(new Error("Invalid service route id."));
  },
  async (req, res, next) => {
    try {
      const serviceRouteId = new mongoose.Types.ObjectId(
        req.body.serviceRouteId
      );
      const companyId = new mongoose.Types.ObjectId(req.token.c_id);
      const { deletedCount } = await ServiceRoute.deleteOne({
        _id: serviceRouteId,
        companyId,
      });
      if (deletedCount > 0) {
        res.sendStatus(204);
      } else {
        res.status(404);
        next(new Error("A service route with that id doesn't exist."));
      }
    } catch (error) {
      const errorList = formatErrors(error);
      next(new Error(errorList));
    }
  },
]);

module.exports = router;
