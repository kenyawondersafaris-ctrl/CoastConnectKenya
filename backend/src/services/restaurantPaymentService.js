"use strict";


/*
|--------------------------------------------------------------------------
| Create restaurant order number
|--------------------------------------------------------------------------
*/

function createRestaurantOrderNumber() {
  return `CCK-${Date.now()}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;
}


/*
|--------------------------------------------------------------------------
| Normalize Kenyan phone number
|--------------------------------------------------------------------------
|
| This is intentionally kept inside the shared restaurant payment service.
| Card payments should not depend on mpesaService just to normalize a
| customer's Kenyan phone number.
|
*/

function normalizeKenyanPhoneNumber(value) {
  const digits =
    String(value || "")
      .replace(/\D/g, "");

  if (/^2547\d{8}$/.test(digits)) {
    return digits;
  }

  if (/^07\d{8}$/.test(digits)) {
    return `254${digits.slice(1)}`;
  }

  if (/^7\d{8}$/.test(digits)) {
    return `254${digits}`;
  }

  throw new Error(
    "A valid Kenyan customer phone number is required."
  );
}


/*
|--------------------------------------------------------------------------
| Map paid restaurant order
|--------------------------------------------------------------------------
*/

function mapPaidRestaurantOrder(
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
      Number(
        orderRow.subtotal || 0
      ),

    deliveryFee:
      Number(
        orderRow.delivery_fee || 0
      ),

    deliveryZoneId:
      orderRow.delivery_zone_id,

    estimatedDeliveryMinutes:
      Number(
        orderRow
          .estimated_delivery_minutes ||
        orderRow
          .estimated_preparation_minutes ||
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


/*
|--------------------------------------------------------------------------
| Convert successful checkout into paid order
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| This function does NOT COMMIT or ROLLBACK.
|
| The provider controller owns the database transaction.
|
| That allows:
|
| M-Pesa callback
| Card webhook
| Future Google Pay provider
|
| to use the exact same order conversion logic.
|
*/

async function convertSuccessfulCheckoutToOrder({
  client,
  payment,
  paymentMethod,
}) {
  if (!client) {
    throw new Error(
      "Database client is required to convert checkout."
    );
  }

  if (!payment) {
    throw new Error(
      "Payment checkout data is required."
    );
  }

  const normalizedPaymentMethod =
    String(
      paymentMethod ||
      payment.payment_method ||
      ""
    )
      .trim()
      .toUpperCase();

  if (!normalizedPaymentMethod) {
    throw new Error(
      "Payment method is required."
    );
  }


  /*
  |--------------------------------------------------------------------------
  | Validate checkout
  |--------------------------------------------------------------------------
  */

  if (!payment.session_id) {
    throw new Error(
      "Checkout session ID is missing."
    );
  }

  if (!payment.session_restaurant_id) {
    throw new Error(
      "Checkout restaurant ID is missing."
    );
  }

  if (
    payment.converted_order_id
  ) {
    throw new Error(
      "Checkout session has already been converted to an order."
    );
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
          $17::varchar,
          $18::varchar,
          $19::integer,
          $20::integer
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

        Number(
          payment.subtotal || 0
        ),

        Number(
          payment.delivery_fee || 0
        ),

        payment.delivery_zone_id,

        payment
          .estimated_delivery_minutes,

        Number(
          payment.discount_amount ||
          0
        ),

        Number(
          payment.total_amount || 0
        ),

        payment.promotion_id,

        payment.promo_code,

        normalizedPaymentMethod,

        payment.table_number,

        payment.guest_count,

        Number(
          payment
            .estimated_preparation_minutes ||
          20
        ),
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
        normalizeKenyanPhoneNumber(
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

        payment
          .session_customer_id,

        normalizedPromotionPhone,

        Number(
          payment.discount_amount ||
          0
        ),
      ]
    );


    /*
    |--------------------------------------------------------------------------
    | Release promotion reservation
    |--------------------------------------------------------------------------
    */

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
  | Convert checkout session
  |--------------------------------------------------------------------------
  */

  const convertedSessionResult =
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

          AND converted_order_id
            IS NULL

        RETURNING
          id,
          session_token,
          restaurant_id,
          customer_id,
          converted_order_id,
          status
      `,
      [
        createdOrder.id,
        payment.session_id,
      ]
    );

  if (
    convertedSessionResult.rows.length ===
    0
  ) {
    throw new Error(
      "Checkout session could not be converted because it has already been processed."
    );
  }


  /*
  |--------------------------------------------------------------------------
  | Build final order object
  |--------------------------------------------------------------------------
  */

  const mappedOrder =
    mapPaidRestaurantOrder(
      createdOrder,
      orderItemsResult.rows
    );


  /*
  |--------------------------------------------------------------------------
  | Return transaction result
  |--------------------------------------------------------------------------
  */

  return {
    order:
      mappedOrder,

    orderRow:
      createdOrder,

    orderItems:
      orderItemsResult.rows,

    session:
      convertedSessionResult.rows[0],

    sessionToken:
      payment.session_token,

    restaurantId:
      payment.session_restaurant_id,

    customerId:
      payment.session_customer_id,
  };
}


/*
|--------------------------------------------------------------------------
| Emit successful restaurant order events
|--------------------------------------------------------------------------
|
| Run this AFTER COMMIT.
|
*/

function emitSuccessfulRestaurantOrderEvents({
  io,
  order,
  sessionToken,
  restaurantId,
  customerId,
}) {
  if (
    !io ||
    !order
  ) {
    return;
  }


  /*
  |--------------------------------------------------------------------------
  | Restaurant dashboard
  |--------------------------------------------------------------------------
  */

  if (restaurantId) {
    io.to(
      `restaurant:${restaurantId}`
    ).emit(
      "restaurant-order-created",
      order
    );
  }


  /*
  |--------------------------------------------------------------------------
  | Checkout browser
  |--------------------------------------------------------------------------
  */

  if (sessionToken) {
    io.to(
      `checkout:${sessionToken}`
    ).emit(
      "checkout-payment-completed",
      {
        success: true,

        paymentStatus:
          "PAID",

        sessionToken,

        order,
      }
    );
  }


  /*
  |--------------------------------------------------------------------------
  | Logged-in customer
  |--------------------------------------------------------------------------
  */

  if (customerId) {
    io.to(
      `customer:${customerId}`
    ).emit(
      "customer-order-created",
      order
    );
  }


  /*
  |--------------------------------------------------------------------------
  | Public order tracking room
  |--------------------------------------------------------------------------
  */

  if (
    order.trackingToken
  ) {
    io.to(
      `order:${order.trackingToken}`
    ).emit(
      "customer-order-created",
      order
    );
  }
}


module.exports = {
  convertSuccessfulCheckoutToOrder,
  emitSuccessfulRestaurantOrderEvents,
  mapPaidRestaurantOrder,
  normalizeKenyanPhoneNumber,
};