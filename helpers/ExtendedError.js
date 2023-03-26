module.exports = class ExtendedError extends Error {
  constructor(message, field) {
    super(message);
    this.name = "ExtendedError";
    this.message = { message, field };
  }
};
