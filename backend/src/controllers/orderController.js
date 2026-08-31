"use strict";

const pool = require("../config/db");

const ORDER_STATUSES = [
  "AWAITING_PAYMENT",
  "PENDING",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
];

const ALLOWED_STATUS_TRANSITIONS = {
  PENDING: [
    "ACCEPTED",
    "REJECTED",
    "CANCELLED",
  ],

  ACCEPTED: [
    "PREPARING",
    "CANCELLED",
  ],

  PREPARING: [
    "READY",
    "CANCELLED",
  ],

  READY: [
    "OUT_FOR_DELIVERY",
    "COMPLETED",
    "CANCELLED",
  ],

  OUT_FOR_DELIVERY: [
    "COMPLETED",
    "CANCELLED",
  ],

  COMPLETED: [],

  CANCELLED: [],

  REJECTED: [],
};

function parsePositiveInteger(
  value,
  fallback,
  maximum
) {
  const parsedValue = Number.parseInt(
    value,
    10
  );

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < 1
  ) {
    return fallback;
  }

  return Math.min(
    parsedValue,
    maximum
  );
}

function cleanText(value) {
  return String(value ?? "")
    .trim();
}

async function createRestaurantNotification(
  client,
  {
    restaurantId,
    recipientUserId,
    orderId = null,
    type,
    title,
    message,
    metadata = {},
  }
) {
  const result = await client.query(
    `
      INSERT INTO restaurant_notifications (
        restaurant_id,
        recipient_user_id,
        order_id,
        notification_type,
        title,
        message,
        metadata
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3::uuid,
        $4::varchar,
        $5::varchar,
        $6::text,
        $7::jsonb
      )
      RETURNING
        id,
        restaurant_id,
        recipient_user_id,
        order_id,
        notification_type,
        title,
        message,
        metadata,
        is_read,
        read_at,
        created_at
    `,
    [
      restaurantId,
      recipientUserId,
      orderId,
      type,
      title,
      message,
      JSON.stringify(metadata),
    ]
  );

  const row =
    result.rows[0];

  return {
    id: row.id,
    restaurantId:
      row.restaurant_id,
    recipientUserId:
      row.recipient_user_id,
    orderId:
      row.order_id,
    type:
      row.notification_type,
    title:
      row.title,
    message:
      row.message,
    metadata:
      row.metadata || {},
    isRead:
      Boolean(row.is_read),
    readAt:
      row.read_at,
    createdAt:
      row.created_at,
  };
}

function mapOrderItem(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    menuItemId: row.menu_item_id,
    itemName: row.item_name,
    unitPrice: Number(
      row.unit_price || 0
    ),
    quantity: Number(
      row.quantity || 0
    ),
    lineTotal: Number(
      row.line_total || 0
    ),
    itemNotes: row.item_notes,
    createdAt: row.created_at,
  };
}

function mapOrder(row) {
  return {
    id: row.id,
    restaurantId:
      row.restaurant_id,
    customerId:
      row.customer_id,
    orderNumber:
      row.order_number,
    customerName:
      row.customer_name,
    customerPhone:
      row.customer_phone,
    orderType:
      row.order_type,
    deliveryAddress:
      row.delivery_address,
    customerNotes:
      row.customer_notes,

    subtotal: Number(
      row.subtotal || 0
    ),

    deliveryFee: Number(
      row.delivery_fee || 0
    ),

    deliveryZoneId:
  row.delivery_zone_id,

estimatedDeliveryMinutes:
  row.estimated_delivery_minutes === null ||
  row.estimated_delivery_minutes === undefined
    ? null
    : Number(
        row.estimated_delivery_minutes
      ),

    totalAmount: Number(
      row.total_amount || 0
    ),

    status: row.status,

    paymentStatus:
      row.payment_status,

    paymentMethod:
      row.payment_method,

    placedAt:
      row.placed_at,

    acceptedAt:
      row.accepted_at,

    completedAt:
      row.completed_at,

    cancelledAt:
      row.cancelled_at,

    createdAt:
      row.created_at,

   updatedAt:
  row.updated_at,

trackingToken:
  row.tracking_token,

estimatedPreparationMinutes:
  Number(
    row.estimated_preparation_minutes || 20
  ),

items: [],
  };
}

async function findOwnerRestaurant(
  client,
  ownerId
) {
  const result = await client.query(
    `
      SELECT
  id,
  name,
  owner_id
FROM restaurants
WHERE owner_id = $1
LIMIT 1
    `,
    [ownerId]
  );

  return result.rows[0] || null;
}

async function findStaffRestaurant(
  client,
  userId
) {
  const result =
    await client.query(
      `
      SELECT
        rs.restaurant_id,
        rs.staff_role,
        rsp.can_manage_orders,
        r.name AS restaurant_name

      FROM restaurant_staff rs

      INNER JOIN restaurants r
        ON r.id = rs.restaurant_id

      LEFT JOIN restaurant_staff_permissions rsp
        ON rsp.restaurant_staff_id = rs.id

      WHERE rs.user_id = $1::uuid
        AND rs.status = 'ACTIVE'

      LIMIT 1
      `,
      [userId]
    );

  return result.rows[0] || null;
}

async function getRestaurantOrders(
  req,
  res,
  restaurant
) {
  try {
   

    const page =
      parsePositiveInteger(
        req.query.page,
        1,
        100000
      );

    const limit =
      parsePositiveInteger(
        req.query.limit,
        20,
        100
      );

    const offset =
      (page - 1) * limit;

    const requestedStatus =
      cleanText(
        req.query.status
      ).toUpperCase();

    if (
      requestedStatus &&
      !ORDER_STATUSES.includes(
        requestedStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid order status.",
      });
    }

  

    const values = [
      restaurant.id,
    ];

   const conditions = [
  "ro.restaurant_id = $1",
];

if (
  req.user.role === "RESTAURANT_STAFF"
) {
  conditions.push(
    `ro.status IN (
      'PENDING',
      'ACCEPTED',
      'PREPARING',
      'READY',
      'OUT_FOR_DELIVERY'
    )`
  );
}

    if (requestedStatus) {
      values.push(
        requestedStatus
      );

      conditions.push(
        `ro.status = $${values.length}`
      );
    }

    const whereClause =
      conditions.join(" AND ");

    const countResult =
      await pool.query(
        `
          SELECT
            COUNT(*)::INTEGER AS total

          FROM restaurant_orders ro

          WHERE ${whereClause}
        `,
        values
      );

    const totalItems = Number(
      countResult.rows[0]?.total || 0
    );

    const dataValues = [
      ...values,
      limit,
      offset,
    ];

    const limitPlaceholder =
      `$${dataValues.length - 1}`;

    const offsetPlaceholder =
      `$${dataValues.length}`;

    const orderResult =
      await pool.query(
        `
          SELECT
            ro.id,
            ro.restaurant_id,
            ro.customer_id,
            ro.order_number,
            ro.customer_name,
            ro.customer_phone,
            ro.order_type,
            ro.delivery_address,
            ro.customer_notes,
            ro.subtotal,
            ro.delivery_fee,
            ro.total_amount,
            ro.status,
            ro.payment_status,
            ro.payment_method,
            ro.placed_at,
            ro.accepted_at,
            ro.completed_at,
            ro.cancelled_at,
            ro.created_at,
            ro.updated_at

          FROM restaurant_orders ro

          WHERE ${whereClause}

          ORDER BY
            CASE
              WHEN ro.status = 'PENDING'
                THEN 1
              WHEN ro.status = 'ACCEPTED'
                THEN 2
              WHEN ro.status = 'PREPARING'
                THEN 3
             WHEN ro.status = 'READY'
                THEN 4
              WHEN ro.status = 'OUT_FOR_DELIVERY'
                THEN 5
              ELSE 6
            END ASC,

            ro.created_at DESC

          LIMIT ${limitPlaceholder}
          OFFSET ${offsetPlaceholder}
        `,
        dataValues
      );

    const orders =
      orderResult.rows.map(
        mapOrder
      );

    if (orders.length > 0) {
      const orderIds =
        orders.map(
          (order) => order.id
        );

      const itemsResult =
        await pool.query(
          `
            SELECT
              id,
              order_id,
              menu_item_id,
              item_name,
              unit_price,
              quantity,
              line_total,
              item_notes,
              created_at

            FROM restaurant_order_items

            WHERE order_id = ANY(
              $1::UUID[]
            )

            ORDER BY
              created_at ASC
          `,
          [orderIds]
        );

      const itemsByOrder =
        new Map();

      itemsResult.rows.forEach(
        (row) => {
          const mappedItem =
            mapOrderItem(row);

          if (
            !itemsByOrder.has(
              row.order_id
            )
          ) {
            itemsByOrder.set(
              row.order_id,
              []
            );
          }

          itemsByOrder
            .get(row.order_id)
            .push(mappedItem);
        }
      );

      orders.forEach(
        (order) => {
          order.items =
            itemsByOrder.get(
              order.id
            ) || [];
        }
      );
    }

    const totalPages =
      totalItems === 0
        ? 0
        : Math.ceil(
            totalItems / limit
          );

    const pendingCountResult =
      await pool.query(
        `
          SELECT
            COUNT(*)::INTEGER
              AS pending_count

          FROM restaurant_orders

          WHERE restaurant_id = $1
            AND status = 'PENDING'
        `,
        [restaurant.id]
      );

    return res.status(200).json({
      success: true,

      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
      },

      orders,

      pendingOrdersCount:
        Number(
          pendingCountResult
            .rows[0]
            ?.pending_count || 0
        ),

      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasPreviousPage:
          page > 1,
        hasNextPage:
          page < totalPages,
      },
    });
  } catch (error) {
    console.error(
      "Get owner orders error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load restaurant orders.",
    });
  }
}

async function getOwnerOrders(
  req,
  res
) {
  try {
    const ownerId =
      req.user.userId;

    const restaurant =
      await findOwnerRestaurant(
        pool,
        ownerId
      );

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message:
          "Create your restaurant profile before managing orders.",
      });
    }

    return getRestaurantOrders(
      req,
      res,
      restaurant
    );
  } catch (error) {
    console.error(
      "Get owner restaurant orders error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load restaurant orders.",
    });
  }
}

async function getStaffOrders(
  req,
  res
) {
  try {
    const userId =
      req.user.userId;

    const staff =
      await findStaffRestaurant(
        pool,
        userId
      );

    if (!staff) {
      return res.status(404).json({
        success: false,
        message:
          "Restaurant staff account not found.",
      });
    }

    if (
      !staff.can_manage_orders
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to manage restaurant orders.",
      });
    }

    if (!req.query.status) {
  req.query.status = "";
}

 return getRestaurantOrders(
  req,
  res,
  {
    id:
      staff.restaurant_id,

    name:
      staff.restaurant_name,
  }
);

  } catch (error) {
    console.error(
      "Get staff orders error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load restaurant orders.",
    });
  }
}

async function updateStaffOrderStatus(
  req,
  res
) {
  try {
    const userId =
      req.user.userId;

    const staff =
      await findStaffRestaurant(
        pool,
        userId
      );

    if (!staff) {
      return res.status(404).json({
        success: false,
        message:
          "Restaurant staff account not found.",
      });
    }

    if (
      !staff.can_manage_orders
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to update restaurant orders.",
      });
    }

 
  return updateRestaurantOrderStatus(
  req,
  res,
  {
    id:
      staff.restaurant_id,

    name:
      staff.restaurant_name,
  }
);

  } catch (error) {
    console.error(
      "Update staff order status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update the order.",
    });
  }
}



async function updateRestaurantOrderStatus(
  req,
  res,
  restaurant
) {
  const client =
    await pool.connect();

  try {
    

    const orderId =
      cleanText(
        req.params.orderId
      );

    const nextStatus =
      cleanText(
        req.body.status
      ).toUpperCase();

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message:
          "Order ID is required.",
      });
    }

    if (
      !ORDER_STATUSES.includes(
        nextStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid order status.",
      });
    }

    await client.query("BEGIN");

   

    const orderResult =
      await client.query(
        `
        SELECT
            id,
            restaurant_id,
            status,
            order_type

          FROM restaurant_orders

          WHERE id = $1
            AND restaurant_id = $2

          LIMIT 1
          FOR UPDATE
        `,
        [
          orderId,
          restaurant.id,
        ]
      );

    if (
      orderResult.rows.length === 0
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(404).json({
        success: false,
        message:
          "Order not found.",
      });
    }

    const currentStatus =
      orderResult.rows[0].status;

      const orderType =
  orderResult.rows[0].order_type;

    if (
      currentStatus === nextStatus
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(400).json({
        success: false,
        message:
          `Order is already ${nextStatus.toLowerCase()}.`,
      });
    }

    const allowedStatuses =
  ALLOWED_STATUS_TRANSITIONS[
    currentStatus
  ] || [];

if (
  !allowedStatuses.includes(
    nextStatus
  )
) {
  await client.query(
    "ROLLBACK"
  );

  return res.status(400).json({
    success: false,
    message:
      `Order cannot move from ${currentStatus} to ${nextStatus}.`,
  });
}

if (
  orderType === "DELIVERY" &&
  currentStatus === "READY" &&
  nextStatus === "COMPLETED"
) {
  await client.query(
    "ROLLBACK"
  );

  return res.status(400).json({
    success: false,
    message:
      "Delivery orders must be marked out for delivery before completion.",
  });
}

if (
  orderType !== "DELIVERY" &&
  nextStatus === "OUT_FOR_DELIVERY"
) {
  await client.query(
    "ROLLBACK"
  );

  return res.status(400).json({
    success: false,
    message:
      "Only delivery orders can be marked out for delivery.",
  });
}

   const updatedResult =
  await client.query(
    `
      UPDATE restaurant_orders

      SET
        status = $1::varchar,

        accepted_at =
          CASE
            WHEN $1::varchar = 'ACCEPTED'::varchar
              THEN CURRENT_TIMESTAMP
            ELSE accepted_at
          END,

        completed_at =
          CASE
            WHEN $1::varchar = 'COMPLETED'::varchar
              THEN CURRENT_TIMESTAMP
            ELSE completed_at
          END,

        cancelled_at =
          CASE
            WHEN $1::varchar IN (
              'CANCELLED'::varchar,
              'REJECTED'::varchar
            )
              THEN CURRENT_TIMESTAMP
            ELSE cancelled_at
          END,

        updated_at =
          CURRENT_TIMESTAMP

      WHERE id = $2::uuid

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
        total_amount,
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
    `,
    [
      nextStatus,
      orderId,
    ]
  );

    await client.query(
      "COMMIT"
    );

    const updatedOrder =
      mapOrder(
        updatedResult.rows[0]
      );

    const io =
      req.app.get("io");

    if (io) {
      io.to(
        `restaurant:${restaurant.id}`
      ).emit(
        "restaurant-order-updated",
        updatedOrder
      );

        // Status notifications are created separately.

      if (
        updatedOrder.customerId
      ) {
        io.to(
          `user:${updatedOrder.customerId}`
        ).emit(
          "customer-order-updated",
          updatedOrder
        );
      }

      if (
  updatedOrder.trackingToken
) {
  io.to(
    `order:${updatedOrder.trackingToken}`
  ).emit(
    "customer-order-updated",
    updatedOrder
  );
}
    }

    return res.status(200).json({
      success: true,
      message:
        `Order status updated to ${nextStatus.toLowerCase()}.`,
      order: updatedOrder,
    });
  } catch (error) {
    await client.query(
      "ROLLBACK"
    );

  console.error(
  "Update restaurant order status error:",
  error
);
    return res.status(500).json({
      success: false,
      message:
        "Unable to update the order status.",
    });
  } finally {
    client.release();
  }
}


async function updateOwnerOrderStatus(
  req,
  res
) {
  try {
    const ownerId =
      req.user.userId;

    const restaurant =
      await findOwnerRestaurant(
        pool,
        ownerId
      );

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message:
          "Restaurant profile not found.",
      });
    }

    return updateRestaurantOrderStatus(
      req,
      res,
      restaurant
    );
  } catch (error) {
    console.error(
      "Update owner order status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update the order status.",
    });
  }
}
async function getCustomerOrderByTrackingToken(
  req,
  res
) {
  try {
    const trackingToken =
      cleanText(
        req.params.trackingToken
      );

    if (!trackingToken) {
      return res.status(400).json({
        success: false,
        message:
          "Tracking token is required.",
      });
    }

    const orderResult =
      await pool.query(
        `
          SELECT
            ro.id,
            ro.restaurant_id,
            ro.customer_id,
            ro.order_number,
            ro.customer_name,
            ro.customer_phone,
            ro.order_type,
            ro.delivery_address,
            ro.customer_notes,
            ro.subtotal,
            ro.delivery_fee,
            ro.delivery_zone_id,
            ro.estimated_delivery_minutes,
            ro.total_amount,
            ro.status,
            ro.payment_status,
            ro.payment_method,
            ro.placed_at,
            ro.accepted_at,
            ro.completed_at,
            ro.cancelled_at,
            ro.created_at,
            ro.updated_at,
            ro.table_number,
            ro.guest_count,
            ro.served_at,
            ro.tracking_token,

            r.name AS restaurant_name

          FROM restaurant_orders ro

          INNER JOIN restaurants r
            ON r.id = ro.restaurant_id

          WHERE ro.tracking_token =
            $1::uuid

          LIMIT 1
        `,
        [trackingToken]
      );

    if (
      orderResult.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Order tracking information was not found.",
      });
    }

    const orderRow =
      orderResult.rows[0];

    const itemsResult =
      await pool.query(
        `
          SELECT
            id,
            order_id,
            menu_item_id,
            item_name,
            unit_price,
            quantity,
            line_total,
            item_notes,
            created_at

          FROM restaurant_order_items

          WHERE order_id =
            $1::uuid

          ORDER BY created_at ASC
        `,
        [orderRow.id]
      );

      const reviewResult =
  await pool.query(
    `
      SELECT
        id,
        rating,
        comment,
        created_at

      FROM reviews

      WHERE restaurant_order_id =
        $1::uuid

      LIMIT 1
    `,
    [orderRow.id]
  );

    const order =
      mapOrder(orderRow);

    order.restaurantName =
      orderRow.restaurant_name;

    order.items =
      itemsResult.rows.map(
        mapOrderItem
      );

      order.hasReview =
  reviewResult.rows.length > 0;

order.review =
  reviewResult.rows.length > 0
    ? {
        id:
          reviewResult.rows[0].id,

        rating:
          Number(
            reviewResult.rows[0].rating
          ),

        comment:
          reviewResult.rows[0].comment,

        createdAt:
          reviewResult.rows[0]
            .created_at,
      }
    : null;

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error(
      "Get tracked customer order error:",
      error
    );

    if (
      error.code === "22P02"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "The tracking token is invalid.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to load order tracking information.",
    });
  }
}

async function createCustomerOrder(
  req,
  res
) {
  const client =
    await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      restaurantId,
      customerName,
      customerPhone,
      orderType,
      deliveryAddress,
      tableNumber,
      guestCount,
      customerNotes,
      items,
    } = req.body;

    if (!restaurantId) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message:
          "Restaurant is required.",
      });
    }

    if (!customerName) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message:
          "Customer name is required.",
      });
    }

    if (!customerPhone) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message:
          "Customer phone is required.",
      });
    }

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message:
          "Add at least one menu item.",
      });
    }

const restaurantResult =
  await client.query(
    `
      WITH kenya_now AS (
        SELECT
          (
            CURRENT_TIMESTAMP
            AT TIME ZONE 'Africa/Nairobi'
          )::time AS current_time,

          EXTRACT(
            DOW FROM
            CURRENT_TIMESTAMP
            AT TIME ZONE 'Africa/Nairobi'
          )::integer AS current_day
      )

      SELECT
        r.id,
        r.owner_id,
        r.name,
        r.offers_delivery,
        r.approval_status,
        r.is_accepting_orders,
        r.temporary_closed_reason,

        CASE

          /*
          |--------------------------------------------------------------
          | Today's normal opening period
          | Example: 08:00 - 22:00
          |--------------------------------------------------------------
          */

          WHEN (
            today_hours.is_open = TRUE
            AND today_hours.opening_time IS NOT NULL
            AND today_hours.closing_time IS NOT NULL
            AND today_hours.opening_time <
                today_hours.closing_time
            AND kenya_now.current_time >=
                today_hours.opening_time
            AND kenya_now.current_time <=
                today_hours.closing_time
          )
          THEN TRUE


          /*
          |--------------------------------------------------------------
          | Today's overnight opening period
          | Example: 18:00 - 02:00
          |
          | This covers 18:00 -> midnight.
          |--------------------------------------------------------------
          */

          WHEN (
            today_hours.is_open = TRUE
            AND today_hours.opening_time IS NOT NULL
            AND today_hours.closing_time IS NOT NULL
            AND today_hours.opening_time >
                today_hours.closing_time
            AND kenya_now.current_time >=
                today_hours.opening_time
          )
          THEN TRUE


          /*
          |--------------------------------------------------------------
          | Previous day's overnight period
          |
          | Example:
          | Monday 18:00 - 02:00
          | Tuesday at 01:00 must still be OPEN.
          |--------------------------------------------------------------
          */

          WHEN (
            previous_hours.is_open = TRUE
            AND previous_hours.opening_time IS NOT NULL
            AND previous_hours.closing_time IS NOT NULL
            AND previous_hours.opening_time >
                previous_hours.closing_time
            AND kenya_now.current_time <=
                previous_hours.closing_time
          )
          THEN TRUE

          ELSE FALSE

        END AS is_open_by_schedule

      FROM restaurants r

      CROSS JOIN kenya_now

      LEFT JOIN restaurant_opening_hours
        AS today_hours
        ON today_hours.restaurant_id = r.id
        AND today_hours.day_of_week =
          kenya_now.current_day

      LEFT JOIN restaurant_opening_hours
        AS previous_hours
        ON previous_hours.restaurant_id = r.id
        AND previous_hours.day_of_week =
          (
            kenya_now.current_day + 6
          ) % 7

      WHERE r.id = $1::uuid

  AND r.approval_status = 'APPROVED'

  AND EXISTS (
    SELECT 1
    FROM business_subscriptions bs

    WHERE bs.user_id = r.owner_id
      AND bs.business_type = 'RESTAURANT'
      AND bs.status = 'ACTIVE'
      AND (
        bs.expires_at IS NULL
        OR bs.expires_at > CURRENT_TIMESTAMP
      )
  )

LIMIT 1
    `,
    [
      restaurantId,
    ]
  );
if (
  restaurantResult.rows.length === 0
) {
  await client.query("ROLLBACK");

  return res.status(404).json({
    success: false,
    message:
      "Restaurant not found.",
  });
}

const restaurant =
  restaurantResult.rows[0];

  /*
|--------------------------------------------------------------------------
| Restaurant manual order availability
|--------------------------------------------------------------------------
*/

if (
  restaurant.is_accepting_orders ===
  false
) {
  await client.query(
    "ROLLBACK"
  );

  return res.status(400).json({
    success: false,

    code:
      "RESTAURANT_NOT_ACCEPTING_ORDERS",

    message:
      restaurant
        .temporary_closed_reason ||
      "This restaurant is temporarily not accepting orders.",
  });
}


/*
|--------------------------------------------------------------------------
| Restaurant scheduled opening hours
|--------------------------------------------------------------------------
*/

if (
  restaurant.is_open_by_schedule !==
  true
) {
  await client.query(
    "ROLLBACK"
  );

  return res.status(400).json({
    success: false,

    code:
      "RESTAURANT_CLOSED",

    message:
      "This restaurant is currently closed. Orders can only be placed during opening hours.",
  });
}

  let subtotal = 0;

const validatedItems = [];




for (const item of items) {

  const menuResult =
    await client.query(
      `
      SELECT
  id,
  name,
  price,
  is_available,
  preparation_minutes

FROM menu_items

        WHERE id = $1::uuid
          AND restaurant_id = $2::uuid

        LIMIT 1
      `,
      [
        item.menuItemId,
        restaurant.id,
      ]
    );

  if (
    menuResult.rows.length === 0
  ) {
    await client.query("ROLLBACK");

    return res.status(404).json({
      success: false,
      message:
        "One or more menu items were not found.",
    });
  }


  const menuItem =
    menuResult.rows[0];

  if (!menuItem.is_available) {
    await client.query("ROLLBACK");

    return res.status(400).json({
      success: false,
      message:
        `${menuItem.name} is currently unavailable.`,
    });
  }

  const quantity =
    Number(item.quantity);

  const lineTotal =
    Number(menuItem.price) *
    quantity;

  subtotal += lineTotal;

validatedItems.push({
  menuItemId:
    menuItem.id,

  itemName:
    menuItem.name,

  unitPrice:
    Number(menuItem.price),

  quantity,

  lineTotal,

  preparationMinutes:
    Number(
      menuItem.preparation_minutes || 20
    ),
});
}

let estimatedPreparationMinutes = 0;

for (const validatedItem of validatedItems) {
  estimatedPreparationMinutes = Math.max(
    estimatedPreparationMinutes,
    Number(
      validatedItem.preparationMinutes || 20
    )
  );
}

if (estimatedPreparationMinutes === 0) {
  estimatedPreparationMinutes = 20;
}

if (
  restaurant.approval_status !==
  "APPROVED"
) {
  await client.query("ROLLBACK");

  return res.status(400).json({
    success: false,
    message:
      "This restaurant is not currently available for orders.",
  });
}

if (
  orderType === "DELIVERY" &&
  !restaurant.offers_delivery
) {
  await client.query("ROLLBACK");

  return res.status(400).json({
    success: false,
    message:
      "This restaurant does not currently offer delivery.",
  });
}

const normalizedOrderType =
  String(orderType || "")
    .trim()
    .toUpperCase();

const allowedOrderTypes = [
  "DINE_IN",
  "PICKUP",
  "DELIVERY",
];

if (
  !allowedOrderTypes.includes(
    normalizedOrderType
  )
) {
  await client.query("ROLLBACK");

  return res.status(400).json({
    success: false,
    message:
      "Order type must be DINE_IN, PICKUP, or DELIVERY.",
  });
}

if (
  normalizedOrderType === "DINE_IN" &&
  !String(tableNumber || "").trim()
) {
  await client.query("ROLLBACK");

  return res.status(400).json({
    success: false,
    message:
      "Table number is required for dine-in orders.",
  });
}

if (
  normalizedOrderType === "DINE_IN" &&
  (
    !Number.isInteger(
      Number(guestCount)
    ) ||
    Number(guestCount) < 1
  )
) {
  await client.query("ROLLBACK");

  return res.status(400).json({
    success: false,
    message:
      "A valid guest count is required for dine-in orders.",
  });
}

if (
  normalizedOrderType === "DELIVERY" &&
  !String(
    deliveryAddress || ""
  ).trim()
) {
  await client.query("ROLLBACK");

  return res.status(400).json({
    success: false,
    message:
      "Delivery address is required for delivery orders.",
  });
}

const deliveryFee = 0;

const totalAmount =
  subtotal + deliveryFee;

const orderNumber =
  `CCK-${Date.now()}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;

const createdOrderResult =
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
        total_amount,
        status,
        payment_status,
        payment_method,
        table_number,
        guest_count,
        estimated_preparation_minutes
        
      )
      VALUES (
        $1::uuid,
        NULL,
        $2::varchar,
        $3::varchar,
        $4::varchar,
        $5::varchar,
        $6::text,
        $7::text,
        $8::numeric,
        $9::numeric,
        $10::numeric,
        'AWAITING_PAYMENT',
        'PENDING',
         NULL,
        $11::varchar,
        $12::integer,
        $13::integer
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
        total_amount,
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
      restaurant.id,
      orderNumber,
      String(customerName).trim(),
      String(customerPhone).trim(),
      normalizedOrderType,

      normalizedOrderType ===
      "DELIVERY"
        ? String(
            deliveryAddress
          ).trim()
        : null,

      String(
        customerNotes || ""
      ).trim() || null,

      subtotal,
      deliveryFee,
      totalAmount,

      normalizedOrderType ===
      "DINE_IN"
        ? String(
            tableNumber
          ).trim()
        : null,

      normalizedOrderType ===
      "DINE_IN"
        ? Number(guestCount)
        : null,

        estimatedPreparationMinutes,
    ]
  );

const createdOrder =
  createdOrderResult.rows[0];

const createdItems = [];

for (
  const item of validatedItems
) {
  const createdItemResult =
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
        VALUES (
          $1::uuid,
          $2::uuid,
          $3::varchar,
          $4::numeric,
          $5::integer,
          $6::numeric,
          $7::text
        )
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
        item.menuItemId,
        item.itemName,
        item.unitPrice,
        item.quantity,
        item.lineTotal,
        null,
      ]
    );

  createdItems.push(
    mapOrderItem(
      createdItemResult.rows[0]
    )
  );
}


const mappedOrder =
  mapOrder(createdOrder);

mappedOrder.items =
  createdItems;

const newOrderNotification =
  await createRestaurantNotification(
    client,
    {
      restaurantId:
        restaurant.id,

      recipientUserId:
        restaurant.owner_id,

      orderId:
        mappedOrder.id,

      type:
        "ORDER_CREATED",

      title:
        "New customer order",

      message:
        `${mappedOrder.orderNumber} has been received.`,

      metadata: {
        orderNumber:
          mappedOrder.orderNumber,

        status:
          mappedOrder.status,

        totalAmount:
          mappedOrder.totalAmount,

        customerName:
          mappedOrder.customerName,
      },
    }
  );

await client.query("COMMIT");

const io =
  req.app.get("io");

if (io) {
  io.to(
    `restaurant:${restaurant.id}`
  ).emit(
    "restaurant-order-created",
    mappedOrder
  );

  io.to(
  `restaurant:${restaurant.id}`
).emit(
  "restaurant-notification-created",
  newOrderNotification
);

  if (
  mappedOrder.trackingToken
) {
  io.to(
    `order:${mappedOrder.trackingToken}`
  ).emit(
    "customer-order-created",
    mappedOrder
  );
}
}

return res.status(201).json({
  success: true,
  message:
    "Order placed successfully.",
  order: mappedOrder,
});
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Create customer order error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to create order.",
    });
  } finally {
    client.release();
  }
}

async function createCustomerOrderReview(
  req,
  res
) {
  const client =
    await pool.connect();

  try {
    const trackingToken =
      cleanText(
        req.params.trackingToken
      );

    const rating =
      Number(req.body.rating);

    const comment =
      cleanText(
        req.body.comment
      );

    if (!trackingToken) {
      return res.status(400).json({
        success: false,
        message:
          "Tracking token is required.",
      });
    }

    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Rating must be between 1 and 5.",
      });
    }

    if (comment.length > 1000) {
      return res.status(400).json({
        success: false,
        message:
          "Review comment must not exceed 1000 characters.",
      });
    }

    await client.query("BEGIN");

    const orderResult =
      await client.query(
        `
          SELECT
            id,
            restaurant_id,
            customer_id,
            status

          FROM restaurant_orders

          WHERE tracking_token =
            $1::uuid

          LIMIT 1

          FOR UPDATE
        `,
        [trackingToken]
      );

    if (
      orderResult.rows.length === 0
    ) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message:
          "Order was not found.",
      });
    }

    const order =
      orderResult.rows[0];

    if (
      order.status !== "COMPLETED"
    ) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message:
          "You can review this restaurant after the order is completed.",
      });
    }

    const existingReviewResult =
      await client.query(
        `
          SELECT id

          FROM reviews

          WHERE restaurant_order_id =
            $1::uuid

          LIMIT 1
        `,
        [order.id]
      );

    if (
      existingReviewResult.rows.length >
      0
    ) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message:
          "This order has already been reviewed.",
      });
    }

    const reviewResult =
      await client.query(
        `
          INSERT INTO reviews (
            customer_id,
            restaurant_id,
            restaurant_order_id,
            rating,
            comment,
            is_approved
          )
          VALUES (
            $1::uuid,
            $2::uuid,
            $3::uuid,
            $4::integer,
            $5::text,
            TRUE
          )
          RETURNING
            id,
            customer_id,
            restaurant_id,
            restaurant_order_id,
            rating,
            comment,
            is_approved,
            created_at
        `,
        [
          order.customer_id,
          order.restaurant_id,
          order.id,
          rating,
          comment || null,
        ]
      );

    const ratingResult =
      await client.query(
        `
          SELECT
            COALESCE(
              AVG(rating),
              0
            )::numeric(3,2)
              AS average_rating,

            COUNT(*)::integer
              AS total_reviews

          FROM reviews

          WHERE restaurant_id =
            $1::uuid

            AND is_approved = TRUE
        `,
        [order.restaurant_id]
      );

    await client.query(
      `
        UPDATE restaurants

        SET
          average_rating =
            $1::numeric,

          total_reviews =
            $2::integer,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id = $3::uuid
      `,
      [
        ratingResult.rows[0]
          .average_rating,

        ratingResult.rows[0]
          .total_reviews,

        order.restaurant_id,
      ]
    );

   const statusNotificationDetails = {
  ACCEPTED: {
    type: "ORDER_ACCEPTED",
    title: "Order accepted",
    message:
      `${updatedResult.rows[0].order_number} was accepted by the kitchen.`,
  },

  PREPARING: {
    type: "ORDER_PREPARING",
    title: "Order preparing",
    message:
      `${updatedResult.rows[0].order_number} is now being prepared.`,
  },

  READY: {
    type: "ORDER_READY",
    title: "Order ready",
    message:
      `${updatedResult.rows[0].order_number} is ready.`,
  },

  OUT_FOR_DELIVERY: {
    type: "ORDER_OUT_FOR_DELIVERY",
    title: "Order out for delivery",
    message:
      `${updatedResult.rows[0].order_number} is out for delivery.`,
  },

  COMPLETED: {
    type: "ORDER_COMPLETED",
    title: "Order completed",
    message:
      `${updatedResult.rows[0].order_number} has been completed.`,
  },

  CANCELLED: {
    type: "ORDER_CANCELLED",
    title: "Order cancelled",
    message:
      `${updatedResult.rows[0].order_number} was cancelled.`,
  },

  REJECTED: {
    type: "ORDER_REJECTED",
    title: "Order rejected",
    message:
      `${updatedResult.rows[0].order_number} was rejected.`,
  },
};

let statusNotification = null;

if (statusNotificationDetails[nextStatus]) {
  statusNotification =
    await createRestaurantNotification(
      client,
      {
        restaurantId:
          restaurant.id,

        recipientUserId:
          restaurant.owner_id,

        orderId:
          updatedResult.rows[0].id,

        type:
          statusNotificationDetails[nextStatus]
            .type,

        title:
          statusNotificationDetails[nextStatus]
            .title,

        message:
          statusNotificationDetails[nextStatus]
            .message,

        metadata: {
          orderNumber:
            updatedResult.rows[0]
              .order_number,

          status:
            nextStatus,
        },
      }
    );
}

await client.query(
  "COMMIT"
);

    return res.status(201).json({
      success: true,
      message:
        "Thank you for reviewing the restaurant.",

      review: {
        id:
          reviewResult.rows[0].id,

        rating:
          Number(
            reviewResult.rows[0]
              .rating
          ),

        comment:
          reviewResult.rows[0]
            .comment,

        createdAt:
          reviewResult.rows[0]
            .created_at,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Create customer order review error:",
      error
    );

    if (
      error.code === "22P02"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "The tracking token is invalid.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to submit the review.",
    });
  } finally {
    client.release();
  }
}

async function getCustomerOrders(
  req,
  res
) {
  try {
    const customerId =
      req.user?.id ||
      req.user?.userId ||
      req.user?.sub;

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message:
          "Customer authentication is required.",
      });
    }

    const result =
      await pool.query(
        `
          SELECT
            ro.id,
            ro.restaurant_id,
            ro.customer_id,
            ro.order_number,
            ro.customer_name,
            ro.customer_phone,
            ro.order_type,
            ro.delivery_address,
            ro.customer_notes,
            ro.subtotal,
            ro.delivery_fee,
            ro.discount_amount,
            ro.total_amount,
            ro.status,
            ro.payment_status,
            ro.payment_method,
            ro.placed_at,
            ro.accepted_at,
            ro.completed_at,
            ro.cancelled_at,
            ro.created_at,
            ro.updated_at,
            ro.tracking_token,
            ro.estimated_preparation_minutes,

            r.name
              AS restaurant_name

          FROM restaurant_orders ro

          INNER JOIN restaurants r
            ON r.id =
              ro.restaurant_id

          WHERE ro.customer_id =
            $1::uuid

          ORDER BY
            ro.created_at DESC
        `,
        [
          customerId,
        ]
      );

    return res.status(200).json({
      success: true,

      count:
        result.rows.length,

      orders:
        result.rows.map(
          (order) => ({
            id:
              order.id,

            restaurantId:
              order.restaurant_id,

            restaurantName:
              order.restaurant_name,

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

            discountAmount:
              Number(
                order.discount_amount || 0
              ),

            totalAmount:
              Number(
                order.total_amount || 0
              ),

            status:
              order.status,

            paymentStatus:
              order.payment_status,

            paymentMethod:
              order.payment_method,

            trackingToken:
              order.tracking_token,

            estimatedPreparationMinutes:
              Number(
                order
                  .estimated_preparation_minutes ||
                20
              ),

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
          })
        ),
    });
  } catch (error) {
    console.error(
      "Get customer orders error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load your orders.",
    });
  }
}

module.exports = {
  createCustomerOrder,
  createCustomerOrderReview,
  getCustomerOrderByTrackingToken,
  getOwnerOrders,
  updateOwnerOrderStatus,
  getStaffOrders,
  updateStaffOrderStatus,
  getCustomerOrders,
};