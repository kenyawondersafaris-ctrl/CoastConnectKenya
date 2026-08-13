"use strict";

const express = require("express");

const {
  getServiceCategories,
} = require(
  "../controllers/serviceCategoryController"
);

const router = express.Router();

router.get(
  "/",
  getServiceCategories
);

module.exports = router;