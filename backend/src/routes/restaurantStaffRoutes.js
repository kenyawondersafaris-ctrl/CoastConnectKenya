"use strict";

const express = require("express");

const authenticate = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");
const requireActiveSubscription =
  require("../middleware/requireActiveSubscription");

const {
  getOwnerRestaurantStaff,
  createOwnerRestaurantStaff,
  getRestaurantStaffInvitation,
  acceptRestaurantStaffInvitation,
  getCurrentRestaurantStaff,
} = require("../controllers/restaurantStaffController");

const router = express.Router();

router.get(
  "/staff-invitations/:token",
  getRestaurantStaffInvitation
);

router.post(
  "/staff-invitations/:token/accept",
  acceptRestaurantStaffInvitation
);

router.get(
  "/staff/me",
  authenticate,
  requireRole("RESTAURANT_STAFF"),
  getCurrentRestaurantStaff
);

router.get(
  "/owner/staff",
  authenticate,
  requireRole("RESTAURANT_OWNER"),
  getOwnerRestaurantStaff
);

router.post(
  "/owner/staff",
  authenticate,
  requireRole("RESTAURANT_OWNER"),
  requireActiveSubscription,
  createOwnerRestaurantStaff
);

module.exports = router;