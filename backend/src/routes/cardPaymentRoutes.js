"use strict";

const express =
  require("express");

const {
  createCardPaymentAttempt,
  handleCardPaymentWebhook,
  verifyCardPayment,
} = require(
  "../controllers/cardPaymentController"
);

const router =
  express.Router();


/*
|--------------------------------------------------------------------------
| Card payment webhook
|--------------------------------------------------------------------------
|
| This endpoint is called by the payment provider.
| It must remain publicly accessible because the provider cannot
| authenticate using a Coast Connect customer JWT.
|
*/

router.post(
  "/webhook",
  handleCardPaymentWebhook
);


/*
|--------------------------------------------------------------------------
| Create card payment attempt
|--------------------------------------------------------------------------
|
| Creates/initializes a card payment for an existing Coast Connect
| checkout session.
|
*/

router.post(
  "/payment-attempt",
  createCardPaymentAttempt
);


/*
|--------------------------------------------------------------------------
| Verify card payment
|--------------------------------------------------------------------------
|
| Used by Coast Connect to verify the final provider payment state.
| The provider remains the source of truth.
|
*/

router.get(
  "/verify/:reference",
  verifyCardPayment
);


module.exports =
  router;