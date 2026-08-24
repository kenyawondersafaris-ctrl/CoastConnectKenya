"use strict";

const express = require("express");

const {
  createCustomerOrder,
  createCustomerOrderReview,
  getCustomerOrderByTrackingToken,
  getOwnerOrders,
  getStaffOrders,
  updateOwnerOrderStatus,
  updateStaffOrderStatus,
  getCustomerOrders,
} = require("../controllers/orderController");

const authenticate = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");
const requireActiveSubscription =
  require("../middleware/requireActiveSubscription");

const router = express.Router();


router.post(
  "/",
  createCustomerOrder
);

router.post(
  "/track/:trackingToken/review",
  createCustomerOrderReview
);

router.get(
  "/track/:trackingToken",
  getCustomerOrderByTrackingToken
);

router.get(
  "/customer",
  authenticate,
  requireRole("CUSTOMER"),
  getCustomerOrders
);

router.get(
  "/staff",
  authenticate,
  requireRole("RESTAURANT_STAFF"),
  getStaffOrders
);

router.patch(
  "/staff/:orderId/status",
  authenticate,
  requireRole("RESTAURANT_STAFF"),
  requireActiveSubscription,
  updateStaffOrderStatus
);

router.get(
  "/owner",
  authenticate,
  requireRole("RESTAURANT_OWNER"),
  getOwnerOrders
);

router.patch(
  "/owner/:orderId/status",
  authenticate,
  requireRole("RESTAURANT_OWNER"),
  requireActiveSubscription,
  updateOwnerOrderStatus
);
module.exports = router;