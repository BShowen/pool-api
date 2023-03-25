const { signJwt, verifyJwt } = require("../index");

beforeAll(() => {
  // Set a temporary password for signJwt to use.
  process.env.JWT_SECRET = "JEST_TEST_SECRET";
  process.env.JWT_MAX_AGE = "7d";
});

let payload;
let options;
beforeEach(() => {
  payload = {
    roles: ["ADMIN"],
    language: "en",
    theme: "dark",
  };
  options = {
    expiresIn: process.env.JWT_MAX_AGE,
  };
});

describe("The signJwt helper function", () => {
  test("throws when a payload is not provided", () => {
    expect(() => signJwt()).toThrow(/^Payload is required.$/);
  });

  test("accepts a payload in the form of a JS object.", () => {
    const token = signJwt(payload);
    expect(typeof token).toBe("string");
  });

  test("accepts an options object in the form of a JS object.", () => {
    const token = signJwt(payload, options);
    expect(typeof token).toBe("string");
  });
});

describe("The verifyJwt helper function", () => {
  let validToken, invalidToken, req, res, next;
  beforeEach(() => {
    validToken = signJwt(payload, options);
    invalidToken = signJwt(payload, options) + "fooBar";
    // mock the request object. verifyJwt retrieves the JWT from
    // the req header using req.get('authorization')
    req = {
      headers: {
        authorization: "",
      },
      get: function (header) {
        return this.headers[header.toLowerCase()];
      },
      setHeader: function (header, value) {
        this.headers[header.toLowerCase()] = value;
      },
    };
    // mock the response object
    res = {
      statusCode: null,
      status: function (code) {
        this.statusCode = code;
      },
    };
    next = jest.fn();
  });

  test("sets req.token to jwt payload when the jwt is valid", () => {
    // verifyJwt retrieves JWT from req header using req.get('authorization')
    req.setHeader("authorization", validToken);
    verifyJwt(req, res, next);
    // verifyJwt sets the status to 401 only on invalid tokens.
    expect(res.statusCode).toBeFalsy();
    // verifyJwt calls next() when it parses a valid token.
    expect(next).toHaveBeenCalledTimes(1);
    // verifyJwt assigns the decoded JWT to req.token
    expect(req.token).toMatchObject(payload);
  });

  test("sets res.status to 401 and calls next with error when token is invalid", () => {
    // verifyJwt retrieves JWT from req header using req.get('authorization')
    req.setHeader("authorization", invalidToken);
    verifyJwt(req, res, next);
    // verifyJwt sets the status to 401 only on invalid tokens.
    expect(res.statusCode).toBe(401);
    // verifyJwt calls next(new Error()) when it parses an invalid token.
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(new Error("Invalid api token."));
    expect(req.token).toBeUndefined();
  });
});
