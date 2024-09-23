const { ObjectId } = require("bson");

const generateUniqueId = () => {
  return new ObjectId().toString();
};

module.exports = generateUniqueId;
