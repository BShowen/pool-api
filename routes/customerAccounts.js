// npm modules
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// local modules
const apiResponse = require("../helpers/apiResponse");
const verifyJwt = require("../helpers/verifyJwt");
const authorizeRoles = require("../helpers/authorizeRoles");
const roles = require("../helpers/roles");
const validateReferentialIntegrity = require("../helpers/validateReferentialIntegrity");
const CustomerAccount = require("../models/CustomerAccount");
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
      req.body.companyId = req.token.c_id;
      req.body.accountOwners = JSON.parse(req.body.accountOwners || "[]");
      const newCustomerAccount = new CustomerAccount(req.body);
      await newCustomerAccount.save();
      res.status(201);
      res.json(apiResponse({ data: newCustomerAccount }));
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
      const customerAccountList = await CustomerAccount.find(
        { companyId: companyId },
        "accountName"
      );
      if (!customerAccountList) {
        // The company isn't in the DB. This can happen when a company is
        // deleted and then the apiToken same is still used.
        throw new Error("Cannot find that company.");
      }
      res
        .status(200)
        .json(apiResponse({ data: { accounts: customerAccountList } }));
    } catch (error) {
      res.status(400);
      next(error);
    }
  },
]);

router.post("/updateAccount", [
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
      if (!mongoose.Types.ObjectId.isValid(req.body.customerAccountId)) {
        // Make sure provided account id is valid mongoose id.
        throw new ExtendedError(
          "Invalid customer account id.",
          "customerAccountId"
        );
      }

      const results = await CustomerAccount.findOneAndUpdate(
        {
          _id: req.body.customerAccountId,
          companyId: req.token.c_id,
        },
        { ...req.body },
        { new: true, runValidators: true }
      );
      res.json(apiResponse({ data: results }));
    } catch (error) {
      console.log(error);
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
    try {
      if (!mongoose.Types.ObjectId.isValid(req.body.customerAccountId)) {
        // Make sure provided account id is valid mongoose id.
        throw new ExtendedError(
          "Invalid customer account id.",
          "customerAccountId"
        );
      }

      const { deletedCount } = await CustomerAccount.deleteOne({
        _id: req.body.customerAccountId,
        companyId: req.token.c_id,
      });

      if (deletedCount) {
        res.sendStatus(204);
      } else {
        throw new ExtendedError("That account couldn't be deleted.");
      }
    } catch (error) {
      res.status(400);
      next(error);
    }
  },
]);

module.exports = router;
