"use strict";

const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const validateInputs = require("../middleware/validateInputs");
const ValidationFailedError = require("../errors/ValidationFailedError");
const Joi = require("joi");
const ForbiddenError = require("../errors/ForbiddenError");
const asyncRouteHandler = require("../middleware/asyncRouteHandler.");
const roleMiddleware = require("../middleware/role");
require("dotenv").config();

const router = express.Router();

const { JWT_SECRET } = process.env;

router.post(
  "/register",
  roleMiddleware(["admin"]),
  validateInputs({
    email: Joi.string().email().required(),
    fullName: Joi.string().min(3).max(120).required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid("admin", "user").required(),
    staffRank: Joi.string().optional().allow(""),
  }),
  asyncRouteHandler(async (req, res) => {
    const { email, fullName, password, role, staffRank } = req.body;

    const user = await User.findOne({ email });

    if (user) {
      throw new ValidationFailedError(
        "An account with similar email already exists"
      );
    }

    try {
      const user = new User({
        email,
        fullName,
        password,
        role,
        staffRank,
        createdBy: req.user._id,
      });

      await user.save();

      res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
      console.log(error);
      throw new ValidationFailedError("Could not register user");
    }
  })
);

router.post(
  "/login",
  validateInputs({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  }),
  asyncRouteHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      throw new ForbiddenError("Account does not existing, check your email.");
    }

    if (!(await user.matchPassword(password))) {
      throw new ForbiddenError("Invalid credentials");
    }

    try {
      const token = jwt.sign({ id: user._id }, JWT_SECRET, {
        expiresIn: "1h",
      });
      res.json({ token });
    } catch (error) {
      console.log("error::: ", error.message);
      throw new ForbiddenError("Login not successful");
    }
  })
);

module.exports = router;
