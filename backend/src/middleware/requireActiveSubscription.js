"use strict";

const pool = require("../config/db");

async function requireActiveSubscription(
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
        message: "Authentication required.",
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
            AND business_type = 'RESTAURANT'
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
          "An active restaurant subscription is required.",
        code:
          "SUBSCRIPTION_REQUIRED",
      });
    }

    if (
      subscription.status !==
      "ACTIVE"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Your restaurant subscription is not active.",
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
          "Your restaurant subscription has expired.",
        code:
          "SUBSCRIPTION_EXPIRED",
      });
    }

    req.subscription =
      subscription;

    next();
  } catch (error) {
    console.error(
      "Active subscription check error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to verify subscription status.",
    });
  }
}

module.exports =
  requireActiveSubscription;