module.exports = (errors, payload) => {
  if (errors) {
    return {
      data: {
        errors,
      },
    };
  } else {
    return {
      data: payload || {},
    };
  }
};
