"use strict";

const express =
  require("express");

const {
  testMpesaConnection,
  handleMpesaCallback,
  createMpesaPaymentAttempt,
} = require("../controllers/mpesaController");

const {
  handleProviderB2CResult,
  handleProviderB2CTimeout,
} = require("../controllers/providerPaymentController");

const authenticate =
  require("../middleware/authMiddleware");

const requireRole =
  require("../middleware/requireRole");

const router =
  express.Router();

  router.post(
  "/callback",
  handleMpesaCallback
);

router.post(
  "/simulate-callback",
  handleMpesaCallback
);

  router.post(
  "/payment-attempt",
  createMpesaPaymentAttempt
);

router.get(
  "/test",
  authenticate,
  requireRole("RESTAURANT_OWNER"),
  testMpesaConnection
);

router.post(
  "/b2c/result",
  handleProviderB2CResult
);

router.post(
  "/b2c/timeout",
  handleProviderB2CTimeout
);



module.exports =
  router;