// npm modules
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");

// local modules
const Company = require("../models/Company");
const apiResponse = require("../helpers/apiResponse");
const signJwt = require("../helpers/signJwt");
const customerAccountsRoute = require("./customerAccounts");
const technicianRoute = require("./technicians");
const serviceRouteRoute = require("./serviceRoutes");
const ExtendedError = require("../helpers/ExtendedError");

router.post("/signup", [
  async (req, res, next) => {
    // Check to make sure company doesn't already exist.
    try {
      const company = await Company.findOne({
        email: req.body.email,
      });
      if (!!company) {
        res.status(400);
        return next(new Error("That company email is already in use."));
      } else {
        next();
      }
    } catch (err) {
      console.log("Error querying DB for email", err);
      res.sendStatus(500);
    }
  },
  async (req, res, next) => {
    // Create Company and save to the DB.
    try {
      const savedCompany = await new Company(req.body).save();
      const apiToken = signJwt(
        {
          c_id: savedCompany._id,
          roles: savedCompany.owner.roles,
          c_email: savedCompany.email,
        },
        {
          expiresIn: process.env.JWT_MAX_AGE,
        }
      );
      res.status(201).json(apiResponse({ data: apiToken }));
    } catch (err) {
      res.status(400);
      next(err);
    }
  },
]);

router.post("/login", [
  (req, res, next) => {
    const email = req.body.email?.toLowerCase();
    const password = req.body.password;

    const errors = [];

    if (email === undefined) {
      errors.push(new ExtendedError("Email is required.", "email"));
    }

    if (password === undefined) {
      errors.push(new ExtendedError("Password is required.", "password"));
    }

    if (errors.length) {
      res.status(400);
      return next(errors);
    }
    next();
  },
  async (req, res, next) => {
    // Get the email and password from request.
    const email = req.body.email?.toLowerCase();
    const password = req.body.password;
    try {
      // Retrieve just the email and password for the company owner.
      const company = await Company.findOne({ email });
      if (!company) {
        throw new ExtendedError("Invalid email.", "email");
      }

      // Compare passwords.
      if (bcrypt.compareSync(password, company.owner.password)) {
        // Return 200 status with api key if matched
        const apiToken = signJwt(
          { c_id: company._id, roles: company.owner.roles, c_email: email },
          { expiresIn: process.env.JWT_MAX_AGE }
        );
        res.status(200).json(apiResponse({ data: { token: apiToken } }));
      } else {
        throw new ExtendedError("Invalid password.", "password");
      }
    } catch (error) {
      // Return 401 status with error message if not matched.
      res.status(401);
      next(error);
    }
  },
]);

router.use("/customer-accounts", customerAccountsRoute);

router.use("/technicians", technicianRoute);

router.use("/routes", serviceRouteRoute);

module.exports = router;
