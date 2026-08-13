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

function mapNotification(row) {
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

async function getOwnerNotifications(
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
          recipient_user_id,
          order_id,
          notification_type,
          title,
          message,
          metadata,
          is_read,
          read_at,
          created_at

        FROM restaurant_notifications

        WHERE restaurant_id = $1::uuid
          AND recipient_user_id = $2::uuid

        ORDER BY created_at DESC

        LIMIT 50
      `,
      [
        restaurant.id,
        ownerId,
      ]
    );

    const unreadResult =
      await pool.query(
        `
          SELECT
            COUNT(*)::integer
              AS unread_count

          FROM restaurant_notifications

          WHERE restaurant_id = $1::uuid
            AND recipient_user_id = $2::uuid
            AND is_read = FALSE
        `,
        [
          restaurant.id,
          ownerId,
        ]
      );

    return res.status(200).json({
      success: true,

      notifications:
        result.rows.map(
          mapNotification
        ),

      unreadCount:
        Number(
          unreadResult.rows[0]
            ?.unread_count || 0
        ),
    });
  } catch (error) {
    console.error(
      "Get owner notifications error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load notifications.",
    });
  }
}

async function markOwnerNotificationsRead(
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

    await pool.query(
      `
        UPDATE restaurant_notifications

        SET
          is_read = TRUE,
          read_at = CURRENT_TIMESTAMP

        WHERE restaurant_id = $1::uuid
          AND recipient_user_id = $2::uuid
          AND is_read = FALSE
      `,
      [
        restaurant.id,
        ownerId,
      ]
    );

    return res.status(200).json({
      success: true,
      message:
        "Notifications marked as read.",
    });
  } catch (error) {
    console.error(
      "Mark owner notifications read error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update notifications.",
    });
  }
}

async function clearOwnerNotifications(
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

    await pool.query(
      `
        DELETE FROM restaurant_notifications

        WHERE restaurant_id = $1::uuid
          AND recipient_user_id = $2::uuid
      `,
      [
        restaurant.id,
        ownerId,
      ]
    );

    return res.status(200).json({
      success: true,
      message:
        "Notifications cleared.",
    });
  } catch (error) {
    console.error(
      "Clear owner notifications error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to clear notifications.",
    });
  }
}

module.exports = {
  getOwnerNotifications,
  markOwnerNotificationsRead,
  clearOwnerNotifications,
};