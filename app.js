const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const mongoose = require("mongoose");

// Require secrets.
require("dotenv").config();

mongoose
  .connect(process.env.DB_STRING)
  .catch((error) => console.log("Error connecting to Mongo: ", error));

const { companyRoute } = require("./routes");

const app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/companies", companyRoute);

module.exports = app;
