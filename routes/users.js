"use strict";

const express = require("express");
const User = require("../models/User"); // Assuming you have a User model
const roleMiddleware = require("../middleware/role");
const asyncRouteHandler = require("../middleware/asyncRouteHandler.");
const validateInputs = require("../middleware/validateInputs");
const Joi = require("joi");
const UnauthorizedError = require("../errors/UnauthorizedError");
const ResourceNotFoundError = require("../errors/ResourceNotFoundError");
const ValidationFailedError = require("../errors/ValidationFailedError");
const bcrypt = require("bcryptjs");

const router = express.Router();

router.get(
  "/",
  roleMiddleware(["admin"]),
  asyncRouteHandler(async (req, res) => {
    try {
      const users = await User.find().select("-password");
      res.json(users);
    } catch (error) {
      res
        .status(500)
        .json({ error: "Failed to fetch users", details: error.message });
    }
  })
);

const passwordSchema = {
  password: Joi.string().min(6).max(128).required(),
};

// Endpoint to update user password
router.put(
  "/:userId/password",
  roleMiddleware(["admin", "user"]), // Admin or the user themselves
  validateInputs(passwordSchema),
  asyncRouteHandler(async (req, res) => {
    const { userId } = req.params;
    const { password } = req.body;

    // Ensure that only the user or an admin can change the password
    if (req.user.role !== "admin" && req.user._id.toString() !== userId) {
      throw new UnauthorizedError("Access denied");
    }

    try {
      // Hash the new password

      // Update the user's password in the database
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = await User.findByIdAndUpdate(
        userId,
        { password: hashedPassword },
        { new: true }
      );

      if (!user) {
        throw new ResourceNotFoundError("User not found");
      }

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      throw new ValidationFailedError("Unable to update password");
    }
  })
);

module.exports = router;
