"use strict";

const express =
  require("express");

const {
  createProviderPaymentAttempt,
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

module.exports =
  router;