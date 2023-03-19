const jwt = require("jsonwebtoken");

/**
 * Attempted to verify the incoming JWT.
 */

module.exports = async function authenticateJWT(req, res, next) {
  const unverifiedToken = req.get("authorization") || "";
  jwt.verify(unverifiedToken, process.env.JWT_SECRET, (err, decodedToken) => {
    if (err) {
      res.sendStatus(401);
    } else {
      req.user = decodedToken;
      next();
    }
  });
};
