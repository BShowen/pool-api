// npm modules
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");

// local modules
const { Company } = require("../models");
const { apiResponse, formatMongooseErrors, signJwt } = require("../helpers");

router.post("/signup", [
  async (req, res, next) => {
    // Check to make sure company doesn't already exist.
    try {
      const company = await Company.findOne({
        email: req.body.email,
      });
      if (!!company) {
        return res
          .status(200)
          .json(
            apiResponse([{ message: "That company email is already in use." }])
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
    if (!req.body.password) return next();

    try {
      req.body.password = await bcrypt.hash(req.body.password, 10);
      next();
    } catch (err) {
      return res
        .status(500)
        .json(apiResponse([{ message: "Error hashing password" }]));
    }
  },
  async (req, res) => {
    // Create Company and save to the DB.
    try {
      const savedCompany = await new Company(req.body).save();
      const apiToken = signJwt(
        { c_id: savedCompany._id },
        {
          expiresIn: "7d",
        }
      );
      res.status(200).json(apiResponse(false, { apiToken }));
    } catch (err) {
      const errorList = formatMongooseErrors(err);
      return res.status(400).json(apiResponse(errorList));
    }
  },
]);

module.exports = router;
