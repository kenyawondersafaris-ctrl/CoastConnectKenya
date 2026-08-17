"use strict";

const express =
  require("express");

const {
  handlePayHeroCallback,
} =
  require("../controllers/payheroController");

const router =
  express.Router();

router.post(
  "/callback",
  handlePayHeroCallback
);

module.exports =
  router;