module.exports = {
  ADMIN: ["ADMIN"],
  MANAGER: ["ADMIN", "MANAGER"],
  TECH: ["ADMIN", "MANAGER", "TECH"],
  CUSTOMER: ["ADMIN", "MANAGER", "TECH", "CUSTOMER"],
  all: ["ADMIN", "MANAGER", "TECH", "CUSTOMER"],
};
