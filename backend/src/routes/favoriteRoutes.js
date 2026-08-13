"use strict";

const express = require(
  "express"
);

const {
  getCustomerFavorites,
  createCustomerFavorite,
  deleteCustomerFavorite,
} = require(
  "../controllers/favoriteController"
);

const authenticate = require(
  "../middleware/authMiddleware"
);

const requireRole = require(
  "../middleware/requireRole"
);

const router =
  express.Router();


/*
|--------------------------------------------------------------------------
| CUSTOMER FAVORITES
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  authenticate,
  requireRole("CUSTOMER"),
  getCustomerFavorites
);


router.post(
  "/",
  authenticate,
  requireRole("CUSTOMER"),
  createCustomerFavorite
);


router.delete(
  "/:favoriteId",
  authenticate,
  requireRole("CUSTOMER"),
  deleteCustomerFavorite
);


module.exports =
  router;