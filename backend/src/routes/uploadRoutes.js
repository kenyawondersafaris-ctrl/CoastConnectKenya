"use strict";

const express = require("express");

const authenticate = require(
  "../middleware/authMiddleware"
);

const requireRole = require(
  "../middleware/requireRole"
);

const requireActiveSubscription = require(
  "../middleware/requireActiveSubscription"
);

const uploadImage = require(
  "../middleware/uploadMiddleware"
);

const validateUploadedImage =
  require(
    "../middleware/validateUploadedImage"
  );

const {
  uploadMenuImage,
} = require("../controllers/uploadController");

const router = express.Router();

router.post(
  "/menu-image",
  authenticate,
  requireRole("RESTAURANT_OWNER"),
  uploadImage.single("image"),
  validateUploadedImage,
  uploadMenuImage
);

router.post(
  "/menu-image",
  authenticate,
  requireRole("RESTAURANT_OWNER"),
  requireActiveSubscription,
  uploadImage.single("image"),
  validateUploadedImage,
  uploadMenuImage
);

module.exports = router;