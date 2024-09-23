const express = require("express");
const upload = require("../middleware/upload");
const asyncRouteHandler = require("../middleware/asyncRouteHandler.");
const roleMiddleware = require("../middleware/role");

const router = express.Router();

router.post(
  "/",
  roleMiddleware(["admin", "user"]),
  upload.fields([{ name: "images" }]),
  asyncRouteHandler(async (req, res) => {
    const image = req.files.images[0];

    res.status(200).json({
      image: `/uploads/${image.filename}`,
    });
  })
);

module.exports = router;
