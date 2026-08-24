"use strict";

const express = require("express");

const {
  getSubscriptionPlans,
  getMySubscription,
  initializeSubscriptionPayment,
  verifySubscriptionPayment,
  handleSubscriptionPaymentWebhook,
} = require(
  "../controllers/subscriptionController"
);


const authenticate =
  require("../middleware/authMiddleware");

const requireRole =
  require("../middleware/requireRole");

const router =
  express.Router();

  /*
|--------------------------------------------------------------------------
| Paystack Subscription Webhook
|--------------------------------------------------------------------------
*/

router.post(
  "/webhook",
  handleSubscriptionPaymentWebhook
);


/*
|------------------------------------------------------------------
| Public Subscription Plans
|------------------------------------------------------------------
*/

router.get(
  "/plans",
  getSubscriptionPlans
);


/*
|------------------------------------------------------------------
| Logged-in Business Subscription
|------------------------------------------------------------------
*/

router.get(
  "/me",
  authenticate,
  requireRole(
    "PROVIDER",
    "RESTAURANT_OWNER"
  ),
  getMySubscription
);

/*
|------------------------------------------------------------------
| Initialize Subscription Payment
|------------------------------------------------------------------
*/

router.post(
  "/initialize",
  authenticate,
  requireRole(
    "PROVIDER",
    "RESTAURANT_OWNER"
  ),
  initializeSubscriptionPayment
);

router.get(
  "/verify/:reference",
  authenticate,
  requireRole(
    "PROVIDER",
    "RESTAURANT_OWNER"
  ),
  verifySubscriptionPayment
);


module.exports =
  router;