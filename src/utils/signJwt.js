import jwt from "jsonwebtoken";

export default function signJwt(payload, options = {}) {
  if (!payload) throw new Error("Payload is required.");
  return jwt.sign(payload, process.env.JWT_SECRET, options);
}
