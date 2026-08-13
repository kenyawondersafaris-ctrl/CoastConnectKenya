"use strict";

const express = require("express");

const {
  getOwnerNotifications,
  markOwnerNotificationsRead,
  clearOwnerNotifications,
} = require(
  "../controllers/restaurantNotificationController"
);

const authenticate =
  require("../middleware/authMiddleware");

const requireRole =
  require("../middleware/requireRole");

const router = express.Router();

router.get(
  "/owner/notifications",
  authenticate,
  requireRole("RESTAURANT_OWNER"),
  getOwnerNotifications
);

router.patch(
  "/owner/notifications/read",
  authenticate,
  requireRole("RESTAURANT_OWNER"),
  markOwnerNotificationsRead
);

router.delete(
  "/owner/notifications",
  authenticate,
  requireRole("RESTAURANT_OWNER"),
  clearOwnerNotifications
);

module.exports = router;