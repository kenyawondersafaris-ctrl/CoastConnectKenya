"use strict";

const express =
  require("express");

const authenticate =
  require("../middleware/authMiddleware");

const requireRole =
  require("../middleware/requireRole");

const {
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} =
  require("../controllers/adminNotificationController");

const {
  getContactMessages,
  resolveContactMessage,
  saveAdminNotes,
} =
  require("../controllers/contactController");

const {
  getAdminOverview,
  getPendingProviders,
  approveProvider,
  rejectProvider,
  getPendingRestaurants,
  approveRestaurant,
  rejectRestaurant,
  getUsers,
  updateUserAccountStatus,
} =
  require("../controllers/adminController");

const router =
  express.Router();

router.get(
  "/overview",
  authenticate,
  requireRole("ADMIN"),
  getAdminOverview
);

router.get(
  "/providers",
  authenticate,
  requireRole("ADMIN"),
  getPendingProviders
);


router.patch(
  "/providers/:providerId/approve",
  authenticate,
  requireRole("ADMIN"),
  approveProvider
);

router.patch(
  "/providers/:providerId/reject",
  authenticate,
  requireRole("ADMIN"),
  rejectProvider
);

router.get(
  "/restaurants",
  authenticate,
  requireRole("ADMIN"),
  getPendingRestaurants
);

router.patch(
  "/restaurants/:restaurantId/approve",
  authenticate,
  requireRole("ADMIN"),
  approveRestaurant
);

router.patch(
  "/restaurants/:restaurantId/reject",
  authenticate,
  requireRole("ADMIN"),
  rejectRestaurant
);

router.get(
  "/users",
  authenticate,
  requireRole("ADMIN"),
  getUsers
);

router.patch(
  "/users/:userId/status",
  authenticate,
  requireRole("ADMIN"),
  updateUserAccountStatus
);

router.get(
  "/contact-messages",
  authenticate,
  requireRole("ADMIN"),
  getContactMessages
);

router.get(
  "/notifications",
  authenticate,
  requireRole("ADMIN"),
  getAdminNotifications
);

router.patch(
  "/notifications/:notificationId/read",
  authenticate,
  requireRole("ADMIN"),
  markAdminNotificationRead
);

router.patch(
  "/notifications/read-all",
  authenticate,
  requireRole("ADMIN"),
  markAllAdminNotificationsRead
);

router.patch(
  "/contact-messages/:messageId/resolve",
  authenticate,
  requireRole("ADMIN"),
  resolveContactMessage
);

router.patch(
  "/contact-messages/:messageId/notes",
  authenticate,
  requireRole("ADMIN"),
  saveAdminNotes
);


module.exports =
  router;