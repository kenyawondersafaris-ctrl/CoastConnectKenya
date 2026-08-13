"use strict";

const pool = require("../config/db");

async function getHomeStats(req, res) {
  try {
    const [
      restaurantsResult,
      providersResult,
      reviewsResult,
      ordersResult,
    ] = await Promise.all([
      pool.query(`
        SELECT COUNT(*)::int AS total
        FROM restaurants
        WHERE approval_status = 'APPROVED'
      `),

      pool.query(`
        SELECT COUNT(*)::int AS total
        FROM provider_profiles
        WHERE verification_status = 'VERIFIED'
      `),

      pool.query(`
        SELECT COUNT(*)::int AS total
        FROM reviews
        WHERE is_approved = TRUE
      `),

      pool.query(`
        SELECT COUNT(*)::int AS total
        FROM restaurant_orders
        WHERE status = 'COMPLETED'
      `),
    ]);

    return res.json({
      success: true,
      stats: {
        restaurants:
          restaurantsResult.rows[0].total,

        providers:
          providersResult.rows[0].total,

        reviews:
          reviewsResult.rows[0].total,

        orders:
          ordersResult.rows[0].total,
      },
    });
  } catch (error) {
    console.error(
      "Load home statistics error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load homepage statistics.",
    });
  }
}

module.exports = {
  getHomeStats,
};