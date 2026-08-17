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
          payment_stage
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
  }

  return res.status(200).json({
    success: true,
    message:
      successful
        ? "Payment callback processed."
        : `Payment callback processed: ${resultDesc}`,
  });
}

module.exports = {
  handlePayHeroCallback,
};