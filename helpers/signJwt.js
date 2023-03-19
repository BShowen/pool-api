const jwt = require("jsonwebtoken");

module.exports = function signJwt(payload, options = {}) {
  return jwt.sign(payload, process.env.JWT_SECRET, options);
};
