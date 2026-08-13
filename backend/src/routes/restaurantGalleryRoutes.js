"use strict";

const express = require("express");

const authMiddleware = require(
  "../middleware/authMiddleware"
);

const requireRole = require(
  "../middleware/requireRole"
);

const {
  getOwnerGallery,
  addGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
} = require(
  "../controllers/restaurantGalleryController"
);

const router = express.Router();

router.get(
 "/",
  authMiddleware,
  requireRole("RESTAURANT_OWNER"),
  getOwnerGallery
);

router.post(
  "/",
  authMiddleware,
  requireRole("RESTAURANT_OWNER"),
  addGalleryImage
);

router.put(
  "/:imageId",
  authMiddleware,
  requireRole("RESTAURANT_OWNER"),
  updateGalleryImage
);

router.delete(
  "/:imageId",
  authMiddleware,
  requireRole("RESTAURANT_OWNER"),
  deleteGalleryImage
);

module.exports = router;