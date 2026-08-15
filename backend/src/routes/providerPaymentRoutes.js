"use strict";

const express =
  require("express");

const {
  createProviderPaymentAttempt,
  createProviderPayout,
} = require("../controllers/providerPaymentController");

const authenticate =
  require("../middleware/authMiddleware");

const requireRole =
  require("../middleware/requireRole");

const router =
  express.Router();

router.post(
  "/payment-attempt",
  authenticate,
  requireRole("CUSTOMER"),
  createProviderPaymentAttempt
);


router.post(
  "/payout",
  authenticate,
  requireRole("ADMIN"),
  createProviderPayout
);

module.exports =
  router;