"use strict";

const pool =
  require("../config/db");

const {
  initiatePayHeroStkPush,
} = require("../services/payheroService");

const {
  initiateMpesaB2CPayout,
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

    

   const currentPaymentStatus =
  String(
    booking.payment_status || ""
  )
    .trim()
    .toUpperCase();

if (
  currentPaymentStatus ===
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

if (
  currentPaymentStatus ===
    "DEPOSIT_PENDING" ||
  currentPaymentStatus ===
    "BALANCE_PENDING"
) {
  await client.query(
    "ROLLBACK"
  );

  return res.status(409).json({
    success: false,
    message:
      "A payment for this booking is already being processed.",
  });
}
    const fullServiceAmount =
  Number(
    booking.estimated_price ||
    0
  );


const paymentStage =
  currentPaymentStatus ===
    "PARTIALLY_PAID"
    ? "BALANCE"
    : "DEPOSIT";

    const currentBookingStatus =
  String(
    booking.booking_status || ""
  )
    .trim()
    .toUpperCase();

if (
  paymentStage === "DEPOSIT" &&
  currentBookingStatus !==
    "CONFIRMED"
) {
  await client.query(
    "ROLLBACK"
  );

  return res.status(409).json({
    success: false,
    message:
      "The deposit can only be paid after the booking is confirmed.",
  });
}

if (
  paymentStage === "BALANCE" &&
  currentBookingStatus !==
    "COMPLETED"
) {
  await client.query(
    "ROLLBACK"
  );

  return res.status(409).json({
    success: false,
    message:
      "The remaining balance can only be paid after the service is completed.",
  });
}
const amount =
  Number(
    (
      fullServiceAmount *
      0.5
    ).toFixed(2)
  );

const platformFeeAmount =
  Number(
    (
      amount *
      0.10
    ).toFixed(2)
  );

const providerShareAmount =
  Number(
    (
      amount -
      platformFeeAmount
    ).toFixed(2)
  );

   if (
  !Number.isFinite(
    fullServiceAmount
  ) ||
  fullServiceAmount <= 0 ||
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
        status,
        payment_stage

      FROM provider_payments

      WHERE booking_id =
        $1::uuid

        AND payment_stage =
          $2::varchar

        AND status IN (
          'PENDING',
          'PROCESSING',
          'PAID'
        )

      LIMIT 1
    `,
    [
      bookingId,
      paymentStage,
    ]
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
  `An active ${paymentStage.toLowerCase()} payment already exists for this booking.`,
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
  payment_stage,
  payment_method,
  payment_provider,
  phone_number,
  amount,
  platform_fee_amount,
  provider_share_amount,
  currency,
  status
)
VALUES (
  $1::uuid,
  $2::uuid,
  $3::uuid,
  $4::varchar,
  $5::varchar,
  'MPESA',
  'SAFARICOM_DARAJA',
  $6::varchar,
  $7::numeric,
  $8::numeric,
  $9::numeric,
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
            created_at,
            payment_stage,
            platform_fee_amount,
            provider_share_amount
        `,
       [
  booking.id,
  booking.provider_id,
  customerId,
  paymentReference,
  paymentStage,
  phoneNumber,
  amount,
  platformFeeAmount,
  providerShareAmount,
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

            paymentStage:
  payment.payment_stage,

platformFeeAmount:
  Number(
    payment.platform_fee_amount ||
    0
  ),

providerShareAmount:
  Number(
    payment.provider_share_amount ||
    0
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
  await initiatePayHeroStkPush({
    phoneNumber:
      payment.phone_number,

    amount:
      Number(
        payment.amount
      ),

    externalReference:
      payment.payment_reference,

    customerName:
      booking.customer_name ||
      "Coast Connect Customer",

    callbackUrl:
      process.env.PAYHERO_CALLBACK_URL,
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
              payment_stage,
              platform_fee_amount,
              provider_share_amount,
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
  CASE
    WHEN $2::varchar =
      'BALANCE'
    THEN
      'BALANCE_PENDING'

    ELSE
      'DEPOSIT_PENDING'
  END,

            updated_at =
              CURRENT_TIMESTAMP

          WHERE id =
            $1::uuid
        `,
        [
  booking.id,
  paymentStage,
]
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

            paymentStage:
  updatedPayment.payment_stage,

platformFeeAmount:
  Number(
    updatedPayment.platform_fee_amount ||
    0
  ),

providerShareAmount:
  Number(
    updatedPayment.provider_share_amount ||
    0
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
    CASE
      WHEN $2::varchar =
        'BALANCE'
      THEN
        'PARTIALLY_PAID'

      ELSE
        'UNPAID'
    END,

  updated_at =
    CURRENT_TIMESTAMP

WHERE id =
  $1::uuid
          `,
          [
  booking.id,
  paymentStage,
]
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



async function createProviderPayout(
  req,
  res
) {
  const client =
    await pool.connect();

  try {
    const paymentId =
      cleanText(
        req.body.paymentId
      );

    if (
      !isValidUuid(
        paymentId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid payment ID.",
      });
    }

    await client.query(
      "BEGIN"
    );

    const paymentResult =
      await client.query(
        `
          SELECT
            pay.id,
            pay.booking_id,
            pay.provider_id,
            pay.payment_reference,
            pay.payment_stage,
            pay.status,
            pay.settlement_status,
            pay.provider_share_amount,
            pay.currency,

            pp.user_id
              AS provider_user_id,

            u.phone
              AS provider_phone

          FROM provider_payments pay

          INNER JOIN provider_profiles pp
            ON pp.id =
              pay.provider_id

          INNER JOIN users u
            ON u.id =
              pp.user_id

          WHERE pay.id =
            $1::uuid

          LIMIT 1

          FOR UPDATE OF pay
        `,
        [
          paymentId,
        ]
      );

    if (
      paymentResult.rows.length ===
      0
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
        payment.status || ""
      ).toUpperCase() !==
      "PAID"
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(409).json({
        success: false,
        message:
          "Only paid provider payments can be settled.",
      });
    }

    if (
      String(
        payment.settlement_status ||
        ""
      ).toUpperCase() !==
      "ELIGIBLE"
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(409).json({
        success: false,
        message:
          "This provider payment is not eligible for payout.",
      });
    }

    const providerPhone =
      cleanText(
        payment.provider_phone
      );

    if (!providerPhone) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(409).json({
        success: false,
        message:
          "The provider does not have an M-Pesa phone number.",
      });
    }

    const payoutAmount =
      Number(
        payment.provider_share_amount ||
        0
      );

    if (
      !Number.isFinite(
        payoutAmount
      ) ||
      payoutAmount <= 0
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(409).json({
        success: false,
        message:
          "The provider payout amount is invalid.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Reserve payout before calling Safaricom
    |--------------------------------------------------------------------------
    */

    await client.query(
      `
        UPDATE provider_payments

        SET
          settlement_status =
            'PROCESSING',

          payout_initiated_at =
            CURRENT_TIMESTAMP,

          payout_failure_reason =
            NULL,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id =
          $1::uuid
      `,
      [
        payment.id,
      ]
    );

    await client.query(
      "COMMIT"
    );

    /*
    |--------------------------------------------------------------------------
    | Initiate Daraja B2C
    |--------------------------------------------------------------------------
    */

    try {
      const payoutResult =
        await initiateMpesaB2CPayout({
          phoneNumber:
            providerPhone,

          amount:
            payoutAmount,

          remarks:
            `Coast Connect ${payment.payment_stage} payout`,

          occasion:
            payment.payment_reference ||
            "Provider settlement",
        });

      const providerResponse =
        payoutResult.response || {};

      await client.query(
        "BEGIN"
      );

      await client.query(
        `
          UPDATE provider_payments

          SET
            payout_conversation_id =
              $1::varchar,

            payout_originator_conversation_id =
              $2::varchar,

            payout_response =
              $3::jsonb,

            updated_at =
              CURRENT_TIMESTAMP

          WHERE id =
            $4::uuid
        `,
        [
          providerResponse
            .ConversationID ||
            null,

          providerResponse
            .OriginatorConversationID ||
            null,

          JSON.stringify(
            providerResponse
          ),

          payment.id,
        ]
      );

      await client.query(
        "COMMIT"
      );

      return res.status(202).json({
        success: true,

        message:
          "Provider payout submitted to M-Pesa.",

        payout: {
          paymentId:
            payment.id,

          bookingId:
            payment.booking_id,

          paymentStage:
            payment.payment_stage,

          amount:
            payoutResult.amount,

          currency:
            payment.currency,

          providerPhone:
            payoutResult.normalizedPhone,

          settlementStatus:
            "PROCESSING",

          conversationId:
            providerResponse
              .ConversationID ||
            null,

          originatorConversationId:
            providerResponse
              .OriginatorConversationID ||
            null,
        },
      });
    } catch (payoutError) {
      console.error(
        "Provider B2C payout error:",
        payoutError.response?.data ||
        payoutError.message
      );

      try {
        await client.query(
          "BEGIN"
        );

        await client.query(
          `
            UPDATE provider_payments

            SET
              settlement_status =
                'ELIGIBLE',

              payout_failure_reason =
                $1::text,

              payout_response =
                $2::jsonb,

              updated_at =
                CURRENT_TIMESTAMP

            WHERE id =
              $3::uuid
          `,
          [
            payoutError.message ||
            "Unable to initiate provider payout.",

            JSON.stringify(
              payoutError.response?.data ||
              {
                message:
                  payoutError.message,
              }
            ),

            payment.id,
          ]
        );

        await client.query(
          "COMMIT"
        );
      } catch (
        savePayoutError
      ) {
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
          "Save B2C payout failure error:",
          savePayoutError
        );
      }

      return res.status(502).json({
        success: false,
        message:
          payoutError.response?.data
            ?.errorMessage ||
          payoutError.response?.data
            ?.ResponseDescription ||
          payoutError.message ||
          "Unable to initiate provider payout.",
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
      // The transaction may already
      // have been committed.
    }

    console.error(
      "Create provider payout error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to process provider payout.",
    });
  } finally {
    client.release();
  }
}

async function createProviderPayout(
  req,
  res
) {
  const client =
    await pool.connect();

  try {
    const paymentId =
      cleanText(
        req.body.paymentId
      );

    if (
      !isValidUuid(
        paymentId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid payment ID.",
      });
    }

    await client.query(
      "BEGIN"
    );

    const paymentResult =
      await client.query(
        `
          SELECT
            pay.id,
            pay.booking_id,
            pay.provider_id,
            pay.payment_reference,
            pay.payment_stage,
            pay.status,
            pay.settlement_status,
            pay.provider_share_amount,
            pay.currency,

            pp.user_id
              AS provider_user_id,

            u.phone
              AS provider_phone

          FROM provider_payments pay

          INNER JOIN provider_profiles pp
            ON pp.id =
              pay.provider_id

          INNER JOIN users u
            ON u.id =
              pp.user_id

          WHERE pay.id =
            $1::uuid

          LIMIT 1

          FOR UPDATE OF pay
        `,
        [
          paymentId,
        ]
      );

    if (
      paymentResult.rows.length ===
      0
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
        payment.status || ""
      ).toUpperCase() !==
      "PAID"
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(409).json({
        success: false,
        message:
          "Only paid provider payments can be settled.",
      });
    }

    if (
      String(
        payment.settlement_status ||
        ""
      ).toUpperCase() !==
      "ELIGIBLE"
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(409).json({
        success: false,
        message:
          "This provider payment is not eligible for payout.",
      });
    }

    const providerPhone =
      cleanText(
        payment.provider_phone
      );

    if (!providerPhone) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(409).json({
        success: false,
        message:
          "The provider does not have an M-Pesa phone number.",
      });
    }

    const payoutAmount =
      Number(
        payment.provider_share_amount ||
        0
      );

    const MIN_B2C_PAYOUT_AMOUNT = 10;

if (
  !Number.isFinite(
    payoutAmount
  ) ||
  payoutAmount <= 0
) {
  await client.query(
    "ROLLBACK"
  );

  return res.status(409).json({
    success: false,
    message:
      "The provider payout amount is invalid.",
  });
}

if (
  payoutAmount <
  MIN_B2C_PAYOUT_AMOUNT
) {
  await client.query(
    "ROLLBACK"
  );

  return res.status(409).json({
    success: false,
    message:
      `The provider payout amount must be at least KES ${MIN_B2C_PAYOUT_AMOUNT}.`,
  });
}
    /*
    |--------------------------------------------------------------------------
    | Daraja sandbox recipient
    |--------------------------------------------------------------------------
    |
    | In sandbox, Safaricom requires the simulator Party B number.
    |
    | Production continues using the actual provider phone number.
    |
    */

    const isProduction =
      process.env.MPESA_ENVIRONMENT ===
      "production";

      console.log(
  "B2C sandbox configuration:",
  {
    shortcode:
      process.env.MPESA_B2C_SHORTCODE,
    initiator:
      process.env.MPESA_B2C_INITIATOR_NAME,
    environment:
      process.env.MPESA_ENVIRONMENT,
  }
);

    const payoutPhone =
      isProduction
        ? providerPhone
        : "254708374149";

    console.log(
      "Provider B2C payout recipient:",
      {
        environment:
          isProduction
            ? "production"
            : "sandbox",

        providerPhone,

        payoutPhone,
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Reserve payout before calling Safaricom
    |--------------------------------------------------------------------------
    */

    await client.query(
      `
        UPDATE provider_payments

        SET
          settlement_status =
            'PROCESSING',

          payout_initiated_at =
            CURRENT_TIMESTAMP,

          payout_failure_reason =
            NULL,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id =
          $1::uuid
      `,
      [
        payment.id,
      ]
    );

    await client.query(
      "COMMIT"
    );

    /*
    |--------------------------------------------------------------------------
    | Initiate Daraja B2C
    |--------------------------------------------------------------------------
    */

    try {
      const payoutResult =
        await initiateMpesaB2CPayout({
          phoneNumber:
            payoutPhone,

          amount:
            payoutAmount,

          remarks:
            `Coast Connect ${payment.payment_stage} payout`,

          occasion:
            payment.payment_reference ||
            "Provider settlement",
        });

      const providerResponse =
        payoutResult.response || {};

      await client.query(
        "BEGIN"
      );

      await client.query(
        `
          UPDATE provider_payments

          SET
            payout_conversation_id =
              $1::varchar,

            payout_originator_conversation_id =
              $2::varchar,

            payout_response =
              $3::jsonb,

            updated_at =
              CURRENT_TIMESTAMP

          WHERE id =
            $4::uuid
        `,
        [
          providerResponse
            .ConversationID ||
            null,

          providerResponse
            .OriginatorConversationID ||
            null,

          JSON.stringify(
            providerResponse
          ),

          payment.id,
        ]
      );

      await client.query(
        "COMMIT"
      );

      return res.status(202).json({
        success: true,

        message:
          "Provider payout submitted to M-Pesa.",

        payout: {
          paymentId:
            payment.id,

          bookingId:
            payment.booking_id,

          paymentStage:
            payment.payment_stage,

          amount:
            payoutResult.amount,

          currency:
            payment.currency,

          providerPhone:
            payoutResult.normalizedPhone,

          settlementStatus:
            "PROCESSING",

          conversationId:
            providerResponse
              .ConversationID ||
            null,

          originatorConversationId:
            providerResponse
              .OriginatorConversationID ||
            null,
        },
      });
    } catch (payoutError) {
      console.error(
        "Provider B2C payout error:",
        payoutError.response?.data ||
        payoutError.message
      );

      try {
        await client.query(
          "BEGIN"
        );

        await client.query(
          `
            UPDATE provider_payments

            SET
              settlement_status =
                'ELIGIBLE',

              payout_failure_reason =
                $1::text,

              payout_response =
                $2::jsonb,

              updated_at =
                CURRENT_TIMESTAMP

            WHERE id =
              $3::uuid
          `,
          [
            payoutError.message ||
            "Unable to initiate provider payout.",

            JSON.stringify(
              payoutError.response?.data ||
              {
                message:
                  payoutError.message,
              }
            ),

            payment.id,
          ]
        );

        await client.query(
          "COMMIT"
        );
      } catch (
        savePayoutError
      ) {
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
          "Save B2C payout failure error:",
          savePayoutError
        );
      }

      return res.status(502).json({
        success: false,

        message:
          payoutError.response?.data
            ?.errorMessage ||
          payoutError.response?.data
            ?.ResponseDescription ||
          payoutError.message ||
          "Unable to initiate provider payout.",
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
      // The transaction may already
      // have been committed.
    }

    console.error(
      "Create provider payout error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to process provider payout.",
    });
  } finally {
    client.release();
  }
}

async function handleProviderB2CResult(
  req,
  res
) {
  const client =
    await pool.connect();

  try {
    const payload =
      req.body || {};

    const result =
      payload.Result;

    if (!result) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid M-Pesa B2C result payload.",
      });
    }

    const conversationId =
      cleanText(
        result.ConversationID
      );

    const originatorConversationId =
      cleanText(
        result.OriginatorConversationID
      );

    const resultCode =
      Number(
        result.ResultCode
      );

    const resultDescription =
      cleanText(
        result.ResultDesc
      );

    /*
    |--------------------------------------------------------------------------
    | Extract B2C result parameters
    |--------------------------------------------------------------------------
    */

    const resultParameters =
      Array.isArray(
        result.ResultParameters
          ?.ResultParameter
      )
        ? result.ResultParameters
            .ResultParameter
        : [];

    const parameterMap = {};

    for (
      const parameter
      of resultParameters
    ) {
      if (
        parameter &&
        parameter.Key
      ) {
        parameterMap[
          parameter.Key
        ] =
          parameter.Value;
      }
    }

    const transactionId =
      cleanText(
        parameterMap.TransactionID
      ) || null;

    await client.query(
      "BEGIN"
    );

    /*
    |--------------------------------------------------------------------------
    | Find the payout
    |--------------------------------------------------------------------------
    */

    const paymentResult =
      await client.query(
        `
          SELECT
            id,
            settlement_status

          FROM provider_payments

          WHERE
            (
              payout_conversation_id =
                $1::varchar

              OR

              payout_originator_conversation_id =
                $2::varchar
            )

          LIMIT 1

          FOR UPDATE
        `,
        [
          conversationId ||
            null,

          originatorConversationId ||
            null,
        ]
      );

    /*
    |--------------------------------------------------------------------------
    | Safaricom may retry callbacks.
    | Always acknowledge a valid callback even if we cannot match it.
    |--------------------------------------------------------------------------
    */

    if (
      paymentResult.rows.length ===
      0
    ) {
      await client.query(
        "ROLLBACK"
      );

      console.warn(
        "Unmatched provider B2C result:",
        {
          conversationId,
          originatorConversationId,
          resultCode,
        }
      );

      return res.status(200).json({
        ResultCode: 0,
        ResultDesc:
          "Accepted",
      });
    }

    const payment =
      paymentResult.rows[0];

    /*
    |--------------------------------------------------------------------------
    | Successful payout
    |--------------------------------------------------------------------------
    */

    if (resultCode === 0) {
      await client.query(
        `
          UPDATE provider_payments

          SET
            settlement_status =
              'SETTLED',

            payout_transaction_id =
              $1::varchar,

            payout_result_payload =
              $2::jsonb,

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
            $3::uuid
        `,
        [
          transactionId,

          JSON.stringify(
            payload
          ),

          payment.id,
        ]
      );
    } else {
      /*
      |--------------------------------------------------------------------------
      | Safaricom rejected/failed the B2C transfer
      |--------------------------------------------------------------------------
      */

      await client.query(
        `
          UPDATE provider_payments

          SET
            settlement_status =
              'FAILED',

            payout_result_payload =
              $1::jsonb,

            payout_failure_reason =
              $2::text,

            updated_at =
              CURRENT_TIMESTAMP

          WHERE id =
            $3::uuid
        `,
        [
          JSON.stringify(
            payload
          ),

          resultDescription ||
            `M-Pesa B2C failed with result code ${resultCode}.`,

          payment.id,
        ]
      );
    }

    await client.query(
      "COMMIT"
    );

    return res.status(200).json({
      ResultCode: 0,
      ResultDesc:
        "Accepted",
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
      "Provider B2C result callback error:",
      error
    );

    return res.status(500).json({
      ResultCode: 1,
      ResultDesc:
        "Unable to process B2C result.",
    });
  } finally {
    client.release();
  }
}


async function handleProviderB2CTimeout(
  req,
  res
) {
  const client =
    await pool.connect();

  try {
    const payload =
      req.body || {};

    const result =
      payload.Result || {};

    const conversationId =
      cleanText(
        result.ConversationID ||
        payload.ConversationID
      );

    const originatorConversationId =
      cleanText(
        result.OriginatorConversationID ||
        payload.OriginatorConversationID
      );

    await client.query(
      "BEGIN"
    );

    const paymentResult =
      await client.query(
        `
          SELECT
            id

          FROM provider_payments

          WHERE
            (
              payout_conversation_id =
                $1::varchar

              OR

              payout_originator_conversation_id =
                $2::varchar
            )

          LIMIT 1

          FOR UPDATE
        `,
        [
          conversationId ||
            null,

          originatorConversationId ||
            null,
        ]
      );

    if (
      paymentResult.rows.length >
      0
    ) {
      await client.query(
        `
          UPDATE provider_payments

          SET
            settlement_status =
              'FAILED',

            payout_result_payload =
              $1::jsonb,

            payout_failure_reason =
              'M-Pesa B2C request timed out.',

            updated_at =
              CURRENT_TIMESTAMP

          WHERE id =
            $2::uuid

            AND settlement_status =
              'PROCESSING'
        `,
        [
          JSON.stringify(
            payload
          ),

          paymentResult.rows[0].id,
        ]
      );
    }

    await client.query(
      "COMMIT"
    );

    return res.status(200).json({
      ResultCode: 0,
      ResultDesc:
        "Accepted",
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
      "Provider B2C timeout callback error:",
      error
    );

    return res.status(500).json({
      ResultCode: 1,
      ResultDesc:
        "Unable to process B2C timeout.",
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
          pp.payment_stage,
          pp.platform_fee_amount,
          pp.provider_share_amount,

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
  "Provider payment callback details:",
  {
    bookingId: payment.booking_id,
    paymentReference:
      payment.payment_reference,
    paymentStage:
      payment.payment_stage,
    currentPaymentStatus:
      payment.payment_status,
    resultCode,
    checkoutRequestId,
  }
);

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
        CASE
          WHEN $2::varchar =
            'BALANCE'
          THEN
            'PARTIALLY_PAID'

          ELSE
            'UNPAID'
        END,

      updated_at =
        CURRENT_TIMESTAMP

    WHERE id =
      $1::uuid
  `,
  [
    payment.booking_id,
    payment.payment_stage,
  ]
);

const paymentWasCancelled =
  resultCode === 1032;

const providerPaymentMessage =
  paymentWasCancelled
    ? "The customer cancelled the M-Pesa payment."
    : resultDescription ||
      "The customer did not complete the M-Pesa payment.";

    if (io) {
      io.to(
  `provider:${payment.provider_id}`
).emit(
  "provider-booking-payment-updated",
  {
    bookingId:
      payment.booking_id,

    paymentStatus:
      payment.payment_stage ===
        "BALANCE"
        ? "PARTIALLY_PAID"
        : "UNPAID",

    paymentStage:
      payment.payment_stage,

   paymentResult:
  paymentWasCancelled
    ? "CANCELLED"
    : "FAILED",

message:
  providerPaymentMessage,
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
        CASE
          WHEN $2::varchar =
            'BALANCE'
          THEN
            'PARTIALLY_PAID'

          ELSE
            'UNPAID'
        END,

      updated_at =
        CURRENT_TIMESTAMP

    WHERE id =
      $1::uuid
  `,
  [
    payment.booking_id,
    payment.payment_stage,
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
        CASE
          WHEN $2::varchar =
            'BALANCE'
          THEN
            'PARTIALLY_PAID'

          ELSE
            'UNPAID'
        END,

      updated_at =
        CURRENT_TIMESTAMP

    WHERE id =
      $1::uuid
  `,
  [
    payment.booking_id,
    payment.payment_stage,
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
        CASE
          WHEN $2::varchar =
            'DEPOSIT'
          THEN
            'PARTIALLY_PAID'

          WHEN $2::varchar =
            'BALANCE'
          THEN
            'PAID'

          ELSE
            'PAID'
        END,

      updated_at =
        CURRENT_TIMESTAMP

    WHERE id =
      $1::uuid
  `,
  [
    payment.booking_id,
    payment.payment_stage,
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
  payment.payment_stage ===
    "DEPOSIT"
    ? "PARTIALLY_PAID"
    : "PAID",

        paymentReference:
          payment.payment_reference,

        transactionId:
          mpesaReceiptNumber,

        amount:
          paidAmount,
          paymentStage:
  payment.payment_stage,

platformFeeAmount:
  Number(
    payment.platform_fee_amount ||
    0
  ),

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
          paidAmount,

          paymentStage:
  payment.payment_stage,

platformFeeAmount:
  Number(
    payment.platform_fee_amount ||
    0
  ),

providerShareAmount:
  Number(
    payment.provider_share_amount ||
    0
  ),
      }
    );
  }

  return {
    handled: true,
  };
}

module.exports = {
  createProviderPaymentAttempt,
  createProviderPayout,
  handleProviderB2CResult,
  handleProviderB2CTimeout,
  handleProviderMpesaCallback,
  // keep any other existing exports here
};