"use strict";

const express = require("express");

const authenticate =
  require("../middleware/authMiddleware");

const allowRoles =
  require("../middleware/roleMiddleware");

const {
  getOwnerDeliveryZones,
  createOwnerDeliveryZone,
  updateOwnerDeliveryZone,
  deleteOwnerDeliveryZone,
} = require(
  "../controllers/restaurantDeliveryZoneController"
);

const router =
  express.Router();

router.get(
  "/owner/delivery-zones",
  authenticate,
  allowRoles("RESTAURANT_OWNER"),
  getOwnerDeliveryZones
);

router.post(
  "/owner/delivery-zones",
  authenticate,
  allowRoles("RESTAURANT_OWNER"),
  createOwnerDeliveryZone
);

router.patch(
  "/owner/delivery-zones/:zoneId",
  authenticate,
  allowRoles("RESTAURANT_OWNER"),
  updateOwnerDeliveryZone
);

router.delete(
  "/owner/delivery-zones/:zoneId",
  authenticate,
  allowRoles("RESTAURANT_OWNER"),
  deleteOwnerDeliveryZone
);
module.exports =
  router;