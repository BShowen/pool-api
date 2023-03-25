// npm modules
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const mongoose = require("mongoose");

// Require secrets.
require("dotenv").config();

// local modules.
const apiResponse = require("./helpers/apiResponse");

mongoose
  .connect(process.env.DB_STRING)
  .catch((error) => console.log("Error connecting to Mongo: ", error));

const companyRoute = require("./routes/companies");

const app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/companies", companyRoute);

app.use((err, req, res, next) => {
  // API error handler.
  // err.message can be a string of comma separated error messages or simply
  // a string with one message.
  const errorMessages = err.message.split("|").map((message) => {
    return { message };
  });
  res.json(apiResponse({ errors: errorMessages }));
});

module.exports = app;
