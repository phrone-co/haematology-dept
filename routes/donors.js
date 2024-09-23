"use strict";

const express = require("express");
const multer = require("multer");
const Donor = require("../models/Donor");
const roleMiddleware = require("../middleware/role");
const asyncRouteHandler = require("../middleware/asyncRouteHandler.");
const validateInputs = require("../middleware/validateInputs");
const Joi = require("joi");
const ValidationFailedError = require("../errors/ValidationFailedError");
const fs = require("fs");
const {
  extractFaceFromImage,
  checkIfFacesMatches,
} = require("../helpers/extractFaceFromImage");
const _ = require("lodash");
const generateUniqueId = require("../helpers/generateUniqueId");
const ResourceNotFoundError = require("../errors/ResourceNotFoundError");

const router = express.Router();

const fileExists = (value, helpers) => {
  let filePath = __dirname + "/.." + value;

  if (!fs.existsSync(filePath)) {
    return helpers.error("any.invalid");
  }
  return value;
};

const upload = multer({ dest: "uploads/" });

const findFaceMatchInDonors = (descriptor) => async (donors) => {
  const results = [];

  for (let donor of donors) {
    const donorDescriptors = new Float32Array(donor.faceDetection.descriptor);

    const faceMatch = await checkIfFacesMatches(descriptor, donorDescriptors);

    if (faceMatch.isMatch) {
      const donorObj = donor.toObject();
      donorObj.faceMatch = faceMatch;

      results.push(donorObj);
    }
  }

  return results;
};

const findFaceMatchInDatabase = async (descriptors, excludeIds) => {
  let query = {};

  if (excludeIds && excludeIds.length > 0) {
    query._id = { $nin: excludeIds };
  }

  const donors = await Donor.find(query)
    .populate({
      path: "donations.handledBy",
      select: "fullName email",
    })
    .populate({
      path: "searchHistory.searcher",
      select: "fullName email",
    });

  console.log(donors);

  const numberOfParallelProcesses = 5;

  const reArrarangedDonors = _.chunk(
    donors,
    Math.ceil(donors.length / numberOfParallelProcesses)
  );

  const totalResults = await Promise.all(
    reArrarangedDonors.map(findFaceMatchInDonors(descriptors))
  );

  return _.concat(...totalResults);
};

// Get all donors
router.get("/", roleMiddleware(["admin", "user"]), async (req, res) => {
  try {
    const donors = await Donor.find()
      .populate({
        path: "donations.handledBy",
        select: "fullName email",
      })
      .populate({
        path: "searchHistory.searcher",
        select: "fullName email",
      })
      .select("-faceDetection -idCardFaces");
    res.json(donors);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch donors", details: error.message });
  }
});

// Add a new donor with profile picture and ID card
router.post(
  "/",
  roleMiddleware(["admin", "user"]),
  validateInputs({
    email: Joi.string().email().optional(),
    name: Joi.string().min(3).max(120).required(),
    phone: Joi.string()
      .pattern(/^[0-9]+$/)
      .min(10)
      .max(15)
      .required(),
    address: Joi.string().max(500).required(),
    profilePictureUri: Joi.string()
      .custom(fileExists, "file existence validation")
      .required(),
    idCardUri: Joi.string()
      .custom(fileExists, "file existence validation")
      .required(),
  }),
  asyncRouteHandler(async (req, res) => {
    const uniqueEmail = `${generateUniqueId()}@email.com`;

    const {
      name,
      email = uniqueEmail,
      phone,
      address,
      profilePictureUri,
      idCardUri,
    } = req.body;

    const faceDescriptor = await extractFaceFromImage(
      __dirname + "/.." + profilePictureUri
    );

    //check that the given image does not exist in our database
    const foundExistingFace = await findFaceMatchInDatabase(faceDescriptor);

    if (foundExistingFace.length > 0) {
      throw new ValidationFailedError(
        "We already have a donor with similar face",
        { existingFace: foundExistingFace[0] }
      );
    }

    let idCardFaceDescriptors;

    try {
      idCardFaceDescriptors = await extractFaceFromImage(
        __dirname + "/.." + profilePictureUri,
        true
      );
    } catch (error) {}

    const serializedFaceDescriptor = Array.from(faceDescriptor);

    try {
      const donor = new Donor({
        name,
        email,
        phone,
        address,
        profilePicture: profilePictureUri,
        idCard: idCardUri,
        faceDetection: { descriptor: serializedFaceDescriptor },
        idCardFaces: idCardFaceDescriptors
          ? idCardFaceDescriptors.map((idCardFaceDescriptor) => ({
              descriptor: Array.from(idCardFaceDescriptor),
            }))
          : null,
        createdBy: req.user._id,
      });

      await donor.save();

      res.status(201).json(donor);
    } catch (error) {
      throw new ValidationFailedError(
        "Failed to add donor due to unknown error",
        { extras: error.message }
      );
    }
  })
);

// Add a new donor with profile picture and ID card
router.post(
  "/:id/donate",
  roleMiddleware(["admin", "user"]),
  asyncRouteHandler(async (req, res) => {
    const { id: donorId } = req.params;

    const donor = await Donor.findById(donorId);

    if (!donor) {
      throw new ResourceNotFoundError("Donor not found!");
    }

    try {
      const donation = {
        date: new Date(),
        handledBy: req.user._id,
      };

      donor.donationCount += 1;
      donor.donations.push(donation);

      await donor.save();

      res.json({ message: "Donation information updated", donor });
    } catch (error) {
      console.error("Error updating donation information:", error);

      throw new ValidationFailedError("Unable to update donor info");
    }
  })
);

router.put(
  "/:id",
  roleMiddleware(["admin", "user"]),
  validateInputs({
    email: Joi.string().email().optional(),
    name: Joi.string().min(3).max(120).optional(),
    phone: Joi.string()
      .pattern(/^[0-9]+$/)
      .min(10)
      .max(15)
      .optional(),
    address: Joi.string().max(500).optional(),
    profilePictureUri: Joi.string()
      .custom(fileExists, "file existence validation")
      .optional(),
    idCardUri: Joi.string()
      .custom(fileExists, "file existence validation")
      .optional(),
  }),
  asyncRouteHandler(async (req, res) => {
    const { name, email, phone, address, profilePictureUri, idCardUri } =
      req.body;

    let serializedFaceDescriptor;

    if (profilePictureUri) {
      const faceDescriptor = await extractFaceFromImage(
        __dirname + "/.." + profilePictureUri
      );

      //check that the given image does not exist in our database
      const foundExistingFace = await findFaceMatchInDatabase(faceDescriptor, [
        req.params.id,
      ]);

      if (foundExistingFace.length > 0) {
        throw new ValidationFailedError(
          "We already have a donor with similar face",
          { existingFace: foundExistingFace[0] }
        );
      }
      serializedFaceDescriptor = Array.from(faceDescriptor);
    }

    let idCardFaceDescriptors;

    if (profilePictureUri) {
      try {
        idCardFaceDescriptors = await extractFaceFromImage(
          __dirname + "/.." + profilePictureUri,
          true
        );
      } catch (error) {}
    }

    const updatePayload = {
      ...(name && { name }),
      ...(email && { email }),
      ...(phone && { phone }),
      ...(address && { address }),
      ...(profilePictureUri && { profilePicture: profilePictureUri }),
      ...(idCardUri && { idCard: idCardUri }),
      ...(serializedFaceDescriptor && {
        faceDetection: { descriptor: serializedFaceDescriptor },
      }),
      ...(idCardFaceDescriptors && {
        idCardFaces: idCardFaceDescriptors.map((idCardFaceDescriptor) => ({
          descriptor: Array.from(idCardFaceDescriptor),
        })),
      }),
    };

    try {
      if (Object.keys(updatePayload).length > 0) {
        updatePayload.updatedBy = req.user._id;

        const donor = await Donor.findByIdAndUpdate(
          req.params.id,
          updatePayload,
          { new: true }
        );
        res.json(donor);
      }
    } catch (error) {
      res
        .status(400)
        .json({ error: "Failed to update donor", details: error.message });
    }
  })
);

// Delete a donor
router.delete("/:id", roleMiddleware(["admin"]), async (req, res) => {
  try {
    await Donor.findByIdAndDelete(req.params.id);
    res.json({ message: "Donor deleted" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to delete donor", details: error.message });
  }
});

router.post(
  "/search",
  roleMiddleware(["admin", "user"]),
  upload.single("picture"),
  asyncRouteHandler(async (req, res) => {
    const { file } = req;

    if (!file) {
      throw new ValidationFailedError("No file uploaded");
    }

    const updateSearchHistory = async (donorId, searcherId) => {
      const searchHistoryEntry = {
        searcher: searcherId,
        searchedAt: new Date(),
      };

      await Donor.findByIdAndUpdate(
        donorId,
        { $push: { searchHistory: searchHistoryEntry } },
        { new: true, upsert: true }
      );
    };

    // Extract face descriptor from uploaded image
    const faceDescriptor = await extractFaceFromImage(file.path);

    // Find donors matching the extracted face descriptor
    const matchingDonors = await findFaceMatchInDatabase(faceDescriptor);

    for (let matchDonor of matchingDonors) {
      await updateSearchHistory(matchDonor._id, req.user._id);
    }

    res.json({ matchingDonors });
  })
);

module.exports = router;
