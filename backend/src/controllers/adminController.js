"use strict";

const pool = require("../config/db");

async function getAdminOverview(
  req,
  res
) {
  try {
    const result =
      await pool.query(`
        SELECT

          (
            SELECT COUNT(*)::integer
            FROM users
            WHERE role = 'CUSTOMER'
          ) AS customers,

          (
            SELECT COUNT(*)::integer
            FROM provider_profiles
          ) AS providers,

          (
            SELECT COUNT(*)::integer
            FROM restaurants
          ) AS restaurants,

          (
            SELECT COUNT(*)::integer
            FROM provider_profiles
            WHERE verification_status = 'PENDING'
          )
          +
          (
            SELECT COUNT(*)::integer
            FROM restaurants
            WHERE approval_status = 'PENDING'
          )
          AS pending_approvals
      `);

    const stats =
      result.rows[0];

    return res.status(200).json({
      success: true,

      stats: {
        customers:
          Number(
            stats.customers || 0
          ),

        providers:
          Number(
            stats.providers || 0
          ),

        restaurants:
          Number(
            stats.restaurants || 0
          ),

        pendingApprovals:
          Number(
            stats.pending_approvals || 0
          ),
      },
    });
  } catch (error) {
    console.error(
      "Admin overview error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load admin overview.",
    });
  }
}

async function getPendingProviders(
  req,
  res
) {
  try {
    const result =
      await pool.query(`
        SELECT
          p.id,
          p.user_id,
          u.full_name,
          u.email,
          u.phone,
          p.service_area,
          p.verification_status,
          p.availability_status,
          p.created_at
        FROM provider_profiles p
        INNER JOIN users u
          ON u.id = p.user_id
        ORDER BY
          p.created_at DESC
      `);

    return res.json({
      success: true,
      providers: result.rows,
    });

  } catch (error) {

    console.error(
      "Admin providers error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load providers.",
    });

  }
}

async function approveProvider(
  req,
  res
) {
  try {

    const providerId =
      req.params.providerId;

    const result =
      await pool.query(
        `
        UPDATE provider_profiles

        SET
          verification_status='VERIFIED',
          availability_status='AVAILABLE',
          updated_at=NOW()

        WHERE id=$1

        RETURNING id
        `,
        [providerId]
      );

    if (
      result.rows.length === 0
    ) {
      return res.status(404).json({
        success:false,
        message:"Provider not found."
      });
    }

    return res.json({
      success:true,
      message:"Provider approved."
    });

  } catch(error){

    console.error(error);

    return res.status(500).json({
      success:false,
      message:"Unable to approve provider."
    });

  }
}

async function rejectProvider(
  req,
  res
) {
  try {
    const providerId =
      req.params.providerId;

    const result =
      await pool.query(
        `
          UPDATE provider_profiles
          SET
            verification_status = 'REJECTED',
            availability_status = 'OFFLINE',
            updated_at = NOW()
          WHERE id = $1
          RETURNING id
        `,
        [providerId]
      );

    if (
      result.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Provider not found.",
      });
    }

    return res.json({
      success: true,
      message:
        "Provider rejected.",
    });

  } catch (error) {
    console.error(
      "Reject provider error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to reject provider.",
    });
  }
}

async function getPendingRestaurants(
  req,
  res
) {
  try {

    const result =
      await pool.query(`
        SELECT
          r.id,
         r.owner_id,
          r.name,
          r.slug,
          r.approval_status,
          r.created_at,
          u.full_name,
          u.email,
          u.phone

        FROM restaurants r

        INNER JOIN users u
         ON u.id = r.owner_id

        ORDER BY
          r.created_at DESC
      `);

    return res.json({
      success: true,
      restaurants:
        result.rows,
    });

  } catch (error) {

    console.error(
      "Admin restaurants error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load restaurants.",
    });

  }
}

async function approveRestaurant(
  req,
  res
) {
  try {

    const restaurantId =
      req.params.restaurantId;

    const result =
      await pool.query(
        `
        UPDATE restaurants

        SET
          approval_status = 'APPROVED',
          updated_at = NOW()

        WHERE id = $1

        RETURNING id
        `,
        [restaurantId]
      );

    if (
      result.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Restaurant not found.",
      });
    }

    return res.json({
      success: true,
      message:
        "Restaurant approved.",
    });

  } catch (error) {

    console.error(
      "Approve restaurant error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to approve restaurant.",
    });

  }
}

async function rejectRestaurant(
  req,
  res
) {
  try {

    const restaurantId =
      req.params.restaurantId;

    const result =
      await pool.query(
        `
        UPDATE restaurants

        SET
          approval_status = 'REJECTED',
          is_accepting_orders = FALSE,
          updated_at = NOW()

        WHERE id = $1

        RETURNING id
        `,
        [restaurantId]
      );

    if (
      result.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Restaurant not found.",
      });
    }

    return res.json({
      success: true,
      message:
        "Restaurant rejected.",
    });

  } catch (error) {

    console.error(
      "Reject restaurant error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to reject restaurant.",
    });

  }
}

async function getUsers(
  req,
  res
) {
  try {

    const result =
      await pool.query(
        `
        SELECT
          id,
          full_name,
          email,
          phone,
          role,
          account_status,
          is_verified,
          created_at

        FROM users

        ORDER BY
          created_at DESC
        `
      );

    return res.json({
      success: true,
      users: result.rows,
    });

  } catch (error) {

    console.error(
      "Admin users error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load users.",
    });

  }
}

async function updateUserAccountStatus(
  req,
  res
) {
  try {
    const userId =
      req.params.userId;

    const accountStatus =
      String(
        req.body.accountStatus || ""
      )
        .trim()
        .toUpperCase();

    const allowedStatuses = [
      "ACTIVE",
      "SUSPENDED",
    ];

    if (
      !allowedStatuses.includes(
        accountStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid account status.",
      });
    }

    const result =
      await pool.query(
        `
          UPDATE users

          SET
            account_status = $2,
            updated_at = NOW()

          WHERE id = $1

          RETURNING
            id,
            full_name,
            email,
            role,
            account_status
        `,
        [
          userId,
          accountStatus,
        ]
      );

    if (
      result.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "User not found.",
      });
    }

    return res.json({
      success: true,
      message:
        accountStatus ===
        "SUSPENDED"
          ? "User suspended."
          : "User reactivated.",

      user:
        result.rows[0],
    });

  } catch (error) {
    console.error(
      "Update user status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update user account.",
    });
  }
}

module.exports = {
  getAdminOverview,
  getPendingProviders,
  approveProvider,
  rejectProvider,
  getPendingRestaurants,
  approveRestaurant,
  rejectRestaurant,
  getUsers,
  updateUserAccountStatus,
};