"use strict";

require("@tensorflow/tfjs-node");
const faceapi = require("face-api.js");
const canvas = require("canvas");
const fs = require("fs");
const path = require("path");

const ValidationFailedError = require("../errors/ValidationFailedError");

// Create a canvas and set up the face-api.js environment
const { Canvas, Image, ImageData, createCanvas, loadImage } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const MODEL_URL = path.join(__dirname, "./models");

const loadModels = async () => {
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromDisk(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_URL),
    faceapi.nets.faceExpressionNet.loadFromDisk(MODEL_URL),
    faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_URL),
    faceapi.nets.ageGenderNet.loadFromDisk(MODEL_URL),
  ]);

  console.log("image processing models loaded");
};

const extractFace = async (imagePath, allowMultipleFaces = false) => {
  console.log("imagePath::: ", imagePath);

  console.time("Extraction::: ");
  const img = await loadImage(imagePath);

  let detections = await faceapi
    .detectAllFaces(img)
    .withFaceLandmarks()
    .withFaceDescriptors()
    .withFaceExpressions()
    .withAgeAndGender();

  if (detections.length === 0) {
    throw new ValidationFailedError("No face was found in the given picture");
  }

  if (!allowMultipleFaces && detections.length > 1) {
    throw new ValidationFailedError(
      "More that once faces appears to be present in the picture"
    );
  }

  if (allowMultipleFaces) {
    return detections.map((extractedFace) => extractedFace.descriptor);
  }

  const extractedFace = detections[0];

  console.timeEnd("Extraction::: ");

  return extractedFace.descriptor;
};

const extractFaceFromImage = async (imagePath, allowMultipleFaces) => {
  return extractFace(imagePath, allowMultipleFaces);
};

const checkIfFacesMatches = async (faceDescriptor1, faceDescriptor2) => {
  let matchScore = 0.6;
  let labledFace1 = new faceapi.LabeledFaceDescriptors("Face", [
    faceDescriptor1,
  ]);

  let faceMatcher = new faceapi.FaceMatcher(labledFace1, matchScore);

  const bestMatch = faceMatcher.findBestMatch(faceDescriptor2);

  const matchPercentage = (1 - bestMatch.distance) * 100;

  if (bestMatch.label === "Face") {
    console.log("matchPercentage::: ", matchPercentage);
  }

  return {
    isMatch: bestMatch.label === "Face" && Math.round(matchPercentage) > 57,
    matchPercentage: matchPercentage.toFixed(2),
  };
};

module.exports = { extractFaceFromImage, loadModels, checkIfFacesMatches };
