"use strict";

const pool = require("../config/db");
const bcrypt = require("bcryptjs");

function cleanText(value) {
  return String(value ?? "").trim();
}

async function getUserRoles(userId) {
  const result = await pool.query(
    `
      SELECT role
      FROM user_roles
      WHERE user_id = $1
      ORDER BY created_at ASC
    `,
    [userId]
  );

  return result.rows.map((row) => row.role);
}

async function addRoleToUser(userId, role) {
  await pool.query(
    `
      INSERT INTO user_roles (
        user_id,
        role
      )
      VALUES ($1, $2)
      ON CONFLICT (user_id, role)
      DO NOTHING
    `,
    [userId, role]
  );
}

async function getAuthenticatedUser(
  req,
  res
) {
  try {
    const userId =
      req.user?.id ||
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
            id,
            full_name,
            email,
            phone,
            role,
            account_status,
            is_verified,
            created_at,
            updated_at

          FROM users

          WHERE id =
            $1::uuid

          LIMIT 1
        `,
        [
          userId,
        ]
      );

    if (
      result.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "User account was not found.",
      });
    }

    const user =
      result.rows[0];

    const roles =
      await getUserRoles(
        user.id
      );

    return res.status(200).json({
      success: true,

      user: {
        id:
          user.id,

        fullName:
          user.full_name,

        email:
          user.email,

        phone:
          user.phone,

        role:
          user.role,

        roles,

        accountStatus:
          user.account_status,

        isVerified:
          Boolean(
            user.is_verified
          ),

        createdAt:
          user.created_at,

        updatedAt:
          user.updated_at,
      },
    });
  } catch (error) {
    console.error(
      "Get authenticated user error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load the account.",
    });
  }
}

async function updateAuthenticatedUser(
  req,
  res
) {
  try {
    const userId =
  req.user?.id ||
  req.user?.userId;

    const fullName =
      cleanText(req.body.fullName);

    const phone =
      cleanText(req.body.phone) || null;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    if (!fullName) {
      return res.status(400).json({
        success: false,
        message:
          "Full name is required.",
      });
    }

    const result =
      await pool.query(
        `
          UPDATE users

          SET
            full_name = $1::varchar,
            phone = $2::varchar,
            updated_at =
              CURRENT_TIMESTAMP

          WHERE id = $3::uuid

          RETURNING
            id,
            full_name,
            email,
            phone,
            role,
            account_status,
            is_verified,
            created_at,
            updated_at
        `,
        [
          fullName,
          phone,
          userId,
        ]
      );

    if (
      result.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "User account was not found.",
      });
    }

    const user =
      result.rows[0];

    return res.status(200).json({
      success: true,
      message:
        "Account updated successfully.",

      user: {
        id:
          user.id,

        fullName:
          user.full_name,

        email:
          user.email,

        phone:
          user.phone,

        role:
          user.role,

        accountStatus:
          user.account_status,

        isVerified:
          user.is_verified,

        createdAt:
          user.created_at,

        updatedAt:
          user.updated_at,
      },
    });
  } catch (error) {
    console.error(
      "Update authenticated user error:",
      error
    );

    if (
      error.code === "23505"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "That phone number is already connected to another account.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to update the account.",
    });
  }
}

async function changeAuthenticatedUserPassword(
  req,
  res
) {
  try {
    const userId =
      req.user?.id ||
      req.user?.userId;

    const currentPassword =
      cleanText(
        req.body.currentPassword
      );

    const newPassword =
      cleanText(
        req.body.newPassword
      );

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    if (
      !currentPassword ||
      !newPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Current password and new password are required.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be at least 8 characters.",
      });
    }

    if (
      currentPassword ===
      newPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be different from the current password.",
      });
    }

    const userResult =
      await pool.query(
        `
          SELECT
            id,
            password_hash

          FROM users

          WHERE id = $1::uuid

          LIMIT 1
        `,
        [userId]
      );

    if (
      userResult.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "User account was not found.",
      });
    }

    const user =
      userResult.rows[0];

    const passwordMatches =
      await bcrypt.compare(
        currentPassword,
        user.password_hash
      );

    if (!passwordMatches) {
      return res.status(400).json({
        success: false,
        message:
          "Current password is incorrect.",
      });
    }

    const newPasswordHash =
      await bcrypt.hash(
        newPassword,
        12
      );

    await pool.query(
      `
        UPDATE users

        SET
          password_hash =
            $1::varchar,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id =
          $2::uuid
      `,
      [
        newPasswordHash,
        userId,
      ]
    );

    return res.status(200).json({
      success: true,
      message:
        "Password changed successfully.",
    });
  } catch (error) {
    console.error(
      "Change authenticated user password error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to change the password.",
    });
  }
}

async function becomeProvider(req, res) {
  try {
    const userId =
      req.user?.userId ||
      req.user?.id;

    await addRoleToUser(
      userId,
      "PROVIDER"
    );

    const roles =
      await getUserRoles(userId);

    return res.status(200).json({
      success: true,
      message:
        "You are now a service provider.",
      roles,
    });
  } catch (error) {
    console.error(
      "Become provider error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to upgrade account.",
    });
  }
}

async function becomeRestaurantOwner(
  req,
  res
) {
  try {
    const userId =
      req.user?.userId ||
      req.user?.id;

    await addRoleToUser(
      userId,
      "RESTAURANT_OWNER"
    );

    const roles =
      await getUserRoles(userId);

    return res.status(200).json({
      success: true,
      message:
        "You are now a restaurant partner.",
      roles,
    });
  } catch (error) {
    console.error(
      "Become restaurant owner error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to upgrade account.",
    });
  }
}

module.exports = {
  getAuthenticatedUser,
  updateAuthenticatedUser,
  changeAuthenticatedUserPassword,
  becomeProvider,
  becomeRestaurantOwner,
};