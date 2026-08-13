"use strict";

const crypto =
  require("crypto");

const pool =
  require("../config/db");

const {
  sendEmail,
} =
  require("./emailService");

function generateVerificationCode() {
  return String(
    crypto.randomInt(
      100000,
      1000000
    )
  );
}

function hashVerificationCode(
  code
) {
  return crypto
    .createHash("sha256")
    .update(code)
    .digest("hex");
}

function isValidUuid(
  value
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "").trim()
  );
}

async function sendVerificationCode(
  user
) {
  const code =
    generateVerificationCode();

  const codeHash =
    hashVerificationCode(code);

  const expiresAt =
    new Date(
      Date.now() +
      10 * 60 * 1000
    );

  await pool.query(
    `
      INSERT INTO email_verification_codes (
        user_id,
        code_hash,
        expires_at,
        attempts,
        last_sent_at,
        updated_at
      )
      VALUES (
        $1::uuid,
        $2::text,
        $3::timestamptz,
        0,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (user_id)
        DO UPDATE SET
        code_hash = EXCLUDED.code_hash,
        expires_at = EXCLUDED.expires_at,
        attempts = 0,
        last_sent_at = CURRENT_TIMESTAMP,

        send_count =
            CASE
            WHEN
                email_verification_codes.send_window_started_at
                <= CURRENT_TIMESTAMP - INTERVAL '1 hour'
            THEN 1
            ELSE
                email_verification_codes.send_count + 1
            END,

        send_window_started_at =
            CASE
            WHEN
                email_verification_codes.send_window_started_at
                <= CURRENT_TIMESTAMP - INTERVAL '1 hour'
            THEN CURRENT_TIMESTAMP
            ELSE
                email_verification_codes.send_window_started_at
            END,

        updated_at = CURRENT_TIMESTAMP
    `,
    [
      user.id,
      codeHash,
      expiresAt,
    ]
  );

  await sendEmail({
    to:
      user.email,

    subject:
      "Verify your Coast Connect account",

    text:
      `Your Coast Connect verification code is ${code}. It expires in 10 minutes.`,

    html:
      `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
          <h2>Coast Connect Kenya</h2>

        <p style="font-size:16px;">
  Hi <strong>${user.fullName || "there"}</strong>,
</p>

          <p>
            Use this verification code to verify your email address:
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
            This code expires in 10 minutes.
          </p>

          <p>
            If you did not create this account,
            you can ignore this email.
          </p>
        </div>
      `,
  });
}

async function verifyEmailCode(
  userId,
  code
) {
  const normalizedUserId =
    String(userId || "").trim();

  const normalizedCode =
    String(code || "").trim();

 if (
  !isValidUuid(
    normalizedUserId
  ) ||
  !/^\d{6}$/.test(
    normalizedCode
  )
) {
  return {
    success: false,
    message:
      "Invalid verification request.",
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
        FROM email_verification_codes
        WHERE user_id = $1::uuid
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
        "Verification code not found.",
    };
  }

  const record =
    result.rows[0];

 if (
  new Date(
    record.expires_at
  ).getTime() <= Date.now()
) {
  await pool.query(
    `
      DELETE FROM
        email_verification_codes
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
      "Verification code has expired. Request a new code.",
  };
}

  if (
    Number(record.attempts) >= 5
  ) {
    return {
      success: false,
      message:
        "Too many verification attempts. Request a new code.",
    };
  }

  const submittedHash =
    hashVerificationCode(
      normalizedCode
    );

 if (
  submittedHash !==
  record.code_hash
) {
  const attemptResult =
    await pool.query(
      `
        UPDATE email_verification_codes

        SET
          attempts = attempts + 1,
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
      attemptResult.rows[0]
        ?.attempts || 0
    );

  if (attempts >= 5) {
    return {
      success: false,
      message:
        "Too many verification attempts. Request a new code.",
    };
  }

  return {
    success: false,
    message:
      "Invalid verification code.",
  };
}

  const client =
    await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
        UPDATE users
        SET
          is_verified = true
        WHERE id = $1::uuid
      `,
      [
        normalizedUserId,
      ]
    );

    await client.query(
      `
        DELETE FROM
          email_verification_codes
        WHERE user_id = $1::uuid
      `,
      [
        normalizedUserId,
      ]
    );

    await client.query("COMMIT");

    return {
      success: true,
      message:
        "Email verified successfully.",
    };
  } catch (error) {
    await client.query(
      "ROLLBACK"
    );

    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  sendVerificationCode,
  hashVerificationCode,
  verifyEmailCode,
};