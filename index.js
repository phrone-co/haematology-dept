"use strict";

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/authentication");
const donorsRoutes = require("./routes/donors");
const uploadRoutes = require("./routes/upload");
const usersRoutes = require("./routes/users");
require("dotenv").config();
const errorHandler = require("./middleware/errorHandler");
const {
  loadModels,
  extractFaceFromImage,
  saveImageToDisk,
} = require("./helpers/extractFaceFromImage");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const { DB_USER, DB_PASS, DB_HOST, DB_NAME, DB_PORT } = process.env;
mongoose.connect(
  `mongodb://${
    DB_USER ? `${DB_USER}:${DB_PASS}@` : ``
  }${DB_HOST}:${DB_PORT}/${DB_NAME}?authMechanism=DEFAULT`
);

(async () => {
  await loadModels();
})();

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

app.use("/api/auth", authRoutes);
app.use("/api/donor", donorsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/users", usersRoutes);

const imageDirectory = path.join(__dirname, "uploads");

// Middleware to serve static files from the image directory
app.use("/api/uploads/:path", express.static(imageDirectory));

app.get("/api/uploads/:path", (req, res) => {
  const { path: imagePath } = req.params;

  // Construct the full path to the image
  const filePath = path.join(imageDirectory, imagePath);

  console.log("filePath::: ", filePath);

  // Check if the file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({ error: "Image not found" });
    }

    // Serve the image file
    res.sendFile(filePath);
  });
});

app.use(errorHandler);

const buildDirectory = path.join(__dirname, "build");
app.use(express.static(buildDirectory));

app.get("*", (req, res) => {
  res.sendFile(path.join(buildDirectory, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
