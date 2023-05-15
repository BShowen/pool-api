import * as jwt from "jsonwebtoken";
import { GraphQLError } from "graphql";

import roles from "./roles.js";

/**
 * This module attaches a user object to the context on each request.
 * The user object is used in resolvers to test for authentication and
 * authorization (based on roles).
 */

const user = {
  isAuthenticated: false,
  reason: "",
  hasRole: function (role) {
    if (this.roles) {
      return this.roles.includes(role);
    }
    return false;
  },
  authenticateAndAuthorize: function ({ role }) {
    if (this.isAuthenticated) {
      // User is authenticated.
      if (this.hasRole(role)) {
        // Use is authorized for the role.
        return;
      }
      // User is not authorized for the role.
      throw new GraphQLError(`Not authorized.`);
    }
    // User is not authenticated.
    throw new GraphQLError(`Not authenticated.`);
  },
};

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
