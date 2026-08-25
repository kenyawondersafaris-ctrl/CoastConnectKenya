"use strict";

const express = require("express");

const authenticate = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");

const requireActiveSubscription =
  require("../middleware/requireActiveSubscription");

const {
  getOwnerMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} = require("../controllers/menuController");

const router = express.Router();

router.use(authenticate);
router.use(requireRole("RESTAURANT_OWNER"));

router.get(
  "/:restaurantId/menu",
  getOwnerMenuItems
);

router.post(
  "/:restaurantId/menu",
  requireActiveSubscription,
  createMenuItem
);

router.put(
  "/:restaurantId/menu/:menuItemId",
  requireActiveSubscription,
  updateMenuItem
);

router.delete(
  "/:restaurantId/menu/:menuItemId",
  requireActiveSubscription,
  deleteMenuItem
);

module.exports = router;