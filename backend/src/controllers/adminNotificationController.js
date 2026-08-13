"use strict";

const pool =
  require("../config/db");

async function getAdminNotifications(
  req,
  res
) {
  try {
    const result =
      await pool.query(
        `
          SELECT
            id,
            type,
            title,
            message,
            entity_type,
            entity_id,
            is_read,
            created_at

          FROM admin_notifications

          ORDER BY
            created_at DESC

          LIMIT 100
        `
      );

    const unreadResult =
      await pool.query(
        `
          SELECT
            COUNT(*)::int
            AS unread_count

          FROM admin_notifications

          WHERE is_read = FALSE
        `
      );

    return res.json({
      success: true,

      notifications:
        result.rows,

      unreadCount:
        unreadResult.rows[0]
          .unread_count,
    });

  } catch (error) {
    console.error(
      "Get admin notifications error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load admin notifications.",
    });
  }
}

async function markAdminNotificationRead(
  req,
  res
) {
  try {
    const notificationId =
      req.params.notificationId;

    const result =
      await pool.query(
        `
          UPDATE admin_notifications

          SET
            is_read = TRUE

          WHERE id = $1

          RETURNING
            id,
            is_read
        `,
        [notificationId]
      );

    if (
      result.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Notification not found.",
      });
    }

    return res.json({
      success: true,
      message:
        "Notification marked as read.",
      notification:
        result.rows[0],
    });

  } catch (error) {
    console.error(
      "Mark notification read error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update notification.",
    });
  }
}

async function markAllAdminNotificationsRead(
  req,
  res
) {
  try {
    await pool.query(
      `
        UPDATE admin_notifications

        SET
          is_read = TRUE

        WHERE is_read = FALSE
      `
    );

    return res.json({
      success: true,
      message:
        "All notifications marked as read.",
    });

  } catch (error) {
    console.error(
      "Mark all notifications read error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update notifications.",
    });
  }
}

module.exports = {
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
};