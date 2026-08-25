"use strict";

const pool = require("../config/db");

async function requireActiveProviderSubscription(
  req,
  res,
  next
) {
  try {
    const userId =
      req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    const result =
      await pool.query(
        `
          SELECT
            status,
            expires_at

          FROM business_subscriptions

          WHERE user_id = $1
            AND business_type = 'PROVIDER'

          ORDER BY created_at DESC

          LIMIT 1
        `,
        [userId]
      );

    const subscription =
      result.rows[0];

    if (!subscription) {
      return res.status(403).json({
        success: false,
        message:
          "An active provider subscription is required.",
        code:
          "SUBSCRIPTION_REQUIRED",
      });
    }

    if (
      String(
        subscription.status
      ).toUpperCase() !==
      "ACTIVE"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Your provider subscription is not active.",
        code:
          "SUBSCRIPTION_INACTIVE",
      });
    }

    if (
      subscription.expires_at &&
      new Date(
        subscription.expires_at
      ) <= new Date()
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Your provider subscription has expired.",
        code:
          "SUBSCRIPTION_EXPIRED",
      });
    }

    req.subscription =
      subscription;

    next();

  } catch (error) {
    console.error(
      "Provider subscription check error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to verify provider subscription status.",
    });
  }
}

module.exports =
  requireActiveProviderSubscription;