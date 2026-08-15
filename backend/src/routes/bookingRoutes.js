"use strict";

const express = require("express");

const {
  createBooking,
  getMyBookings,
  createBookingReview,
  generateBookingStartPin,
  verifyBookingStartPin,
} = require("../controllers/bookingController");

const authenticate =
  require("../middleware/authMiddleware");

const requireRole =
  require("../middleware/requireRole");

const router =
  express.Router();

router.get(
  "/me",
  authenticate,
  requireRole("CUSTOMER"),
  getMyBookings
);

router.post(
  "/:bookingId/start-pin",
  authenticate,
  requireRole("CUSTOMER"),
  generateBookingStartPin
);

router.post(
  "/:bookingId/start",
  authenticate,
  requireRole("PROVIDER"),
  verifyBookingStartPin
);

router.post(
  "/:bookingId/review",
  authenticate,
  requireRole("CUSTOMER"),
  createBookingReview
);

router.post(
  "/",
  authenticate,
  requireRole("CUSTOMER"),
  createBooking
);

module.exports = router;