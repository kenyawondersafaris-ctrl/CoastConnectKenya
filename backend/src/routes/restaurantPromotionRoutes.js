"use strict";

const express = require("express");

const {
  getOwnerPromotions,
  createOwnerPromotion,
  updateOwnerPromotion,
  deleteOwnerPromotion,
  validateCustomerPromotion,
} = require(
  "../controllers/restaurantPromotionController"
);


const authenticate =
  require("../middleware/authMiddleware");

const requireRole =
  require("../middleware/requireRole");

  const requireActiveSubscription =
  require("../middleware/requireActiveSubscription");

const router = express.Router();


router.post(
  "/promotions/validate",
  validateCustomerPromotion
);

router.get(
  "/owner/promotions",
  authenticate,
  requireRole("RESTAURANT_OWNER"),
  getOwnerPromotions
);

router.post(
  "/owner/promotions",
  authenticate,
  requireRole("RESTAURANT_OWNER"),
  requireActiveSubscription,
  createOwnerPromotion
);

router.patch(
  "/owner/promotions/:promotionId",
  authenticate,
  requireRole("RESTAURANT_OWNER"),
  requireActiveSubscription,
  updateOwnerPromotion
);
router.delete(
  "/owner/promotions/:promotionId",
  authenticate,
  requireRole("RESTAURANT_OWNER"),
  requireActiveSubscription,
  deleteOwnerPromotion
);

module.exports = router;