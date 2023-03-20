// npm modules
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

// local modules
const { Company, CustomerAccount } = require("../models");
const {
  apiResponse,
  formatMongooseErrors,
  signJwt,
  verifyJwt,
  authorizeRoles,
  roles,
} = require("../helpers");

router.post("/signup", [
  async (req, res, next) => {
    // Check to make sure company doesn't already exist.
    try {
      const company = await Company.findOne({
        email: req.body.email,
      });
      if (!!company) {
        return res.status(200).json(
          apiResponse({
            errors: [{ message: "That company email is already in use." }],
          })
        );
      } else {
        next();
      }
    } catch (err) {
      console.log("Error querying DB for email", err);
      res.sendStatus(500);
    }
  },
  async (req, res, next) => {
    /**
     * Hash the password, if it was provided.
     * If no password was provided then this middleware gets skipped and
     * mongoose validation will handle the missing password.
     */
    if (!req.body.owner.password) return next();

    try {
      req.body.owner.password = await bcrypt.hash(req.body.owner.password, 10);
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
    // Create Company and save to the DB.
    try {
      const savedCompany = await new Company(req.body).save();
      const apiToken = signJwt(
        { c_id: savedCompany._id, roles: savedCompany.owner.roles },
        {
          expiresIn: process.env.JWT_MAX_AGE,
        }
      );
      res.status(200).json(apiResponse({ data: apiToken }));
    } catch (err) {
      const errorList = formatMongooseErrors(err);
      return res.status(400).json(apiResponse({ errors: errorList }));
    }
  },
]);

router.post("/login", [
  (req, res, next) => {
    const email = req.body.email?.toLowerCase();
    const password = req.body.password;

    const errors = [];

    if (email === undefined) {
      errors.push({ message: "Email is required." });
    }

    if (password === undefined) {
      errors.push({ message: "Password is required." });
    }

    if (errors.length) {
      return res.status(400).json(apiResponse({ errors }));
    }
    next();
  },
  async (req, res) => {
    // Get the email and password from request.
    const email = req.body.email?.toLowerCase();
    const password = req.body.password;
    try {
      // Retrieve just the email and password for the company owner.
      const company = await Company.findOne({ email });
      if (!company) {
        throw new Error("Invalid email.");
      }

      // Compare passwords.
      if (bcrypt.compareSync(password, company.owner.password)) {
        // Return 200 status with api key if matched
        const apiToken = signJwt(
          { c_id: company._id, roles: company.owner.roles },
          { expiresIn: process.env.JWT_MAX_AGE }
        );
        res.status(200).json(apiResponse({ data: apiToken }));
      } else {
        throw new Error("Invalid password.");
      }
    } catch (error) {
      // Return 401 status with error message if not matched.
      res
        .status(401)
        .json(apiResponse({ errors: [{ message: error.message }] }));
    }
  },
]);

router.post("/new-account", [
  verifyJwt,
  authorizeRoles(roles.MANAGER),
  async (req, res) => {
    try {
      const companyId = new mongoose.Types.ObjectId(req.token.c_id);
      const company = await Company.findById(companyId);
      company.accounts.push(company.accounts.create(req.body));
      await company.save();
      return res.status(200).json(
        apiResponse({
          message: "Successfully created a new customer account.",
        })
      );
    } catch (err) {
      console.log(err);
      const errorList = formatMongooseErrors(err);
      return res.status(400).json(apiResponse({ errors: errorList }));
    }
  },
]);

router.get(
  "/all-accounts",
  [verifyJwt, authorizeRoles(roles.MANAGER)],
  async (req, res) => {
    try {
      const companyId = new mongoose.Types.ObjectId(req.token.c_id);
      const accounts = await Company.findById(
        companyId,
        "-_id accounts.accountName"
      ).exec();
      res.status(200).json(apiResponse({ data: accounts }));
    } catch (error) {
      res
        .status(500)
        .json(apiResponse({ errors: [{ message: error.message }] }));
    }
  }
);

router.post("/new-technician", [
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
      const company = await Company.findById(companyId);
      company.technicians.push(company.technicians.create(req.body));
      await company.save();
      return res.status(200).json(
        apiResponse({
          message: "Successfully created a new technician.",
        })
      );
    } catch (err) {
      console.log(err);
      const errorList = formatMongooseErrors(err);
      return res.status(400).json(apiResponse({ errors: errorList }));
    }
  },
]);

router.get(
  "/all-technicians",
  [verifyJwt, authorizeRoles(roles.MANAGER)],
  async (req, res) => {
    try {
      const companyId = new mongoose.Types.ObjectId(req.token.c_id);
      const accounts = await Company.findById(
        companyId,
        "-_id technicians.firstName technicians.lastName"
      ).exec();

      res.status(200).json(apiResponse({ data: accounts }));
    } catch (error) {
      res
        .status(500)
        .json(apiResponse({ errors: [{ message: error.message }] }));
    }
  }
);
module.exports = router;
