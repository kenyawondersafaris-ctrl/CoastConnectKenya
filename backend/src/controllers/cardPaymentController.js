"use strict";

const pool =
  require("../config/db");

const {
  initializePaystackTransaction,
  verifyPaystackTransaction,
  verifyPaystackWebhookSignature,
  normalizePaystackTransaction,
} = require(
  "../services/paystackService"
);

const {
  convertSuccessfulCheckoutToOrder,
  emitSuccessfulRestaurantOrderEvents,
} = require(
  "../services/restaurantPaymentService"
);


/*
|--------------------------------------------------------------------------
| Payment reference
|--------------------------------------------------------------------------
*/

function createCardPaymentReference() {
  return `CCKCARD-${Date.now()}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;
}


/*
|--------------------------------------------------------------------------
| Load checkout/payment context
|--------------------------------------------------------------------------
*/

async function loadCardPaymentContext(
  client,
  reference
) {
  const result =
    await client.query(
      `
        SELECT
          rp.id AS payment_id,
          rp.checkout_session_id,
          rp.order_id,
          rp.restaurant_id,
          rp.customer_id,
          rp.payment_reference,
          rp.transaction_id,
          rp.payment_method,
          rp.payment_provider,
          rp.amount AS payment_amount,
          rp.currency,
          rp.status AS payment_status,

          cs.id AS session_id,
          cs.session_token,

          cs.restaurant_id
            AS session_restaurant_id,

          cs.customer_id
            AS session_customer_id,

          cs.customer_name,
          cs.customer_phone,
          cs.order_type,
          cs.delivery_address,
          cs.customer_notes,
          cs.table_number,
          cs.guest_count,
          cs.subtotal,
          cs.delivery_fee,
          cs.delivery_zone_id,
          cs.estimated_delivery_minutes,
          cs.discount_amount,
          cs.total_amount,
          cs.promotion_id,
          cs.promo_code,
          cs.estimated_preparation_minutes,
          cs.payment_method,

          cs.status
            AS session_status,

          cs.converted_order_id,
          cs.expires_at

        FROM restaurant_payments rp

        INNER JOIN checkout_sessions cs
          ON cs.id =
            rp.checkout_session_id

        WHERE rp.payment_reference =
          $1::varchar

        LIMIT 1

        FOR UPDATE OF rp, cs
      `,
      [
        reference,
      ]
    );

  return result.rows[0] || null;
}


/*
|--------------------------------------------------------------------------
| Create card payment attempt
|--------------------------------------------------------------------------
*/

async function createCardPaymentAttempt(
  req,
  res
) {
  const client =
    await pool.connect();

  try {
    const sessionToken =
      String(
        req.body.sessionToken || ""
      ).trim();

    const email =
      String(
        req.body.email || ""
      )
        .trim()
        .toLowerCase();

    if (!sessionToken) {
      return res.status(400).json({
        success: false,
        message:
          "Checkout session token is required.",
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message:
          "Email is required for card payment.",
      });
    }

    await client.query("BEGIN");

    const sessionResult =
      await client.query(
        `
          SELECT
            id,
            session_token,
            restaurant_id,
            customer_id,
            customer_name,
            customer_phone,
            subtotal,
            discount_amount,
            total_amount,
            promotion_id,
            promo_code,
            status,
            expires_at

          FROM checkout_sessions

          WHERE session_token =
            $1::uuid

          LIMIT 1

          FOR UPDATE
        `,
        [
          sessionToken,
        ]
      );

    if (
      sessionResult.rows.length === 0
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(404).json({
        success: false,
        message:
          "Checkout session was not found.",
      });
    }

    const checkoutSession =
      sessionResult.rows[0];


    /*
    |--------------------------------------------------------------------------
    | Expired checkout
    |--------------------------------------------------------------------------
    */

    if (
      new Date(
        checkoutSession.expires_at
      ).getTime() <= Date.now()
    ) {
      await client.query(
        `
          UPDATE checkout_sessions

          SET
            status = 'EXPIRED',

            updated_at =
              CURRENT_TIMESTAMP

          WHERE id =
            $1::uuid
        `,
        [
          checkoutSession.id,
        ]
      );

      if (
        checkoutSession.promotion_id
      ) {
        await client.query(
          `
            DELETE FROM
              promotion_reservations

            WHERE checkout_session_id =
              $1::uuid
          `,
          [
            checkoutSession.id,
          ]
        );
      }

      await client.query(
        "COMMIT"
      );

      return res.status(410).json({
        success: false,
        message:
          "This checkout session has expired.",
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Checkout status
    |--------------------------------------------------------------------------
    */

    if (
      ![
        "PENDING",
        "FAILED",
      ].includes(
        checkoutSession.status
      )
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(409).json({
        success: false,
        message:
          `Checkout session cannot start payment while it is ${checkoutSession.status}.`,
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Existing active payment
    |--------------------------------------------------------------------------
    */

    const activePaymentResult =
      await client.query(
        `
          SELECT
            id,
            payment_method,
            payment_provider,
            status

          FROM restaurant_payments

          WHERE checkout_session_id =
            $1::uuid

            AND status IN (
              'PENDING',
              'PROCESSING',
              'PAID'
            )

          LIMIT 1

          FOR UPDATE
        `,
        [
          checkoutSession.id,
        ]
      );

    if (
      activePaymentResult.rows.length >
      0
    ) {
      const activePayment =
        activePaymentResult.rows[0];

      if (
        activePayment.status ===
        "PAID"
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(409).json({
          success: false,
          message:
            "This checkout has already been paid.",
        });
      }

      await client.query(
        `
          UPDATE restaurant_payments

          SET
            status =
              'FAILED',

            provider_response =
              COALESCE(
                provider_response,
                '{}'::jsonb
              )
              ||
              jsonb_build_object(
                'reason',
                'Replaced by card payment attempt'
              ),

            updated_at =
              CURRENT_TIMESTAMP

          WHERE id =
            $1::uuid
        `,
        [
          activePayment.id,
        ]
      );
    }


    /*
    |--------------------------------------------------------------------------
    | Promotion reservation
    |--------------------------------------------------------------------------
    |
    | The checkout session already contains the validated promotion.
    | We keep the same reservation model used by M-Pesa.
    |
    */

    if (
      checkoutSession.promotion_id
    ) {
      await client.query(
        `
          DELETE FROM
            promotion_reservations

          WHERE expires_at <=
            CURRENT_TIMESTAMP
        `
      );

      await client.query(
        `
          INSERT INTO
            promotion_reservations (
              promotion_id,
              checkout_session_id,
              customer_id,
              customer_phone,
              expires_at
            )

          VALUES (
            $1::uuid,
            $2::uuid,
            $3::uuid,
            $4::varchar,
            CURRENT_TIMESTAMP +
              INTERVAL '15 minutes'
          )

          ON CONFLICT (
            checkout_session_id
          )

          DO UPDATE SET
            promotion_id =
              EXCLUDED.promotion_id,

            customer_id =
              EXCLUDED.customer_id,

            customer_phone =
              EXCLUDED.customer_phone,

            expires_at =
              EXCLUDED.expires_at
        `,
        [
          checkoutSession.promotion_id,
          checkoutSession.id,
          checkoutSession.customer_id,
          checkoutSession.customer_phone,
        ]
      );
    }


    /*
    |--------------------------------------------------------------------------
    | Create Coast Connect payment record
    |--------------------------------------------------------------------------
    */

    const paymentReference =
      createCardPaymentReference();

    const paymentResult =
      await client.query(
        `
          INSERT INTO restaurant_payments (
            checkout_session_id,
            order_id,
            restaurant_id,
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
            NULL,
            $2::uuid,
            $3::uuid,
            $4::varchar,
            'CARD',
            'PAYSTACK',
            $5::varchar,
            $6::numeric,
            'KES',
            'PENDING'
          )

          RETURNING
            id,
            checkout_session_id,
            payment_reference,
            payment_method,
            payment_provider,
            amount,
            currency,
            status,
            created_at
        `,
        [
          checkoutSession.id,
          checkoutSession.restaurant_id,
          checkoutSession.customer_id,
          paymentReference,
          checkoutSession.customer_phone,
          checkoutSession.total_amount,
        ]
      );

    const payment =
      paymentResult.rows[0];

    await client.query(
      "COMMIT"
    );


    /*
    |--------------------------------------------------------------------------
    | Initialize Paystack transaction
    |--------------------------------------------------------------------------
    */

    try {
      const callbackUrl =
        String(
          process.env
            .PAYSTACK_CALLBACK_URL ||
          ""
        ).trim();

      const paystackResult =
        await initializePaystackTransaction({
          email,

          amount:
            Number(
              payment.amount
            ),

          reference:
            payment.payment_reference,

          callbackUrl:
            callbackUrl || null,

          metadata: {
            checkoutSessionId:
              payment.checkout_session_id,

            restaurantId:
              checkoutSession.restaurant_id,

            customerId:
              checkoutSession.customer_id,

            paymentMethod:
              "CARD",

            source:
              "COAST_CONNECT_RESTAURANT",
          },
        });

      await client.query(
        "BEGIN"
      );

      const updatedPaymentResult =
        await client.query(
          `
            UPDATE restaurant_payments

            SET
              status =
                'PROCESSING',

              provider_response =
                $1::jsonb,

              updated_at =
                CURRENT_TIMESTAMP

            WHERE id =
              $2::uuid

            RETURNING
              id,
              checkout_session_id,
              payment_reference,
              payment_method,
              payment_provider,
              amount,
              currency,
              status,
              created_at,
              updated_at
          `,
          [
            JSON.stringify(
              paystackResult.raw
            ),

            payment.id,
          ]
        );

      await client.query(
        `
          UPDATE checkout_sessions

          SET
            payment_method =
              'CARD',

            status =
              'PAYMENT_PROCESSING',

            updated_at =
              CURRENT_TIMESTAMP

          WHERE id =
            $1::uuid
        `,
        [
          payment.checkout_session_id,
        ]
      );

      await client.query(
        "COMMIT"
      );

      const updatedPayment =
        updatedPaymentResult
          .rows[0];

      return res.status(201).json({
        success: true,

        message:
          "Card payment initialized successfully.",

        payment: {
          id:
            updatedPayment.id,

          checkoutSessionId:
            updatedPayment
              .checkout_session_id,

          paymentReference:
            updatedPayment
              .payment_reference,

          paymentMethod:
            updatedPayment
              .payment_method,

          paymentProvider:
            updatedPayment
              .payment_provider,

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
        },

        checkout: {
          authorizationUrl:
            paystackResult
              .authorizationUrl,

          accessCode:
            paystackResult
              .accessCode,

          reference:
            paystackResult
              .reference,
        },
      });
    } catch (
      initializationError
    ) {
      console.error(
        "Paystack initialization error:",
        initializationError
          .response?.data ||
        initializationError.message
      );

      try {
        await client.query(
          "BEGIN"
        );

        await client.query(
          `
            UPDATE restaurant_payments

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
              initializationError
                .response?.data ||
              {
                message:
                  initializationError
                    .message,
              }
            ),

            payment.id,
          ]
        );

        await client.query(
          `
            UPDATE checkout_sessions

            SET
              status =
                'FAILED',

              updated_at =
                CURRENT_TIMESTAMP

            WHERE id =
              $1::uuid
          `,
          [
            checkoutSession.id,
          ]
        );

        if (
          checkoutSession.promotion_id
        ) {
          await client.query(
            `
              DELETE FROM
                promotion_reservations

              WHERE checkout_session_id =
                $1::uuid
            `,
            [
              checkoutSession.id,
            ]
          );
        }

        await client.query(
          "COMMIT"
        );
      } catch (
        databaseError
      ) {
        try {
          await client.query(
            "ROLLBACK"
          );
        } catch (
          rollbackError
        ) {
          console.error(
            "Card initialization rollback error:",
            rollbackError
          );
        }

        console.error(
          "Save Paystack initialization failure error:",
          databaseError
        );
      }

      return res.status(502).json({
        success: false,

        message:
          initializationError
            .response?.data
            ?.message ||
          initializationError
            .message ||
          "Unable to initialize card payment.",
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
      console.error(
        "Create card payment rollback error:",
        rollbackError
      );
    }

    console.error(
      "Create card payment attempt error:",
      error
    );

    if (
      error.code === "23505"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "An active payment already exists for this checkout session.",
      });
    }

    if (
      error.code === "22P02"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "The checkout session token is invalid.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to create card payment attempt.",
    });
  } finally {
    client.release();
  }
}


/*
|--------------------------------------------------------------------------
| Process successful Paystack transaction
|--------------------------------------------------------------------------
*/

async function loadExistingCardOrder(
  client,
  orderId
) {
  const result =
    await client.query(
      `
        SELECT
          id,
          restaurant_id,
          customer_id,
          order_number,
          customer_name,
          customer_phone,
          order_type,
          delivery_address,
          customer_notes,
          subtotal,
          delivery_fee,
          delivery_zone_id,
          estimated_delivery_minutes,
          discount_amount,
          total_amount,
          promotion_id,
          promo_code,
          status,
          payment_status,
          payment_method,
          placed_at,
          accepted_at,
          completed_at,
          cancelled_at,
          created_at,
          updated_at,
          tracking_token,
          estimated_preparation_minutes

        FROM restaurant_orders

        WHERE id =
          $1::uuid

        LIMIT 1
      `,
      [
        orderId,
      ]
    );

  if (
    result.rows.length === 0
  ) {
    return null;
  }

  const order =
    result.rows[0];

  return {
    id:
      order.id,

    restaurantId:
      order.restaurant_id,

    customerId:
      order.customer_id,

    orderNumber:
      order.order_number,

    customerName:
      order.customer_name,

    customerPhone:
      order.customer_phone,

    orderType:
      order.order_type,

    deliveryAddress:
      order.delivery_address,

    customerNotes:
      order.customer_notes,

    subtotal:
      Number(
        order.subtotal || 0
      ),

    deliveryFee:
      Number(
        order.delivery_fee || 0
      ),

    deliveryZoneId:
      order.delivery_zone_id,

    estimatedDeliveryMinutes:
      Number(
        order.estimated_delivery_minutes ||
        order.estimated_preparation_minutes ||
        20
      ),

    discountAmount:
      Number(
        order.discount_amount || 0
      ),

    totalAmount:
      Number(
        order.total_amount || 0
      ),

    promotionId:
      order.promotion_id,

    promoCode:
      order.promo_code,

    status:
      order.status,

    paymentStatus:
      order.payment_status,

    paymentMethod:
      order.payment_method,

    placedAt:
      order.placed_at,

    acceptedAt:
      order.accepted_at,

    completedAt:
      order.completed_at,

    cancelledAt:
      order.cancelled_at,

    createdAt:
      order.created_at,

    updatedAt:
      order.updated_at,

    trackingToken:
      order.tracking_token,

    estimatedPreparationMinutes:
      Number(
        order.estimated_preparation_minutes ||
        20
      ),
  };
}

async function processSuccessfulCardTransaction({
  reference,
  transaction,
  callbackPayload = null,
  req,
}) {
  const client =
    await pool.connect();

  let conversionResult =
    null;

  try {
    await client.query(
      "BEGIN"
    );

    const payment =
      await loadCardPaymentContext(
        client,
        reference
      );

    if (!payment) {
      await client.query(
        "ROLLBACK"
      );

      return {
        processed: false,
        reason:
          "PAYMENT_NOT_FOUND",
      };
    }


    /*
    |--------------------------------------------------------------------------
    | Idempotency
    |--------------------------------------------------------------------------
    */

    if (
        payment.payment_status ===
            "PAID" &&
        payment.order_id
        ) {
        const existingOrder =
            await loadExistingCardOrder(
            client,
            payment.order_id
            );

        await client.query(
            "COMMIT"
        );

        return {
            processed: true,
            duplicate: true,

            orderId:
            payment.order_id,

            order:
            existingOrder,
        };
        }


    /*
    |--------------------------------------------------------------------------
    | Verify provider transaction
    |--------------------------------------------------------------------------
    */

    const normalizedTransaction =
      normalizePaystackTransaction(
        transaction
      );

    if (!normalizedTransaction) {
      throw new Error(
        "Paystack transaction payload is invalid."
      );
    }

    if (
      normalizedTransaction.status !==
      "success"
    ) {
      throw new Error(
        "Paystack transaction is not successful."
      );
    }

    if (
      normalizedTransaction.currency !==
      "KES"
    ) {
      throw new Error(
        "Paystack transaction currency does not match checkout currency."
      );
    }

    const expectedAmount =
      Number(
        payment.payment_amount ||
        0
      );

    if (
      normalizedTransaction.amount !==
      expectedAmount
    ) {
      throw new Error(
        "Paystack transaction amount does not match checkout amount."
      );
    }

    if (
      normalizedTransaction.reference !==
      payment.payment_reference
    ) {
      throw new Error(
        "Paystack payment reference does not match."
      );
    }


    /*
    |--------------------------------------------------------------------------
    | Already converted checkout
    |--------------------------------------------------------------------------
    */

    if (
      payment.converted_order_id
    ) {
      await client.query(
        `
          UPDATE restaurant_payments

          SET
            order_id =
              $1::uuid,

            transaction_id =
              COALESCE(
                transaction_id,
                $2::varchar
              ),

            status =
              'PAID',

            callback_payload =
              COALESCE(
                $3::jsonb,
                callback_payload
              ),

            provider_response =
              $4::jsonb,

            paid_at =
              COALESCE(
                paid_at,
                CURRENT_TIMESTAMP
              ),

            updated_at =
              CURRENT_TIMESTAMP

          WHERE id =
            $5::uuid
        `,
        [
          payment
            .converted_order_id,

          normalizedTransaction.id,

          callbackPayload
            ? JSON.stringify(
                callbackPayload
              )
            : null,

          JSON.stringify(
            transaction
          ),

          payment.payment_id,
        ]
      );

      const existingOrder =
  await loadExistingCardOrder(
    client,
    payment.converted_order_id
  );

if (!existingOrder) {
  throw new Error(
    "The paid order could not be loaded."
  );
}

await client.query(
  "COMMIT"
);

return {
  processed: true,
  duplicate: true,

  orderId:
    payment.converted_order_id,

  order:
    existingOrder,
};
    }


    /*
    |--------------------------------------------------------------------------
    | Convert checkout to order
    |--------------------------------------------------------------------------
    */

    conversionResult =
      await convertSuccessfulCheckoutToOrder({
        client,

        payment,

        paymentMethod:
          "CARD",
      });


    /*
    |--------------------------------------------------------------------------
    | Mark payment PAID
    |--------------------------------------------------------------------------
    */

    await client.query(
      `
        UPDATE restaurant_payments

        SET
          order_id =
            $1::uuid,

          transaction_id =
            $2::varchar,

          status =
            'PAID',

          callback_payload =
            $3::jsonb,

          provider_response =
            $4::jsonb,

          paid_at =
            CURRENT_TIMESTAMP,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id =
          $5::uuid
      `,
      [
        conversionResult
          .order.id,

        normalizedTransaction.id,

        callbackPayload
          ? JSON.stringify(
              callbackPayload
            )
          : null,

        JSON.stringify(
          transaction
        ),

        payment.payment_id,
      ]
    );

    await client.query(
      "COMMIT"
    );


    /*
    |--------------------------------------------------------------------------
    | Emit events after commit
    |--------------------------------------------------------------------------
    */

    emitSuccessfulRestaurantOrderEvents({
      io:
        req.app.get("io"),

      order:
        conversionResult.order,

      sessionToken:
        conversionResult
          .sessionToken,

      restaurantId:
        conversionResult
          .restaurantId,

      customerId:
        conversionResult
          .customerId,
    });

    return {
      processed: true,
      duplicate: false,
      order:
        conversionResult.order,
    };
  } catch (error) {
    try {
      await client.query(
        "ROLLBACK"
      );
    } catch (
      rollbackError
    ) {
      console.error(
        "Card success processing rollback error:",
        rollbackError
      );
    }

    throw error;
  } finally {
    client.release();
  }
}


/*
|--------------------------------------------------------------------------
| Paystack webhook
|--------------------------------------------------------------------------
*/

async function handleCardPaymentWebhook(
  req,
  res
) {
  try {
    const signature =
      req.headers[
        "x-paystack-signature"
      ];

    const signatureValid =
      verifyPaystackWebhookSignature(
        req.body,
        signature
      );

    if (!signatureValid) {
      console.warn(
        "Rejected Paystack webhook with invalid signature."
      );

      return res
        .status(401)
        .json({
          success: false,
          message:
            "Invalid webhook signature.",
        });
    }

    const event =
      req.body;

    const eventName =
      String(
        event?.event || ""
      )
        .trim()
        .toLowerCase();

    /*
    |--------------------------------------------------------------------------
    | Ignore events we do not currently consume
    |--------------------------------------------------------------------------
    */

    if (
      eventName !==
      "charge.success"
    ) {
      return res.status(200).json({
        success: true,
        message:
          "Webhook acknowledged.",
      });
    }

    const transaction =
      event?.data;

    const reference =
      String(
        transaction?.reference ||
        ""
      ).trim();

    if (!reference) {
      return res.status(200).json({
        success: true,
        message:
          "Webhook acknowledged.",
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Provider verification
    |--------------------------------------------------------------------------
    |
    | Do not trust webhook body alone.
    |
    */

    const verificationResult =
      await verifyPaystackTransaction(
        reference
      );

    const verifiedTransaction =
      verificationResult
        .transaction;

    const result =
      await processSuccessfulCardTransaction({
        reference,

        transaction:
          verifiedTransaction,

        callbackPayload:
          event,

        req,
      });

    return res.status(200).json({
      success: true,
      message:
        "Webhook processed.",
    });
  } catch (error) {
    console.error(
      "Paystack webhook processing error:",
      error.response?.data ||
      error.message
    );

    /*
    |--------------------------------------------------------------------------
    | Return 500 so Paystack can retry delivery
    |--------------------------------------------------------------------------
    */

    return res.status(500).json({
      success: false,
      message:
        "Webhook processing failed.",
    });
  }
}


/*
|--------------------------------------------------------------------------
| Verify card payment
|--------------------------------------------------------------------------
|
| Browser-side verification is secondary.
| The provider webhook remains the preferred confirmation mechanism.
|
*/

async function verifyCardPayment(
  req,
  res
) {
  try {
    const reference =
      String(
        req.params.reference || ""
      ).trim();

    if (!reference) {
      return res.status(400).json({
        success: false,
        message:
          "Payment reference is required.",
      });
    }

    const verificationResult =
      await verifyPaystackTransaction(
        reference
      );

    const transaction =
      normalizePaystackTransaction(
        verificationResult.transaction
      );

    if (!transaction) {
      return res.status(502).json({
        success: false,
        message:
          "Paystack returned an invalid transaction.",
      });
    }

    if (
      transaction.status ===
      "success"
    ) {
      const result =
        await processSuccessfulCardTransaction({
          reference,

          transaction:
            verificationResult
              .transaction,

          callbackPayload:
            null,

          req,
        });

      return res.status(200).json({
        success: true,

        paymentStatus:
          "PAID",

        duplicate:
          Boolean(
            result.duplicate
          ),

        order:
          result.order ||
          null,

        orderId:
          result.orderId ||
          result.order?.id ||
          null,
      });
    }

    return res.status(200).json({
      success: true,

      paymentStatus:
        String(
          transaction.status ||
          "pending"
        ).toUpperCase(),

      message:
        "Payment has not been confirmed as successful.",
    });
  } catch (error) {
    console.error(
      "Verify card payment error:",
      error.response?.data ||
      error.message
    );

    return res.status(502).json({
      success: false,

      message:
        error.response?.data
          ?.message ||
        error.message ||
        "Unable to verify card payment.",
    });
  }
}


module.exports = {
  createCardPaymentAttempt,
  handleCardPaymentWebhook,
  verifyCardPayment,
};