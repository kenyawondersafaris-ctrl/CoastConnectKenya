"use strict";

const cloudinary =
  require("../config/cloudinary");

const pool = require("../config/db");

function parseBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return String(value).toLowerCase() === "true";
}

function parseOptionalInteger(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsedValue = Number.parseInt(value, 10);

  return Number.isInteger(parsedValue) ? parsedValue : null;
}

function mapMenuItem(row) {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    description: row.description,
    category: row.category,
    price: Number(row.price),
    imageUrl:row.image_url,
    imagePublicId:row.image_public_id,
    isAvailable: Boolean(row.is_available),
    isFeatured: Boolean(row.is_featured),
    displayOrder: Number(row.display_order || 0),
    preparationMinutes:
      row.preparation_minutes !== null
        ? Number(row.preparation_minutes)
        : null,
    priceVerifiedAt: row.price_verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function verifyRestaurantOwnership(
  restaurantId,
  ownerId
) {
  const result = await pool.query(
    `
      SELECT id, owner_id, name
      FROM restaurants
      WHERE id = $1
        AND owner_id = $2
      LIMIT 1
    `,
    [restaurantId, ownerId]
  );

  return result.rows[0] || null;
}

async function getOwnerMenuItems(req, res) {
  try {
    const restaurantId = String(
      req.params.restaurantId || ""
    ).trim();

    const ownerId = req.user.userId;

    const restaurant = await verifyRestaurantOwnership(
      restaurantId,
      ownerId
    );

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message:
          "Restaurant not found or you do not own this restaurant.",
      });
    }

    const result = await pool.query(
      `
        SELECT
          id,
          restaurant_id,
          name,
          description,
          category,
          price,
          image_url,
          image_public_id,
          is_available,
          is_featured,
          display_order,
          preparation_minutes,
          price_verified_at,
          created_at,
          updated_at
        FROM menu_items
        WHERE restaurant_id = $1
        ORDER BY
          display_order ASC,
          category ASC NULLS LAST,
          name ASC
      `,
      [restaurantId]
    );

    return res.status(200).json({
      success: true,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
      },
      menuItems: result.rows.map(mapMenuItem),
    });
  } catch (error) {
    console.error("Get owner menu items error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load menu items.",
    });
  }
}

async function createMenuItem(req, res) {
  try {
    const restaurantId = String(
      req.params.restaurantId || ""
    ).trim();

    const ownerId = req.user.userId;

    const {
  name,
  description,
  category,
  price,
  imageUrl,
  imagePublicId,
  isAvailable,
  isFeatured,
  displayOrder,
  preparationMinutes,
} = req.body;

    if (!name || price === undefined || price === null) {
      return res.status(400).json({
        success: false,
        message: "Menu item name and price are required.",
      });
    }

    const normalizedPrice = Number(price);

    if (
      !Number.isFinite(normalizedPrice) ||
      normalizedPrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Price must be a valid positive number.",
      });
    }

    const normalizedPreparationMinutes =
      parseOptionalInteger(preparationMinutes);

    if (
      normalizedPreparationMinutes !== null &&
      normalizedPreparationMinutes < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Preparation time cannot be less than zero.",
      });
    }

    const restaurant = await verifyRestaurantOwnership(
      restaurantId,
      ownerId
    );

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message:
          "Restaurant not found or you do not own this restaurant.",
      });
    }

    const result = await pool.query(
      `
        INSERT INTO menu_items (
          restaurant_id,
          name,
          description,
          category,
          price,
          image_url,
          image_public_id,
          is_available,
          is_featured,
          display_order,
          preparation_minutes,
          price_verified_at
        )
        VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        CURRENT_TIMESTAMP
      )
        RETURNING
          id,
          restaurant_id,
          name,
          description,
          category,
          price,
          image_url,
          image_public_id,
          is_available,
          is_featured,
          display_order,
          preparation_minutes,
          price_verified_at,
          created_at,
          updated_at
      `,
      [
        restaurantId,
        String(name).trim(),
        description?.trim() || null,
        category?.trim() || null,
        normalizedPrice,
        imageUrl?.trim() || null,
        imagePublicId?.trim() || null,
        parseBoolean(isAvailable, true),
        parseBoolean(isFeatured, false),
        parseOptionalInteger(displayOrder) || 0,
        normalizedPreparationMinutes,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Menu item created successfully.",
      menuItem: mapMenuItem(result.rows[0]),
    });
  } catch (error) {
    console.error("Create menu item error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create menu item.",
    });
  }
}

async function updateMenuItem(req, res) {
  try {
    const restaurantId = String(
      req.params.restaurantId || ""
    ).trim();

    const menuItemId = String(
      req.params.menuItemId || ""
    ).trim();

    const ownerId = req.user.userId;

    const restaurant = await verifyRestaurantOwnership(
      restaurantId,
      ownerId
    );

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message:
          "Restaurant not found or you do not own this restaurant.",
      });
    }

    const existingResult = await pool.query(
      `
        SELECT *
        FROM menu_items
        WHERE id = $1
          AND restaurant_id = $2
        LIMIT 1
      `,
      [menuItemId, restaurantId]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found.",
      });
    }

    const existingItem = existingResult.rows[0];

    const oldImagePublicId =
  existingItem.image_public_id;
    const updates = req.body;

    const name =
      updates.name !== undefined
        ? String(updates.name).trim()
        : existingItem.name;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Menu item name is required.",
      });
    }

    const price =
      updates.price !== undefined
        ? Number(updates.price)
        : Number(existingItem.price);

    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be a valid positive number.",
      });
    }

    const preparationMinutes =
      updates.preparationMinutes !== undefined
        ? parseOptionalInteger(updates.preparationMinutes)
        : existingItem.preparation_minutes;

    if (
      preparationMinutes !== null &&
      preparationMinutes < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Preparation time cannot be less than zero.",
      });
    }

    const result = await pool.query(
      `
        UPDATE menu_items
        SET
          name = $1,
          description = $2,
          category = $3,
          price = $4,
          image_url = $5,
          image_public_id = $6,
          is_available = $7,
          is_featured = $8,
          display_order = $9,
          preparation_minutes = $10,
          price_verified_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $11
        AND restaurant_id = $12
        RETURNING
          id,
          restaurant_id,
          name,
          description,
          category,
          price,
          image_url,
          image_public_id,
          is_available,
          is_featured,
          display_order,
          preparation_minutes,
          price_verified_at,
          created_at,
          updated_at
      `,
      [
        name,
        updates.description !== undefined
          ? updates.description?.trim() || null
          : existingItem.description,
        updates.category !== undefined
          ? updates.category?.trim() || null
          : existingItem.category,
        price,
        updates.imageUrl !== undefined
          ? updates.imageUrl?.trim() || null
          : existingItem.image_url,
          updates.imagePublicId !== undefined
          ? updates.imagePublicId?.trim() || null
          : existingItem.image_public_id,
        updates.isAvailable !== undefined
          ? parseBoolean(updates.isAvailable)
          : existingItem.is_available,
        updates.isFeatured !== undefined
          ? parseBoolean(updates.isFeatured)
          : existingItem.is_featured,
        updates.displayOrder !== undefined
          ? parseOptionalInteger(updates.displayOrder) || 0
          : existingItem.display_order,
        preparationMinutes,
        menuItemId,
        restaurantId,
      ]
    );

    const updatedItem =
  result.rows[0];

const newImagePublicId =
  updatedItem.image_public_id;

if (
  oldImagePublicId &&
  newImagePublicId &&
  oldImagePublicId !==
    newImagePublicId
) {
  try {
    await cloudinary.uploader.destroy(
      oldImagePublicId,
      {
        resource_type: "image",
      }
    );
  } catch (cloudinaryError) {
    console.error(
      "Old menu image cleanup error:",
      cloudinaryError
    );
  }
}

    return res.status(200).json({
      success: true,
      message: "Menu item updated successfully.",
      menuItem:mapMenuItem(updatedItem),
    });
  } catch (error) {
    console.error("Update menu item error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update menu item.",
    });
  }
}

async function deleteMenuItem(req, res) {
  try {
    const restaurantId = String(
      req.params.restaurantId || ""
    ).trim();

    const menuItemId = String(
      req.params.menuItemId || ""
    ).trim();

    const ownerId = req.user.userId;

    const restaurant = await verifyRestaurantOwnership(
      restaurantId,
      ownerId
    );

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message:
          "Restaurant not found or you do not own this restaurant.",
      });
    }

    const result = await pool.query(
      `
        DELETE FROM menu_items
        WHERE id = $1
          AND restaurant_id = $2
        RETURNING
          id,
          image_public_id
      `,
      [menuItemId, restaurantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found.",
      });
    }

    const deletedItem =
  result.rows[0];

if (
  deletedItem.image_public_id
) {
  try {
    await cloudinary.uploader.destroy(
      deletedItem.image_public_id,
      {
        resource_type: "image",
      }
    );
  } catch (cloudinaryError) {
    console.error(
      "Deleted menu image cleanup error:",
      cloudinaryError
    );
  }
}

    return res.status(200).json({
      success: true,
      message: "Menu item deleted successfully.",
    });
  } catch (error) {
    console.error("Delete menu item error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete menu item.",
    });
  }
}

module.exports = {
  getOwnerMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
};