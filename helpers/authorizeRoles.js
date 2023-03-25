module.exports = function authorizeRoles(roles = []) {
  if (typeof roles === String) {
    roles = [roles];
  }

  return (req, res, next) => {
    const { token } = req;
    const hasRole = roles.some((role) => token?.roles?.includes(role));
    if (hasRole) {
      next();
    } else {
      res.sendStatus(401);
    }
  };
};
