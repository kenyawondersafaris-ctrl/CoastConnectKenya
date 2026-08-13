"use strict";

const pool =
  require("../config/db");

  const {
  createAdminNotification,
} =
  require("../services/adminNotificationService");

function cleanText(value) {
  return String(
    value ?? ""
  ).trim();
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "").trim()
  );
}

async function createContactMessage(
  req,
  res
) {
  try {
    const fullName =
      cleanText(
        req.body.fullName
      );

    const email =
      cleanText(
        req.body.email
      ).toLowerCase();

    const subject =
      cleanText(
        req.body.subject
      ).toUpperCase();

    const message =
      cleanText(
        req.body.message
      );

    if (
      !fullName ||
      !email ||
      !subject ||
      !message
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Full name, email, subject and message are required.",
      });
    }

    if (
      fullName.length > 120
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Full name is too long.",
      });
    }

  const emailPattern =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (
  email.length > 180 ||
  !emailPattern.test(email)
) {
  return res.status(400).json({
    success: false,
    message:
      "Please enter a valid email address.",
  });
}
    const allowedSubjects = [
      "GENERAL_SUPPORT",
      "PROVIDER_SUPPORT",
      "RESTAURANT_SUPPORT",
      "BUSINESS_ENQUIRY",
      "OTHER",
    ];

    if (
      !allowedSubjects.includes(
        subject
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid contact subject.",
      });
    }

    if (
      message.length > 2000
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Message must not exceed 2000 characters.",
      });
    }

    const result =
      await pool.query(
        `
          INSERT INTO contact_messages (
            full_name,
            email,
            subject,
            message
          )
          VALUES (
            $1,
            $2,
            $3,
            $4
          )
          RETURNING
            id,
            status,
            created_at
        `,
        [
          fullName,
          email,
          subject,
          message,
        ]
      );

    const contactMessage =
      result.rows[0];

    /*
      CREATE ADMIN NOTIFICATION
    */
    const io =
      req.app.get("io");

    await createAdminNotification({
      type:
        "NEW_CONTACT_MESSAGE",

      title:
        "New support message",

      message:
        `${fullName} submitted a ${subject
          .replaceAll("_", " ")
          .toLowerCase()} request.`,

      entityType:
        "CONTACT_MESSAGE",

      entityId:
        contactMessage.id,

      io,
    });

    return res.status(201).json({
      success: true,

      message:
        "Your message has been received.",

      contactMessage: {
        id:
          contactMessage.id,

        status:
          contactMessage.status,

        createdAt:
          contactMessage.created_at,
      },
    });

  } catch (error) {
    console.error(
      "Create contact message error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to send your message.",
    });
  }
}

async function getContactMessages(
  req,
  res
) {
  try {

    const result =
      await pool.query(`
        SELECT
          id,
          full_name,
          email,
          subject,
          message,
          status,
          admin_notes,
          resolved_at,
          created_at
        FROM contact_messages
        ORDER BY
          created_at DESC
      `);

    return res.json({
      success: true,
      messages:
        result.rows,
    });

  } catch (error) {

    console.error(
      "Get contact messages error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load contact messages.",
    });

  }
}

async function resolveContactMessage(
  req,
  res
) {
  try {
    const messageId =
      req.params.messageId;

      if (!isValidUuid(messageId)) {
  return res.status(400).json({
    success: false,
    message:
      "Invalid support message ID.",
  });
}

    const result =
      await pool.query(
        `
          UPDATE contact_messages

          SET
            status = 'RESOLVED',
            resolved_at =
              CURRENT_TIMESTAMP

          WHERE id = $1

          RETURNING
            id,
            status,
            resolved_at
        `,
        [messageId]
      );

    if (
      result.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Support message not found.",
      });
    }

    return res.json({
      success: true,
      message:
        "Support message resolved.",
      contactMessage:
        result.rows[0],
    });

  } catch (error) {
    console.error(
      "Resolve contact message error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to resolve support message.",
    });
  }
}

async function saveAdminNotes(
  req,
  res
) {
  try {
    const messageId =
      req.params.messageId;

      if (!isValidUuid(messageId)) {
  return res.status(400).json({
    success: false,
    message:
      "Invalid support message ID.",
  });
}

    const notes =
      cleanText(
        req.body.notes
      );

    if (
      notes.length > 5000
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Admin notes must not exceed 5000 characters.",
      });
    }

    const result =
      await pool.query(
        `
          UPDATE contact_messages

          SET
            admin_notes = $2

          WHERE id = $1

          RETURNING
            id,
            admin_notes,
            status
        `,
        [
          messageId,
          notes || null,
        ]
      );

    if (
      result.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Support message not found.",
      });
    }

    return res.json({
      success: true,
      message:
        "Admin notes saved.",
      contactMessage:
        result.rows[0],
    });

  } catch (error) {
    console.error(
      "Save admin notes error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to save admin notes.",
    });
  }
}

module.exports = {
  createContactMessage,
  getContactMessages,
  resolveContactMessage,
  saveAdminNotes,
};