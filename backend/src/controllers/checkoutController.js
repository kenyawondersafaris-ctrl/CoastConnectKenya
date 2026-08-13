"use strict";

const pool = require("../config/db");

const {
  resolveDeliveryZone,
} = require(
  "./restaurantDeliveryZoneController"
);

function cleanText(value) {
  return String(value ?? "").trim();
}

async function createCheckoutSession(
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
      customerNotes,
      tableNumber,
      guestCount,
      promoCode,
      items,
    } = req.body;

    const normalizedOrderType =
      cleanText(orderType)
        .toUpperCase();

    if (!restaurantId) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(400).json({
        success: false,
        message:
          "Restaurant is required.",
      });
    }

    if (
      !cleanText(customerName)
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(400).json({
        success: false,
        message:
          "Customer name is required.",
      });
    }

    if (
      !cleanText(customerPhone)
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(400).json({
        success: false,
        message:
          "Customer phone is required.",
      });
    }

    if (
      ![
        "DINE_IN",
        "PICKUP",
        "DELIVERY",
      ].includes(
        normalizedOrderType
      )
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(400).json({
        success: false,
        message:
          "Order type must be DINE_IN, PICKUP, or DELIVERY.",
      });
    }

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(400).json({
        success: false,
        message:
          "Add at least one menu item.",
      });
    }

    if (
      normalizedOrderType ===
        "DINE_IN" &&
      !cleanText(tableNumber)
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(400).json({
        success: false,
        message:
          "Table number is required for dine-in orders.",
      });
    }

    if (
      normalizedOrderType ===
        "DINE_IN" &&
      (
        !Number.isInteger(
          Number(guestCount)
        ) ||
        Number(guestCount) < 1
      )
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(400).json({
        success: false,
        message:
          "A valid guest count is required for dine-in orders.",
      });
    }

    if (
      normalizedOrderType ===
        "DELIVERY" &&
      !cleanText(
        deliveryAddress
      )
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(400).json({
        success: false,
        message:
          "Delivery address is required for delivery orders.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Restaurant
    |--------------------------------------------------------------------------
    */

    const restaurantResult =
      await client.query(
        `
          SELECT
            id,
            name,
            offers_delivery,
            approval_status,
            is_accepting_orders,
            temporary_closed_reason

          FROM restaurants

          WHERE id = $1::uuid

          LIMIT 1
        `,
        [
          restaurantId,
        ]
      );

    if (
      restaurantResult
        .rows.length === 0
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(404).json({
        success: false,
        message:
          "Restaurant not found.",
      });
    }

    const restaurant =
      restaurantResult.rows[0];

    if (
      restaurant
        .is_accepting_orders ===
      false
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(409).json({
        success: false,
        message:
          restaurant
            .temporary_closed_reason ||
          "This restaurant is not accepting new orders at the moment.",
      });
    }

    if (
      restaurant
        .approval_status !==
      "APPROVED"
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(400).json({
        success: false,
        message:
          "This restaurant is not currently available for checkout.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Delivery
    |--------------------------------------------------------------------------
    */

    let deliveryFee = 0;
    let deliveryZone = null;

    if (
      normalizedOrderType ===
        "DELIVERY" &&
      !restaurant.offers_delivery
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(400).json({
        success: false,
        message:
          "This restaurant does not currently offer delivery.",
      });
    }

    if (
      normalizedOrderType ===
      "DELIVERY"
    ) {
      deliveryZone =
        await resolveDeliveryZone(
          restaurant.id,
          deliveryAddress
        );

      if (!deliveryZone) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(400)
          .json({
            success: false,
            message:
              "Sorry, this restaurant does not currently deliver to that location.",
          });
      }

      deliveryFee =
        deliveryZone.deliveryFee;
    }

    /*
    |--------------------------------------------------------------------------
    | Validate menu items
    |--------------------------------------------------------------------------
    */

    let subtotal = 0;

    let estimatedPreparationMinutes =
      0;

    const validatedItems = [];

    for (
      const item of items
    ) {
      const menuItemResult =
        await client.query(
          `
            SELECT
              id,
              name,
              price,
              is_available,
              preparation_minutes

            FROM menu_items

            WHERE id =
              $1::uuid

              AND restaurant_id =
                $2::uuid

            LIMIT 1
          `,
          [
            item.menuItemId,
            restaurant.id,
          ]
        );

      if (
        menuItemResult
          .rows.length === 0
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(404)
          .json({
            success: false,
            message:
              "One or more menu items were not found.",
          });
      }

      const menuItem =
        menuItemResult.rows[0];

      if (
        !menuItem.is_available
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(400)
          .json({
            success: false,
            message:
              `${menuItem.name} is currently unavailable.`,
          });
      }

      const quantity =
        Number(
          item.quantity
        );

      if (
        !Number.isInteger(
          quantity
        ) ||
        quantity < 1
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(400)
          .json({
            success: false,
            message:
              "Each menu item must have a valid quantity.",
          });
      }

      const unitPrice =
        Number(
          menuItem.price
        );

      const lineTotal =
        unitPrice *
        quantity;

      subtotal +=
        lineTotal;

      estimatedPreparationMinutes =
        Math.max(
          estimatedPreparationMinutes,
          Number(
            menuItem
              .preparation_minutes ||
            20
          )
        );

      validatedItems.push({
        menuItemId:
          menuItem.id,

        itemName:
          menuItem.name,

        unitPrice,

        quantity,

        lineTotal,

        itemNotes:
          cleanText(
            item.itemNotes
          ) || null,
      });
    }

    if (
      estimatedPreparationMinutes ===
      0
    ) {
      estimatedPreparationMinutes =
        20;
    }

    /*
    |--------------------------------------------------------------------------
    | Promotion
    |--------------------------------------------------------------------------
    */

    let appliedPromotion =
      null;

    let discountAmount = 0;

    let normalizedPromoCode =
      cleanText(
        promoCode
      ).toUpperCase();

    if (
      normalizedPromoCode
    ) {
      const promotionResult =
        await client.query(
          `
            SELECT
              id,
              restaurant_id,
              name,
              promotion_type,
              discount_value,
              promo_code,
              minimum_order_amount,
              maximum_discount_amount,
              total_usage_limit,
              starts_at,
              ends_at,
              is_active

            FROM restaurant_promotions

            WHERE restaurant_id =
              $1::uuid

              AND UPPER(
                promo_code
              ) = $2::varchar

            LIMIT 1
          `,
          [
            restaurant.id,
            normalizedPromoCode,
          ]
        );

      if (
        promotionResult
          .rows.length === 0
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(404)
          .json({
            success: false,
            message:
              "Promo code not found.",
          });
      }

      const promotion =
        promotionResult.rows[0];

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

      if (
        !promotion.is_active
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(400)
          .json({
            success: false,
            message:
              "This promotion is inactive.",
          });
      }

      if (
        now < startsAt
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(400)
          .json({
            success: false,
            message:
              "This promotion has not started yet.",
          });
      }

      if (
        now > endsAt
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(400)
          .json({
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

      if (
        subtotal <
        minimumOrderAmount
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(400)
          .json({
            success: false,
            message:
              `Minimum order amount is KES ${minimumOrderAmount.toLocaleString(
                "en-KE"
              )}.`,
          });
      }

      const usageResult =
        await client.query(
          `
            SELECT
              COUNT(*)::integer
                AS usage_count

            FROM promotion_usages

            WHERE promotion_id =
              $1::uuid
          `,
          [
            promotion.id,
          ]
        );

      const usageCount =
        Number(
          usageResult
            .rows[0]
            ?.usage_count ||
          0
        );

      if (
        promotion
          .total_usage_limit !==
          null &&
        usageCount >=
          Number(
            promotion
              .total_usage_limit
          )
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(400)
          .json({
            success: false,
            message:
              "This promotion has reached its usage limit.",
          });
      }

      if (
        promotion
          .promotion_type ===
        "PERCENTAGE"
      ) {
        discountAmount =
          subtotal *
          (
            Number(
              promotion
                .discount_value
            ) / 100
          );

        if (
          promotion
            .maximum_discount_amount !==
          null
        ) {
          discountAmount =
            Math.min(
              discountAmount,
              Number(
                promotion
                  .maximum_discount_amount
              )
            );
        }
      }

      if (
        promotion
          .promotion_type ===
        "FIXED_AMOUNT"
      ) {
        discountAmount =
          Number(
            promotion
              .discount_value
          );
      }

      if (
        promotion
          .promotion_type ===
        "FREE_DELIVERY"
      ) {
        deliveryFee = 0;
      }

      discountAmount =
        Math.min(
          discountAmount,
          subtotal
        );

      discountAmount =
        Number(
          discountAmount
            .toFixed(2)
        );

      appliedPromotion =
        promotion;
    }

    /*
    |--------------------------------------------------------------------------
    | Final total
    |--------------------------------------------------------------------------
    */

    const totalAmount =
      Number(
        (
          subtotal -
          discountAmount +
          deliveryFee
        ).toFixed(2)
      );

    /*
    |--------------------------------------------------------------------------
    | Authenticated customer
    |--------------------------------------------------------------------------
    |
    | Optional authentication means:
    |
    | CUSTOMER token -> save user ID
    | Guest checkout -> NULL
    | Other roles    -> NULL
    |
    */

    const authenticatedCustomerId =
      req.user?.role ===
      "CUSTOMER"
        ? (
            req.user.id ||
            req.user.userId ||
            req.user.sub ||
            null
          )
        : null;

    /*
    |--------------------------------------------------------------------------
    | Create checkout session
    |--------------------------------------------------------------------------
    */

    const sessionResult =
      await client.query(
        `
          INSERT INTO
            checkout_sessions (
              restaurant_id,
              customer_id,
              customer_name,
              customer_phone,
              order_type,
              delivery_address,
              customer_notes,
              table_number,
              guest_count,
              subtotal,
              delivery_fee,
              delivery_zone_id,
              estimated_delivery_minutes,
              discount_amount,
              total_amount,
              promotion_id,
              promo_code,
              estimated_preparation_minutes,
              payment_method,
              status,
              expires_at
            )

          VALUES (
            $1::uuid,
            $2::uuid,
            $3::varchar,
            $4::varchar,
            $5::varchar,
            $6::text,
            $7::text,
            $8::varchar,
            $9::integer,
            $10::numeric,
            $11::numeric,
            $12::uuid,
            $13::integer,
            $14::numeric,
            $15::numeric,
            $16::uuid,
            $17::varchar,
            $18::integer,
            'MPESA',
            'PENDING',
            CURRENT_TIMESTAMP +
              INTERVAL '30 minutes'
          )

          RETURNING
            id,
            session_token,
            restaurant_id,
            customer_id,
            customer_name,
            customer_phone,
            order_type,
            subtotal,
            delivery_fee,
            delivery_zone_id,
            estimated_delivery_minutes,
            discount_amount,
            total_amount,
            promotion_id,
            promo_code,
            estimated_preparation_minutes,
            payment_method,
            status,
            expires_at,
            created_at
        `,
        [
          restaurant.id,

          authenticatedCustomerId,

          cleanText(
            customerName
          ),

          cleanText(
            customerPhone
          ),

          normalizedOrderType,

          normalizedOrderType ===
            "DELIVERY"
            ? cleanText(
                deliveryAddress
              )
            : null,

          cleanText(
            customerNotes
          ) || null,

          normalizedOrderType ===
            "DINE_IN"
            ? cleanText(
                tableNumber
              )
            : null,

          normalizedOrderType ===
            "DINE_IN"
            ? Number(
                guestCount
              )
            : null,

          subtotal,

          deliveryFee,

          deliveryZone
            ? deliveryZone.id
            : null,

          deliveryZone
            ? deliveryZone
                .estimatedDeliveryMinutes
            : null,

          discountAmount,

          totalAmount,

          appliedPromotion
            ? appliedPromotion.id
            : null,

          normalizedPromoCode ||
            null,

          estimatedPreparationMinutes,
        ]
      );

    const checkoutSession =
      sessionResult.rows[0];

    /*
    |--------------------------------------------------------------------------
    | Checkout items
    |--------------------------------------------------------------------------
    */

    for (
      const item of
        validatedItems
    ) {
      await client.query(
        `
          INSERT INTO
            checkout_session_items (
              checkout_session_id,
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
        `,
        [
          checkoutSession.id,
          item.menuItemId,
          item.itemName,
          item.unitPrice,
          item.quantity,
          item.lineTotal,
          item.itemNotes,
        ]
      );
    }

    await client.query(
      "COMMIT"
    );

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return res
      .status(201)
      .json({
        success: true,

        message:
          "Checkout session created successfully.",

        checkoutSession: {
          id:
            checkoutSession.id,

          sessionToken:
            checkoutSession
              .session_token,

          restaurantId:
            checkoutSession
              .restaurant_id,

          customerId:
            checkoutSession
              .customer_id,

          restaurantName:
            restaurant.name,

          customerName:
            checkoutSession
              .customer_name,

          customerPhone:
            checkoutSession
              .customer_phone,

          orderType:
            checkoutSession
              .order_type,

          subtotal:
            Number(
              checkoutSession
                .subtotal
            ),

          deliveryFee:
            Number(
              checkoutSession
                .delivery_fee
            ),

          deliveryZone:
            deliveryZone
              ? {
                  id:
                    deliveryZone.id,

                  name:
                    deliveryZone.name,

                  estimatedDeliveryMinutes:
                    deliveryZone
                      .estimatedDeliveryMinutes,
                }
              : null,

          discountAmount:
            Number(
              checkoutSession
                .discount_amount ||
              0
            ),

          totalAmount:
            Number(
              checkoutSession
                .total_amount
            ),

          promoCode:
            checkoutSession
              .promo_code,

          promotion:
            appliedPromotion
              ? {
                  id:
                    appliedPromotion.id,

                  name:
                    appliedPromotion.name,

                  promoCode:
                    appliedPromotion
                      .promo_code,

                  promotionType:
                    appliedPromotion
                      .promotion_type,
                }
              : null,

          estimatedPreparationMinutes:
            Number(
              checkoutSession
                .estimated_preparation_minutes
            ),

          paymentMethod:
            checkoutSession
              .payment_method,

          status:
            checkoutSession.status,

          expiresAt:
            checkoutSession
              .expires_at,

          items:
            validatedItems,
        },
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
        "Checkout rollback error:",
        rollbackError
      );
    }

    console.error(
      "Create checkout session error:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Unable to create checkout session.",
      });
  } finally {
    client.release();
  }
}

module.exports = {
  createCheckoutSession,
};