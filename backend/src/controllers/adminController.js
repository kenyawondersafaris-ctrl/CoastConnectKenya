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

async function getProviderPayouts(
  req,
  res
) {
  try {
    const result =
      await pool.query(
        `
          SELECT
            pay.id,
            pay.booking_id,
            pay.provider_id,
            pay.payment_stage,
            pay.amount,
            pay.provider_share_amount,
            pay.currency,
            pay.status,
            pay.settlement_status,
            pay.paid_at,
            pay.created_at,

            pay.manual_payout_method,
            pay.manual_payout_reference,
            pay.manual_payout_notes,
            pay.manual_payout_paid_at,

            pp.user_id AS provider_user_id,

            u.full_name AS provider_name,
            u.phone AS provider_phone,
            u.email AS provider_email,

            b.booking_date,
            b.start_time,
            b.service_address

          FROM provider_payments pay

          INNER JOIN provider_profiles pp
            ON pp.id = pay.provider_id

          INNER JOIN users u
            ON u.id = pp.user_id

          INNER JOIN bookings b
            ON b.id = pay.booking_id

          WHERE
            pay.status = 'PAID'

            AND

            pay.settlement_status IN (
              'ELIGIBLE',
              'PENDING_MANUAL_PAYOUT'
            )

          ORDER BY
            pay.created_at DESC
        `
      );

    return res.json({
      success: true,
      payouts:
        result.rows,
    });

  } catch (error) {
    console.error(
      "Get provider payouts error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load provider payouts.",
    });
  }
}


async function markProviderPayoutPaid(
  req,
  res
) {
  const client =
    await pool.connect();

  try {
    const paymentId =
      String(
        req.params.paymentId ||
        ""
      ).trim();

    const {
      payoutMethod,
      payoutReference,
      notes,
    } = req.body || {};

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message:
          "Payment ID is required.",
      });
    }

    const normalizedMethod =
      String(
        payoutMethod ||
        ""
      )
        .trim()
        .toUpperCase();

    const normalizedReference =
      String(
        payoutReference ||
        ""
      ).trim();

    const normalizedNotes =
      String(
        notes ||
        ""
      ).trim();

    if (
      ![
        "BANK",
        "MPESA",
        "CASH",
        "OTHER",
      ].includes(
        normalizedMethod
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid manual payout method.",
      });
    }

    if (!normalizedReference) {
      return res.status(400).json({
        success: false,
        message:
          "Payout reference is required.",
      });
    }

    await client.query(
      "BEGIN"
    );

    const paymentResult =
      await client.query(
        `
          SELECT
            id,
            booking_id,
            provider_id,
            payment_stage,
            provider_share_amount,
            currency,
            status,
            settlement_status

          FROM provider_payments

          WHERE id =
            $1::uuid

          FOR UPDATE
        `,
        [
          paymentId,
        ]
      );

    if (
      paymentResult.rows.length === 0
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(404).json({
        success: false,
        message:
          "Provider payment not found.",
      });
    }

    const payment =
      paymentResult.rows[0];

    if (
      String(
        payment.status ||
        ""
      ).toUpperCase() !==
      "PAID"
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(409).json({
        success: false,
        message:
          "Only paid provider payments can be marked as paid.",
      });
    }

    const settlementStatus =
      String(
        payment.settlement_status ||
        ""
      ).toUpperCase();

    if (
      ![
        "ELIGIBLE",
        "PENDING_MANUAL_PAYOUT",
      ].includes(
        settlementStatus
      )
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(409).json({
        success: false,
        message:
          "This provider payment is not ready for manual payout.",
      });
    }

    const updatedResult =
      await client.query(
        `
          UPDATE provider_payments

          SET
            settlement_status =
              'SETTLED',

            manual_payout_method =
              $1::varchar,

            manual_payout_reference =
              $2::varchar,

            manual_payout_notes =
              $3::text,

            manual_payout_paid_at =
              CURRENT_TIMESTAMP,

            payout_failure_reason =
              NULL,

            settled_at =
              COALESCE(
                settled_at,
                CURRENT_TIMESTAMP
              ),

            updated_at =
              CURRENT_TIMESTAMP

          WHERE id =
            $4::uuid

          RETURNING
            id,
            booking_id,
            payment_stage,
            provider_share_amount,
            currency,
            status,
            settlement_status,
            manual_payout_method,
            manual_payout_reference,
            manual_payout_notes,
            manual_payout_paid_at,
            settled_at
        `,
        [
          normalizedMethod,
          normalizedReference,
          normalizedNotes ||
            null,
          paymentId,
        ]
      );

    await client.query(
      "COMMIT"
    );

    return res.json({
      success: true,
      message:
        "Provider payout recorded successfully.",
      payout:
        updatedResult.rows[0],
    });

  } catch (error) {
    try {
      await client.query(
        "ROLLBACK"
      );
    } catch (
      rollbackError
    ) {
      // Ignore rollback failure.
    }

    console.error(
      "Mark provider payout paid error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to record provider payout.",
    });

  } finally {
    client.release();
  }
}

async function getProviderPayoutHistory(
  req,
  res
) {
  try {
    const result =
      await pool.query(
        `
          SELECT
            pay.id,
            pay.booking_id,
            pay.payment_stage,
            pay.provider_share_amount,
            pay.currency,
            pay.status,
            pay.settlement_status,

            pay.manual_payout_method,
            pay.manual_payout_reference,
            pay.manual_payout_notes,
            pay.manual_payout_paid_at,

            pay.settled_at,
            pay.paid_at,
            pay.created_at,

            u.full_name AS provider_name,
            u.phone AS provider_phone,
            u.email AS provider_email

          FROM provider_payments pay

          INNER JOIN provider_profiles pp
            ON pp.id = pay.provider_id

          INNER JOIN users u
            ON u.id = pp.user_id

          WHERE
            pay.status = 'PAID'

            AND

            pay.settlement_status = 'SETTLED'

          ORDER BY
            COALESCE(
              pay.manual_payout_paid_at,
              pay.settled_at,
              pay.updated_at
            ) DESC
        `
      );

    return res.json({
      success: true,
      payouts:
        result.rows,
    });

  } catch (error) {
    console.error(
      "Get provider payout history error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load provider payout history.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Provider Professional Verification
|--------------------------------------------------------------------------
*/

async function getPendingProviderVerifications(
  req,
  res
) {
  try {

    const result =
  await pool.query(
    `
      SELECT
        pv.id AS verification_id,
        pv.provider_id,
        pv.status,
        pv.submitted_at,

        pp.user_id,

        u.full_name,
        u.email,
        u.phone,

        pv.qualification_summary,
        pv.portfolio_description,
        pv.portfolio_url

      FROM provider_verifications pv

      INNER JOIN provider_profiles pp
        ON pp.id = pv.provider_id

      INNER JOIN users u
        ON u.id = pp.user_id

      WHERE pv.status = 'SUBMITTED'

      ORDER BY
        pv.submitted_at ASC
    `
  );

    return res.json({
      success: true,
      verifications:
        result.rows,
    });

  } catch (error) {

    console.error(
      "Get pending provider verifications error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load provider verification requests.",
    });
  }
}


async function getProviderVerificationDetails(
  req,
  res
) {
  try {

    const providerId =
      String(
        req.params.providerId || ""
      ).trim();

    const verificationResult =
      await pool.query(
        `
          SELECT
            pv.id,
            pv.provider_id,
            pv.qualification_summary,
            pv.portfolio_description,
            pv.portfolio_url,
            pv.provider_notes,
            pv.admin_notes,
            pv.status,
            pv.submitted_at,
            pv.reviewed_at,

            pp.user_id,
            pp.service_area,
            pp.experience_years,
            pp.profile_photo,

            u.full_name,
            u.email,
            u.phone

          FROM provider_verifications pv

          INNER JOIN provider_profiles pp
            ON pp.id = pv.provider_id

          INNER JOIN users u
            ON u.id = pp.user_id

          WHERE pv.provider_id =
            $1::uuid

          LIMIT 1
        `,
        [
          providerId,
        ]
      );

    if (
      verificationResult.rows.length ===
      0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Provider verification not found.",
      });
    }

    const documentsResult =
      await pool.query(
        `
          SELECT
            id,
            verification_id,
            file_name,
            file_url,
            created_at

          FROM provider_verification_documents

          WHERE verification_id =
            $1::uuid

          ORDER BY
            created_at DESC
        `,
        [
          verificationResult.rows[0].id,
        ]
      );

    return res.json({
      success: true,

      verification:
        verificationResult.rows[0],

      documents:
        documentsResult.rows,
    });

  } catch (error) {

    console.error(
      "Get provider verification details error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load provider verification details.",
    });
  }
}


async function approveProviderVerification(
  req,
  res
) {
  const client =
    await pool.connect();

  try {

    const providerId =
      String(
        req.params.providerId || ""
      ).trim();

    await client.query(
      "BEGIN"
    );

    const result =
  await client.query(
    `
      UPDATE provider_verifications

      SET
        status = 'APPROVED',
        admin_notes = NULL,
        reviewed_by = $2::uuid,
        reviewed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP

      WHERE provider_id =
        $1::uuid

        AND status = 'SUBMITTED'

      RETURNING
        id,
        provider_id,
        status
    `,
    [
      providerId,
      req.user.id,
    ]
  );
    if (
      result.rows.length === 0
    ) {

      await client.query(
        "ROLLBACK"
      );

      return res.status(404).json({
        success: false,
        message:
          "Submitted provider verification not found.",
      });
    }

    await client.query(
      "COMMIT"
    );

    return res.json({
      success: true,
      message:
        "Provider professional verification approved.",

      verification:
        result.rows[0],
    });

  } catch (error) {

    try {
      await client.query(
        "ROLLBACK"
      );
    } catch (rollbackError) {
      // Ignore rollback failure.
    }

    console.error(
      "Approve provider verification error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to approve provider verification.",
    });

  } finally {
    client.release();
  }
}


async function rejectProviderVerification(
  req,
  res
) {
  const client =
    await pool.connect();

  try {

    const providerId =
      String(
        req.params.providerId || ""
      ).trim();

    const rejectionReason =
      String(
        req.body?.rejectionReason || ""
      ).trim();

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message:
          "A rejection reason is required.",
      });
    }

    if (
      rejectionReason.length > 2000
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Rejection reason is too long.",
      });
    }

    await client.query(
      "BEGIN"
    );

    const result =
  await client.query(
    `
      UPDATE provider_verifications

      SET
        status = 'REJECTED',
        admin_notes = $2::text,
        reviewed_by = $3::uuid,
        reviewed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP

      WHERE provider_id =
        $1::uuid

        AND status = 'SUBMITTED'

      RETURNING
        id,
        provider_id,
        status,
        admin_notes
    `,
    [
      providerId,
      rejectionReason,
      req.user.id,
    ]
  );
    if (
      result.rows.length === 0
    ) {

      await client.query(
        "ROLLBACK"
      );

      return res.status(404).json({
        success: false,
        message:
          "Submitted provider verification not found.",
      });
    }

    await client.query(
      "COMMIT"
    );

    return res.json({
      success: true,
      message:
        "Provider professional verification rejected.",

      verification:
        result.rows[0],
    });

  } catch (error) {

    try {
      await client.query(
        "ROLLBACK"
      );
    } catch (rollbackError) {
      // Ignore rollback failure.
    }

    console.error(
      "Reject provider verification error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to reject provider verification.",
    });

  } finally {
    client.release();
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
  getProviderPayouts,
  markProviderPayoutPaid,
  getProviderPayoutHistory,
  getPendingProviderVerifications,
  getProviderVerificationDetails,
  approveProviderVerification,
  rejectProviderVerification,
};