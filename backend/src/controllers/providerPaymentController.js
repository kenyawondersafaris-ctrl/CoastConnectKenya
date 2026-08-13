"use strict";

const pool =
  require("../config/db");

const {
  initiateMpesaStkPush,
} = require("../services/mpesaService");

function cleanText(value) {
  return String(value ?? "").trim();
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "")
  );
}

async function createProviderPaymentAttempt(
  req,
  res
) {
  const client =
    await pool.connect();

  try {
    const customerId =
      req.user.userId;

    const bookingId =
      cleanText(
        req.body.bookingId
      );

    const phoneNumber =
      cleanText(
        req.body.phoneNumber
      );

    if (
      !isValidUuid(
        bookingId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid booking ID.",
      });
    }

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message:
          "M-Pesa phone number is required.",
      });
    }

    await client.query(
      "BEGIN"
    );

    const bookingResult =
      await client.query(
        `
          SELECT
            b.id,
            b.customer_id,
            b.provider_id,
            b.estimated_price,
            b.booking_status,
            b.payment_status,

            pp.user_id
              AS provider_user_id

          FROM bookings b

          INNER JOIN provider_profiles pp
            ON pp.id =
              b.provider_id

          WHERE b.id =
            $1::uuid

          LIMIT 1

          FOR UPDATE OF b
        `,
        [bookingId]
      );

    if (
      bookingResult.rows.length ===
      0
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(404).json({
        success: false,
        message:
          "Booking not found.",
      });
    }

    const booking =
      bookingResult.rows[0];

    if (
      booking.customer_id !==
      customerId
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(403).json({
        success: false,
        message:
          "You cannot pay for this booking.",
      });
    }

    if (
      String(
        booking.booking_status ||
        ""
      ).toUpperCase() !==
      "CONFIRMED"
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(409).json({
        success: false,
        message:
          "Only confirmed bookings can be paid.",
      });
    }

    if (
      String(
        booking.payment_status ||
        ""
      ).toUpperCase() ===
      "PAID"
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(409).json({
        success: false,
        message:
          "This booking has already been paid.",
      });
    }

    const amount =
      Number(
        booking.estimated_price ||
        0
      );

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(409).json({
        success: false,
        message:
          "This booking does not have a valid payable amount.",
      });
    }

    const existingPaymentResult =
      await client.query(
        `
          SELECT
            id,
            status

          FROM provider_payments

          WHERE booking_id =
            $1::uuid

            AND status IN (
              'PENDING',
              'PROCESSING',
              'PAID'
            )

          LIMIT 1
        `,
        [bookingId]
      );

    if (
      existingPaymentResult.rows.length >
      0
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(409).json({
        success: false,
        message:
          "An active payment already exists for this booking.",
      });
    }

    const paymentReference =
      `CCKPROV-${Date.now()}-${Math.floor(
        1000 +
        Math.random() * 9000
      )}`;

    const paymentResult =
      await client.query(
        `
          INSERT INTO provider_payments (
            booking_id,
            provider_id,
            customer_id,
            payment_reference,
            payment_method,
            payment_provider,
            phone_number,
            amount,
            currency,
            status
          )
          VALUES (
            $1::uuid,
            $2::uuid,
            $3::uuid,
            $4::varchar,
            'MPESA',
            'SAFARICOM_DARAJA',
            $5::varchar,
            $6::numeric,
            'KES',
            'PENDING'
          )
          RETURNING
            id,
            booking_id,
            provider_id,
            customer_id,
            payment_reference,
            phone_number,
            amount,
            currency,
            status,
            created_at
        `,
        [
          booking.id,
          booking.provider_id,
          customerId,
          paymentReference,
          phoneNumber,
          amount,
        ]
      );

    const payment =
      paymentResult.rows[0];

    await client.query(
      "COMMIT"
    );

    const callbackUrl =
      String(
        process.env
          .MPESA_CALLBACK_URL ||
        ""
      ).trim();

    if (!callbackUrl) {
      return res.status(201).json({
        success: true,

        message:
          "Provider payment attempt recorded. STK Push will activate after a public callback URL is configured.",

        stkPushReady:
          false,

        payment: {
          id:
            payment.id,

          bookingId:
            payment.booking_id,

          paymentReference:
            payment.payment_reference,

          phoneNumber:
            payment.phone_number,

          amount:
            Number(
              payment.amount
            ),

          currency:
            payment.currency,

          status:
            payment.status,

          createdAt:
            payment.created_at,
        },
      });
    }

    try {
      const stkResult =
        await initiateMpesaStkPush({
          phoneNumber:
            payment.phone_number,

          amount:
            Number(
              payment.amount
            ),

          accountReference:
            payment.payment_reference,

          transactionDescription:
            "Coast Connect provider booking",
        });

      const providerResponse =
        stkResult.response || {};

      await client.query(
        "BEGIN"
      );

      const updatedPaymentResult =
        await client.query(
          `
            UPDATE provider_payments

            SET
              checkout_request_id =
                $1::varchar,

              merchant_request_id =
                $2::varchar,

              phone_number =
                $3::varchar,

              amount =
                $4::numeric,

              status =
                'PROCESSING',

              provider_response =
                $5::jsonb,

              updated_at =
                CURRENT_TIMESTAMP

            WHERE id =
              $6::uuid

            RETURNING
              id,
              booking_id,
              provider_id,
              customer_id,
              payment_reference,
              checkout_request_id,
              merchant_request_id,
              phone_number,
              amount,
              currency,
              status,
              created_at,
              updated_at
          `,
          [
            providerResponse
              .CheckoutRequestID ||
            null,

            providerResponse
              .MerchantRequestID ||
            null,

            stkResult
              .normalizedPhone,

            stkResult.amount,

            JSON.stringify(
              providerResponse
            ),

            payment.id,
          ]
        );

      await client.query(
        `
          UPDATE bookings

          SET
            payment_status =
              'PENDING',

            updated_at =
              CURRENT_TIMESTAMP

          WHERE id =
            $1::uuid
        `,
        [booking.id]
      );

      await client.query(
        "COMMIT"
      );

      const updatedPayment =
        updatedPaymentResult.rows[0];

      return res.status(201).json({
        success: true,

        message:
          providerResponse
            .CustomerMessage ||
          "M-Pesa prompt sent. Check your phone and enter your PIN.",

        stkPushReady:
          true,

        payment: {
          id:
            updatedPayment.id,

          bookingId:
            updatedPayment.booking_id,

          paymentReference:
            updatedPayment
              .payment_reference,

          checkoutRequestId:
            updatedPayment
              .checkout_request_id,

          merchantRequestId:
            updatedPayment
              .merchant_request_id,

          phoneNumber:
            updatedPayment.phone_number,

          amount:
            Number(
              updatedPayment.amount
            ),

          currency:
            updatedPayment.currency,

          status:
            updatedPayment.status,

          createdAt:
            updatedPayment.created_at,

          updatedAt:
            updatedPayment.updated_at,
        },
      });
    } catch (stkError) {
      console.error(
        "Provider M-Pesa STK Push error:",
        stkError.response?.data ||
        stkError.message
      );

      try {
        await client.query(
          "BEGIN"
        );

        await client.query(
          `
            UPDATE provider_payments

            SET
              status =
                'FAILED',

              provider_response =
                $1::jsonb,

              updated_at =
                CURRENT_TIMESTAMP

            WHERE id =
              $2::uuid
          `,
          [
            JSON.stringify(
              stkError.response?.data ||
              {
                message:
                  stkError.message,
              }
            ),

            payment.id,
          ]
        );

        await client.query(
          `
            UPDATE bookings

            SET
              payment_status =
                'UNPAID',

              updated_at =
                CURRENT_TIMESTAMP

            WHERE id =
              $1::uuid
          `,
          [booking.id]
        );

        await client.query(
          "COMMIT"
        );
      } catch (databaseError) {
        try {
          await client.query(
            "ROLLBACK"
          );
        } catch (
          rollbackError
        ) {
          console.error(
            "Provider payment rollback error:",
            rollbackError
          );
        }

        console.error(
          "Save provider STK failure error:",
          databaseError
        );
      }

      return res.status(502).json({
        success: false,
        message:
          stkError.response?.data
            ?.errorMessage ||
          stkError.response?.data
            ?.ResponseDescription ||
          stkError.message ||
          "Unable to initiate M-Pesa payment.",
      });
    }
  } catch (error) {
    try {
      await client.query(
        "ROLLBACK"
      );
    } catch (
      rollbackError
    ) {
      // Transaction may already
      // have been committed.
    }

    console.error(
      "Create provider payment attempt error:",
      error
    );

    if (
      error.code === "23505"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "An active payment already exists for this booking.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to initiate provider payment.",
    });
  } finally {
    client.release();
  }
}

async function handleProviderMpesaCallback(
  callbackPayload,
  client,
  io
) {
  const stkCallback =
    callbackPayload?.Body
      ?.stkCallback;

  if (!stkCallback) {
    return {
      handled: false,
    };
  }

  const checkoutRequestId =
    String(
      stkCallback.CheckoutRequestID ||
      ""
    ).trim();

  const merchantRequestId =
    String(
      stkCallback.MerchantRequestID ||
      ""
    ).trim();

  const resultCode =
    Number(
      stkCallback.ResultCode
    );

  const resultDescription =
    String(
      stkCallback.ResultDesc ||
      ""
    ).trim();

  if (!checkoutRequestId) {
    return {
      handled: false,
    };
  }

  const paymentResult =
    await client.query(
      `
        SELECT
          pp.id,
          pp.booking_id,
          pp.provider_id,
          pp.customer_id,
          pp.payment_reference,
          pp.checkout_request_id,
          pp.merchant_request_id,
          pp.transaction_id,
          pp.phone_number,
          pp.amount,
          pp.currency,
          pp.status,

          b.booking_status,
          b.payment_status

        FROM provider_payments pp

        INNER JOIN bookings b
          ON b.id =
            pp.booking_id

        WHERE pp.checkout_request_id =
          $1::varchar

        LIMIT 1

        FOR UPDATE OF pp, b
      `,
      [
        checkoutRequestId,
      ]
    );

  if (
    paymentResult.rows.length ===
    0
  ) {
    return {
      handled: false,
    };
  }

  const payment =
    paymentResult.rows[0];

  console.log(
    "Provider payment callback detected:",
    payment.payment_reference
  );

  /*
  |--------------------------------------------------------------------------
  | Idempotency
  |--------------------------------------------------------------------------
  */

  if (
    String(
      payment.status || ""
    ).toUpperCase() ===
      "PAID" &&
    String(
      payment.payment_status || ""
    ).toUpperCase() ===
      "PAID"
  ) {
    return {
      handled: true,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Failed / cancelled payment
  |--------------------------------------------------------------------------
  */

  if (resultCode !== 0) {
    await client.query(
      `
        UPDATE provider_payments

        SET
          merchant_request_id =
            COALESCE(
              NULLIF(
                $1::varchar,
                ''
              ),
              merchant_request_id
            ),

          status =
            'FAILED',

          callback_payload =
            $2::jsonb,

          provider_response =
            COALESCE(
              provider_response,
              '{}'::jsonb
            )
            ||
            jsonb_build_object(
              'ResultCode',
              $3::integer,

              'ResultDesc',
              $4::text
            ),

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id =
          $5::uuid
      `,
      [
        merchantRequestId,

        JSON.stringify(
          callbackPayload
        ),

        resultCode,
        resultDescription,
        payment.id,
      ]
    );

    await client.query(
      `
        UPDATE bookings

        SET
          payment_status =
            'UNPAID',

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id =
          $1::uuid
      `,
      [
        payment.booking_id,
      ]
    );

    if (io) {
      io.to(
        `customer:${payment.customer_id}`
      ).emit(
        "provider-payment-failed",
        {
          bookingId:
            payment.booking_id,

          paymentReference:
            payment.payment_reference,

          message:
            resultDescription ||
            "M-Pesa payment was not completed.",
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
            "UNPAID",
        }
      );
    }

    return {
      handled: true,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Callback metadata
  |--------------------------------------------------------------------------
  */

  const metadataItems =
    stkCallback
      ?.CallbackMetadata
      ?.Item;

  const getMetadataValue = (
    name
  ) => {
    if (
      !Array.isArray(
        metadataItems
      )
    ) {
      return null;
    }

    const item =
      metadataItems.find(
        (entry) =>
          String(
            entry?.Name || ""
          ) === name
      );

    return item?.Value ?? null;
  };

  const paidAmount =
    Number(
      getMetadataValue(
        "Amount"
      ) || 0
    );

  const mpesaReceiptNumber =
    String(
      getMetadataValue(
        "MpesaReceiptNumber"
      ) || ""
    ).trim();

  const callbackPhoneNumber =
    String(
      getMetadataValue(
        "PhoneNumber"
      ) || ""
    ).trim();

  const transactionDate =
    getMetadataValue(
      "TransactionDate"
    );

  /*
  |--------------------------------------------------------------------------
  | Validate receipt
  |--------------------------------------------------------------------------
  */

  if (!mpesaReceiptNumber) {
    await client.query(
      `
        UPDATE provider_payments

        SET
          status =
            'FAILED',

          callback_payload =
            $1::jsonb,

          provider_response =
            COALESCE(
              provider_response,
              '{}'::jsonb
            )
            ||
            jsonb_build_object(
              'validationError',
              'Missing M-Pesa receipt number'
            ),

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id =
          $2::uuid
      `,
      [
        JSON.stringify(
          callbackPayload
        ),

        payment.id,
      ]
    );

    await client.query(
      `
        UPDATE bookings

        SET
          payment_status =
            'UNPAID',

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id =
          $1::uuid
      `,
      [
        payment.booking_id,
      ]
    );

    return {
      handled: true,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Validate amount
  |--------------------------------------------------------------------------
  */

  const expectedAmount =
    Number(
      payment.amount || 0
    );

  if (
    !Number.isFinite(
      paidAmount
    ) ||
    paidAmount !==
      expectedAmount
  ) {
    await client.query(
      `
        UPDATE provider_payments

        SET
          status =
            'FAILED',

          transaction_id =
            NULLIF(
              $1::varchar,
              ''
            ),

          callback_payload =
            $2::jsonb,

          provider_response =
            COALESCE(
              provider_response,
              '{}'::jsonb
            )
            ||
            jsonb_build_object(
              'validationError',
              'Payment amount mismatch',

              'expectedAmount',
              $3::numeric,

              'receivedAmount',
              $4::numeric
            ),

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id =
          $5::uuid
      `,
      [
        mpesaReceiptNumber,

        JSON.stringify(
          callbackPayload
        ),

        expectedAmount,
        paidAmount,
        payment.id,
      ]
    );

    await client.query(
      `
        UPDATE bookings

        SET
          payment_status =
            'UNPAID',

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id =
          $1::uuid
      `,
      [
        payment.booking_id,
      ]
    );

    return {
      handled: true,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Successful provider payment
  |--------------------------------------------------------------------------
  */

  await client.query(
    `
      UPDATE provider_payments

      SET
        merchant_request_id =
          COALESCE(
            NULLIF(
              $1::varchar,
              ''
            ),
            merchant_request_id
          ),

        transaction_id =
          $2::varchar,

        phone_number =
          COALESCE(
            NULLIF(
              $3::varchar,
              ''
            ),
            phone_number
          ),

        amount =
          $4::numeric,

        status =
          'PAID',

        callback_payload =
          $5::jsonb,

        provider_response =
          COALESCE(
            provider_response,
            '{}'::jsonb
          )
          ||
          jsonb_build_object(
            'ResultCode',
            $6::integer,

            'ResultDesc',
            $7::text,

            'TransactionDate',
            $8::text
          ),

        paid_at =
          CURRENT_TIMESTAMP,

        updated_at =
          CURRENT_TIMESTAMP

      WHERE id =
        $9::uuid
    `,
    [
      merchantRequestId,
      mpesaReceiptNumber,
      callbackPhoneNumber,
      paidAmount,

      JSON.stringify(
        callbackPayload
      ),

      resultCode,
      resultDescription,

      transactionDate
        ? String(
            transactionDate
          )
        : null,

      payment.id,
    ]
  );

  await client.query(
    `
      UPDATE bookings

      SET
        payment_status =
          'PAID',

        updated_at =
          CURRENT_TIMESTAMP

      WHERE id =
        $1::uuid
    `,
    [
      payment.booking_id,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | Real-time notifications
  |--------------------------------------------------------------------------
  */

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
          "PAID",

        paymentReference:
          payment.payment_reference,

        transactionId:
          mpesaReceiptNumber,

        amount:
          paidAmount,
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
          "PAID",

        amount:
          paidAmount,
      }
    );
  }

  return {
    handled: true,
  };
}

module.exports = {
  createProviderPaymentAttempt,
  handleProviderMpesaCallback,
};