module.exports = (options = {}) => {
  return {
    errors: options.errors || null,
    data: options.data || null,
  };
};
