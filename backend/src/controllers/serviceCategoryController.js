"use strict";

const pool = require("../config/db");

async function getServiceCategories(
  req,
  res
) {
  try {
    const result =
      await pool.query(
        `
          SELECT
            id,
            name,
            description,
            is_active,
            created_at

          FROM service_categories

          WHERE is_active = TRUE

          ORDER BY name ASC
        `
      );

    const categories =
      result.rows.map(
        (row) => ({
          id:
            row.id,

          name:
            row.name,

          description:
            row.description,

          isActive:
            Boolean(
              row.is_active
            ),

          createdAt:
            row.created_at,
        })
      );

    return res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error(
      "Get service categories error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load service categories.",
    });
  }
}

module.exports = {
  getServiceCategories,
};