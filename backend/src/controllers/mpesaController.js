"use strict";

const pool = require("../config/db");

const {
  getMpesaAccessToken,
  initiateMpesaStkPush,
  formatMpesaPhoneNumber,
} = require("../services/mpesaService");

const {
  handleProviderMpesaCallback,
} = require("./providerPaymentController");

async function testMpesaConnection(
  req,
  res
) {
  try {
    const accessToken =
      await getMpesaAccessToken();

    return res.status(200).json({
      success: true,
      message:
        "M-Pesa OAuth connection is working.",
      tokenReceived:
        Boolean(accessToken),
    });
  } catch (error) {
    console.error(
      "M-Pesa OAuth test error:",
      error.response?.data ||
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        error.response?.data?.errorMessage ||
        error.response?.data?.error_description ||
        error.message ||
        "Unable to connect to M-Pesa.",
    });
  }
}

function getCallbackMetadataValue(
  metadataItems,
  name
) {
  if (!Array.isArray(metadataItems)) {
    return null;
  }

  const matchingItem =
    metadataItems.find(
      (item) =>
        String(item?.Name || "") === name
    );

  return matchingItem?.Value ?? null;
}

function createRestaurantOrderNumber() {
  return `CCK-${Date.now()}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;
}

function mapPaidOrder(
  orderRow,
  orderItems
) {
  return {
    id:
      orderRow.id,

    restaurantId:
      orderRow.restaurant_id,

    customerId:
      orderRow.customer_id,

    orderNumber:
      orderRow.order_number,

    customerName:
      orderRow.customer_name,

    customerPhone:
      orderRow.customer_phone,

    orderType:
      orderRow.order_type,

    deliveryAddress:
      orderRow.delivery_address,

    customerNotes:
      orderRow.customer_notes,

    subtotal:
      Number(orderRow.subtotal || 0),

    deliveryFee:
      Number(
        orderRow.delivery_fee || 0
      ),

      deliveryZoneId:
  orderRow.delivery_zone_id,

estimatedDeliveryMinutes:
  Number(
    orderRow.estimated_delivery_minutes ||
    orderRow.estimated_preparation_minutes ||
    20
  ),

      discountAmount:
  Number(
    orderRow.discount_amount || 0
  ),

promotionId:
  orderRow.promotion_id,

promoCode:
  orderRow.promo_code,

    totalAmount:
      Number(
        orderRow.total_amount || 0
      ),

    status:
      orderRow.status,

    paymentStatus:
      orderRow.payment_status,

    paymentMethod:
      orderRow.payment_method,

    placedAt:
      orderRow.placed_at,

    acceptedAt:
      orderRow.accepted_at,

    completedAt:
      orderRow.completed_at,

    cancelledAt:
      orderRow.cancelled_at,

    createdAt:
      orderRow.created_at,

    updatedAt:
      orderRow.updated_at,

    trackingToken:
      orderRow.tracking_token,

    estimatedPreparationMinutes:
      Number(
        orderRow
          .estimated_preparation_minutes ||
        20
      ),

    items:
      orderItems.map(
        (item) => ({
          id:
            item.id,

          orderId:
            item.order_id,

          menuItemId:
            item.menu_item_id,

          itemName:
            item.item_name,

          unitPrice:
            Number(
              item.unit_price || 0
            ),

          quantity:
            Number(
              item.quantity || 0
            ),

          lineTotal:
            Number(
              item.line_total || 0
            ),

          itemNotes:
            item.item_notes,

          createdAt:
            item.created_at,
        })
      ),
  };
}

async function handleMpesaCallback(
  req,
  res
) {
  const client =
    await pool.connect();

  let committedOrder = null;
  let committedSessionToken = null;
  let committedRestaurantId = null;
  let committedCustomerId = null;

  try {
    const callbackPayload =
      req.body;

    const stkCallback =
      callbackPayload?.Body
        ?.stkCallback;

    if (!stkCallback) {
      console.error(
        "Invalid M-Pesa callback payload:",
        JSON.stringify(
          callbackPayload,
          null,
          2
        )
      );

      return res.status(200).json({
        ResultCode: 0,
        ResultDesc:
          "Callback acknowledged",
      });
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
      console.error(
        "M-Pesa callback has no CheckoutRequestID:",
        JSON.stringify(
          callbackPayload,
          null,
          2
        )
      );

      return res.status(200).json({
        ResultCode: 0,
        ResultDesc:
          "Callback acknowledged",
      });
    }

    const metadataItems =
      stkCallback
        ?.CallbackMetadata
        ?.Item;

    const paidAmount =
      Number(
        getCallbackMetadataValue(
          metadataItems,
          "Amount"
        ) || 0
      );

    const mpesaReceiptNumber =
      String(
        getCallbackMetadataValue(
          metadataItems,
          "MpesaReceiptNumber"
        ) || ""
      ).trim();

    const callbackPhoneNumber =
      String(
        getCallbackMetadataValue(
          metadataItems,
          "PhoneNumber"
        ) || ""
      ).trim();

    const transactionDate =
      getCallbackMetadataValue(
        metadataItems,
        "TransactionDate"
      );

    /*
    |--------------------------------------------------------------------------
    | Begin callback transaction
    |--------------------------------------------------------------------------
    */

    await client.query(
      "BEGIN"
    );

    /*
    |--------------------------------------------------------------------------
    | Provider payment dispatcher
    |--------------------------------------------------------------------------
    |
    | Check provider_payments first.
    |
    | providerIo has a different variable name so it
    | does not conflict with the restaurant Socket.IO
    | variable used later in this function.
    |
    */

    const providerIo =
      req.app.get("io");

    const providerHandled =
      await handleProviderMpesaCallback(
        callbackPayload,
        client,
        providerIo
      );

    if (
      providerHandled.handled
    ) {

      
      await client.query(
        "COMMIT"
      );

      return res
        .status(200)
        .json({
          ResultCode: 0,
          ResultDesc:
            "Provider payment callback processed",
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Restaurant payment flow
    |--------------------------------------------------------------------------
    |
    | If the callback was not for provider_payments,
    | continue with the existing restaurant payment
    | processing.
    |
    */

    const paymentResult =
      await client.query(
        `
          SELECT
            rp.id AS payment_id,
            rp.checkout_session_id,
            rp.order_id,
            rp.restaurant_id,
            rp.customer_id,
            rp.payment_reference,
            rp.checkout_request_id,
            rp.merchant_request_id,
            rp.transaction_id,
            rp.phone_number,
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

          WHERE rp.checkout_request_id =
            $1::varchar

          LIMIT 1

          FOR UPDATE OF rp, cs
        `,
        [
          checkoutRequestId,
        ]
      );

    if (
      paymentResult.rows.length ===
      0
    ) {
      await client.query(
        "ROLLBACK"
      );

      console.error(
        "No payment found for M-Pesa callback:",
        checkoutRequestId
      );

      return res.status(200).json({
        ResultCode: 0,
        ResultDesc:
          "Callback acknowledged",
      });
    }

    const payment =
      paymentResult.rows[0];

    committedSessionToken =
      payment.session_token;

    committedRestaurantId =
      payment.session_restaurant_id;

    committedCustomerId =
      payment.session_customer_id;

    /*
    |--------------------------------------------------------------------------
    | Restaurant payment idempotency
    |--------------------------------------------------------------------------
    */

    if (
      payment.payment_status ===
        "PAID" &&
      payment.order_id
    ) {
      await client.query(
        "COMMIT"
      );

      return res.status(200).json({
        ResultCode: 0,
        ResultDesc:
          "Callback already processed",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Failed / cancelled M-Pesa payment
    |--------------------------------------------------------------------------
    */

    if (resultCode !== 0) {
      await client.query(
        `
          UPDATE restaurant_payments

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
          payment.payment_id,
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

            AND status <>
              'CONVERTED'
        `,
        [
          payment.session_id,
        ]
      );

      if (
  payment.promotion_id
) {
  await client.query(
    `
      DELETE FROM
        promotion_reservations

      WHERE checkout_session_id =
        $1::uuid
    `,
    [
      payment.session_id,
    ]
  );
}

      await client.query(
        "COMMIT"
      );

      const io =
        req.app.get("io");

      if (io) {
        io.to(
          `checkout:${payment.session_token}`
        ).emit(
          "checkout-payment-failed",
          {
            success: false,

            sessionToken:
              payment.session_token,

            paymentReference:
              payment.payment_reference,

            resultCode,

            message:
              resultDescription ||
              "M-Pesa payment was not completed.",
          }
        );
      }

      return res.status(200).json({
        ResultCode: 0,
        ResultDesc:
          "Failed payment callback processed",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Successful callback receipt validation
    |--------------------------------------------------------------------------
    */

    if (!mpesaReceiptNumber) {
      await client.query(
        `
          UPDATE restaurant_payments

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

          payment.payment_id,
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

            AND status <>
              'CONVERTED'
        `,
        [
          payment.session_id,
        ]
      );

      if (
  payment.promotion_id
) {
  await client.query(
    `
      DELETE FROM
        promotion_reservations

      WHERE checkout_session_id =
        $1::uuid
    `,
    [
      payment.session_id,
    ]
  );
}

      await client.query(
        "COMMIT"
      );

      console.error(
        "Successful M-Pesa callback has no receipt:",
        checkoutRequestId
      );

      return res.status(200).json({
        ResultCode: 0,
        ResultDesc:
          "Callback validation completed",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Verify paid amount
    |--------------------------------------------------------------------------
    */

    const expectedAmount =
      Number(
        payment.payment_amount ||
        0
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
          UPDATE restaurant_payments

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
          payment.payment_id,
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

            AND status <>
              'CONVERTED'
        `,
        [
          payment.session_id,
        ]
      );

      if (
  payment.promotion_id
) {
  await client.query(
    `
      DELETE FROM
        promotion_reservations

      WHERE checkout_session_id =
        $1::uuid
    `,
    [
      payment.session_id,
    ]
  );
}

      await client.query(
        "COMMIT"
      );

      console.error(
        "M-Pesa amount mismatch:",
        {
          checkoutRequestId,
          expectedAmount,
          paidAmount,
        }
      );

      return res.status(200).json({
        ResultCode: 0,
        ResultDesc:
          "Callback validation completed",
      });
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

            merchant_request_id =
              COALESCE(
                NULLIF(
                  $3::varchar,
                  ''
                ),
                merchant_request_id
              ),

            phone_number =
              COALESCE(
                NULLIF(
                  $4::varchar,
                  ''
                ),
                phone_number
              ),

            amount =
              $5::numeric,

            status =
              'PAID',

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
          payment
            .converted_order_id,

          mpesaReceiptNumber,

          merchantRequestId,

          callbackPhoneNumber,

          paidAmount,

          JSON.stringify(
            callbackPayload
          ),

          payment.payment_id,
        ]
      );

      if (
  payment.promotion_id
) {
  await client.query(
    `
      DELETE FROM
        promotion_reservations

      WHERE checkout_session_id =
        $1::uuid
    `,
    [
      payment.session_id,
    ]
  );
}

      await client.query(
        "COMMIT"
      );

      return res.status(200).json({
        ResultCode: 0,
        ResultDesc:
          "Callback already converted",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Create restaurant order
    |--------------------------------------------------------------------------
    */

    const orderNumber =
      createRestaurantOrderNumber();

    const orderResult =
      await client.query(
        `
          INSERT INTO restaurant_orders (
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
            table_number,
            guest_count,
            estimated_preparation_minutes
          )
          VALUES (
            $1::uuid,
            $2::uuid,
            $3::varchar,
            $4::varchar,
            $5::varchar,
            $6::varchar,
            $7::text,
            $8::text,
            $9::numeric,
            $10::numeric,
            $11::uuid,
            $12::integer,
            $13::numeric,
            $14::numeric,
            $15::uuid,
            $16::varchar,
            'PENDING',
            'PAID',
            'MPESA',
            $17::varchar,
            $18::integer,
            $19::integer
          )

          RETURNING
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
            table_number,
            guest_count,
            served_at,
            tracking_token,
            estimated_preparation_minutes
        `,
        [
          payment
            .session_restaurant_id,

          payment
            .session_customer_id,

          orderNumber,

          payment.customer_name,

          payment.customer_phone,

          payment.order_type,

          payment.delivery_address,

          payment.customer_notes,

          payment.subtotal,

          payment.delivery_fee,

          payment.delivery_zone_id,

          payment
            .estimated_delivery_minutes,

          payment.discount_amount ||
            0,

          payment.total_amount,

          payment.promotion_id,

          payment.promo_code,

          payment.table_number,

          payment.guest_count,

          payment
            .estimated_preparation_minutes,
        ]
      );

    const createdOrder =
      orderResult.rows[0];

 /*
|--------------------------------------------------------------------------
| Record promotion usage
|--------------------------------------------------------------------------
*/

if (
  payment.promotion_id
) {
  let normalizedPromotionPhone =
    null;

  try {
    normalizedPromotionPhone =
      formatMpesaPhoneNumber(
        payment.customer_phone
      );
  } catch (phoneError) {
    throw new Error(
      "Unable to normalize customer phone while recording promotion usage."
    );
  }

  await client.query(
    `
      INSERT INTO promotion_usages (
        promotion_id,
        order_id,
        customer_id,
        customer_phone,
        discount_amount
      )

      VALUES (
        $1::uuid,
        $2::uuid,
        $3::uuid,
        $4::varchar,
        $5::numeric
      )
    `,
    [
      payment.promotion_id,

      createdOrder.id,

      payment.session_customer_id,

      normalizedPromotionPhone,

      Number(
        payment.discount_amount ||
        0
      ),
    ]
  );

  await client.query(
    `
      DELETE FROM
        promotion_reservations

      WHERE checkout_session_id =
        $1::uuid
    `,
    [
      payment.session_id,
    ]
  );
}

    /*
    |--------------------------------------------------------------------------
    | Copy checkout items into order
    |--------------------------------------------------------------------------
    */

    const orderItemsResult =
      await client.query(
        `
          INSERT INTO restaurant_order_items (
            order_id,
            menu_item_id,
            item_name,
            unit_price,
            quantity,
            line_total,
            item_notes
          )

          SELECT
            $1::uuid,
            menu_item_id,
            item_name,
            unit_price,
            quantity,
            line_total,
            item_notes

          FROM checkout_session_items

          WHERE checkout_session_id =
            $2::uuid

          ORDER BY
            created_at ASC

          RETURNING
            id,
            order_id,
            menu_item_id,
            item_name,
            unit_price,
            quantity,
            line_total,
            item_notes,
            created_at
        `,
        [
          createdOrder.id,
          payment.session_id,
        ]
      );

    if (
      orderItemsResult.rows.length ===
      0
    ) {
      throw new Error(
        "Checkout session has no items to convert."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Mark restaurant payment PAID
    |--------------------------------------------------------------------------
    */

    await client.query(
      `
        UPDATE restaurant_payments

        SET
          order_id =
            $1::uuid,

          merchant_request_id =
            COALESCE(
              NULLIF(
                $2::varchar,
                ''
              ),
              merchant_request_id
            ),

          transaction_id =
            $3::varchar,

          phone_number =
            COALESCE(
              NULLIF(
                $4::varchar,
                ''
              ),
              phone_number
            ),

          amount =
            $5::numeric,

          status =
            'PAID',

          callback_payload =
            $6::jsonb,

          provider_response =
            COALESCE(
              provider_response,
              '{}'::jsonb
            )
            ||
            jsonb_build_object(
              'ResultCode',
              $7::integer,

              'ResultDesc',
              $8::text,

              'TransactionDate',
              $9::text
            ),

          paid_at =
            CURRENT_TIMESTAMP,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id =
          $10::uuid
      `,
      [
        createdOrder.id,

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

        payment.payment_id,
      ]
    );

    /*
    |--------------------------------------------------------------------------
    | Convert checkout session
    |--------------------------------------------------------------------------
    */

    await client.query(
      `
        UPDATE checkout_sessions

        SET
          status =
            'CONVERTED',

          converted_order_id =
            $1::uuid,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id =
          $2::uuid
      `,
      [
        createdOrder.id,
        payment.session_id,
      ]
    );

    await client.query(
      "COMMIT"
    );

    committedOrder =
      mapPaidOrder(
        createdOrder,
        orderItemsResult.rows
      );

    /*
    |--------------------------------------------------------------------------
    | Restaurant Socket.IO events
    |--------------------------------------------------------------------------
    */

    const io =
      req.app.get("io");

    if (io) {
      io.to(
        `restaurant:${committedRestaurantId}`
      ).emit(
        "restaurant-order-created",
        committedOrder
      );

      io.to(
        `checkout:${committedSessionToken}`
      ).emit(
        "checkout-payment-completed",
        {
          success: true,

          paymentStatus:
            "PAID",

          sessionToken:
            committedSessionToken,

          order:
            committedOrder,
        }
      );

      if (
        committedCustomerId
      ) {
        io.to(
          `user:${committedCustomerId}`
        ).emit(
          "customer-order-created",
          committedOrder
        );
      }

      io.to(
        `order:${committedOrder.trackingToken}`
      ).emit(
        "customer-order-created",
        committedOrder
      );
    }

    return res.status(200).json({
      ResultCode: 0,
      ResultDesc:
        "Callback processed successfully",
    });
  } catch (error) {
    try {
      await client.query(
        "ROLLBACK"
      );
    } catch (
      rollbackError
    ) {
      console.error(
        "M-Pesa callback rollback error:",
        rollbackError
      );
    }

    console.error(
      "M-Pesa callback processing error:",
      error
    );

    return res.status(200).json({
      ResultCode: 0,
      ResultDesc:
        "Callback acknowledged",
    });
  } finally {
    client.release();
  }
}

async function createMpesaPaymentAttempt(
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

    const phoneNumber =
      String(
        req.body.phoneNumber || ""
      ).trim();

    if (!sessionToken) {
      return res.status(400).json({
        success: false,
        message:
          "Checkout session token is required.",
      });
    }

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message:
          "M-Pesa phone number is required.",
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
            customer_phone,
            promotion_id,
            subtotal,
            discount_amount,
            total_amount,
            status,
            expires_at

          FROM checkout_sessions

          WHERE session_token =
            $1::uuid

          LIMIT 1

          FOR UPDATE
        `,
        [sessionToken]
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
    | Promotion
    |--------------------------------------------------------------------------
    */

    if (
      checkoutSession.promotion_id
    ) {
      const promotionResult =
        await client.query(
          `
            SELECT
              id,
              restaurant_id,
              promo_code,
              minimum_order_amount,
              is_active,
              starts_at,
              ends_at,
              total_usage_limit,
              per_customer_usage_limit

            FROM restaurant_promotions

            WHERE id =
              $1::uuid

            LIMIT 1

            FOR UPDATE
          `,
          [
            checkoutSession
              .promotion_id,
          ]
        );

      if (
        promotionResult.rows.length ===
        0
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(409).json({
          success: false,
          message:
            "The selected promotion is no longer available.",
        });
      }

      const promotion =
        promotionResult.rows[0];

      /*
      |--------------------------------------------------------------------------
      | Payment-time promotion validity
      |--------------------------------------------------------------------------
      */

      if (!promotion.is_active) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(409).json({
          success: false,
          message:
            "This promotion is no longer active.",
        });
      }

      if (
        String(
          promotion.restaurant_id
        ) !==
        String(
          checkoutSession.restaurant_id
        )
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(409).json({
          success: false,
          message:
            "This promotion is not valid for this restaurant.",
        });
      }

      const now =
        new Date();

      const startsAt =
        new Date(
          promotion.starts_at
        );

      const endsAt =
        new Date(
          promotion.ends_at
        );

      if (now < startsAt) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(409).json({
          success: false,
          message:
            "This promotion has not started yet.",
        });
      }

      if (now >= endsAt) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(409).json({
          success: false,
          message:
            "This promotion has expired.",
        });
      }

      const minimumOrderAmount =
        Number(
          promotion
            .minimum_order_amount ||
          0
        );

      const checkoutSubtotal =
        Number(
          checkoutSession.subtotal ||
          0
        );

      if (
        checkoutSubtotal <
        minimumOrderAmount
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(409).json({
          success: false,
          message:
            `This promotion requires a minimum order of KES ${minimumOrderAmount.toLocaleString(
              "en-KE"
            )}.`,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Normalize phone for promotion identity
      |--------------------------------------------------------------------------
      */

      let normalizedCustomerPhone =
        null;

      try {
        normalizedCustomerPhone =
          formatMpesaPhoneNumber(
            checkoutSession.customer_phone
          );
      } catch (phoneError) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(400).json({
          success: false,
          message:
            "A valid Kenyan phone number is required to use this promotion.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Remove stale reservations
      |--------------------------------------------------------------------------
      */

      await client.query(
        `
          DELETE FROM
            promotion_reservations

          WHERE expires_at <=
            CURRENT_TIMESTAMP
        `
      );

      /*
      |--------------------------------------------------------------------------
      | Total promotion usage
      |--------------------------------------------------------------------------
      */

      const totalUsageResult =
        await client.query(
          `
            SELECT
              (
                SELECT COUNT(*)

                FROM promotion_usages

                WHERE promotion_id =
                  $1::uuid
              )
              +
              (
                SELECT COUNT(*)

                FROM promotion_reservations

                WHERE promotion_id =
                  $1::uuid

                  AND expires_at >
                    CURRENT_TIMESTAMP
              )
              AS total_reserved_usage
          `,
          [
            promotion.id,
          ]
        );

      const totalReservedUsage =
        Number(
          totalUsageResult
            .rows[0]
            ?.total_reserved_usage ||
          0
        );

      if (
        promotion.total_usage_limit !==
          null &&
        totalReservedUsage >=
          Number(
            promotion
              .total_usage_limit
          )
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(409).json({
          success: false,
          message:
            "This promotion has reached its usage limit.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Logged-in customer limit
      |--------------------------------------------------------------------------
      */

      if (
        checkoutSession.customer_id &&
        promotion
          .per_customer_usage_limit !==
          null
      ) {
        const customerUsageResult =
          await client.query(
            `
              SELECT
                (
                  SELECT COUNT(*)

                  FROM promotion_usages

                  WHERE promotion_id =
                    $1::uuid

                    AND customer_id =
                      $2::uuid
                )
                +
                (
                  SELECT COUNT(*)

                  FROM promotion_reservations

                  WHERE promotion_id =
                    $1::uuid

                    AND customer_id =
                      $2::uuid

                    AND expires_at >
                      CURRENT_TIMESTAMP
                )
                AS customer_reserved_usage
            `,
            [
              promotion.id,
              checkoutSession
                .customer_id,
            ]
          );

        const customerReservedUsage =
          Number(
            customerUsageResult
              .rows[0]
              ?.customer_reserved_usage ||
            0
          );

        if (
          customerReservedUsage >=
          Number(
            promotion
              .per_customer_usage_limit
          )
        ) {
          await client.query(
            "ROLLBACK"
          );

          return res.status(409).json({
            success: false,
            message:
              "You have already used this promotion the maximum allowed number of times.",
          });
        }
      }

      /*
      |--------------------------------------------------------------------------
      | Guest customer limit
      |--------------------------------------------------------------------------
      */

      if (
        !checkoutSession.customer_id &&
        promotion
          .per_customer_usage_limit !==
          null
      ) {
        const guestUsageResult =
          await client.query(
            `
              SELECT
                (
                  SELECT COUNT(*)

                  FROM promotion_usages

                  WHERE promotion_id =
                    $1::uuid

                    AND customer_phone =
                      $2::varchar
                )
                +
                (
                  SELECT COUNT(*)

                  FROM promotion_reservations

                  WHERE promotion_id =
                    $1::uuid

                    AND customer_phone =
                      $2::varchar

                    AND expires_at >
                      CURRENT_TIMESTAMP
                )
                AS guest_reserved_usage
            `,
            [
              promotion.id,
              normalizedCustomerPhone,
            ]
          );

        const guestReservedUsage =
          Number(
            guestUsageResult
              .rows[0]
              ?.guest_reserved_usage ||
            0
          );

        if (
          guestReservedUsage >=
          Number(
            promotion
              .per_customer_usage_limit
          )
        ) {
          await client.query(
            "ROLLBACK"
          );

          return res.status(409).json({
            success: false,
            message:
              "This phone number has already used this promotion the maximum allowed number of times.",
          });
        }
      }

      /*
      |--------------------------------------------------------------------------
      | Reserve promotion slot
      |--------------------------------------------------------------------------
      */

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
          promotion.id,
          checkoutSession.id,
          checkoutSession.customer_id,
          normalizedCustomerPhone,
        ]
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Create payment attempt
    |--------------------------------------------------------------------------
    */

    const paymentReference =
      `CCKPAY-${Date.now()}-${Math.floor(
        1000 +
        Math.random() * 9000
      )}`;

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
            'MPESA',
            'SAFARICOM_DARAJA',
            $5::varchar,
            $6::numeric,
            'KES',
            'PENDING'
          )

          RETURNING
            id,
            checkout_session_id,
            payment_reference,
            phone_number,
            amount,
            currency,
            status,
            created_at
        `,
        [
          checkoutSession.id,
          checkoutSession
            .restaurant_id,
          checkoutSession
            .customer_id,
          paymentReference,
          phoneNumber,
          checkoutSession
            .total_amount,
        ]
      );

    const payment =
      paymentResult.rows[0];

    const callbackUrl =
      String(
        process.env
          .MPESA_CALLBACK_URL ||
        ""
      ).trim();

    /*
    |--------------------------------------------------------------------------
    | Commit payment + promotion reservation
    |--------------------------------------------------------------------------
    */

    await client.query(
      "COMMIT"
    );

    /*
    |--------------------------------------------------------------------------
    | Development
    |--------------------------------------------------------------------------
    */

    if (!callbackUrl) {
      return res.status(201).json({
        success: true,

        message:
          "Payment attempt recorded. STK Push will activate after the backend is deployed.",

        stkPushReady: false,

        payment: {
          id:
            payment.id,

          checkoutSessionId:
            payment
              .checkout_session_id,

          paymentReference:
            payment
              .payment_reference,

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

        return res.status(201).json({
      success: true,

      message:
        "Payment initiated successfully. Complete the payment manually using the restaurant's M-Pesa details.",

      stkPushReady: false,

      payment: {
        id:
          payment.id,

        checkoutSessionId:
          payment
            .checkout_session_id,

        paymentReference:
          payment
            .payment_reference,

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

    /*
    |--------------------------------------------------------------------------
    | STK Push
    |--------------------------------------------------------------------------
    */

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
            payment
              .payment_reference,

          transactionDescription:
            "Coast Connect order",
        });

     const providerResponse =
  stkResult.response || {};

/*
|--------------------------------------------------------------------------
| Safaricom STK request validation
|--------------------------------------------------------------------------
*/

if (
  String(
    providerResponse.ResponseCode || ""
  ) !== "0"
) {
  throw new Error(
    providerResponse.errorMessage ||
    providerResponse.ResponseDescription ||
    providerResponse.CustomerMessage ||
    "M-Pesa payment could not be initiated."
  );
}

await client.query(
  "BEGIN"
);
      const updatedPaymentResult =
        await client.query(
          `
            UPDATE restaurant_payments

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
              checkout_session_id,
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
          UPDATE checkout_sessions

          SET
            status =
              'PAYMENT_PROCESSING',

            updated_at =
              CURRENT_TIMESTAMP

          WHERE id =
            $1::uuid
        `,
        [
          payment
            .checkout_session_id,
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
          providerResponse
            .CustomerMessage ||
          "M-Pesa prompt sent. Check your phone and enter your PIN.",

        stkPushReady: true,

        payment: {
          id:
            updatedPayment.id,

          checkoutSessionId:
            updatedPayment
              .checkout_session_id,

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
            updatedPayment
              .phone_number,

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
      });
    } catch (stkError) {
      console.error(
        "M-Pesa STK Push error:",
        stkError.response?.data ||
        stkError.message
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
            payment
              .checkout_session_id,
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
      } catch (databaseError) {
        try {
          await client.query(
            "ROLLBACK"
          );
        } catch (
          rollbackError
        ) {
          console.error(
            "STK failure rollback error:",
            rollbackError
          );
        }

        console.error(
          "Save STK failure error:",
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
      console.error(
        "Create payment rollback error:",
        rollbackError
      );
    }

    console.error(
      "Create M-Pesa payment attempt error:",
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
        "Unable to create M-Pesa payment attempt.",
    });
  } finally {
    client.release();
  }
}

module.exports = {
  testMpesaConnection,
  handleMpesaCallback,
  createMpesaPaymentAttempt,
};