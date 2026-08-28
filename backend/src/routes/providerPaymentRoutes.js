"use strict";

const express =
  require("express");

const {
  createProviderPaymentAttempt,
  createProviderPayout,
  createPaymentDispute,
  respondToPaymentDispute,
  submitDisputeEvidence,
  resolvePaymentDispute,
  markPaymentRefunded,
  getPaymentDisputes,
  getProviderPaymentDisputes,
} =
require("../controllers/providerPaymentController");

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

router.get(
  "/disputes",
  authenticate,
  requireRole("PROVIDER"),
  getProviderPaymentDisputes
);
router.post(
  "/disputes",
  authenticate,
  requireRole("CUSTOMER"),
  createPaymentDispute
);

router.get(
  "/disputes",
  authenticate,
  requireRole("ADMIN"),
  getPaymentDisputes
);

router.post(
  "/disputes/:disputeId/respond",
  authenticate,
  requireRole("PROVIDER"),
  respondToPaymentDispute
);

router.post(
  "/disputes/:disputeId/evidence",
  authenticate,
  submitDisputeEvidence
);

router.post(
  "/disputes/:disputeId/resolve",
  authenticate,
  requireRole("ADMIN"),
  resolvePaymentDispute
);

router.post(
  "/payments/:paymentId/mark-refunded",
  authenticate,
  requireRole("ADMIN"),
  markPaymentRefunded
);

router.post(
  "/payout",
  authenticate,
  requireRole("ADMIN"),
  createProviderPayout
);

module.exports =
  router;