// npm modules
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const mongoose = require("mongoose");
const cors = require("cors");
const corsOptions = {
  origin: function (origin, cb) {
    if (origin === "http://192.168.1.74:5173") {
      return cb(null, true);
    } else {
      return cb(new Error("Origin not allowed"));
    }
  },
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Require secrets.
require("dotenv").config();

// local modules.
const errorHandler = require("./helpers/errorHandler");

mongoose
  .connect(process.env.DB_STRING)
  .catch((error) => console.log("Error connecting to Mongo: ", error));

const companyRoute = require("./routes/companies");

const app = express();
app.use(cors(corsOptions));
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use("/companies", companyRoute);

app.use(errorHandler);

module.exports = app;
