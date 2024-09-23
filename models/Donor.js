const mongoose = require("mongoose");

const faceDescriptorSchema = new mongoose.Schema({
  descriptor: {
    type: [Number], // Array of arrays of numbers
    required: true,
  },
});

const donationSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  handledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

const searchHistorySchema = new mongoose.Schema({
  searcher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  searchedAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

const donorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: false, unique: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    profilePicture: { type: String, required: true },
    idCard: { type: String, required: false },
    faceDetection: {
      type: faceDescriptorSchema,
      required: true,
    },
    idCardFaces: {
      type: [faceDescriptorSchema],
      required: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    donationCount: { type: Number, default: 0 },
    donations: {
      type: [donationSchema],
      default: [],
    },
    searchHistory: [searchHistorySchema],
  },
  {
    timestamps: true,
  }
);

donorSchema.pre(/^find/, function (next) {
  this.populate({
    path: "createdBy",
    select: "fullName role", // Select fields you want to populate
  });
  next();
});

module.exports = mongoose.model("Donor", donorSchema);
