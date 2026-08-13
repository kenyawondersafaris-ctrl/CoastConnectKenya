"use strict";

const pool =
  require("../config/db");

async function createAdminNotification({
  type,
  title,
  message,
  entityType = null,
  entityId = null,
  io = null,
}) {
  const normalizedType =
    String(type || "")
      .trim()
      .toUpperCase();

  const normalizedTitle =
    String(title || "")
      .trim();

  const normalizedMessage =
    String(message || "")
      .trim();

  if (
    !normalizedType ||
    !normalizedTitle ||
    !normalizedMessage
  ) {
    throw new Error(
      "Notification type, title and message are required."
    );
  }

  const result =
    await pool.query(
      `
        INSERT INTO admin_notifications (
          type,
          title,
          message,
          entity_type,
          entity_id
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5
        )
        RETURNING
          id,
          type,
          title,
          message,
          entity_type,
          entity_id,
          is_read,
          created_at
      `,
      [
        normalizedType,
        normalizedTitle,
        normalizedMessage,
        entityType,
        entityId,
      ]
    );

  const notification =
    result.rows[0];

  if (io) {
    io.to(
      "admin:notifications"
    ).emit(
      "admin-notification-created",
      notification
    );
  }

  return notification;
}

module.exports = {
  createAdminNotification,
};