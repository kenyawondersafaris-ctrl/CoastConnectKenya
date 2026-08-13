"use strict";

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const pool = require("../config/db");

async function getOwnerRestaurantStaff(
  req,
  res
) {
  try {
    const ownerId =
      req.user.userId;

    const restaurantResult =
      await pool.query(
        `
        SELECT id
        FROM restaurants
        WHERE owner_id = $1::uuid
        LIMIT 1
        `,
        [ownerId]
      );

    if (
      restaurantResult.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Restaurant profile not found.",
      });
    }

    const restaurantId =
      restaurantResult.rows[0].id;



    const staffResult =
      await pool.query(
        `
        SELECT
          rs.id,
          rs.restaurant_id,
          rs.user_id,
          rs.full_name,
          rs.email,
          rs.phone,
          rs.staff_role,
          rs.status,
          rs.invited_at,
          rs.joined_at,
          rs.suspended_at,
          rs.removed_at,
          rs.created_at,
          rs.updated_at,

          rsp.can_manage_orders,
          rsp.can_manage_menu,
          rsp.can_manage_gallery,
          rsp.can_view_analytics,
          rsp.can_manage_opening_hours,
          rsp.can_manage_order_availability,
          rsp.can_manage_staff,
          rsp.can_manage_settings

        FROM restaurant_staff rs

        LEFT JOIN restaurant_staff_permissions rsp
          ON rsp.restaurant_staff_id = rs.id

        WHERE rs.restaurant_id = $1::uuid
          AND rs.status <> 'REMOVED'

        ORDER BY
          rs.created_at DESC
        `,
        [restaurantId]
      );

    return res.status(200).json({
      success: true,

      staff:
        staffResult.rows.map(
          (staff) => ({
            id:
              staff.id,

            restaurantId:
              staff.restaurant_id,

            userId:
              staff.user_id,

            fullName:
              staff.full_name,

            email:
              staff.email,

            phone:
              staff.phone,

            role:
              staff.staff_role,

            status:
              staff.status,

            invitedAt:
              staff.invited_at,

            joinedAt:
              staff.joined_at,

            suspendedAt:
              staff.suspended_at,

            removedAt:
              staff.removed_at,

            createdAt:
              staff.created_at,

            updatedAt:
              staff.updated_at,

            permissions: {
              canManageOrders:
                Boolean(
                  staff.can_manage_orders
                ),

              canManageMenu:
                Boolean(
                  staff.can_manage_menu
                ),

              canManageGallery:
                Boolean(
                  staff.can_manage_gallery
                ),

              canViewAnalytics:
                Boolean(
                  staff.can_view_analytics
                ),

              canManageOpeningHours:
                Boolean(
                  staff.can_manage_opening_hours
                ),

              canManageOrderAvailability:
                Boolean(
                  staff.can_manage_order_availability
                ),

              canManageStaff:
                Boolean(
                  staff.can_manage_staff
                ),

              canManageSettings:
                Boolean(
                  staff.can_manage_settings
                ),
            },
          })
        ),
    });
  } catch (error) {
    console.error(
      "Get restaurant staff error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load restaurant staff.",
    });
  }
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function getDefaultPermissions(role) {
  const permissions = {
    canManageOrders: false,
    canManageMenu: false,
    canManageGallery: false,
    canViewAnalytics: false,
    canManageOpeningHours: false,
    canManageOrderAvailability: false,
    canManageStaff: false,
    canManageSettings: false,
  };

  if (role === "MANAGER") {
    return {
      ...permissions,
      canManageOrders: true,
      canManageMenu: true,
      canManageGallery: true,
      canViewAnalytics: true,
      canManageOpeningHours: true,
      canManageOrderAvailability: true,
    };
  }

  if (role === "CASHIER") {
    return {
      ...permissions,
      canManageOrders: true,
    };
  }

  if (role === "KITCHEN_STAFF") {
    return {
      ...permissions,
      canManageOrders: true,
    };
  }

  return permissions;
}

async function createOwnerRestaurantStaff(
  req,
  res
) {
  const client =
    await pool.connect();

  try {
    const ownerId =
      req.user.userId;

    const fullName =
      cleanText(req.body.fullName);

    const email =
      cleanText(req.body.email)
        .toLowerCase() || null;

    const phone =
      cleanText(req.body.phone) ||
      null;

    const role =
      cleanText(req.body.role)
        .toUpperCase();

    if (!fullName) {
      return res.status(400).json({
        success: false,
        message:
          "Staff member name is required.",
      });
    }

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message:
          "Provide an email address or phone number.",
      });
    }

    if (
      ![
        "MANAGER",
        "CASHIER",
        "KITCHEN_STAFF",
      ].includes(role)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Staff role must be MANAGER, CASHIER, or KITCHEN_STAFF.",
      });
    }

    await client.query("BEGIN");

    const restaurantResult =
      await client.query(
        `
        SELECT id
        FROM restaurants
        WHERE owner_id = $1::uuid
        LIMIT 1
        FOR UPDATE
        `,
        [ownerId]
      );

    if (
      restaurantResult.rows.length === 0
    ) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message:
          "Restaurant profile not found.",
      });
    }

    const restaurantId =
      restaurantResult.rows[0].id;

    const existingResult =
      await client.query(
        `
        SELECT id
        FROM restaurant_staff
        WHERE restaurant_id = $1::uuid
          AND status <> 'REMOVED'
          AND (
            (
              $2::varchar IS NOT NULL
              AND LOWER(email) =
                LOWER($2::varchar)
            )
            OR
            (
              $3::varchar IS NOT NULL
              AND phone = $3::varchar
            )
          )
        LIMIT 1
        `,
        [
          restaurantId,
          email,
          phone,
        ]
      );

    if (
      existingResult.rows.length > 0
    ) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message:
          "A staff member with this email or phone already exists.",
      });
    }

    const invitationToken =
  crypto.randomBytes(32).toString("hex");

const invitationExpiresAt =
  new Date(
    Date.now() + 48 * 60 * 60 * 1000
  );

    const staffResult =
      await client.query(
        `
        INSERT INTO restaurant_staff (
        restaurant_id,
        full_name,
        email,
        phone,
        staff_role,
        status,
        invitation_token,
        invitation_expires_at
        )
        VALUES (
        $1::uuid,
        $2::varchar,
        $3::varchar,
        $4::varchar,
        $5::varchar,
        'INVITED',
        $6::varchar,
        $7::timestamptz
        )
        RETURNING
          id,
          restaurant_id,
          user_id,
          full_name,
          email,
          phone,
          staff_role,
          status,
          invited_at,
          joined_at,
          created_at,
          updated_at
        `,
        [
        restaurantId,
        fullName,
        email,
        phone,
        role,
        invitationToken,
        invitationExpiresAt,
        ]
      );

    const staff =
      staffResult.rows[0];

    const defaultPermissions =
      getDefaultPermissions(role);



    await client.query(
      `
      INSERT INTO restaurant_staff_permissions (
        restaurant_staff_id,
        can_manage_orders,
        can_manage_menu,
        can_manage_gallery,
        can_view_analytics,
        can_manage_opening_hours,
        can_manage_order_availability,
        can_manage_staff,
        can_manage_settings
      )
      VALUES (
        $1::uuid,
        $2::boolean,
        $3::boolean,
        $4::boolean,
        $5::boolean,
        $6::boolean,
        $7::boolean,
        $8::boolean,
        $9::boolean
      )
      `,
      [
        staff.id,
        defaultPermissions.canManageOrders,
        defaultPermissions.canManageMenu,
        defaultPermissions.canManageGallery,
        defaultPermissions.canViewAnalytics,
        defaultPermissions.canManageOpeningHours,
        defaultPermissions.canManageOrderAvailability,
        defaultPermissions.canManageStaff,
        defaultPermissions.canManageSettings,
      ]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message:
        "Restaurant staff invitation created successfully.",

      staff: {
        id:
          staff.id,

        restaurantId:
          staff.restaurant_id,

        userId:
          staff.user_id,

        fullName:
          staff.full_name,

        email:
          staff.email,

        phone:
          staff.phone,

        role:
          staff.staff_role,

        status:
          staff.status,

        invitedAt:
          staff.invited_at,

        joinedAt:
          staff.joined_at,

        createdAt:
          staff.created_at,

        updatedAt:
          staff.updated_at,

        permissions:
          defaultPermissions,
      },

      invitation: {
  token:
    invitationToken,

  expiresAt:
    invitationExpiresAt,

  acceptanceUrl:
    `http://127.0.0.1:5500/frontend/staff-invitation.html?token=${encodeURIComponent(
      invitationToken
    )}`,
},
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Create restaurant staff error:",
      error
    );

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message:
          "A staff member with this email, phone, or account already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to create restaurant staff invitation.",
    });
  } finally {
    client.release();
  }
}

async function getRestaurantStaffInvitation(
  req,
  res
) {
  try {
    const token =
      cleanText(req.params.token);

    if (!token) {
      return res.status(400).json({
        success: false,
        message:
          "Invitation token is required.",
      });
    }

    const result =
      await pool.query(
        `
        SELECT
          rs.id,
          rs.full_name,
          rs.email,
          rs.phone,
          rs.staff_role,
          rs.status,
          rs.invitation_expires_at,
          rs.invitation_accepted_at,

          r.id AS restaurant_id,
          r.name AS restaurant_name

        FROM restaurant_staff rs

        INNER JOIN restaurants r
          ON r.id = rs.restaurant_id

        WHERE rs.invitation_token = $1
        LIMIT 1
        `,
        [token]
      );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "This staff invitation was not found.",
      });
    }

    const invitation =
      result.rows[0];

    if (
      invitation.status !== "INVITED" ||
      invitation.invitation_accepted_at
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This staff invitation has already been used.",
      });
    }

    if (
      !invitation.invitation_expires_at ||
      new Date(
        invitation.invitation_expires_at
      ).getTime() <= Date.now()
    ) {
      return res.status(410).json({
        success: false,
        message:
          "This staff invitation has expired.",
      });
    }

    return res.status(200).json({
      success: true,

      invitation: {
        staffId:
          invitation.id,

        fullName:
          invitation.full_name,

        email:
          invitation.email,

        phone:
          invitation.phone,

        role:
          invitation.staff_role,

        restaurantId:
          invitation.restaurant_id,

        restaurantName:
          invitation.restaurant_name,

        expiresAt:
          invitation.invitation_expires_at,
      },
    });
  } catch (error) {
    console.error(
      "Get restaurant staff invitation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load the staff invitation.",
    });
  }
}

async function acceptRestaurantStaffInvitation(
  req,
  res
) {
  const client =
    await pool.connect();

  try {
    const token =
      cleanText(req.params.token);

    const password =
      String(req.body.password || "");

    const confirmPassword =
      String(
        req.body.confirmPassword || ""
      );

    if (!token) {
      return res.status(400).json({
        success: false,
        message:
          "Invitation token is required.",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message:
          "Password is required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 8 characters.",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Passwords do not match.",
      });
    }

    await client.query("BEGIN");

    const invitationResult =
      await client.query(
        `
        SELECT
          rs.id,
          rs.restaurant_id,
          rs.user_id,
          rs.full_name,
          rs.email,
          rs.phone,
          rs.staff_role,
          rs.status,
          rs.invitation_expires_at,
          rs.invitation_accepted_at,

          r.name AS restaurant_name

        FROM restaurant_staff rs

        INNER JOIN restaurants r
          ON r.id = rs.restaurant_id

        WHERE rs.invitation_token = $1

        LIMIT 1

        FOR UPDATE OF rs
        `,
        [token]
      );

    if (
      invitationResult.rows.length === 0
    ) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message:
          "This staff invitation was not found.",
      });
    }

    const invitation =
      invitationResult.rows[0];

    if (
      invitation.status !== "INVITED" ||
      invitation.invitation_accepted_at ||
      invitation.user_id
    ) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message:
          "This staff invitation has already been used.",
      });
    }

    if (
      !invitation.invitation_expires_at ||
      new Date(
        invitation.invitation_expires_at
      ).getTime() <= Date.now()
    ) {
      await client.query("ROLLBACK");

      return res.status(410).json({
        success: false,
        message:
          "This staff invitation has expired.",
      });
    }

    if (!invitation.email) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message:
          "This invitation does not contain an email address.",
      });
    }

    const normalizedEmail =
      invitation.email
        .trim()
        .toLowerCase();

    const existingUserResult =
      await client.query(
        `
        SELECT
          id,
          email,
          phone,
          role

        FROM users

        WHERE
          LOWER(email) =
            LOWER($1::varchar)

          OR (
            $2::varchar IS NOT NULL
            AND phone = $2::varchar
          )

        LIMIT 1
        `,
        [
          normalizedEmail,
          invitation.phone || null,
        ]
      );

    if (
      existingUserResult.rows.length > 0
    ) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message:
          "An account already exists with this email or phone. Existing-account linking will be handled separately.",
      });
    }

    const passwordHash =
      await bcrypt.hash(
        password,
        12
      );

    const userResult =
      await client.query(
        `
        INSERT INTO users (
          full_name,
          email,
          phone,
          password_hash,
          role,
          account_status,
          is_verified
        )
        VALUES (
          $1::varchar,
          $2::varchar,
          $3::varchar,
          $4::varchar,
          'RESTAURANT_STAFF',
          'ACTIVE',
          TRUE
        )
        RETURNING
          id,
          full_name,
          email,
          phone,
          role,
          account_status,
          is_verified,
          created_at
        `,
        [
          invitation.full_name,
          normalizedEmail,
          invitation.phone || null,
          passwordHash,
        ]
      );

    const user =
      userResult.rows[0];

    const staffResult =
      await client.query(
        `
        UPDATE restaurant_staff

        SET
          user_id = $1::uuid,
          status = 'ACTIVE',
          joined_at =
            CURRENT_TIMESTAMP,
          invitation_accepted_at =
            CURRENT_TIMESTAMP,
          invitation_token = NULL,
          invitation_expires_at = NULL,
          updated_at =
            CURRENT_TIMESTAMP

        WHERE id = $2::uuid

        RETURNING
          id,
          restaurant_id,
          user_id,
          full_name,
          email,
          phone,
          staff_role,
          status,
          joined_at,
          updated_at
        `,
        [
          user.id,
          invitation.id,
        ]
      );

    const staff =
      staffResult.rows[0];

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,

      message:
        "Staff account activated successfully.",

      account: {
        userId:
          user.id,

        fullName:
          user.full_name,

        email:
          user.email,

        phone:
          user.phone,

        accountRole:
          user.role,

        staffRole:
          staff.staff_role,

        staffStatus:
          staff.status,

        restaurantId:
          staff.restaurant_id,

        restaurantName:
          invitation.restaurant_name,

        joinedAt:
          staff.joined_at,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Accept restaurant staff invitation error:",
      error
    );

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message:
          "An account already exists with this email or phone.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to activate the staff account.",
    });
  } finally {
    client.release();
  }
}

async function getCurrentRestaurantStaff(
  req,
  res
) {
  try {
    const userId =
      req.user.userId;

    const result =
      await pool.query(
        `
        SELECT
          rs.id,
          rs.restaurant_id,
          rs.user_id,
          rs.full_name,
          rs.email,
          rs.phone,
          rs.staff_role,
          rs.status,
          rs.joined_at,
          rs.updated_at,

          r.name AS restaurant_name,

          rsp.can_manage_orders,
          rsp.can_manage_menu,
          rsp.can_manage_gallery,
          rsp.can_view_analytics,
          rsp.can_manage_opening_hours,
          rsp.can_manage_order_availability,
          rsp.can_manage_staff,
          rsp.can_manage_settings

        FROM restaurant_staff rs

        INNER JOIN restaurants r
          ON r.id = rs.restaurant_id

        LEFT JOIN restaurant_staff_permissions rsp
          ON rsp.restaurant_staff_id = rs.id

        WHERE rs.user_id = $1::uuid
          AND rs.status <> 'REMOVED'

        LIMIT 1
        `,
        [userId]
      );

    if (
      result.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Restaurant staff profile not found.",
      });
    }

    const staff =
      result.rows[0];

    if (staff.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message:
          "Your restaurant staff account is not active.",
      });
    }

    return res.status(200).json({
      success: true,

      staff: {
        id:
          staff.id,

        userId:
          staff.user_id,

        restaurantId:
          staff.restaurant_id,

        restaurantName:
          staff.restaurant_name,

        fullName:
          staff.full_name,

        email:
          staff.email,

        phone:
          staff.phone,

        role:
          staff.staff_role,

        status:
          staff.status,

        joinedAt:
          staff.joined_at,

        updatedAt:
          staff.updated_at,

        permissions: {
          canManageOrders:
            Boolean(
              staff.can_manage_orders
            ),

          canManageMenu:
            Boolean(
              staff.can_manage_menu
            ),

          canManageGallery:
            Boolean(
              staff.can_manage_gallery
            ),

          canViewAnalytics:
            Boolean(
              staff.can_view_analytics
            ),

          canManageOpeningHours:
            Boolean(
              staff.can_manage_opening_hours
            ),

          canManageOrderAvailability:
            Boolean(
              staff.can_manage_order_availability
            ),

          canManageStaff:
            Boolean(
              staff.can_manage_staff
            ),

          canManageSettings:
            Boolean(
              staff.can_manage_settings
            ),
        },
      },
    });
  } catch (error) {
    console.error(
      "Get current restaurant staff error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load your staff account.",
    });
  }
}

module.exports = {
  getOwnerRestaurantStaff,
  createOwnerRestaurantStaff,
  getRestaurantStaffInvitation,
  acceptRestaurantStaffInvitation,
  getCurrentRestaurantStaff,
};