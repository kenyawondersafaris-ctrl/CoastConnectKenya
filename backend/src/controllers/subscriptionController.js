"use strict";

const pool = require("../config/db");

const crypto = require("crypto");

const {
  initiatePayHeroStkPush,
  generatePayHeroSubscriptionReference,
} = require("../services/payheroService");


async function getSubscriptionPlans(
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
            business_type,
            billing_period,
            amount_kes,
            duration_days
          FROM subscription_plans
          WHERE is_active = TRUE
          ORDER BY
            business_type ASC,
            amount_kes ASC
        `
      );

    return res.json({
      success: true,
      plans: result.rows,
    });

  } catch (error) {

    console.error(
      "Get subscription plans error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load subscription plans.",
    });

  }
}


async function getMySubscription(
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
            bs.id,
            bs.business_type,
            bs.status,
            bs.starts_at,
            bs.expires_at,
            bs.cancelled_at,
            bs.created_at,

            sp.id AS plan_id,
            sp.name AS plan_name,
            sp.billing_period,
            sp.amount_kes,
            sp.duration_days

          FROM business_subscriptions bs

          INNER JOIN subscription_plans sp
            ON sp.id = bs.plan_id

                 WHERE
  bs.user_id = $1

  AND bs.status IN (
    'ACTIVE',
    'CANCELLED',
    'EXPIRED',
    'PENDING'
  )

          ORDER BY
            bs.created_at DESC

          LIMIT 1
        `,
        [
          userId,
        ]
      );

    return res.json({
      success: true,

      subscription:
        result.rows[0] ||
        null,
    });

  } catch (error) {

    console.error(
      "Get my subscription error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load subscription status.",
    });

  }
}

async function initializeSubscriptionPayment(
  req,
  res
) {
  const client =
    await pool.connect();

  try {

    const userId =
      req.user.userId;

    const userRole =
      String(req.user.role || "")
        .trim()
        .toUpperCase();

   const {
  planId,
  phoneNumber,
} =
  req.body;


    /*
    |--------------------------------------------------------------------------
    | Validate selected plan
    |--------------------------------------------------------------------------
    */

    if (!planId) {

      return res.status(400).json({
        success: false,
        message:
          "Please select a subscription plan.",
      });

    }


    /*
    |--------------------------------------------------------------------------
    | Determine allowed business type
    |--------------------------------------------------------------------------
    */

    let businessType;

    if (userRole === "PROVIDER") {

      businessType =
        "PROVIDER";

    } else if (
      userRole === "RESTAURANT_OWNER"
    ) {

      businessType =
        "RESTAURANT";

    } else {

      return res.status(403).json({
        success: false,
        message:
          "Only providers and restaurant owners can purchase subscriptions.",
      });

    }


    /*
    |--------------------------------------------------------------------------
    | Get selected subscription plan
    |--------------------------------------------------------------------------
    */

    const planResult =
      await client.query(
        `
          SELECT
            id,
            name,
            business_type,
            billing_period,
            amount_kes,
            duration_days
          FROM subscription_plans
          WHERE id = $1
            AND is_active = TRUE
          LIMIT 1
        `,
        [
          planId,
        ]
      );

    const plan =
      planResult.rows[0];


    if (!plan) {

      return res.status(404).json({
        success: false,
        message:
          "Subscription plan not found.",
      });

    }


    /*
    |--------------------------------------------------------------------------
    | Ensure the plan belongs to this business type
    |--------------------------------------------------------------------------
    */

    if (
      plan.business_type !==
      businessType
    ) {

      return res.status(403).json({
        success: false,
        message:
          "This subscription plan is not available for your account type.",
      });

    }

          /*
    |--------------------------------------------------------------------------
    | Ensure business profile has been approved
    |--------------------------------------------------------------------------
    */

    let approvalResult;

    if (
      businessType === "PROVIDER"
    ) {
      approvalResult =
        await client.query(
          `
            SELECT
              id

            FROM provider_profiles

            WHERE user_id =
              $1::uuid

              AND verification_status IN (
                'APPROVED',
                'VERIFIED'
                )

            LIMIT 1
          `,
          [
            userId,
          ]
        );
    } else {
      approvalResult =
        await client.query(
          `
            SELECT
              id

            FROM restaurants

            WHERE owner_id =
              $1::uuid

              AND approval_status =
                'APPROVED'

            LIMIT 1
          `,
          [
            userId,
          ]
        );
    }

    if (
      approvalResult.rows.length === 0
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Your business must be approved before you can purchase a subscription.",
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Get user details for Paystack
    |--------------------------------------------------------------------------
    */

    const userResult =
      await client.query(
        `
         SELECT
           id,
            full_name,
            email,
            phone
          FROM users
          WHERE id = $1
          LIMIT 1
        `,
        [
          userId,
        ]
      );

    const user =
      userResult.rows[0];


    if (!user) {

      return res.status(404).json({
        success: false,
        message:
          "User account not found.",
      });

    }


  const paymentPhoneNumber =
  String(phoneNumber || "").trim();

if (!paymentPhoneNumber) {
  return res.status(400).json({
    success: false,
    message:
      "Please enter the M-Pesa number you would like to use for this payment.",
  });
}


    /*
    |--------------------------------------------------------------------------
    | Generate unique payment reference
    |--------------------------------------------------------------------------
    */

    const paymentReference =
      `CCK-SUB-${Date.now()}-${crypto
        .randomBytes(6)
        .toString("hex")}`;


        const payHeroReference =
  generatePayHeroSubscriptionReference(
    paymentReference
  );


    /*
    |--------------------------------------------------------------------------
    | Create pending subscription and payment
    |--------------------------------------------------------------------------
    */

    await client.query(
      "BEGIN"
    );

    const subscriptionResult =
      await client.query(
        `
          INSERT INTO business_subscriptions (
            user_id,
            plan_id,
            business_type,
            status
          )
          VALUES (
            $1,
            $2,
            $3,
            'PENDING'
          )
          RETURNING
            id,
            status
        `,
        [
          userId,
          plan.id,
          businessType,
        ]
      );

    const subscription =
      subscriptionResult.rows[0];


    await client.query(
      `
        INSERT INTO subscription_payments (
          subscription_id,
          user_id,
          amount_kes,
          currency,
          provider,
          paystack_reference,
          status
        )
        VALUES (
          $1,
          $2,
          $3,
          'KES',
          'PAYHERO',
          $4,
          'INITIALIZED'
        )
      `,
      [
        subscription.id,
        userId,
        plan.amount_kes,
        paymentReference,
      ]
    );

    await client.query(
      "COMMIT"
    );


    /*
    |--------------------------------------------------------------------------
    | Initialize Paystack
    |--------------------------------------------------------------------------
    */

    /*
|--------------------------------------------------------------------------
| Initialize PayHero subscription payment
|--------------------------------------------------------------------------
*/

const payHeroResponse =
  await initiatePayHeroStkPush({
   phoneNumber:
  paymentPhoneNumber,

    amount:
      Number(
        plan.amount_kes
      ),

    externalReference:
      payHeroReference,

    customerName:
      user.full_name,

    callbackUrl:
      `${process.env.BACKEND_URL}/api/payments/payhero/subscription-callback`,
  });


    /*
    |--------------------------------------------------------------------------
    | Return checkout details
    |--------------------------------------------------------------------------
    */

    return res.json({
      success: true,

      message:
        "Subscription payment initialized.",

      subscriptionId:
        subscription.id,

      reference:
        paymentReference,

    payHeroResponse:
  payHeroResponse.response,

paymentMethod:
  "PAYHERO_STK",
    });

  } catch (error) {

    try {
      await client.query(
        "ROLLBACK"
      );
    } catch (rollbackError) {
      console.error(
        "Subscription payment rollback error:",
        rollbackError
      );
    }

    console.error(
      "Initialize subscription payment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to initialize subscription payment.",
    });

  } finally {

    client.release();

  }
}

async function verifySubscriptionPayment(
  req,
  res
) {
  try {
    const {
      reference,
    } =
      req.params;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message:
          "Payment reference is required.",
      });
    }

    const paymentResult =
      await pool.query(
        `
          SELECT
            sp.id AS payment_id,
            sp.subscription_id,
            sp.user_id,
            sp.amount_kes,
            sp.currency,
            sp.status AS payment_status,
            sp.failure_reason,

            bs.status AS subscription_status,
            bs.plan_id

          FROM subscription_payments sp

          INNER JOIN business_subscriptions bs
            ON bs.id =
              sp.subscription_id

          WHERE
            sp.paystack_reference =
              $1::varchar

          LIMIT 1
        `,
        [
          reference,
        ]
      );

    const payment =
      paymentResult.rows[0];

    if (!payment) {
      return res.status(404).json({
        success: false,
        message:
          "Subscription payment was not found.",
      });
    }

    if (
      payment.user_id !==
      req.user.userId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to verify this payment.",
      });
    }

    let message;

    if (
      payment.payment_status ===
      "SUCCESS"
    ) {
      message =
        "Subscription payment completed successfully.";
    } else if (
      payment.payment_status ===
      "FAILED"
    ) {
      message =
        payment.failure_reason ||
        "M-Pesa payment was not completed.";
    } else {
      message =
        "Waiting for M-Pesa payment confirmation.";
    }

    return res.status(200).json({
      success:
        payment.payment_status ===
        "SUCCESS",

      paymentStatus:
        payment.payment_status,

      subscriptionStatus:
        payment.subscription_status,

      subscriptionId:
        payment.subscription_id,

      failureReason:
        payment.failure_reason ||
        null,

      message,
    });

  } catch (error) {
    console.error(
      "Verify subscription payment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to verify subscription payment.",
    });
  }
}

async function handleSubscriptionPaymentWebhook(
  req,
  res
) {
  try {
    console.log(
      "Subscription webhook received:",
      req.body
    );

    return res.status(200).json({
      success: true,
    });

  } catch (error) {

    console.error(
      "Subscription webhook error:",
      error
    );

    return res.status(500).json({
      success: false,
    });

  }
}




module.exports = {
  getSubscriptionPlans,
  getMySubscription,
  initializeSubscriptionPayment,
  verifySubscriptionPayment,
  handleSubscriptionPaymentWebhook,
};