"use strict";

const pool = require("../config/db");

async function findOwnerRestaurant(
  client,
  ownerId
) {
  const result = await client.query(
    `
      SELECT
        id,
        name

      FROM restaurants

      WHERE owner_id = $1::uuid

      LIMIT 1
    `,
    [ownerId]
  );

  return result.rows[0] || null;
}

function cleanText(value) {
  const normalized =
    String(value ?? "").trim();

  return normalized || null;
}

function mapPromotion(row) {
  return {
    id: row.id,
    restaurantId:
      row.restaurant_id,
    name:
      row.name,
    description:
      row.description,
    promotionType:
      row.promotion_type,
    discountValue:
      row.discount_value === null
        ? null
        : Number(row.discount_value),
    promoCode:
      row.promo_code,
    minimumOrderAmount:
      Number(
        row.minimum_order_amount || 0
      ),
    maximumDiscountAmount:
      row.maximum_discount_amount === null
        ? null
        : Number(
            row.maximum_discount_amount
          ),
    totalUsageLimit:
      row.total_usage_limit,
    perCustomerUsageLimit:
      row.per_customer_usage_limit,
    startsAt:
      row.starts_at,
    endsAt:
      row.ends_at,
    isActive:
      Boolean(row.is_active),
    createdBy:
      row.created_by,
    createdAt:
      row.created_at,
    updatedAt:
      row.updated_at,
  };
}

async function getOwnerPromotions(
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

    const result = await pool.query(
      `
        SELECT
          id,
          restaurant_id,
          name,
          description,
          promotion_type,
          discount_value,
          promo_code,
          minimum_order_amount,
          maximum_discount_amount,
          total_usage_limit,
          per_customer_usage_limit,
          starts_at,
          ends_at,
          is_active,
          created_by,
          created_at,
          updated_at

        FROM restaurant_promotions

        WHERE restaurant_id = $1::uuid

        ORDER BY created_at DESC
      `,
      [restaurant.id]
    );

    return res.status(200).json({
      success: true,

      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
      },

      promotions:
        result.rows.map(
          mapPromotion
        ),
    });
  } catch (error) {
    console.error(
      "Get owner promotions error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load promotions.",
    });
  }
}

async function createOwnerPromotion(
  req,
  res
) {
  const client =
    await pool.connect();

  try {
    const ownerId =
      req.user.userId;

    const restaurant =
      await findOwnerRestaurant(
        client,
        ownerId
      );

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message:
          "Restaurant profile not found.",
      });
    }

    const {
      name,
      description,
      promotionType,
      discountValue,
      promoCode,
      minimumOrderAmount = 0,
      maximumDiscountAmount,
      totalUsageLimit,
      perCustomerUsageLimit = 1,
      startsAt,
      endsAt,
      isActive = true,
    } = req.body;

    const normalizedName =
      cleanText(name);

    const normalizedType =
      String(
        promotionType || ""
      )
        .trim()
        .toUpperCase();

    const normalizedPromoCode =
      cleanText(promoCode)
        ?.toUpperCase() || null;

    const allowedTypes = [
      "PERCENTAGE",
      "FIXED_AMOUNT",
      "FREE_DELIVERY",
    ];

    if (!normalizedName) {
      return res.status(400).json({
        success: false,
        message:
          "Promotion name is required.",
      });
    }

    if (
      !allowedTypes.includes(
        normalizedType
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid promotion type.",
      });
    }

    if (!startsAt || !endsAt) {
      return res.status(400).json({
        success: false,
        message:
          "Promotion start and end dates are required.",
      });
    }

    const startDate =
      new Date(startsAt);

    const endDate =
      new Date(endsAt);

    if (
      Number.isNaN(
        startDate.getTime()
      ) ||
      Number.isNaN(
        endDate.getTime()
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Enter valid promotion dates.",
      });
    }

    if (
      endDate <= startDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Promotion end date must be after the start date.",
      });
    }

    const normalizedDiscountValue =
      discountValue === null ||
      discountValue === undefined ||
      discountValue === ""
        ? null
        : Number(discountValue);

    if (
      normalizedType !==
        "FREE_DELIVERY" &&
      (
        !Number.isFinite(
          normalizedDiscountValue
        ) ||
        normalizedDiscountValue <= 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Discount value must be greater than zero.",
      });
    }

    if (
      normalizedType ===
        "PERCENTAGE" &&
      normalizedDiscountValue > 100
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Percentage discount cannot exceed 100.",
      });
    }

    const result =
      await client.query(
        `
          INSERT INTO restaurant_promotions (
            restaurant_id,
            name,
            description,
            promotion_type,
            discount_value,
            promo_code,
            minimum_order_amount,
            maximum_discount_amount,
            total_usage_limit,
            per_customer_usage_limit,
            starts_at,
            ends_at,
            is_active,
            created_by
          )
          VALUES (
            $1::uuid,
            $2::varchar,
            $3::text,
            $4::varchar,
            $5::numeric,
            $6::varchar,
            $7::numeric,
            $8::numeric,
            $9::integer,
            $10::integer,
            $11::timestamptz,
            $12::timestamptz,
            $13::boolean,
            $14::uuid
          )
          RETURNING
            id,
            restaurant_id,
            name,
            description,
            promotion_type,
            discount_value,
            promo_code,
            minimum_order_amount,
            maximum_discount_amount,
            total_usage_limit,
            per_customer_usage_limit,
            starts_at,
            ends_at,
            is_active,
            created_by,
            created_at,
            updated_at
        `,
        [
          restaurant.id,
          normalizedName,
          cleanText(description),
          normalizedType,
          normalizedType ===
            "FREE_DELIVERY"
            ? null
            : normalizedDiscountValue,
          normalizedPromoCode,
          Number(
            minimumOrderAmount || 0
          ),
          maximumDiscountAmount ===
              null ||
            maximumDiscountAmount ===
              undefined ||
            maximumDiscountAmount === ""
            ? null
            : Number(
                maximumDiscountAmount
              ),
          totalUsageLimit === null ||
            totalUsageLimit ===
              undefined ||
            totalUsageLimit === ""
            ? null
            : Number.parseInt(
                totalUsageLimit,
                10
              ),
          Number.parseInt(
            perCustomerUsageLimit,
            10
          ) || 1,
          startDate.toISOString(),
          endDate.toISOString(),
          Boolean(isActive),
          ownerId,
        ]
      );

    return res.status(201).json({
      success: true,
      message:
        "Promotion created successfully.",
      promotion:
        mapPromotion(
          result.rows[0]
        ),
    });
  } catch (error) {
    console.error(
      "Create owner promotion error:",
      error
    );

    if (
      error.code === "23505"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "That promo code already exists for this restaurant.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to create promotion.",
    });
  } finally {
    client.release();
  }
}

async function updateOwnerPromotion(
  req,
  res
) {
  try {
    const ownerId =
      req.user.userId;

    const promotionId =
      req.params.promotionId;

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

    const existingResult =
      await pool.query(
        `
          SELECT
            id,
            restaurant_id,
            name,
            description,
            promotion_type,
            discount_value,
            promo_code,
            minimum_order_amount,
            maximum_discount_amount,
            total_usage_limit,
            per_customer_usage_limit,
            starts_at,
            ends_at,
            is_active,
            created_by,
            created_at,
            updated_at

          FROM restaurant_promotions

          WHERE id = $1::uuid
            AND restaurant_id = $2::uuid

          LIMIT 1
        `,
        [
          promotionId,
          restaurant.id,
        ]
      );

    if (
      existingResult.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Promotion not found.",
      });
    }

    const existing =
      existingResult.rows[0];

    const {
      name,
      description,
      promotionType,
      discountValue,
      promoCode,
      minimumOrderAmount,
      maximumDiscountAmount,
      totalUsageLimit,
      perCustomerUsageLimit,
      startsAt,
      endsAt,
      isActive,
    } = req.body;

    const normalizedName =
      name === undefined
        ? existing.name
        : cleanText(name);

    const normalizedType =
      promotionType === undefined
        ? existing.promotion_type
        : String(promotionType)
            .trim()
            .toUpperCase();

    const allowedTypes = [
      "PERCENTAGE",
      "FIXED_AMOUNT",
      "FREE_DELIVERY",
    ];

    if (!normalizedName) {
      return res.status(400).json({
        success: false,
        message:
          "Promotion name is required.",
      });
    }

    if (
      !allowedTypes.includes(
        normalizedType
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid promotion type.",
      });
    }

    const normalizedPromoCode =
      promoCode === undefined
        ? existing.promo_code
        : cleanText(promoCode)
            ?.toUpperCase() || null;

    let normalizedDiscountValue =
      discountValue === undefined
        ? existing.discount_value === null
          ? null
          : Number(
              existing.discount_value
            )
        : discountValue === null ||
          discountValue === ""
        ? null
        : Number(discountValue);

    if (
      normalizedType ===
      "FREE_DELIVERY"
    ) {
      normalizedDiscountValue = null;
    }

    if (
      normalizedType !==
        "FREE_DELIVERY" &&
      (
        !Number.isFinite(
          normalizedDiscountValue
        ) ||
        normalizedDiscountValue <= 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Discount value must be greater than zero.",
      });
    }

    if (
      normalizedType ===
        "PERCENTAGE" &&
      normalizedDiscountValue > 100
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Percentage discount cannot exceed 100.",
      });
    }

    const startDate =
      startsAt === undefined
        ? new Date(
            existing.starts_at
          )
        : new Date(startsAt);

    const endDate =
      endsAt === undefined
        ? new Date(
            existing.ends_at
          )
        : new Date(endsAt);

    if (
      Number.isNaN(
        startDate.getTime()
      ) ||
      Number.isNaN(
        endDate.getTime()
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Enter valid promotion dates.",
      });
    }

    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message:
          "Promotion end date must be after the start date.",
      });
    }

    const result =
      await pool.query(
        `
          UPDATE restaurant_promotions

          SET
            name = $1::varchar,
            description = $2::text,
            promotion_type = $3::varchar,
            discount_value = $4::numeric,
            promo_code = $5::varchar,
            minimum_order_amount = $6::numeric,
            maximum_discount_amount = $7::numeric,
            total_usage_limit = $8::integer,
            per_customer_usage_limit = $9::integer,
            starts_at = $10::timestamptz,
            ends_at = $11::timestamptz,
            is_active = $12::boolean,
            updated_at = CURRENT_TIMESTAMP

          WHERE id = $13::uuid
            AND restaurant_id = $14::uuid

          RETURNING
            id,
            restaurant_id,
            name,
            description,
            promotion_type,
            discount_value,
            promo_code,
            minimum_order_amount,
            maximum_discount_amount,
            total_usage_limit,
            per_customer_usage_limit,
            starts_at,
            ends_at,
            is_active,
            created_by,
            created_at,
            updated_at
        `,
        [
          normalizedName,

          description === undefined
            ? existing.description
            : cleanText(description),

          normalizedType,

          normalizedDiscountValue,

          normalizedPromoCode,

          minimumOrderAmount ===
          undefined
            ? Number(
                existing.minimum_order_amount
              )
            : Number(
                minimumOrderAmount || 0
              ),

          maximumDiscountAmount ===
          undefined
            ? existing.maximum_discount_amount
            : maximumDiscountAmount ===
                null ||
              maximumDiscountAmount ===
                ""
            ? null
            : Number(
                maximumDiscountAmount
              ),

          totalUsageLimit === undefined
            ? existing.total_usage_limit
            : totalUsageLimit === null ||
              totalUsageLimit === ""
            ? null
            : Number.parseInt(
                totalUsageLimit,
                10
              ),

          perCustomerUsageLimit ===
          undefined
            ? existing.per_customer_usage_limit
            : Number.parseInt(
                perCustomerUsageLimit,
                10
              ) || 1,

          startDate.toISOString(),

          endDate.toISOString(),

          isActive === undefined
            ? Boolean(
                existing.is_active
              )
            : Boolean(isActive),

          promotionId,

          restaurant.id,
        ]
      );

    return res.status(200).json({
      success: true,
      message:
        "Promotion updated successfully.",
      promotion:
        mapPromotion(
          result.rows[0]
        ),
    });
  } catch (error) {
    console.error(
      "Update owner promotion error:",
      error
    );

    if (
      error.code === "23505"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "That promo code already exists for this restaurant.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to update promotion.",
    });
  }
}


async function deleteOwnerPromotion(
  req,
  res
) {
  try {
    const ownerId =
      req.user.userId;

    const promotionId =
      req.params.promotionId;

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

    const result =
      await pool.query(
        `
          DELETE FROM restaurant_promotions

          WHERE id = $1::uuid
            AND restaurant_id = $2::uuid

          RETURNING
            id,
            name,
            promo_code
        `,
        [
          promotionId,
          restaurant.id,
        ]
      );

    if (
      result.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Promotion not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Promotion deleted successfully.",
      promotion: {
        id:
          result.rows[0].id,

        name:
          result.rows[0].name,

        promoCode:
          result.rows[0].promo_code,
      },
    });
  } catch (error) {
    console.error(
      "Delete owner promotion error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to delete promotion.",
    });
  }
}


async function validateCustomerPromotion(
  req,
  res
) {
  try {
    const {
      restaurantId,
      promoCode,
      subtotal,
      customerId = null,
    } = req.body;

    const normalizedRestaurantId =
      String(
        restaurantId || ""
      ).trim();

    const normalizedPromoCode =
      String(
        promoCode || ""
      )
        .trim()
        .toUpperCase();

    const normalizedSubtotal =
      Number(subtotal);

    if (
      !normalizedRestaurantId ||
      !normalizedPromoCode
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Restaurant and promo code are required.",
      });
    }

    if (
      !Number.isFinite(
        normalizedSubtotal
      ) ||
      normalizedSubtotal < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Enter a valid order subtotal.",
      });
    }

    const promotionResult =
      await pool.query(
        `
          SELECT
            id,
            restaurant_id,
            name,
            description,
            promotion_type,
            discount_value,
            promo_code,
            minimum_order_amount,
            maximum_discount_amount,
            total_usage_limit,
            per_customer_usage_limit,
            starts_at,
            ends_at,
            is_active,
            created_by,
            created_at,
            updated_at

          FROM restaurant_promotions

          WHERE restaurant_id = $1::uuid
            AND UPPER(promo_code) = $2::varchar

          LIMIT 1
        `,
        [
          normalizedRestaurantId,
          normalizedPromoCode,
        ]
      );

    if (
      promotionResult.rows.length === 0
    ) {
      return res.status(404).json({
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

    if (!promotion.is_active) {
      return res.status(400).json({
        success: false,
        message:
          "This promotion is inactive.",
      });
    }

    if (now < startsAt) {
      return res.status(400).json({
        success: false,
        message:
          "This promotion has not started yet.",
      });
    }

    if (now > endsAt) {
      return res.status(400).json({
        success: false,
        message:
          "This promotion has expired.",
      });
    }

    const minimumOrderAmount =
      Number(
        promotion.minimum_order_amount || 0
      );

    if (
      normalizedSubtotal <
      minimumOrderAmount
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Minimum order amount is KES ${minimumOrderAmount.toLocaleString(
            "en-KE"
          )}.`,
      });
    }

    const totalUsageResult =
      await pool.query(
        `
          SELECT
            COUNT(*)::integer
              AS usage_count

          FROM promotion_usages

          WHERE promotion_id = $1::uuid
        `,
        [promotion.id]
      );

    const totalUsageCount =
      Number(
        totalUsageResult.rows[0]
          ?.usage_count || 0
      );

    if (
      promotion.total_usage_limit !==
        null &&
      totalUsageCount >=
        Number(
          promotion.total_usage_limit
        )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This promotion has reached its usage limit.",
      });
    }

    if (customerId) {
      const customerUsageResult =
        await pool.query(
          `
            SELECT
              COUNT(*)::integer
                AS usage_count

            FROM promotion_usages

            WHERE promotion_id = $1::uuid
              AND customer_id = $2::uuid
          `,
          [
            promotion.id,
            customerId,
          ]
        );

      const customerUsageCount =
        Number(
          customerUsageResult.rows[0]
            ?.usage_count || 0
        );

      if (
        customerUsageCount >=
        Number(
          promotion.per_customer_usage_limit ||
          1
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "You have already used this promotion the maximum number of times.",
        });
      }
    }

    let discountAmount = 0;

    if (
      promotion.promotion_type ===
      "PERCENTAGE"
    ) {
      discountAmount =
        normalizedSubtotal *
        (
          Number(
            promotion.discount_value
          ) / 100
        );

      if (
        promotion.maximum_discount_amount !==
        null
      ) {
        discountAmount =
          Math.min(
            discountAmount,
            Number(
              promotion.maximum_discount_amount
            )
          );
      }
    }

    if (
      promotion.promotion_type ===
      "FIXED_AMOUNT"
    ) {
      discountAmount =
        Number(
          promotion.discount_value
        );
    }

    if (
      promotion.promotion_type ===
      "FREE_DELIVERY"
    ) {
      discountAmount = 0;
    }

    discountAmount =
      Math.min(
        discountAmount,
        normalizedSubtotal
      );

    discountAmount =
      Number(
        discountAmount.toFixed(2)
      );

    const finalSubtotal =
      Number(
        (
          normalizedSubtotal -
          discountAmount
        ).toFixed(2)
      );

    return res.status(200).json({
      success: true,
      message:
        "Promotion applied successfully.",

      promotion:
        mapPromotion(promotion),

      pricing: {
        originalSubtotal:
          normalizedSubtotal,

        discountAmount,

        finalSubtotal,

        freeDelivery:
          promotion.promotion_type ===
          "FREE_DELIVERY",
      },
    });
  } catch (error) {
    console.error(
      "Validate customer promotion error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to validate promotion.",
    });
  }
}
module.exports = {
  getOwnerPromotions,
  createOwnerPromotion,
  updateOwnerPromotion,
  deleteOwnerPromotion,
  validateCustomerPromotion,
};