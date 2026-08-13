"use strict";

const express = require("express");

const {
  getHomeStats,
} = require(
  "../controllers/homeController"
);

const router = express.Router();

router.get(
  "/stats",
  getHomeStats
);

module.exports = router;