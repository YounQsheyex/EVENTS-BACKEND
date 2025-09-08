const crypto = require("crypto");

const generateToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

module.exports = generateToken;
