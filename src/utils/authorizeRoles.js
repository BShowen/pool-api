import roles from "./roles.js";
export default function authorizeRoles({ userRoles, allowedRole }) {
  // This is a list of roles that are allowed.
  const allowedRoles = roles[allowedRole.toUpperCase()];

  // return true or false if the user has a role listed in the allowedRoles.
  return allowedRoles.some((role) => userRoles.includes(role));
}
