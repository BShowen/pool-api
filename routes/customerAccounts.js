// npm modules
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// local modules
const apiResponse = require("../helpers/apiResponse");
const formatErrors = require("../helpers/formatErrors");
const verifyJwt = require("../helpers/verifyJwt");
const authorizeRoles = require("../helpers/authorizeRoles");
const roles = require("../helpers/roles");

const Company = require("../models/Company");
const CustomerAccount = require("../models/CustomerAccount");

router.post("/new", [
  verifyJwt,
  authorizeRoles(roles.MANAGER),
  async (req, res) => {
    try {
      const companyId = new mongoose.Types.ObjectId(req.token.c_id);
      const companyExists = await Company.countDocuments({ _id: companyId });

      if (!companyExists) {
        // The company isn't in the DB. This can happen when a company is
        // deleted and then the same apiToken is still used.
        throw new Error("Cannot find that company.");
      }
      const newCustomerAccount = new CustomerAccount(req.body);
      await newCustomerAccount.save();
      return res.sendStatus(201);
    } catch (err) {
      const errorList = formatErrors(err);
      res.status(400);
      next(new Error(errorList));
    }
  },
]);

router.get(
  "/all",
  [verifyJwt, authorizeRoles(roles.MANAGER)],
  async (req, res) => {
    try {
      const companyId = new mongoose.Types.ObjectId(req.token.c_id);
      const customerAccountList = await CustomerAccount.find(
        { companyId: companyId },
        "-_id accountName"
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
      const errorList = formatErrors(error);
      next(new Error(errorList));
    }
  }
);

module.exports = router;
