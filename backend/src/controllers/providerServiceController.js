"use strict";

const pool = require("../config/db");

const ALLOWED_PRICING_TYPES = [
  "FIXED",
  "HOURLY",
  "DAILY",
  "PER_VISIT",
  "PER_TRIP",
];

function cleanText(value) {
  return String(value ?? "").trim();
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "")
  );
}

function mapProviderService(row) {
  return {
    id: row.id,
    providerId: row.provider_id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    title: row.title,
    description: row.description,
    pricingType: row.pricing_type,
    price: Number(row.price || 0),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getProviderProfileId(
  client,
  userId
) {
  const result =
    await client.query(
      `
        SELECT id
        FROM provider_profiles
        WHERE user_id = $1::uuid
        LIMIT 1
      `,
      [userId]
    );

  return result.rows[0]?.id || null;
}

async function getMyProviderServices(
  req,
  res
) {
  try {
    const userId =
      req.user.userId;

    const result =
      await pool.query(
        `
          SELECT
            ps.id,
            ps.provider_id,
            ps.category_id,
            ps.title,
            ps.description,
            ps.pricing_type,
            ps.price,
            ps.is_active,
            ps.created_at,
            ps.updated_at,
            sc.name AS category_name

          FROM provider_services ps

          INNER JOIN provider_profiles pp
            ON pp.id = ps.provider_id

          INNER JOIN service_categories sc
            ON sc.id = ps.category_id

          WHERE pp.user_id =
            $1::uuid

          ORDER BY
            ps.created_at DESC
        `,
        [userId]
      );

    return res.status(200).json({
      success: true,
      services:
        result.rows.map(
          mapProviderService
        ),
    });
  } catch (error) {
    console.error(
      "Get provider services error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load provider services.",
    });
  }
}

async function createMyProviderService(
  req,
  res
) {
  const client =
    await pool.connect();

  try {
    const userId =
      req.user.userId;

    const categoryId =
      cleanText(
        req.body.categoryId
      );

    const title =
      cleanText(
        req.body.title
      );

    const description =
      cleanText(
        req.body.description
      );

    const pricingType =
      cleanText(
        req.body.pricingType
      ).toUpperCase();

    const price =
      Number(req.body.price);

    if (!isValidUuid(categoryId)) {
      return res.status(400).json({
        success: false,
        message:
          "A valid service category is required.",
      });
    }

    if (
      !title ||
      title.length > 150
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Service title is required and cannot exceed 150 characters.",
      });
    }

    if (
      description.length > 2000
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Service description cannot exceed 2000 characters.",
      });
    }

    if (
      !ALLOWED_PRICING_TYPES.includes(
        pricingType
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid pricing type.",
      });
    }

    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Price must be greater than zero.",
      });
    }

    await client.query("BEGIN");

    const providerId =
      await getProviderProfileId(
        client,
        userId
      );

    if (!providerId) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(400).json({
        success: false,
        message:
          "Create your provider profile before adding services.",
      });
    }

    const categoryResult =
      await client.query(
        `
          SELECT id
          FROM service_categories
          WHERE id = $1::uuid
            AND is_active = TRUE
          LIMIT 1
        `,
        [categoryId]
      );

    if (
      categoryResult.rows.length ===
      0
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(400).json({
        success: false,
        message:
          "The selected service category is unavailable.",
      });
    }

    const result =
      await client.query(
        `
          INSERT INTO provider_services (
            provider_id,
            category_id,
            title,
            description,
            pricing_type,
            price,
            is_active
          )
          VALUES (
            $1::uuid,
            $2::uuid,
            $3::varchar,
            $4::text,
            $5::varchar,
            $6::numeric,
            TRUE
          )
          RETURNING
            id,
            provider_id,
            category_id,
            title,
            description,
            pricing_type,
            price,
            is_active,
            created_at,
            updated_at
        `,
        [
          providerId,
          categoryId,
          title,
          description || null,
          pricingType,
          price,
        ]
      );

    const service =
      result.rows[0];

    const categoryNameResult =
      await client.query(
        `
          SELECT name
          FROM service_categories
          WHERE id = $1::uuid
        `,
        [categoryId]
      );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message:
        "Service created successfully.",
      service:
        mapProviderService({
          ...service,
          category_name:
            categoryNameResult
              .rows[0]
              .name,
        }),
    });
  } catch (error) {
    try {
      await client.query(
        "ROLLBACK"
      );
    } catch (rollbackError) {
      console.error(
        "Create service rollback error:",
        rollbackError
      );
    }

    console.error(
      "Create provider service error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to create provider service.",
    });
  } finally {
    client.release();
  }
}

async function updateMyProviderService(
  req,
  res
) {
  try {
    const userId =
      req.user.userId;

    const serviceId =
      cleanText(
        req.params.serviceId
      );

    const categoryId =
      cleanText(
        req.body.categoryId
      );

    const title =
      cleanText(
        req.body.title
      );

    const description =
      cleanText(
        req.body.description
      );

    const pricingType =
      cleanText(
        req.body.pricingType
      ).toUpperCase();

    const price =
      Number(req.body.price);

    const isActive =
      req.body.isActive !== false;

    if (
      !isValidUuid(serviceId) ||
      !isValidUuid(categoryId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid service information.",
      });
    }

    if (
      !title ||
      title.length > 150
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Service title is required and cannot exceed 150 characters.",
      });
    }

    if (
      !ALLOWED_PRICING_TYPES.includes(
        pricingType
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid pricing type.",
      });
    }

    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Price must be greater than zero.",
      });
    }

    const result =
      await pool.query(
        `
          UPDATE provider_services ps

          SET
            category_id =
              $3::uuid,
            title =
              $4::varchar,
            description =
              $5::text,
            pricing_type =
              $6::varchar,
            price =
              $7::numeric,
            is_active =
              $8::boolean,
            updated_at =
              CURRENT_TIMESTAMP

          FROM provider_profiles pp,
               service_categories sc

          WHERE ps.id =
              $1::uuid

            AND ps.provider_id =
              pp.id

            AND pp.user_id =
              $2::uuid

            AND sc.id =
              $3::uuid

            AND sc.is_active =
              TRUE

          RETURNING
            ps.id,
            ps.provider_id,
            ps.category_id,
            ps.title,
            ps.description,
            ps.pricing_type,
            ps.price,
            ps.is_active,
            ps.created_at,
            ps.updated_at,
            sc.name AS category_name
        `,
        [
          serviceId,
          userId,
          categoryId,
          title,
          description || null,
          pricingType,
          price,
          Boolean(isActive),
        ]
      );

    if (
      result.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Provider service not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Service updated successfully.",
      service:
        mapProviderService(
          result.rows[0]
        ),
    });
  } catch (error) {
    console.error(
      "Update provider service error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update provider service.",
    });
  }
}

async function deleteMyProviderService(
  req,
  res
) {
  try {
    const userId =
      req.user.userId;

    const serviceId =
      cleanText(
        req.params.serviceId
      );

    if (!isValidUuid(serviceId)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid service ID.",
      });
    }

    const result =
      await pool.query(
        `
          DELETE FROM provider_services ps

          USING provider_profiles pp

          WHERE ps.id =
              $1::uuid

            AND ps.provider_id =
              pp.id

            AND pp.user_id =
              $2::uuid

          RETURNING ps.id
        `,
        [
          serviceId,
          userId,
        ]
      );

    if (
      result.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Provider service not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Service deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete provider service error:",
      error
    );

    if (error.code === "23503") {
      return res.status(409).json({
        success: false,
        message:
          "This service has bookings and cannot be deleted. Deactivate it instead.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to delete provider service.",
    });
  }
}

module.exports = {
  getMyProviderServices,
  createMyProviderService,
  updateMyProviderService,
  deleteMyProviderService,
};