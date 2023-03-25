const { authorizeRoles, roles } = require("../index");

describe("The authorizeRoles function", () => {
  test("returns a middleware function", () => {
    const response = authorizeRoles(roles.ADMIN);
    expect(typeof response).toBe("function");
  });

  describe("Handles admin requests", () => {
    const req = { token: { roles: ["ADMIN"] } };
    const res = { sendStatus: jest.fn() };
    const next = jest.fn();

    test("authorizes admin request for all request types.", () => {
      // Create middleware for authorizing all roles
      const middleware = [
        authorizeRoles(roles.ADMIN),
        authorizeRoles(roles.MANAGER),
        authorizeRoles(roles.TECH),
        authorizeRoles(roles.CUSTOMER),
      ];

      // Call each middleware
      middleware.forEach((cb) => cb(req, res, next));

      expect(next).toHaveBeenCalledTimes(4);
    });
  });

  describe("Handles manager requests", () => {
    const req = { token: { roles: ["MANAGER"] } };
    const res = { sendStatus: jest.fn() };
    const next = jest.fn();

    test("authorizes a manager for manager, tech and customer requests.", () => {
      // Create middleware for authorizing manager, tech, and customer.
      const middleware = [
        authorizeRoles(roles.MANAGER),
        authorizeRoles(roles.TECH),
        authorizeRoles(roles.CUSTOMER),
      ];

      // Call each middleware
      middleware.forEach((cb) => cb(req, res, next));

      expect(res.sendStatus).toHaveBeenCalledTimes(0);
      expect(next).toHaveBeenCalledTimes(3);
    });

    test("blocks a manager from admin requests.", () => {
      const middlewareFn = authorizeRoles(roles.ADMIN);
      middlewareFn(req, res, next);
      expect(next).toHaveBeenCalledTimes(0);
      expect(res.sendStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe("Handles tech requests", () => {
    const req = { token: { roles: ["TECH"] } };
    const res = { sendStatus: jest.fn() };
    const next = jest.fn();

    test("authorizes a tech for tech and customer requests", () => {
      // generate an array of middleware functions. One fn for each role.
      const middleware = [
        authorizeRoles(roles.TECH),
        authorizeRoles(roles.CUSTOMER),
      ];
      // Call each middleware fn.
      middleware.forEach((fn) => fn(req, res, next));
      expect(res.sendStatus).toHaveBeenCalledTimes(0);
      expect(next).toHaveBeenCalledTimes(2);
    });

    test("blocks a tech from manager and admin request", () => {
      // Create middleware for authorizing admin and managers.
      const middleware = [
        authorizeRoles(req.ADMIN),
        authorizeRoles(req.MANAGER),
      ];

      // Call each middleware.
      middleware.forEach((fn) => fn(req, res, next));
      expect(res.sendStatus).toHaveBeenCalledTimes(2);
    });
  });

  describe("Handles customer requests", () => {
    const req = { token: { roles: ["CUSTOMER"] } };
    const res = { sendStatus: jest.fn() };
    const next = jest.fn();

    test("authorizes a customer request", () => {
      const middleware = authorizeRoles(roles.CUSTOMER);
      middleware(req, res, next);
      expect(res.sendStatus).toHaveBeenCalledTimes(0);
      expect(next).toHaveBeenCalledTimes(1);
    });

    test("blocks a customer from admin, manager, and tech requests", () => {
      // Create middleware for each role.
      const middleware = [
        authorizeRoles(roles.ADMIN),
        authorizeRoles(roles.MANAGER),
        authorizeRoles(roles.TECH),
      ];
      // Call each middleware
      middleware.forEach((fn) => fn(req, res, next));
      expect(next).toHaveBeenCalledTimes(0);
      expect(res.sendStatus).toHaveBeenCalledTimes(3);
    });
  });
});
