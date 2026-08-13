"use strict";

const express = require("express");

const authenticate = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");

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
  "/restaurants/:restaurantId/menu",
  createMenuItem
);

router.put(
 "/:restaurantId/menu/:menuItemId",
  updateMenuItem
);

router.delete(
  "/:restaurantId/menu/:menuItemId",
  deleteMenuItem
);

module.exports = router;