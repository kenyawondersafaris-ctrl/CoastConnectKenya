"use strict";

const pool = require("../config/db");


function cleanText(value) {
  return String(value ?? "")
    .trim();
}


function getAuthenticatedUserId(req) {
  return (
    req.user?.id ||
    req.user?.userId ||
    null
  );
}


/*
|--------------------------------------------------------------------------
| GET CUSTOMER FAVORITES
|--------------------------------------------------------------------------
*/

async function getCustomerFavorites(
  req,
  res
) {
  try {

    const customerId =
      getAuthenticatedUserId(req);


    if (!customerId) {
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
            cf.id,
            cf.favorite_type,
            cf.restaurant_id,
            cf.provider_id,
            cf.created_at,

            r.name AS restaurant_name,
            r.slug AS restaurant_slug,

            pp.id AS provider_profile_id,

            u.full_name AS provider_name

          FROM customer_favorites cf

          LEFT JOIN restaurants r
            ON r.id =
              cf.restaurant_id

          LEFT JOIN provider_profiles pp
            ON pp.id =
              cf.provider_id

          LEFT JOIN users u
            ON u.id =
              pp.user_id

          WHERE cf.customer_id =
            $1::uuid

          ORDER BY
            cf.created_at DESC
        `,
        [
          customerId,
        ]
      );


    const favorites =
      result.rows.map(
        (row) => ({
          id:
            row.id,

          favoriteType:
            row.favorite_type,

          restaurantId:
            row.restaurant_id,

          providerId:
            row.provider_id,

          createdAt:
            row.created_at,

          restaurant:
            row.restaurant_id
              ? {
                  id:
                    row.restaurant_id,

                  name:
                    row.restaurant_name,

                  slug:
                    row.restaurant_slug,
                }
              : null,

          provider:
            row.provider_id
              ? {
                  id:
                    row.provider_profile_id,

                  name:
                    row.provider_name,
                }
              : null,
        })
      );


    return res.status(200).json({
      success: true,

      count:
        favorites.length,

      favorites,
    });

  } catch (error) {

    console.error(
      "Get customer favorites error:",
      error
    );


    return res.status(500).json({
      success: false,
      message:
        "Unable to load your saved places.",
    });
  }
}


/*
|--------------------------------------------------------------------------
| CREATE FAVORITE
|--------------------------------------------------------------------------
*/

async function createCustomerFavorite(
  req,
  res
) {
  try {

    const customerId =
      getAuthenticatedUserId(req);


    const favoriteType =
      cleanText(
        req.body.favoriteType
      ).toUpperCase();


    const targetId =
      cleanText(
        req.body.targetId
      );


    if (!customerId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }


    if (
      ![
        "RESTAURANT",
        "PROVIDER",
      ].includes(favoriteType)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Favorite type must be RESTAURANT or PROVIDER.",
      });
    }


    if (!targetId) {
      return res.status(400).json({
        success: false,
        message:
          "Favorite target is required.",
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Restaurant favorite
    |--------------------------------------------------------------------------
    */

    if (
      favoriteType ===
      "RESTAURANT"
    ) {

      const restaurantResult =
        await pool.query(
          `
            SELECT id
            FROM restaurants
            WHERE id = $1::uuid
            LIMIT 1
          `,
          [
            targetId,
          ]
        );


      if (
        restaurantResult.rows.length ===
        0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Restaurant was not found.",
        });
      }


      const result =
        await pool.query(
          `
            INSERT INTO customer_favorites (
              customer_id,
              favorite_type,
              restaurant_id
            )

            VALUES (
              $1::uuid,
              'RESTAURANT',
              $2::uuid
            )

            ON CONFLICT (
              customer_id,
              restaurant_id
            )
            WHERE restaurant_id
              IS NOT NULL

            DO NOTHING

            RETURNING
              id,
              favorite_type,
              restaurant_id,
              provider_id,
              created_at
          `,
          [
            customerId,
            targetId,
          ]
        );


      if (
        result.rows.length === 0
      ) {

        const existingResult =
          await pool.query(
            `
              SELECT
                id,
                favorite_type,
                restaurant_id,
                provider_id,
                created_at

              FROM customer_favorites

              WHERE customer_id =
                $1::uuid

                AND restaurant_id =
                  $2::uuid

              LIMIT 1
            `,
            [
              customerId,
              targetId,
            ]
          );


        return res.status(200).json({
          success: true,
          duplicate: true,
          message:
            "Restaurant is already saved.",
          favorite:
            mapFavorite(
              existingResult.rows[0]
            ),
        });
      }


      return res.status(201).json({
        success: true,
        duplicate: false,
        message:
          "Restaurant saved successfully.",
        favorite:
          mapFavorite(
            result.rows[0]
          ),
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Provider favorite
    |--------------------------------------------------------------------------
    */

    const providerResult =
      await pool.query(
        `
          SELECT id
          FROM provider_profiles
          WHERE id = $1::uuid
          LIMIT 1
        `,
        [
          targetId,
        ]
      );


    if (
      providerResult.rows.length ===
      0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Service provider was not found.",
      });
    }


    const result =
      await pool.query(
        `
          INSERT INTO customer_favorites (
            customer_id,
            favorite_type,
            provider_id
          )

          VALUES (
            $1::uuid,
            'PROVIDER',
            $2::uuid
          )

          ON CONFLICT (
            customer_id,
            provider_id
          )
          WHERE provider_id
            IS NOT NULL

          DO NOTHING

          RETURNING
            id,
            favorite_type,
            restaurant_id,
            provider_id,
            created_at
        `,
        [
          customerId,
          targetId,
        ]
      );


    if (
      result.rows.length === 0
    ) {

      const existingResult =
        await pool.query(
          `
            SELECT
              id,
              favorite_type,
              restaurant_id,
              provider_id,
              created_at

            FROM customer_favorites

            WHERE customer_id =
              $1::uuid

              AND provider_id =
                $2::uuid

            LIMIT 1
          `,
          [
            customerId,
            targetId,
          ]
        );


      return res.status(200).json({
        success: true,
        duplicate: true,
        message:
          "Service provider is already saved.",
        favorite:
          mapFavorite(
            existingResult.rows[0]
          ),
      });
    }


    return res.status(201).json({
      success: true,
      duplicate: false,
      message:
        "Service provider saved successfully.",
      favorite:
        mapFavorite(
          result.rows[0]
        ),
    });

  } catch (error) {

    console.error(
      "Create customer favorite error:",
      error
    );


    /*
    |--------------------------------------------------------------------------
    | Invalid UUID
    |--------------------------------------------------------------------------
    */

    if (
      error.code === "22P02"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid favorite target ID.",
      });
    }


    return res.status(500).json({
      success: false,
      message:
        "Unable to save this place.",
    });
  }
}


/*
|--------------------------------------------------------------------------
| DELETE FAVORITE
|--------------------------------------------------------------------------
*/

async function deleteCustomerFavorite(
  req,
  res
) {
  try {

    const customerId =
      getAuthenticatedUserId(req);


    const favoriteId =
      cleanText(
        req.params.favoriteId
      );


    if (!customerId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }


    if (!favoriteId) {
      return res.status(400).json({
        success: false,
        message:
          "Favorite ID is required.",
      });
    }


    const result =
      await pool.query(
        `
          DELETE FROM customer_favorites

          WHERE id =
            $1::uuid

            AND customer_id =
              $2::uuid

          RETURNING id
        `,
        [
          favoriteId,
          customerId,
        ]
      );


    if (
      result.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Saved place was not found.",
      });
    }


    return res.status(200).json({
      success: true,
      message:
        "Saved place removed successfully.",
    });

  } catch (error) {

    console.error(
      "Delete customer favorite error:",
      error
    );


    if (
      error.code === "22P02"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid favorite ID.",
      });
    }


    return res.status(500).json({
      success: false,
      message:
        "Unable to remove this saved place.",
    });
  }
}


/*
|--------------------------------------------------------------------------
| MAP FAVORITE
|--------------------------------------------------------------------------
*/

function mapFavorite(row) {

  if (!row) {
    return null;
  }


  return {
    id:
      row.id,

    favoriteType:
      row.favorite_type,

    restaurantId:
      row.restaurant_id,

    providerId:
      row.provider_id,

    createdAt:
      row.created_at,
  };
}


module.exports = {
  getCustomerFavorites,
  createCustomerFavorite,
  deleteCustomerFavorite,
};