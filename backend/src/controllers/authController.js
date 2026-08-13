"use strict";

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const {
  sendVerificationCode,
  verifyEmailCode,
} =
require("../services/emailVerificationService");



const allowedRoles = [
  "CUSTOMER",
  "PROVIDER",
  "RESTAURANT_OWNER",
];

function cleanText(value) {
  return String(value ?? "").trim();
}

async function register(req, res) {
  const client = await pool.connect();

  try {
   const {
  fullName,
  email,
  phone,
  password,
  role = "CUSTOMER",
} = req.validated.body;

    const normalizedFullName =
      cleanText(fullName);

    const normalizedEmail =
      cleanText(email).toLowerCase();

    const normalizedPhone =
      cleanText(phone) || null;

    const normalizedRole =
      cleanText(role).toUpperCase();

    if (
      !normalizedFullName ||
      !normalizedEmail ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Full name, email and password are required",
      });
    }

    if (
      !allowedRoles.includes(
        normalizedRole
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid account role",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 8 characters",
      });
    }

    await client.query("BEGIN");

    const existingUser =
      await client.query(
        `
          SELECT id
          FROM users
          WHERE email = $1::varchar
             OR (
               $2::varchar IS NOT NULL
               AND phone = $2::varchar
             )
          LIMIT 1
        `,
        [
          normalizedEmail,
          normalizedPhone,
        ]
      );

    if (
      existingUser.rows.length > 0
    ) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message:
          "An account with that email or phone already exists",
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
            role
          )
          VALUES (
            $1::varchar,
            $2::varchar,
            $3::varchar,
            $4::text,
            $5::varchar
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
          normalizedFullName,
          normalizedEmail,
          normalizedPhone,
          passwordHash,
          normalizedRole,
        ]
      );

    const user =
      userResult.rows[0];

    await client.query(
      `
        INSERT INTO user_roles (
          user_id,
          role
        )
        VALUES (
          $1::uuid,
          $2::varchar
        )
        ON CONFLICT (
          user_id,
          role
        )
        DO NOTHING
      `,
      [
        user.id,
        normalizedRole,
      ]
    );

    await client.query("COMMIT");

    try {
  await sendVerificationCode({
    id:
      user.id,

    email:
      user.email,

    fullName:
      user.full_name,
  });
} catch (emailError) {
  console.error(
    "Verification email send error:",
    emailError
  );
}

    return res.status(201).json({
      success: true,
      message:
        "Account created successfully",

      user: {
        id: user.id,
        fullName:
          user.full_name,
        email:
          user.email,
        phone:
          user.phone,

        // Kept for existing frontend code.
        role:
          user.role,

        // New multi-role field.
        roles: [
          normalizedRole,
        ],

        accountStatus:
          user.account_status,

        isVerified:
          user.is_verified,

        createdAt:
          user.created_at,
      },
    });
  } catch (error) {
    try {
      await client.query(
        "ROLLBACK"
      );
    } catch (rollbackError) {
      console.error(
        "Registration rollback error:",
        rollbackError
      );
    }

    console.error(
      "Registration error:",
      error
    );

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message:
          "An account with that email or phone already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to create account",
    });
  } finally {
    client.release();
  }
}

async function verifyEmail(
  req,
  res
) {
  try {
    const {
      userId,
      code,
    } =
      req.body;

    const result =
      await verifyEmailCode(
        userId,
        code
      );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message:
          result.message,
      });
    }

    return res.status(200).json({
      success: true,
      message:
        result.message,
    });
  } catch (error) {
    console.error(
      "Email verification error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to verify email.",
    });
  }
}


async function resendVerificationCode(
  req,
  res
) {
  try {
    const {
      userId,
    } = req.body;

    const normalizedUserId =
      String(
        userId || ""
      ).trim();

    if (!normalizedUserId) {
      return res.status(400).json({
        success: false,
        message:
          "User ID is required.",
      });
    }

    const userResult =
      await pool.query(
        `
          SELECT
            id,
            full_name,
            email,
            is_verified
          FROM users
          WHERE id = $1::uuid
          LIMIT 1
        `,
        [
          normalizedUserId,
        ]
      );

    if (
      userResult.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "User account not found.",
      });
    }

    const user =
      userResult.rows[0];

    if (user.is_verified) {
      return res.status(400).json({
        success: false,
        message:
          "This email is already verified.",
      });
    }

    const existingCodeResult =
      await pool.query(
        `
          SELECT
            last_sent_at,
            send_count,
            send_window_started_at
          FROM email_verification_codes
          WHERE user_id = $1::uuid
          LIMIT 1
        `,
        [
          normalizedUserId,
        ]
      );

    if (
      existingCodeResult.rows.length > 0
    ) {
      const verificationRecord =
        existingCodeResult.rows[0];

      const windowStartedAt =
        new Date(
          verificationRecord
            .send_window_started_at
        ).getTime();

      const windowStillActive =
        Number.isFinite(
          windowStartedAt
        ) &&
        Date.now() -
          windowStartedAt <
          60 * 60 * 1000;

      const sendCount =
        Number(
          verificationRecord
            .send_count || 0
        );

      if (
        windowStillActive &&
        sendCount >= 5
      ) {
        return res.status(429).json({
          success: false,
          message:
            "Too many verification emails requested. Please try again later.",
        });
      }

      const lastSentAt =
        new Date(
          verificationRecord
            .last_sent_at
        ).getTime();

      const secondsSinceLastSend =
        Math.floor(
          (
            Date.now() -
            lastSentAt
          ) / 1000
        );

      if (
        secondsSinceLastSend < 60
      ) {
        const retryAfter =
          60 -
          secondsSinceLastSend;

        return res.status(429).json({
          success: false,
          message:
            `Please wait ${retryAfter} seconds before requesting another code.`,
          retryAfter,
        });
      }
    }

    await sendVerificationCode({
      id:
        user.id,

      email:
        user.email,

      fullName:
        user.full_name,
    });

    return res.status(200).json({
      success: true,
      message:
        "A new verification code has been sent.",
    });
  } catch (error) {
    console.error(
      "Resend verification code error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to resend verification code.",
    });
  }
}
async function login(req, res) {
  try {
   const {
  email,
  password,
} = req.validated.body;

    const normalizedEmail =
      cleanText(email).toLowerCase();

    if (
      !normalizedEmail ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required",
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
            password_hash,
            role,
            account_status,
            is_verified

          FROM users

          WHERE email =
            $1::varchar

          LIMIT 1
        `,
        [normalizedEmail]
      );

    if (
      result.rows.length === 0
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    const user =
      result.rows[0];

    if (
      user.account_status !==
      "ACTIVE"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Your account is not active",
      });
    }

    if (!user.is_verified) {
  return res.status(403).json({
    success: false,
    message:
      "Please verify your email before logging in.",
    requiresEmailVerification:
      true,
    userId:
      user.id,
    email:
      user.email,
  });
}

    const passwordMatches =
      await bcrypt.compare(
        password,
        user.password_hash
      );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    const rolesResult =
      await pool.query(
        `
          SELECT role
          FROM user_roles
          WHERE user_id =
            $1::uuid
          ORDER BY created_at ASC
        `,
        [user.id]
      );

    let roles =
      rolesResult.rows.map(
        (row) =>
          String(
            row.role || ""
          ).toUpperCase()
      );

    /*
      Backward compatibility:
      if the migration missed this user,
      use users.role and repair user_roles.
    */
    if (roles.length === 0) {
      roles = [
        String(
          user.role
        ).toUpperCase(),
      ];

      await pool.query(
        `
          INSERT INTO user_roles (
            user_id,
            role
          )
          VALUES (
            $1::uuid,
            $2::varchar
          )
          ON CONFLICT (
            user_id,
            role
          )
          DO NOTHING
        `,
        [
          user.id,
          user.role,
        ]
      );
    }

    const primaryRole =
      roles.includes(
        user.role
      )
        ? user.role
        : roles[0];

    const token =
      jwt.sign(
        {
          userId:
            user.id,

          // Existing middleware still reads this.
          role:
            primaryRole,

          // New multi-role authorization.
          roles,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "7d",
        }
      );

    return res.status(200).json({
      success: true,
      message:
        "Login successful",
      token,

      user: {
        id:
          user.id,

        fullName:
          user.full_name,

        email:
          user.email,

        phone:
          user.phone,

        // Retained for current dashboards.
        role:
          primaryRole,

        // New multi-role array.
        roles,

        accountStatus:
          user.account_status,

        isVerified:
          user.is_verified,
      },
    });
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to log in",
    });
  }
}

module.exports = {
  register,
  verifyEmail,
  resendVerificationCode,
  login,
};