"use strict";

const express =
  require("express");

const optionalAuthenticate =
  require(
    "../middleware/optionalAuthMiddleware"
  );

const {
  createCheckoutSession,
} = require(
  "../controllers/checkoutController"
);

const router =
  express.Router();

router.post(
  "/",
  optionalAuthenticate,
  createCheckoutSession
);

module.exports =
  router; 