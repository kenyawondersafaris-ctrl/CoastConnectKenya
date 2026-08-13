"use strict";

const pool = require("../config/db");
const cloudinary = require("../config/cloudinary");

async function getOwnerRestaurant(userId) {
  const result = await pool.query(
    `
      SELECT id
      FROM restaurants
      WHERE owner_id = $1
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] || null;
}

async function getOwnerGallery(request, response) {
  try {
    const restaurant =
      await getOwnerRestaurant(
        request.user.userId
      );

    if (!restaurant) {
      return response.status(404).json({
        success: false,
        message:
          "Create your restaurant profile first.",
      });
    }

    const result = await pool.query(
      `
        SELECT
          id,
          restaurant_id AS "restaurantId",
          image_url AS "imageUrl",
          public_id AS "publicId",
          caption,
          display_order AS "displayOrder",
          is_cover AS "isCover",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM restaurant_gallery_images
        WHERE restaurant_id = $1
        ORDER BY
          is_cover DESC,
          display_order ASC,
          created_at DESC
      `,
      [restaurant.id]
    );

    return response.status(200).json({
      success: true,
      images: result.rows,
    });
  } catch (error) {
    console.error(
      "Get restaurant gallery error:",
      error
    );

    return response.status(500).json({
      success: false,
      message:
        "Unable to load restaurant gallery.",
    });
  }
}

async function addGalleryImage(
  request,
  response
) {
  try {
    const restaurant =
      await getOwnerRestaurant(
        request.user.userId
      );

    if (!restaurant) {
      return response.status(404).json({
        success: false,
        message:
          "Create your restaurant profile first.",
      });
    }

    const {
      imageUrl,
      publicId,
      caption,
      displayOrder,
      isCover,
    } = request.body;

    if (!imageUrl || !publicId) {
      return response.status(400).json({
        success: false,
        message:
          "Image URL and public ID are required.",
      });
    }

    const galleryCountResult =
      await pool.query(
        `
          SELECT COUNT(*)::INTEGER AS total
          FROM restaurant_gallery_images
          WHERE restaurant_id = $1
        `,
        [restaurant.id]
      );

    if (
      galleryCountResult.rows[0].total >= 12
    ) {
      return response.status(400).json({
        success: false,
        message:
          "A restaurant can have a maximum of 12 gallery images.",
      });
    }

    const coverValue =
      isCover === true ||
      isCover === "true";

    if (coverValue) {
      await pool.query(
        `
          UPDATE restaurant_gallery_images
          SET
            is_cover = FALSE,
            updated_at = NOW()
          WHERE restaurant_id = $1
        `,
        [restaurant.id]
      );
    }

    const result = await pool.query(
      `
        INSERT INTO restaurant_gallery_images (
          restaurant_id,
          image_url,
          public_id,
          caption,
          display_order,
          is_cover
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
          id,
          restaurant_id AS "restaurantId",
          image_url AS "imageUrl",
          public_id AS "publicId",
          caption,
          display_order AS "displayOrder",
          is_cover AS "isCover",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [
        restaurant.id,
        imageUrl.trim(),
        publicId.trim(),
        caption?.trim() || null,
        Number(displayOrder) || 0,
        coverValue,
      ]
    );

    if (coverValue) {
  await pool.query(
    `
      UPDATE restaurants
      SET
        cover_image_url = $1,
        updated_at = NOW()
      WHERE id = $2
    `,
    [
      imageUrl.trim(),
      restaurant.id,
    ]
  );
}



    return response.status(201).json({
      success: true,
      message:
        "Gallery image added successfully.",
      image: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Add gallery image error:",
      error
    );

    return response.status(500).json({
      success: false,
      message:
        "Unable to add gallery image.",
    });
  }
}

async function updateGalleryImage(
  request,
  response
) {
  try {
    const restaurant =
      await getOwnerRestaurant(
        request.user.userId
      );

    if (!restaurant) {
      return response.status(404).json({
        success: false,
        message:
          "Restaurant profile not found.",
      });
    }

    const { imageId } = request.params;

    const {
      caption,
      displayOrder,
      isCover,
    } = request.body;

    const imageResult =
      await pool.query(
        `
          SELECT id
          FROM restaurant_gallery_images
          WHERE id = $1
            AND restaurant_id = $2
          LIMIT 1
        `,
        [imageId, restaurant.id]
      );

    if (!imageResult.rows[0]) {
      return response.status(404).json({
        success: false,
        message:
          "Gallery image not found.",
      });
    }

    const coverValue =
      isCover === true ||
      isCover === "true";

    if (coverValue) {
      await pool.query(
        `
          UPDATE restaurant_gallery_images
          SET
            is_cover = FALSE,
            updated_at = NOW()
          WHERE restaurant_id = $1
        `,
        [restaurant.id]
      );
    }

    const result = await pool.query(
      `
        UPDATE restaurant_gallery_images
        SET
          caption = $1,
          display_order = $2,
          is_cover = $3,
          updated_at = NOW()
        WHERE id = $4
          AND restaurant_id = $5
        RETURNING
          id,
          restaurant_id AS "restaurantId",
          image_url AS "imageUrl",
          public_id AS "publicId",
          caption,
          display_order AS "displayOrder",
          is_cover AS "isCover",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [
        caption?.trim() || null,
        Number(displayOrder) || 0,
        coverValue,
        imageId,
        restaurant.id,
      ]
    );

    if (coverValue) {
  await pool.query(
    `
      UPDATE restaurants
      SET
        cover_image_url = $1,
        updated_at = NOW()
      WHERE id = $2
    `,
    [
      result.rows[0].imageUrl,
      restaurant.id,
    ]
  );
}

    return response.status(200).json({
      success: true,
      message:
        "Gallery image updated successfully.",
      image: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Update gallery image error:",
      error
    );

    return response.status(500).json({
      success: false,
      message:
        "Unable to update gallery image.",
    });
  }
}

async function deleteGalleryImage(
  request,
  response
) {
  try {
    const restaurant =
      await getOwnerRestaurant(
        request.user.userId
      );

    if (!restaurant) {
      return response.status(404).json({
        success: false,
        message:
          "Restaurant profile not found.",
      });
    }

    const { imageId } = request.params;

    const result = await pool.query(
      `
        DELETE FROM restaurant_gallery_images
        WHERE id = $1
          AND restaurant_id = $2
        RETURNING
          id,
          public_id AS "publicId"
      `,
      [imageId, restaurant.id]
    );

    const deletedImage = result.rows[0];

    if (!deletedImage) {
      return response.status(404).json({
        success: false,
        message:
          "Gallery image not found.",
      });
    }

    try {
      await cloudinary.uploader.destroy(
        deletedImage.publicId,
        {
          resource_type: "image",
        }
      );
    } catch (cloudinaryError) {
      console.error(
        "Cloudinary gallery deletion error:",
        cloudinaryError
      );
    }

    return response.status(200).json({
      success: true,
      message:
        "Gallery image deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete gallery image error:",
      error
    );

    return response.status(500).json({
      success: false,
      message:
        "Unable to delete gallery image.",
    });
  }
}

module.exports = {
  getOwnerGallery,
  addGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
};