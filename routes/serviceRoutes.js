// npm modules
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// Local modules
const {
  Company,
  Technician,
  CustomerAccount,
  ServiceRoute,
} = require("../models");
const {
  apiResponse,
  formatErrors,
  verifyJwt,
  authorizeRoles,
  roles,
} = require("../helpers");

router.post("/new", [
  verifyJwt,
  authorizeRoles(roles.ADMIN),
  async (req, res, next) => {
    // verify company existence.
    try {
      const companyId = new mongoose.Types.ObjectId(req.token.c_id);
      const companyExists = await Company.countDocuments({
        _id: companyId,
      });
      if (!companyExists) {
        next(new Error("That company doesn't exist."));
      }
    } catch (error) {
      next(new Error("Invalid company id."));
    }
    // find the technician. return error if not found.
    try {
      const technicianId = new mongoose.Types.ObjectId(req.body.technicianId);
      const technician = await Technician.countDocuments({ _id: technicianId });
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
      const customerAccountExists = await CustomerAccount.countDocuments({
        _id: customerAccountId,
      });
      if (!customerAccountExists) {
        next(new Error("That customer account doesn't exist."));
      }
    } catch (error) {
      next(new Error("Invalid customer account id."));
    }
    next();
  },
  async (req, res) => {
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
      res
        .status(200)
        .json(apiResponse({ message: "Successfully created a new route." }));
    } catch (error) {
      console.log(error);
      const errorList = formatErrors(error);
      return res.status(400).json(apiResponse({ errors: errorList }));
    }
  },
]);

router.get("/all", [
  verifyJwt,
  authorizeRoles(roles.TECH), //Authorize for techs and higher.
  async (req, res, next) => {
    try {
      const companyId = req.token.c_id;
      const serviceRouteList = await ServiceRoute.find({
        companyId: companyId,
      }).populate({
        path: "technician",
        select: "-_id firstName lastName",
      });
      res
        .status(200)
        .json(apiResponse({ data: { serviceRoutes: serviceRouteList } }));
    } catch (error) {
      const errorList = formatErrors(error);
      next(new Error(errorList));
    }
  },
]);

router.post("/update", [
  verifyJwt,
  authorizeRoles(roles.MANAGER),
  async (req, res, next) => {
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
        return next(new Error("Unable to update the service route."));
      }

      res
        .status(200)
        .json(
          apiResponse({ message: "Successfully updated the service route." })
        );
    } catch (error) {
      const errorList = formatErrors(error);
      res.status(500);
      next(new Error(errorList));
    }
  },
]);

router.post("/delete", [
  verifyJwt,
  authorizeRoles(roles.ADMIN),
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
        res
          .status(200)
          .json(
            apiResponse({ message: "Successfully deleted a service route." })
          );
      } else {
        next(new Error("That service route could not be deleted."));
      }
    } catch (error) {
      const errorList = formatErrors(error);
      next(new Error(errorList));
    }
  },
]);

module.exports = router;
