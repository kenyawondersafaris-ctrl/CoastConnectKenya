"use strict";

const express = require("express");

const authMiddleware = require(
  "../middleware/authMiddleware"
);

const requireRole = require(
  "../middleware/requireRole"
);

const requireActiveSubscription = require(
  "../middleware/requireActiveSubscription"
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
  requireActiveSubscription,
  addGalleryImage
);

router.put(
  "/:imageId",
  authMiddleware,
  requireRole("RESTAURANT_OWNER"),
  requireActiveSubscription,
  updateGalleryImage
);

router.delete(
  "/:imageId",
  authMiddleware,
  requireRole("RESTAURANT_OWNER"),
  requireActiveSubscription,
  deleteGalleryImage
);

module.exports = router;