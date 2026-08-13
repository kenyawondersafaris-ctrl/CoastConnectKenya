"use strict";

const pool = require("../config/db");

function cleanText(value) {
  return String(value ?? "").trim();
}

async function getOwnerDeliveryZones(
  req,
  res
) {
  try {
    const ownerId =
      req.user?.id ||
      req.user?.userId;

    if (!ownerId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    const result =
      await pool.query(
        `
          SELECT
            dz.id,
            dz.restaurant_id,
            dz.name,
            dz.description,
            dz.minimum_order_amount,
            dz.delivery_fee,
            dz.estimated_delivery_minutes,
            dz.is_active,
            dz.display_order,
            dz.created_at,
            dz.updated_at

          FROM restaurant_delivery_zones dz

          INNER JOIN restaurants r
            ON r.id =
              dz.restaurant_id

          WHERE r.owner_id =
            $1::uuid

          ORDER BY
            dz.display_order ASC,
            dz.created_at ASC
        `,
        [ownerId]
      );

    const deliveryZones =
      result.rows.map((zone) => ({
        id:
          zone.id,

        restaurantId:
          zone.restaurant_id,

        name:
          zone.name,

        description:
          zone.description,

        minimumOrderAmount:
          Number(
            zone.minimum_order_amount || 0
          ),

        deliveryFee:
          Number(
            zone.delivery_fee || 0
          ),

        estimatedDeliveryMinutes:
          zone.estimated_delivery_minutes,

        isActive:
          zone.is_active,

        displayOrder:
          zone.display_order,

        createdAt:
          zone.created_at,

        updatedAt:
          zone.updated_at,
      }));

    return res.status(200).json({
      success: true,
      deliveryZones,
    });
  } catch (error) {
    console.error(
      "Get owner delivery zones error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load delivery zones.",
    });
  }
}

async function getRestaurantDeliveryZones(
  req,
  res
) {
  try {

    const restaurantId =
      cleanText(
        req.params.restaurantId
      );

    const result =
      await pool.query(
        `
        SELECT
          id,
          name,
          description,
          minimum_order_amount,
          delivery_fee,
          estimated_delivery_minutes,
          display_order,
          is_active,
          created_at,
          updated_at
        FROM
          restaurant_delivery_zones
        WHERE
          restaurant_id = $1::uuid
          AND is_active = TRUE
        ORDER BY
          display_order ASC,
          name ASC
        `,
        [restaurantId]
      );

    return res.json({
      success: true,

      deliveryZones:
        result.rows.map((zone) => ({
          id: zone.id,
          name: zone.name,
          description:
            zone.description,
          minimumOrderAmount:
            Number(
              zone.minimum_order_amount
            ),
          deliveryFee:
            Number(
              zone.delivery_fee
            ),
          estimatedDeliveryMinutes:
            zone.estimated_delivery_minutes,
          displayOrder:
            zone.display_order,
          isActive:
            zone.is_active,
          createdAt:
            zone.created_at,
          updatedAt:
            zone.updated_at,
        })),
    });

  } catch (error) {

    console.error(
      "Get restaurant delivery zones:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load delivery zones.",
    });

  }
}

async function resolveDeliveryZone(
  restaurantId,
  deliveryAddress
) {
  if (!deliveryAddress) {
    return null;
  }

  const normalizedAddress =
    deliveryAddress
      .trim()
      .toLowerCase();

  const result =
    await pool.query(
      `
      SELECT
        id,
        name,
        delivery_fee,
        minimum_order_amount,
        estimated_delivery_minutes
      FROM
        restaurant_delivery_zones
      WHERE
        restaurant_id = $1::uuid
        AND is_active = TRUE
      ORDER BY
        display_order ASC,
        name ASC
      `,
      [restaurantId]
    );

  const zone =
    result.rows.find((item) => {
      return normalizedAddress.includes(
        item.name.toLowerCase()
      );
    });

  if (!zone) {
    return null;
  }

  return {
    id: zone.id,
    name: zone.name,
    deliveryFee: Number(
      zone.delivery_fee
    ),
    minimumOrderAmount: Number(
      zone.minimum_order_amount
    ),
    estimatedDeliveryMinutes:
      zone.estimated_delivery_minutes,
  };
}

async function createOwnerDeliveryZone(
  req,
  res
) {
  const client =
    await pool.connect();

  try {
    const ownerId =
      req.user?.id ||
      req.user?.userId;

    const name =
      cleanText(req.body.name);

    const description =
      cleanText(
        req.body.description
      ) || null;

    const minimumOrderAmount =
      Number(
        req.body.minimumOrderAmount ?? 0
      );

    const deliveryFee =
      Number(
        req.body.deliveryFee ?? 0
      );

    const estimatedDeliveryMinutes =
      req.body.estimatedDeliveryMinutes ===
        null ||
      req.body.estimatedDeliveryMinutes ===
        undefined ||
      req.body.estimatedDeliveryMinutes ===
        ""
        ? null
        : Number.parseInt(
            req.body.estimatedDeliveryMinutes,
            10
          );

    const displayOrder =
      Number.parseInt(
        req.body.displayOrder ?? 0,
        10
      );

    const isActive =
      req.body.isActive !== false;

    if (!ownerId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message:
          "Delivery zone name is required.",
      });
    }

    if (
      !Number.isFinite(
        minimumOrderAmount
      ) ||
      minimumOrderAmount < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Minimum order amount must be zero or greater.",
      });
    }

    if (
      !Number.isFinite(deliveryFee) ||
      deliveryFee < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Delivery fee must be zero or greater.",
      });
    }

    if (
      estimatedDeliveryMinutes !== null &&
      (
        !Number.isInteger(
          estimatedDeliveryMinutes
        ) ||
        estimatedDeliveryMinutes <= 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Estimated delivery time must be a positive whole number.",
      });
    }

    if (
      !Number.isInteger(displayOrder) ||
      displayOrder < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Display order must be zero or greater.",
      });
    }

    await client.query("BEGIN");

    const restaurantResult =
      await client.query(
        `
          SELECT id

          FROM restaurants

          WHERE owner_id = $1::uuid

          LIMIT 1

          FOR UPDATE
        `,
        [ownerId]
      );

    if (
      restaurantResult.rows.length === 0
    ) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message:
          "Create your restaurant profile before adding delivery zones.",
      });
    }

    const restaurantId =
      restaurantResult.rows[0].id;

    const result =
      await client.query(
        `
          INSERT INTO restaurant_delivery_zones (
            restaurant_id,
            name,
            description,
            minimum_order_amount,
            delivery_fee,
            estimated_delivery_minutes,
            is_active,
            display_order
          )
          VALUES (
            $1::uuid,
            $2::varchar,
            $3::varchar,
            $4::numeric,
            $5::numeric,
            $6::integer,
            $7::boolean,
            $8::integer
          )
          RETURNING
            id,
            restaurant_id,
            name,
            description,
            minimum_order_amount,
            delivery_fee,
            estimated_delivery_minutes,
            is_active,
            display_order,
            created_at,
            updated_at
        `,
        [
          restaurantId,
          name,
          description,
          minimumOrderAmount,
          deliveryFee,
          estimatedDeliveryMinutes,
          isActive,
          displayOrder,
        ]
      );

    await client.query("COMMIT");

    const zone =
      result.rows[0];

    return res.status(201).json({
      success: true,
      message:
        "Delivery zone created successfully.",

      deliveryZone: {
        id:
          zone.id,

        restaurantId:
          zone.restaurant_id,

        name:
          zone.name,

        description:
          zone.description,

        minimumOrderAmount:
          Number(
            zone.minimum_order_amount
          ),

        deliveryFee:
          Number(
            zone.delivery_fee
          ),

        estimatedDeliveryMinutes:
          zone.estimated_delivery_minutes,

        isActive:
          zone.is_active,

        displayOrder:
          zone.display_order,

        createdAt:
          zone.created_at,

        updatedAt:
          zone.updated_at,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Create owner delivery zone error:",
      error
    );

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message:
          "A delivery zone with that name already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to create the delivery zone.",
    });
  } finally {
    client.release();
  }
}

async function updateOwnerDeliveryZone(
  req,
  res
) {
  const client =
    await pool.connect();

  try {
    const ownerId =
      req.user?.id ||
      req.user?.userId;

    const zoneId =
      cleanText(req.params.zoneId);

    const name =
      cleanText(req.body.name);

    const description =
      cleanText(
        req.body.description
      ) || null;

    const minimumOrderAmount =
      Number(
        req.body.minimumOrderAmount ?? 0
      );

    const deliveryFee =
      Number(
        req.body.deliveryFee ?? 0
      );

    const estimatedDeliveryMinutes =
      req.body.estimatedDeliveryMinutes ===
        null ||
      req.body.estimatedDeliveryMinutes ===
        undefined ||
      req.body.estimatedDeliveryMinutes ===
        ""
        ? null
        : Number.parseInt(
            req.body.estimatedDeliveryMinutes,
            10
          );

    const displayOrder =
      Number.parseInt(
        req.body.displayOrder ?? 0,
        10
      );

    const isActive =
      req.body.isActive !== false;

    await client.query("BEGIN");

    const zoneResult =
      await client.query(
        `
        SELECT
          dz.id
        FROM restaurant_delivery_zones dz
        INNER JOIN restaurants r
          ON r.id = dz.restaurant_id
        WHERE
          dz.id = $1::uuid
          AND r.owner_id = $2::uuid
        LIMIT 1
        FOR UPDATE
        `,
        [
          zoneId,
          ownerId,
        ]
      );

    if (
      zoneResult.rows.length === 0
    ) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message:
          "Delivery zone not found.",
      });
    }

    const result =
      await client.query(
        `
        UPDATE restaurant_delivery_zones
        SET
          name = $1,
          description = $2,
          minimum_order_amount = $3,
          delivery_fee = $4,
          estimated_delivery_minutes = $5,
          is_active = $6,
          display_order = $7,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $8::uuid
        RETURNING *
        `,
        [
          name,
          description,
          minimumOrderAmount,
          deliveryFee,
          estimatedDeliveryMinutes,
          isActive,
          displayOrder,
          zoneId,
        ]
      );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message:
        "Delivery zone updated successfully.",
      deliveryZone:
        result.rows[0],
    });

  } catch (error) {

    await client.query(
      "ROLLBACK"
    );

    console.error(
      "Update delivery zone error:",
      error
    );

    if (
      error.code === "23505"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "A delivery zone with that name already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to update the delivery zone.",
    });

  } finally {

    client.release();

  }
}

async function deleteOwnerDeliveryZone(
  req,
  res
) {
  const client =
    await pool.connect();

  try {
    const ownerId =
      req.user?.id ||
      req.user?.userId;

    const zoneId =
      cleanText(req.params.zoneId);

    if (!ownerId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    if (!zoneId) {
      return res.status(400).json({
        success: false,
        message:
          "Delivery zone ID is required.",
      });
    }

    await client.query("BEGIN");

    const result =
      await client.query(
        `
          DELETE FROM
            restaurant_delivery_zones dz

          USING restaurants r

          WHERE dz.id =
            $1::uuid

            AND r.id =
              dz.restaurant_id

            AND r.owner_id =
              $2::uuid

          RETURNING
            dz.id,
            dz.name
        `,
        [
          zoneId,
          ownerId,
        ]
      );

    if (
      result.rows.length === 0
    ) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message:
          "Delivery zone not found.",
      });
    }

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message:
        "Delivery zone deleted successfully.",

      deliveryZone: {
        id:
          result.rows[0].id,

        name:
          result.rows[0].name,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Delete owner delivery zone error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to delete the delivery zone.",
    });
  } finally {
    client.release();
  }
}

module.exports = {
  getOwnerDeliveryZones,
  createOwnerDeliveryZone,
  updateOwnerDeliveryZone,
  deleteOwnerDeliveryZone,
  getRestaurantDeliveryZones,
  resolveDeliveryZone,
};