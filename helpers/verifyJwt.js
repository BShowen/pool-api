// npm modules
const mongoose = require("mongoose");

// local modules
const jwt = require("jsonwebtoken");

/**
 * Attempted to verify the incoming JWT.
 */

module.exports = async function authenticateJWT(req, res, next) {
  const unverifiedToken = req.get("authorization") || "";
  jwt.verify(
    unverifiedToken,
    process.env.JWT_SECRET,
    { maxAge: process.env.JWT_MAX_AGE },
    (err, decodedToken) => {
      if (err) {
        res.status(401);
        next(new Error("Invalid api token."));
        // res.sendStatus(401);
      } else {
        if (mongoose.Types.ObjectId.isValid(decodedToken.c_id)) {
          req.token = decodedToken;
          next();
        } else {
          res.status(401);
          next(new Error("Invalid token id."));
        }
      }
    }
  );
};
