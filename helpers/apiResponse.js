module.exports = ({ errors, data, message }) => {
  return {
    errors: errors || null,
    data: data || null,
    message: message || null,
  };
};
