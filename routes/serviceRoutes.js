// npm modules
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const async = require("async");

// Local modules
const Company = require("../models/Company");
const Technician = require("../models/Technician");
const CustomerAccount = require("../models/CustomerAccount");
const ServiceRoute = require("../models/ServiceRoute");

const apiResponse = require("../helpers/apiResponse");
const formatErrors = require("../helpers/formatErrors");
const verifyJwt = require("../helpers/verifyJwt");
const authorizeRoles = require("../helpers/authorizeRoles");
const roles = require("../helpers/roles");
const validateReferentialIntegrity = require("../helpers/validateReferentialIntegrity");

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
    async.parallel(
      [
        async function () {
          // Verify existence of the technician.
          return {
            isValid: await validateReferentialIntegrity(
              req.body.technicianId,
              "Technician"
            ),
            message: "Invalid technician.",
          };
        },
        async function () {
          // verify existence of the customer account.
          return {
            isValid: await validateReferentialIntegrity(
              req.body.customerAccountId,
              "CustomerAccount"
            ),
            message: "Invalid customer account.",
          };
        },
      ],
      (error, results) => {
        if (error) {
          // Format any errors that are thrown from async.parallel
          const errorList = formatErrors(error);
          return next(new Error(errorList));
        }

        // format any error messages after verifying model existence
        const errors = results
          .map((result) => {
            if (!result.isValid) {
              return new Error(result.message);
            }
          })
          .filter((item) => item);

        if (errors.length) {
          const formattedErrorList = formatErrors(errors);
          res.status(400);
          next(new Error(formattedErrorList));
        } else {
          next();
        }
      }
    );
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
      res.sendStatus(201);
    } catch (error) {
      console.log(error);
      const errorList = formatErrors(error);
      res.status(400);
      next(new Error(errorList));
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

    return next(new Error("Invalid service route id."));
  },
  async (req, res, next) => {
    // Try to perform the mongoose update.
    try {
      const serviceRouteId = new mongoose.Types.ObjectId(
        req.body.serviceRouteId
      );
      const companyId = new mongoose.Types.ObjectId(req.token.c_id);
      const results = await ServiceRoute.findOneAndUpdate(
        { _id: serviceRouteId, companyId },
        req.body
      );

      if (!results) {
        throw new Error("Unable to update the service route.");
      }

      res.sendStatus(200);
    } catch (error) {
      const errorList = formatErrors(error);
      res.status(400);
      next(new Error(errorList));
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
