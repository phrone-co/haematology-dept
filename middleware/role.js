const jwt = require("jsonwebtoken");
const User = require("../models/User");
const UnauthorizedError = require("../errors/UnauthorizedError");
const ForbiddenError = require("../errors/ForbiddenError");
const asyncRouteHandler = require("./asyncRouteHandler.");

const roleMiddleware = (roles) => {
  return asyncRouteHandler(async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      throw new UnauthorizedError("Access denied");
    }

    try {
      const decoded = jwt.verify(token, "your_jwt_secret");
      req.user = await User.findById(decoded.id);

      if (!roles.includes(req.user.role)) {
        throw new ForbiddenError("Insufficient role");
      }
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error;
      }

      throw new UnauthorizedError("You session has expired");
    }

    next();
  });
};

module.exports = roleMiddleware;
