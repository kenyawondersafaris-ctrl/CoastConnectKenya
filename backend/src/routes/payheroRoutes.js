"use strict";

const express =
  require("express");

const authenticate =
  require("../middleware/authMiddleware");

const requireRole =
  require("../middleware/requireRole");

const {
  handlePayHeroCallback,
  handlePayHeroSubscriptionCallback,
} =
  require("../controllers/payheroController");

const {
  initiatePayHeroStkPush,
} =
  require("../services/payheroService");

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| Temporary admin-only PayHero STK test
|--------------------------------------------------------------------------
*/

router.post(
  "/test-stk",
  authenticate,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const phoneNumber =
        String(
          req.body?.phoneNumber ||
          ""
        ).trim();

      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          message:
            "Test phone number is required.",
        });
      }

      const result =
        await initiatePayHeroStkPush({
          phoneNumber,

          amount:
            10,

          externalReference:
            `CC-PAYHERO-TEST-${Date.now()}`,

          customerName:
            "Coast Connect Test",

          callbackUrl:
            "https://coastconnectkenya.onrender.com/api/payments/payhero/callback",
        });

      return res.status(201).json({
        success: true,
        message:
          "PayHero STK test submitted.",
        result,
      });

    } catch (error) {
      console.error(
        "PayHero STK test error:",
        error.response?.data ||
        error.message
      );

      return res.status(500).json({
        success: false,
        message:
          error.response?.data ||
          error.message,
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| PayHero callback
|--------------------------------------------------------------------------
*/

router.post(
  "/callback",
  handlePayHeroCallback
);

router.post(
  "/subscription-callback",
  handlePayHeroSubscriptionCallback
);

module.exports =
  router;