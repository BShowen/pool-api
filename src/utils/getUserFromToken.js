import * as jwt from "jsonwebtoken";
import { GraphQLError } from "graphql";

import roles from "./roles.js";

/**
 * This module attaches a user object to the context on each request.
 * The user object is used in resolvers to test for authentication and
 * authorization (based on roles).
 */

import user from "./contextUser.js";

export default function getUserFromToken({ req }) {
  const token = req.headers.authorization || "";

  if (token.length === 0) {
    return {
      ...user,
      reason: "Authentication token not provided.",
    };
  }

  return jwt.verify(
    token.split(" ")[1],
    process.env.JWT_SECRET,
    { maxAge: process.env.JWT_MAX_AGE },
    (err, token) => {
      if (err) {
        throw new GraphQLError("Invalid token", {
          extensions: {
            code: "Unauthenticated",
          },
        });
      } else {
        const userRoles = roles[token.roles[0]];
        return {
          ...user,
          ...token,
          roles: userRoles,
          isAuthenticated: true,
        };
      }
    }
  );
}
