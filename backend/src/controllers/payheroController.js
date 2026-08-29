"use strict";

const pool =
  require("../config/db");

function cleanText(value) {
  return String(
    value ?? ""
  ).trim();
}

function isSuccessfulPayHeroResult(
  response
) {
  return (
    Number(
      response?.ResultCode
    ) === 0 &&
    String(
      response?.Status || ""
    ).toUpperCase() ===
      "SUCCESS"
  );
}

async function handlePayHeroCallback(
  req,
  res
) {
  const payload =
    req.body || {};

  const response =
    payload.response || {};

  const externalReference =
    cleanText(
      response.ExternalReference
    );

  const checkoutRequestId =
    cleanText(
      response.CheckoutRequestID
    );

  const merchantRequestId =
    cleanText(
      response.MerchantRequestID
    );

  const mpesaReceiptNumber =
    cleanText(
      response.MpesaReceiptNumber
    );

  const phone =
    cleanText(
      response.Phone
    );

  const resultCode =
    Number(
      response.ResultCode
    );

  const resultDesc =
    cleanText(
      response.ResultDesc
    );

  if (
    !externalReference
  ) {
    console.warn(
      "PayHero callback missing ExternalReference:",
      payload
    );

    return res.status(200).json({
      success: true,
      message:
        "Callback accepted.",
    });
  }

  const paymentResult =
    await pool.query(
      `
        SELECT
  id,
  status,
  payment_stage,
  booking_id,
  provider_id,
  customer_id,
  provider_share_amount
FROM provider_payments
        WHERE
          payment_reference =
            $1::varchar

          OR

          checkout_request_id =
            $2::varchar

        ORDER BY created_at DESC

        LIMIT 1
      `,
      [
        externalReference,
        checkoutRequestId ||
          null,
      ]
    );

  if (
    paymentResult.rows.length ===
    0
  ) {
    console.warn(
      "Unmatched PayHero callback:",
      {
        externalReference,
        checkoutRequestId,
        merchantRequestId,
        resultCode,
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "Callback accepted.",
    });
  }

  const payment =
    paymentResult.rows[0];

    if (
  payment.status ===
  "SUCCESS"
) {
  return res.status(200).json({
    success: true,
    message:
      "Subscription payment was already processed.",
  });
}

  const successful =
    isSuccessfulPayHeroResult(
      response
    );

  const providerResponse =
    {
      ...response,
      provider:
        "payhero",
    };

  const callbackPayload =
    {
      ...payload,
    };

  if (successful) {
    await pool.query(
      `
        UPDATE provider_payments
        SET
          checkout_request_id =
            COALESCE(
              NULLIF($1::varchar, ''),
              checkout_request_id
            ),

          merchant_request_id =
            COALESCE(
              NULLIF($2::varchar, ''),
              merchant_request_id
            ),

          transaction_id =
            COALESCE(
              NULLIF($3::varchar, ''),
              transaction_id
            ),

          phone_number =
            COALESCE(
              NULLIF($4::varchar, ''),
              phone_number
            ),

          status =
            'PAID',

          provider_response =
            $5::jsonb,

          callback_payload =
            $6::jsonb,

          paid_at =
            COALESCE(
              paid_at,
              CURRENT_TIMESTAMP
            ),

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id =
          $7::uuid
      `,
      [
        checkoutRequestId,
        merchantRequestId,
        mpesaReceiptNumber,
        phone,
        JSON.stringify(
          providerResponse
        ),
        JSON.stringify(
          callbackPayload
        ),
        payment.id,
      ]
    );

        await pool.query(
      `
        UPDATE bookings
        SET
          payment_status =
            CASE
              WHEN $2::varchar = 'BALANCE'
              THEN 'PAID'
              ELSE 'PARTIALLY_PAID'
            END,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id =
          (
            SELECT booking_id
            FROM provider_payments
            WHERE id = $1::uuid
          )
      `,
      [
        payment.id,
        payment.payment_stage,
      ]
    );

    const io =
  req.app.get("io");

if (io) {
  io.to(
    `customer:${payment.customer_id}`
  ).emit(
    "provider-payment-completed",
    {
      bookingId:
        payment.booking_id,

      providerId:
        payment.provider_id,

      paymentStatus:
        payment.payment_stage ===
        "DEPOSIT"
          ? "PARTIALLY_PAID"
          : "PAID",

      paymentReference:
        externalReference,

      transactionId:
        mpesaReceiptNumber,

      amount:
        Number(
          response.Amount || 0
        ),

      paymentStage:
        payment.payment_stage,

      providerShareAmount:
        Number(
          payment.provider_share_amount ||
          0
        ),
    }
  );

  io.to(
  `provider:${payment.provider_id}`
).emit(
  "provider-booking-payment-updated",
  {
    bookingId:
      payment.booking_id,

    paymentStatus:
      payment.payment_stage ===
      "DEPOSIT"
        ? "PARTIALLY_PAID"
        : "PAID",

    amount:
      Number(
        response.Amount || 0
      ),

    paymentStage:
      payment.payment_stage,

    providerShareAmount:
      Number(
        payment.provider_share_amount ||
        0
      ),
  }
);
}
  } else {
    await pool.query(
      `
        UPDATE provider_payments
        SET
          checkout_request_id =
            COALESCE(
              NULLIF($1::varchar, ''),
              checkout_request_id
            ),

          merchant_request_id =
            COALESCE(
              NULLIF($2::varchar, ''),
              merchant_request_id
            ),

          phone_number =
            COALESCE(
              NULLIF($3::varchar, ''),
              phone_number
            ),

          status =
            'FAILED',

          provider_response =
            $4::jsonb,

          callback_payload =
            $5::jsonb,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id =
          $6::uuid
      `,
      [
        checkoutRequestId,
        merchantRequestId,
        phone,
        JSON.stringify(
          providerResponse
        ),
        JSON.stringify(
          callbackPayload
        ),
        payment.id,
      ]
    );

        await pool.query(
      `
        UPDATE bookings
        SET
          payment_status =
            CASE
              WHEN $2::varchar = 'BALANCE'
              THEN 'PARTIALLY_PAID'
              ELSE 'UNPAID'
            END,
          updated_at =
            CURRENT_TIMESTAMP
        WHERE id =
          (
            SELECT booking_id
            FROM provider_payments
            WHERE id = $1::uuid
          )
      `,
      [
        payment.id,
        payment.payment_stage,
      ]
    );
  

      const io =
      req.app.get("io");

    if (io) {
      const paymentStatus =
        payment.payment_stage ===
        "BALANCE"
          ? "PARTIALLY_PAID"
          : "UNPAID";

      const message =
        resultDesc ||
        "The customer did not complete the M-Pesa payment.";

      io.to(
        `customer:${payment.customer_id}`
      ).emit(
        "provider-payment-failed",
        {
          bookingId:
            payment.booking_id,

          providerId:
            payment.provider_id,

          paymentReference:
            externalReference,

          paymentStage:
            payment.payment_stage,

          paymentStatus,

          paymentResult:
            "FAILED",

          resultCode,

          message,
        }
      );

      io.to(
        `provider:${payment.provider_id}`
      ).emit(
        "provider-booking-payment-updated",
        {
          bookingId:
            payment.booking_id,

          paymentStatus,

          paymentStage:
            payment.payment_stage,

          paymentResult:
            "FAILED",

          resultCode,

          message,
        }
           );
    }
  }




  return res.status(200).json({
    success: true,
    message:
      successful
        ? "Payment callback processed."
        : `Payment callback processed: ${resultDesc}`,
  });
}

async function handlePayHeroSubscriptionCallback(
  req,
  res
) {
  const client =
    await pool.connect();

  try {
    const payload =
      req.body || {};

    console.log(
      "PayHero subscription callback:",
      JSON.stringify(
        payload,
        null,
        2
      )
    );

    const response =
      payload.response ||
      payload ||
      {};

    const externalReference =
      cleanText(
        response.ExternalReference
      );

    const resultCode =
      Number(
        response.ResultCode
      );

    const resultDesc =
      cleanText(
        response.ResultDesc
      );

    if (!externalReference) {
      console.warn(
        "Subscription callback missing ExternalReference:",
        payload
      );

      return res.status(200).json({
        success: true,
        message:
          "Callback accepted.",
      });
    }

    await client.query(
      "BEGIN"
    );

    const paymentResult =
      await client.query(
        `
          SELECT
            sp.id,
            sp.subscription_id,
            sp.amount_kes,
            sp.status,
            bs.user_id,
            bs.plan_id,
            bs.business_type

          FROM subscription_payments sp

          INNER JOIN business_subscriptions bs
            ON bs.id =
              sp.subscription_id

          WHERE sp.paystack_reference =
            $1::varchar

          FOR UPDATE

          LIMIT 1
        `,
        [
          externalReference,
        ]
      );

    if (
      paymentResult.rows.length === 0
    ) {
      await client.query(
        "ROLLBACK"
      );

      console.warn(
        "Unmatched PayHero subscription callback:",
        {
          externalReference,
          resultCode,
          resultDesc,
        }
      );

      return res.status(200).json({
        success: true,
        message:
          "Callback accepted.",
      });
    }

    const payment =
      paymentResult.rows[0];

    const successful =
      isSuccessfulPayHeroResult(
        response
      );

    if (!successful) {
      const failureReason =
        resultDesc ||
        "M-Pesa payment was not completed.";

      if (
        payment.status !==
        "FAILED"
      ) {
        await client.query(
          `
            UPDATE subscription_payments
            SET
              status = 'FAILED',

              failure_reason =
                $1::text,

              updated_at =
                CURRENT_TIMESTAMP

            WHERE id = $2
          `,
          [
            failureReason,
            payment.id,
          ]
        );
      }

      await client.query(
        "COMMIT"
      );

      console.log(
        "Subscription payment failed:",
        {
          subscriptionId:
            payment.subscription_id,

          externalReference,

          resultCode,

          resultDesc:
            failureReason,
        }
      );

      return res.status(200).json({
        success: true,
        message:
          "Subscription payment failure processed.",
      });
    }

    if (
      payment.status ===
      "SUCCESS"
    ) {
      await client.query(
        "COMMIT"
      );

      return res.status(200).json({
        success: true,
        message:
          "Subscription payment was already processed.",
      });
    }

    await client.query(
      `
        UPDATE subscription_payments
        SET
          status = 'SUCCESS',

          failure_reason = NULL,

          paystack_transaction_id =
            COALESCE(
              NULLIF(
                $1::varchar,
                ''
              ),
              paystack_transaction_id
            ),

          paid_at =
            COALESCE(
              paid_at,
              CURRENT_TIMESTAMP
            ),

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id = $2
      `,
      [
        cleanText(
          response.MpesaReceiptNumber
        ),
        payment.id,
      ]
    );

    const planResult =
      await client.query(
        `
          SELECT
            duration_days

          FROM subscription_plans

          WHERE id = $1

          LIMIT 1
        `,
        [
          payment.plan_id,
        ]
      );

    const durationDays =
      Number(
        planResult.rows[0]
          ?.duration_days || 0
      );

    await client.query(
      `
        UPDATE business_subscriptions
        SET
          status = 'ACTIVE',

          starts_at =
            COALESCE(
              starts_at,
              CURRENT_TIMESTAMP
            ),

          expires_at =
            CURRENT_TIMESTAMP +
            ($1::int * INTERVAL '1 day'),

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id = $2
      `,
      [
        durationDays,
        payment.subscription_id,
      ]
    );

    await client.query(
      "COMMIT"
    );

    console.log(
      "Subscription payment successful:",
      {
        subscriptionId:
          payment.subscription_id,

        externalReference,

        resultCode,
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "Subscription payment callback received.",
    });

  } catch (error) {
    try {
      await client.query(
        "ROLLBACK"
      );
    } catch (rollbackError) {
      console.error(
        "Subscription callback rollback error:",
        rollbackError
      );
    }

    console.error(
      "PayHero subscription callback error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to process subscription payment callback.",
    });

  } finally {
    client.release();
  }
}

module.exports = {
  handlePayHeroCallback,
  handlePayHeroSubscriptionCallback,
};
