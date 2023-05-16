import { GraphQLError } from "graphql";

/**
 * This is the user that is defined in every request context.
 * Access this user in your resolvers with context.user
 */
export default {
  isAuthenticated: false,
  reason: undefined,
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
  c_id: undefined,
  roles: [],
  c_email: undefined,
  iat: undefined,
  exp: undefined,
};
