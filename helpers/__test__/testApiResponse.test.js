const { apiResponse } = require("../index");

test("apiResponse to always return data, errors, and message", () => {
  expect(apiResponse()).toEqual({
    errors: null,
    data: null,
    message: null,
  });
});

test("apiResponse to return errors when provided", () => {
  const errors = [{ message: "foo bar" }, { message: "bar baz" }];
  const response = apiResponse({
    errors,
  });
  expect(response).toEqual({
    errors,
    data: null,
    message: null,
  });
});

test("apiResponse to return data when provided", () => {
  const data = [
    { firstName: "foo", lastName: "bar", age: 30 },
    { firstName: "bar", lastName: "baz", age: 19 },
  ];
  expect(apiResponse({ data: data })).toEqual({
    data,
    errors: null,
    message: null,
  });
});

test("apiResponse to return message when provided", () => {
  const message = "Success";
  const response = apiResponse({ message });
  expect(response).toEqual({ message, errors: null, data: null });
});

test("apiResponse to return data and message when provided", () => {
  const data = [{ firstName: "foo", lastName: "bar", age: 30 }];
  const message = "Success";
  const response = apiResponse({ message, data });
  expect(response).toEqual({ message, data, errors: null });
});
