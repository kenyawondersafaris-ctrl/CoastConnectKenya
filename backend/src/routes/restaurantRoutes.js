"use strict";

const express = require("express");

const {
  getRestaurants,
  getRestaurantByIdentifier,
  getOwnerRestaurant,
  createOwnerRestaurant,
  updateOwnerRestaurant,
  getOwnerOpeningHours,
  updateOwnerOpeningHours,
  getOwnerRestaurantReviews,
  getOwnerRestaurantAnalytics,
  updateOwnerOrderAvailability,
  getOwnerRestaurantPaymentSettings,
  updateOwnerRestaurantPaymentSettings,
  getRestaurantPaymentInstructions,
  confirmRestaurantManualPayment,
    getOwnerPendingManualPayments,
} = require("../controllers/restaurantController");

const {
  getRestaurantDeliveryZones,
} = require(
  "../controllers/restaurantDeliveryZoneController"
);

const authenticate = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");
const requireActiveSubscription = require("../middleware/requireActiveSubscription");

const router = express.Router();

router.get("/", getRestaurants);

router.get(
  "/payment-instructions",
  getRestaurantPaymentInstructions
);

router.post(
  "/manual-payment/confirm",
  confirmRestaurantManualPayment
);

router.get(
  "/owner/pending-manual-payments",
  authenticate,
  requireRole("RESTAURANT_OWNER"),
  getOwnerPendingManualPayments
);

router.get(
  "/owner/profile",
  authenticate,
  requireRole("RESTAURANT_OWNER"),
  getOwnerRestaurant
);

router.post(
  "/owner/profile",
  authenticate,
  requireRole("RESTAURANT_OWNER"),
  createOwnerRestaurant
);



router.put(
  "/owner/profile",
  authenticate,
  requireRole("RESTAURANT_OWNER"),
  updateOwnerRestaurant
);

router.put(
  "/owner/profile",
  authenticate,
  requireRole("RESTAURANT_OWNER"),
  requireActiveSubscription,
  updateOwnerRestaurant
);

router.get(
  "/owner/payment-settings",
  authenticate,
  requireRole("RESTAURANT_OWNER"),
  getOwnerRestaurantPaymentSettings
);

router.put(
  "/owner/payment-settings",
  authenticate,
  requireRole("RESTAURANT_OWNER"),
  updateOwnerRestaurantPaymentSettings
);

router.get(
  "/owner/opening-hours",
  authenticate,
  requireRole("RESTAURANT_OWNER"),
  getOwnerOpeningHours
);

router.put(
  "/owner/opening-hours",
  authenticate,
  requireRole("RESTAURANT_OWNER"),
  updateOwnerOpeningHours
);

router.put(
  "/owner/opening-hours",
  authenticate,
  requireRole("RESTAURANT_OWNER"),
  requireActiveSubscription,
  updateOwnerOpeningHours
);


router.get(
  "/owner/reviews",
  authenticate,
  requireRole("RESTAURANT_OWNER"),
  getOwnerRestaurantReviews
);

router.get(
  "/owner/analytics",
  authenticate,
  requireRole("RESTAURANT_OWNER"),
  getOwnerRestaurantAnalytics
);

router.put(
  "/owner/order-availability",
  authenticate,
  requireRole("RESTAURANT_OWNER"),
  updateOwnerOrderAvailability
);

router.put(
  "/owner/order-availability",
  authenticate,
  requireRole("RESTAURANT_OWNER"),
  requireActiveSubscription,
  updateOwnerOrderAvailability
);

router.get(
  "/:restaurantId/delivery-zones",
  getRestaurantDeliveryZones
);

router.get(
  "/owner/pending-manual-payments",
  authenticate,
  requireRole("RESTAURANT_OWNER"),
  getOwnerPendingManualPayments
);

router.get(
  "/:identifier",
  getRestaurantByIdentifier
);



module.exports = router;