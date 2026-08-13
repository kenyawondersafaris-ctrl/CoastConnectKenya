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
  createOwnerPromotion
);

router.patch(
  "/owner/promotions/:promotionId",
  authenticate,
  requireRole("RESTAURANT_OWNER"),
  updateOwnerPromotion
);

router.delete(
  "/owner/promotions/:promotionId",
  authenticate,
  requireRole("RESTAURANT_OWNER"),
  deleteOwnerPromotion
);

module.exports = router;