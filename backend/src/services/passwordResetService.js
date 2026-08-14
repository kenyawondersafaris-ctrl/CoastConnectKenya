"use strict";

const crypto =
  require("crypto");

const pool =
  require("../config/db");

const {
  sendEmail,
} =
  require("./emailService");


/*
|--------------------------------------------------------------------------
| Reset code helpers
|--------------------------------------------------------------------------
*/

function generatePasswordResetCode() {
  return String(
    crypto.randomInt(
      100000,
      1000000
    )
  );
}


function hashPasswordResetCode(
  code
) {
  return crypto
    .createHash("sha256")
    .update(
      String(code || "")
    )
    .digest("hex");
}


function codesMatch(
  submittedHash,
  storedHash
) {
  if (
    !submittedHash ||
    !storedHash
  ) {
    return false;
  }

  try {
    const submittedBuffer =
      Buffer.from(
        submittedHash,
        "hex"
      );

    const storedBuffer =
      Buffer.from(
        storedHash,
        "hex"
      );

    if (
      submittedBuffer.length !==
      storedBuffer.length
    ) {
      return false;
    }

    return crypto.timingSafeEqual(
      submittedBuffer,
      storedBuffer
    );
  } catch (error) {
    return false;
  }
}


/*
|--------------------------------------------------------------------------
| Send password reset code
|--------------------------------------------------------------------------
*/

async function sendPasswordResetCode(
  user
) {
  if (
    !user?.id ||
    !user?.email
  ) {
    throw new Error(
      "Valid user information is required."
    );
  }

  const code =
    generatePasswordResetCode();

  const codeHash =
    hashPasswordResetCode(
      code
    );

  const expiresAt =
    new Date(
      Date.now() +
      10 * 60 * 1000
    );


  /*
  |--------------------------------------------------------------------------
  | Store only the hash
  |--------------------------------------------------------------------------
  */

  await pool.query(
    `
      INSERT INTO password_reset_codes (
        user_id,
        code_hash,
        expires_at,
        attempts,
        last_sent_at,
        send_count,
        send_window_started_at,
        updated_at
      )

      VALUES (
        $1::uuid,
        $2::text,
        $3::timestamptz,
        0,
        CURRENT_TIMESTAMP,
        1,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )

      ON CONFLICT (user_id)

      DO UPDATE SET
        code_hash =
          EXCLUDED.code_hash,

        expires_at =
          EXCLUDED.expires_at,

        attempts =
          0,

        last_sent_at =
          CURRENT_TIMESTAMP,

        send_count =
          CASE
            WHEN
              password_reset_codes
                .send_window_started_at
              <=
              CURRENT_TIMESTAMP -
              INTERVAL '1 hour'
            THEN 1

            ELSE
              password_reset_codes
                .send_count + 1
          END,

        send_window_started_at =
          CASE
            WHEN
              password_reset_codes
                .send_window_started_at
              <=
              CURRENT_TIMESTAMP -
              INTERVAL '1 hour'
            THEN
              CURRENT_TIMESTAMP

            ELSE
              password_reset_codes
                .send_window_started_at
          END,

        updated_at =
          CURRENT_TIMESTAMP
    `,
    [
      user.id,
      codeHash,
      expiresAt,
    ]
  );


  /*
  |--------------------------------------------------------------------------
  | Send email
  |--------------------------------------------------------------------------
  */

  await sendEmail({
    to:
      user.email,

    subject:
      "Reset your Coast Connect password",

    text:
      `Your Coast Connect password reset code is ${code}. It expires in 10 minutes.`,

    html:
      `
        <div
          style="
            font-family:Arial,sans-serif;
            max-width:520px;
            margin:auto;
            color:#1f2937;
          "
        >
          <h2
            style="
              color:#0b6b5f;
              margin-bottom:24px;
            "
          >
            Coast Connect Kenya
          </h2>

          <p style="font-size:16px;">
            Hi
            <strong>
              ${user.fullName || "there"}
            </strong>,
          </p>

          <p>
            We received a request to reset
            your Coast Connect password.
          </p>

          <p>
            Use the code below to continue:
          </p>

          <div
            style="
              background:#f5f7fb;
              border:1px solid #dbe4f0;
              border-radius:12px;
              padding:24px;
              text-align:center;
              margin:30px 0;
            "
          >
            <span
              style="
                font-size:40px;
                font-weight:700;
                letter-spacing:10px;
                color:#0b6b5f;
                font-family:Arial,sans-serif;
              "
            >
              ${code}
            </span>
          </div>

          <p>
            This code expires in
            <strong>10 minutes</strong>.
          </p>

          <p>
            If you did not request a password
            reset, you can safely ignore this
            email. Your password will not change.
          </p>

          <p
            style="
              margin-top:32px;
              font-size:13px;
              color:#6b7280;
            "
          >
            For your security, never share this
            code with anyone.
          </p>
        </div>
      `,
  });

  return {
    success: true,
  };
}


/*
|--------------------------------------------------------------------------
| Check sending limits
|--------------------------------------------------------------------------
*/

async function canSendPasswordResetCode(
  userId
) {
  const result =
    await pool.query(
      `
        SELECT
          last_sent_at,
          send_count,
          send_window_started_at

        FROM password_reset_codes

        WHERE user_id =
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
    return {
      allowed: true,
    };
  }

  const record =
    result.rows[0];

  const windowStartedAt =
    new Date(
      record
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
      record.send_count || 0
    );

  if (
    windowStillActive &&
    sendCount >= 5
  ) {
    return {
      allowed: false,

      statusCode: 429,

      message:
        "Too many password reset emails requested. Please try again later.",
    };
  }

  const lastSentAt =
    new Date(
      record.last_sent_at
    ).getTime();

  if (
    Number.isFinite(
      lastSentAt
    )
  ) {
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

      return {
        allowed: false,

        statusCode: 429,

        retryAfter,

        message:
          `Please wait ${retryAfter} seconds before requesting another password reset code.`,
      };
    }
  }

  return {
    allowed: true,
  };
}


/*
|--------------------------------------------------------------------------
| Verify password reset code
|--------------------------------------------------------------------------
*/

async function verifyPasswordResetCode(
  userId,
  code
) {
  const normalizedUserId =
    String(
      userId || ""
    ).trim();

  const normalizedCode =
    String(
      code || ""
    ).trim();

  if (
    !normalizedUserId ||
    !/^\d{6}$/.test(
      normalizedCode
    )
  ) {
    return {
      success: false,

      message:
        "Invalid password reset request.",
    };
  }

  const result =
    await pool.query(
      `
        SELECT
          user_id,
          code_hash,
          expires_at,
          attempts

        FROM password_reset_codes

        WHERE user_id =
          $1::uuid

        LIMIT 1
      `,
      [
        normalizedUserId,
      ]
    );

  if (
    result.rows.length === 0
  ) {
    return {
      success: false,

      message:
        "Password reset code is invalid or has expired.",
    };
  }

  const record =
    result.rows[0];


  /*
  |--------------------------------------------------------------------------
  | Expiry
  |--------------------------------------------------------------------------
  */

  if (
    new Date(
      record.expires_at
    ).getTime() <=
    Date.now()
  ) {
    await pool.query(
      `
        DELETE FROM
          password_reset_codes

        WHERE user_id =
          $1::uuid
      `,
      [
        normalizedUserId,
      ]
    );

    return {
      success: false,

      message:
        "Password reset code has expired. Request a new code.",
    };
  }


  /*
  |--------------------------------------------------------------------------
  | Maximum attempts
  |--------------------------------------------------------------------------
  */

  if (
    Number(
      record.attempts
    ) >= 5
  ) {
    return {
      success: false,

      message:
        "Too many incorrect attempts. Request a new password reset code.",
    };
  }


  /*
  |--------------------------------------------------------------------------
  | Compare code
  |--------------------------------------------------------------------------
  */

  const submittedHash =
    hashPasswordResetCode(
      normalizedCode
    );

  const matches =
    codesMatch(
      submittedHash,
      record.code_hash
    );

  if (!matches) {
    const attemptResult =
      await pool.query(
        `
          UPDATE
            password_reset_codes

          SET
            attempts =
              attempts + 1,

            updated_at =
              CURRENT_TIMESTAMP

          WHERE user_id =
            $1::uuid

          RETURNING
            attempts
        `,
        [
          normalizedUserId,
        ]
      );

    const attempts =
      Number(
        attemptResult
          .rows[0]
          ?.attempts || 0
      );

    if (
      attempts >= 5
    ) {
      return {
        success: false,

        message:
          "Too many incorrect attempts. Request a new password reset code.",
      };
    }

    return {
      success: false,

      message:
        "Invalid password reset code.",
    };
  }

  return {
    success: true,

    message:
      "Password reset code verified successfully.",
  };
}


/*
|--------------------------------------------------------------------------
| Delete reset code
|--------------------------------------------------------------------------
*/

async function consumePasswordResetCode(
  userId
) {
  await pool.query(
    `
      DELETE FROM
        password_reset_codes

      WHERE user_id =
        $1::uuid
    `,
    [
      userId,
    ]
  );
}


module.exports = {
  sendPasswordResetCode,
  canSendPasswordResetCode,
  verifyPasswordResetCode,
  consumePasswordResetCode,
  hashPasswordResetCode,
};