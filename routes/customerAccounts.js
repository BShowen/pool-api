// npm modules
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// local modules
const {
  apiResponse,
  formatErrors,
  verifyJwt,
  authorizeRoles,
  roles,
} = require("../helpers");
const { Company, CustomerAccount } = require("../models");

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
      return res.status(200).json(
        apiResponse({
          message: "Successfully created a new customer account.",
        })
      );
    } catch (err) {
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
      res
        .status(500)
        .json(apiResponse({ errors: [{ message: error.message }] }));
    }
  }
);

module.exports = router;
