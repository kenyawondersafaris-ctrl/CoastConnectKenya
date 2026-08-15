"use strict";

const pool = require("../config/db");
const crypto = require("crypto");
function cleanText(value) {
  return String(value ?? "").trim();
}

function generateServiceStartPin() {
  return String(
    crypto.randomInt(
      100000,
      1000000
    )
  );
}

function hashServiceStartPin(pin) {
  return crypto
    .createHash("sha256")
    .update(
      String(pin)
    )
    .digest("hex");
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "")
  );
}

async function generateBookingStartPin(
  req,
  res
) {
  const client =
    await pool.connect();

  try {
    const customerId =
      req.user.userId;

    const bookingId =
      cleanText(
        req.params.bookingId
      );

    if (
      !isValidUuid(
        bookingId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid booking ID.",
      });
    }

    await client.query(
      "BEGIN"
    );

    const bookingResult =
      await client.query(
        `
          SELECT
            id,
            customer_id,
            booking_status,
            payment_status

          FROM bookings

          WHERE id =
            $1::uuid

          LIMIT 1

          FOR UPDATE
        `,
        [
          bookingId,
        ]
      );

    if (
      bookingResult.rows.length ===
      0
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(404).json({
        success: false,
        message:
          "Booking not found.",
      });
    }

    const booking =
      bookingResult.rows[0];

    if (
      booking.customer_id !==
      customerId
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(403).json({
        success: false,
        message:
          "You cannot generate a start PIN for this booking.",
      });
    }

    if (
      String(
        booking.booking_status ||
        ""
      ).toUpperCase() !==
        "CONFIRMED" ||
      String(
        booking.payment_status ||
        ""
      ).toUpperCase() !==
        "PARTIALLY_PAID"
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(409).json({
        success: false,
        message:
          "A start PIN can only be generated after the deposit has been paid for a confirmed booking.",
      });
    }

    const serviceStartPin =
      generateServiceStartPin();

    const serviceStartPinHash =
      hashServiceStartPin(
        serviceStartPin
      );

    await client.query(
      `
        UPDATE bookings

        SET
          service_start_pin_hash =
            $1::varchar,

          service_start_pin_created_at =
            CURRENT_TIMESTAMP,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id =
          $2::uuid
      `,
      [
        serviceStartPinHash,
        bookingId,
      ]
    );

    await client.query(
      "COMMIT"
    );

    return res.status(200).json({
      success: true,
      message:
        "Service start PIN generated successfully.",

      bookingId,

      startPin:
        serviceStartPin,
    });
  } catch (error) {
    try {
      await client.query(
        "ROLLBACK"
      );
    } catch (
      rollbackError
    ) {
      // Ignore rollback failure.
    }

    console.error(
      "Generate booking start PIN error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to generate service start PIN.",
    });
  } finally {
    client.release();
  }
}

async function verifyBookingStartPin(
  req,
  res
) {
  const client =
    await pool.connect();

  try {
    const providerUserId =
      req.user.userId;

    const bookingId =
      cleanText(
        req.params.bookingId
      );

    const startPin =
      cleanText(
        req.body.startPin
      );

    if (
      !isValidUuid(
        bookingId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid booking ID.",
      });
    }

    if (
      !/^\d{6}$/.test(
        startPin
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Enter the 6-digit service start PIN.",
      });
    }

    await client.query(
      "BEGIN"
    );

    const bookingResult =
      await client.query(
        `
          SELECT
            b.id,
            b.provider_id,
            b.booking_status,
            b.payment_status,
            b.service_start_pin_hash,

            pp.user_id
              AS provider_user_id

          FROM bookings b

          INNER JOIN provider_profiles pp
            ON pp.id =
              b.provider_id

          WHERE b.id =
            $1::uuid

          LIMIT 1

          FOR UPDATE OF b
        `,
        [
          bookingId,
        ]
      );

    if (
      bookingResult.rows.length ===
      0
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(404).json({
        success: false,
        message:
          "Booking not found.",
      });
    }

    const booking =
      bookingResult.rows[0];

    if (
      booking.provider_user_id !==
      providerUserId
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(403).json({
        success: false,
        message:
          "You cannot start this booking.",
      });
    }

    if (
      String(
        booking.booking_status ||
        ""
      ).toUpperCase() !==
        "CONFIRMED" ||
      String(
        booking.payment_status ||
        ""
      ).toUpperCase() !==
        "PARTIALLY_PAID"
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(409).json({
        success: false,
        message:
          "This booking is not ready to start.",
      });
    }

    if (
      !booking.service_start_pin_hash
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(409).json({
        success: false,
        message:
          "The customer has not generated a service start PIN yet.",
      });
    }

    const enteredPinHash =
      hashServiceStartPin(
        startPin
      );

    if (
      enteredPinHash !==
      booking.service_start_pin_hash
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(400).json({
        success: false,
        message:
          "Incorrect service start PIN.",
      });
    }

    const updatedBookingResult =
      await client.query(
        `
          UPDATE bookings

          SET
            booking_status =
              'IN_PROGRESS',

            service_started_at =
              CURRENT_TIMESTAMP,

            service_start_pin_hash =
              NULL,

            service_start_pin_created_at =
              NULL,

            updated_at =
              CURRENT_TIMESTAMP

          WHERE id =
            $1::uuid

          RETURNING
            id,
            booking_status,
            payment_status,
            service_started_at
        `,
        [
          bookingId,
        ]
      );

    await client.query(
      "COMMIT"
    );

    return res.status(200).json({
      success: true,
      message:
        "Service started successfully.",

      booking:
        updatedBookingResult.rows[0],
    });
  } catch (error) {
    try {
      await client.query(
        "ROLLBACK"
      );
    } catch (
      rollbackError
    ) {
      // Ignore rollback failure.
    }

    console.error(
      "Verify booking start PIN error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to start service.",
    });
  } finally {
    client.release();
  }
}

async function createBooking(
  req,
  res
) {
  const client =
    await pool.connect();

  try {
    const customerId =
      req.user.userId;

    const providerId =
      cleanText(
        req.body.providerId
      );

    const providerServiceId =
      cleanText(
        req.body.providerServiceId
      );

    const serviceAddress =
      cleanText(
        req.body.serviceAddress
      );

    const bookingDate =
      cleanText(
        req.body.bookingDate
      );

    const startTime =
      cleanText(
        req.body.startTime
      );

    const instructions =
      cleanText(
        req.body.instructions
      );

    if (
      !isValidUuid(providerId) ||
      !isValidUuid(
        providerServiceId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid provider or service.",
      });
    }

    if (!serviceAddress) {
      return res.status(400).json({
        success: false,
        message:
          "Service address is required.",
      });
    }

    if (
      serviceAddress.length > 1000
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Service address is too long.",
      });
    }

    if (
      instructions.length > 2000
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Instructions cannot exceed 2000 characters.",
      });
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        bookingDate
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A valid booking date is required.",
      });
    }

    if (
      !/^\d{2}:\d{2}$/.test(
        startTime
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A valid booking time is required.",
      });
    }

    const bookingDateTime =
      new Date(
        `${bookingDate}T${startTime}:00`
      );

    if (
      Number.isNaN(
        bookingDateTime.getTime()
      ) ||
      bookingDateTime <= new Date()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Booking date and time must be in the future.",
      });
    }

    await client.query("BEGIN");

    const customerResult =
      await client.query(
        `
          SELECT
            id,
            role,
            account_status

          FROM users

          WHERE id =
            $1::uuid

          LIMIT 1

          FOR UPDATE
        `,
        [customerId]
      );

    if (
      customerResult.rows.length ===
      0
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(404).json({
        success: false,
        message:
          "Customer account not found.",
      });
    }

    const customer =
      customerResult.rows[0];

    if (
      String(
        customer.account_status
      ).toUpperCase() !==
      "ACTIVE"
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(403).json({
        success: false,
        message:
          "Your account is not active.",
      });
    }

    const serviceResult =
      await client.query(
        `
          SELECT
            ps.id,
            ps.provider_id,
            ps.title,
            ps.price,
            ps.pricing_type,
            ps.is_active,

            pp.availability_status,
            pp.verification_status,

            u.full_name AS provider_name

          FROM provider_services ps

          INNER JOIN provider_profiles pp
            ON pp.id = ps.provider_id

          INNER JOIN users u
            ON u.id = pp.user_id

          WHERE ps.id =
            $1::uuid

            AND ps.provider_id =
            $2::uuid

          LIMIT 1

          FOR UPDATE
        `,
        [
          providerServiceId,
          providerId,
        ]
      );

    if (
      serviceResult.rows.length ===
      0
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(404).json({
        success: false,
        message:
          "Provider service not found.",
      });
    }

    const service =
      serviceResult.rows[0];

    if (!service.is_active) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(409).json({
        success: false,
        message:
          "This service is currently inactive.",
      });
    }

    if (
      String(
        service.availability_status
      ).toUpperCase() !==
      "AVAILABLE"
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(409).json({
        success: false,
        message:
          "This provider is currently unavailable.",
      });
    }

    const duplicateResult =
      await client.query(
        `
          SELECT id

          FROM bookings

          WHERE customer_id =
            $1::uuid

            AND provider_service_id =
            $2::uuid

            AND booking_date =
            $3::date

            AND start_time =
            $4::time

            AND booking_status IN (
              'PENDING',
              'CONFIRMED'
            )

          LIMIT 1
        `,
        [
          customerId,
          providerServiceId,
          bookingDate,
          startTime,
        ]
      );

    if (
      duplicateResult.rows.length >
      0
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(409).json({
        success: false,
        message:
          "You already have a booking for this service at the selected time.",
      });
    }

    const conflictResult =
      await client.query(
        `
          SELECT id

          FROM bookings

          WHERE provider_id =
            $1::uuid

            AND booking_date =
            $2::date

            AND start_time =
            $3::time

            AND booking_status IN (
              'PENDING',
              'CONFIRMED',
              'IN_PROGRESS'
            )

          LIMIT 1
        `,
        [
          providerId,
          bookingDate,
          startTime,
        ]
      );

    if (
      conflictResult.rows.length >
      0
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(409).json({
        success: false,
        message:
          "The provider already has a booking at that time.",
      });
    }

    const result =
      await client.query(
        `
          INSERT INTO bookings (
            customer_id,
            provider_service_id,
            provider_id,
            service_address,
            booking_date,
            start_time,
            instructions,
            estimated_price,
            booking_status,
            payment_status
          )
          VALUES (
            $1::uuid,
            $2::uuid,
            $3::uuid,
            $4::text,
            $5::date,
            $6::time,
            $7::text,
            $8::numeric,
            'PENDING',
            'UNPAID'
          )
          RETURNING
            id,
            customer_id,
            provider_service_id,
            provider_id,
            service_address,
            booking_date,
            start_time,
            instructions,
            estimated_price,
            booking_status,
            payment_status,
            created_at,
            updated_at
        `,
        [
          customerId,
          providerServiceId,
          providerId,
          serviceAddress,
          bookingDate,
          startTime,
          instructions || null,
          service.price,
        ]
      );

    await client.query("COMMIT");

    const booking =
      result.rows[0];

    const io =
      req.app.get("io");

    if (io) {
      io
    .to(`provider:${providerId}`)
    .emit(
        "provider-booking-created",
        {
          bookingId:
            booking.id,

          providerId,

          customerId,

          serviceTitle:
            service.title,

          bookingDate:
            booking.booking_date,

          startTime:
            booking.start_time,
        }
      );
    }

    return res.status(201).json({
      success: true,
      message:
        "Booking created successfully.",

      booking: {
        id:
          booking.id,

        customerId:
          booking.customer_id,

        providerServiceId:
          booking.provider_service_id,

        providerId:
          booking.provider_id,

        providerName:
          service.provider_name,

        serviceTitle:
          service.title,

        pricingType:
          service.pricing_type,

        serviceAddress:
          booking.service_address,

        bookingDate:
          booking.booking_date,

        startTime:
          booking.start_time,

        instructions:
          booking.instructions,

        estimatedPrice:
          Number(
            booking.estimated_price ||
            0
          ),

        bookingStatus:
          booking.booking_status,

        paymentStatus:
          booking.payment_status,

        createdAt:
          booking.created_at,

        updatedAt:
          booking.updated_at,
      },
    });
  } catch (error) {
    try {
      await client.query(
        "ROLLBACK"
      );
    } catch (rollbackError) {
      console.error(
        "Booking rollback error:",
        rollbackError
      );
    }

    console.error(
      "Create booking error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to create booking.",
    });
  } finally {
    client.release();
  }
}

async function getMyBookings(
  req,
  res
) {
  try {
    const customerId =
      req.user.userId;

    const result =
      await pool.query(
        `
        SELECT
          b.id,
          b.booking_date,
          b.start_time,
          b.service_address,
          b.instructions,
          b.estimated_price,
          b.booking_status,
          b.payment_status,
          b.created_at,

          ps.title,

          u.full_name
            AS provider_name

        FROM bookings b

        LEFT JOIN provider_services ps
          ON ps.id =
          b.provider_service_id

        LEFT JOIN provider_profiles pp
          ON pp.id =
          b.provider_id

        LEFT JOIN users u
          ON u.id =
          pp.user_id

        WHERE b.customer_id =
          $1::uuid

        ORDER BY
          b.created_at DESC
        `,
        [customerId]
      );

    return res.json({
      success: true,
      bookings:
        result.rows,
    });
  } catch (error) {
    console.error(
      "Get customer bookings error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load bookings.",
    });
  }
}

async function createBookingReview(
  req,
  res
) {
  const client =
    await pool.connect();

  try {
    const customerId =
      req.user.userId;

    const bookingId =
      String(
        req.params.bookingId || ""
      ).trim();

    const rating =
      Number(
        req.body.rating
      );

    const comment =
      String(
        req.body.comment || ""
      ).trim();

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (
      !uuidPattern.test(
        bookingId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid booking ID.",
      });
    }

    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Rating must be between 1 and 5.",
      });
    }

    if (
      comment.length > 2000
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Review comment cannot exceed 2000 characters.",
      });
    }

    await client.query(
      "BEGIN"
    );

    const bookingResult =
      await client.query(
        `
          SELECT
            b.id,
            b.customer_id,
            b.provider_id,
            b.booking_status,

            pp.user_id
              AS provider_user_id

          FROM bookings b

          INNER JOIN provider_profiles pp
            ON pp.id =
              b.provider_id

          WHERE b.id =
            $1::uuid

          LIMIT 1

          FOR UPDATE OF b
        `,
        [bookingId]
      );

    if (
      bookingResult.rows.length ===
      0
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(404).json({
        success: false,
        message:
          "Booking not found.",
      });
    }

    const booking =
      bookingResult.rows[0];

    if (
      booking.customer_id !==
      customerId
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(403).json({
        success: false,
        message:
          "You cannot review this booking.",
      });
    }

    if (
      String(
        booking.booking_status ||
        ""
      ).toUpperCase() !==
      "COMPLETED"
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(409).json({
        success: false,
        message:
          "Only completed bookings can be reviewed.",
      });
    }

    if (!booking.provider_id) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(409).json({
        success: false,
        message:
          "This booking is not linked to a provider.",
      });
    }

    const existingReviewResult =
      await client.query(
        `
          SELECT id
          FROM reviews
          WHERE booking_id =
            $1::uuid
          LIMIT 1
        `,
        [bookingId]
      );

    if (
      existingReviewResult.rows.length >
      0
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(409).json({
        success: false,
        message:
          "You have already reviewed this booking.",
      });
    }

    const reviewResult =
      await client.query(
        `
          INSERT INTO reviews (
            customer_id,
            provider_id,
            booking_id,
            rating,
            comment,
            is_approved
          )
          VALUES (
            $1::uuid,
            $2::uuid,
            $3::uuid,
            $4::integer,
            $5::text,
            TRUE
          )
          RETURNING
            id,
            customer_id,
            provider_id,
            booking_id,
            rating,
            comment,
            is_approved,
            created_at
        `,
        [
          customerId,
          booking.provider_id,
          bookingId,
          rating,
          comment || null,
        ]
      );

    const ratingResult =
      await client.query(
        `
          SELECT
            COALESCE(
              AVG(rating),
              0
            ) AS average_rating,

            COUNT(*)::integer
              AS total_reviews

          FROM reviews

          WHERE provider_id =
            $1::uuid

            AND is_approved =
              TRUE
        `,
        [booking.provider_id]
      );

    const averageRating =
      Number(
        ratingResult.rows[0]
          .average_rating || 0
      );

    const totalReviews =
      Number(
        ratingResult.rows[0]
          .total_reviews || 0
      );

    await client.query(
      `
        UPDATE provider_profiles

        SET
          average_rating =
            $2::numeric,

          total_reviews =
            $3::integer,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id =
          $1::uuid
      `,
      [
        booking.provider_id,
        averageRating,
        totalReviews,
      ]
    );

    await client.query(
      "COMMIT"
    );

    const review =
      reviewResult.rows[0];

    return res.status(201).json({
      success: true,
      message:
        "Review submitted successfully.",

      review: {
        id:
          review.id,

        bookingId:
          review.booking_id,

        providerId:
          review.provider_id,

        rating:
          Number(
            review.rating
          ),

        comment:
          review.comment,

        isApproved:
          review.is_approved,

        createdAt:
          review.created_at,
      },

      providerRating: {
        averageRating:
          Number(
            averageRating.toFixed(2)
          ),

        totalReviews,
      },
    });
  } catch (error) {
    try {
      await client.query(
        "ROLLBACK"
      );
    } catch (rollbackError) {
      console.error(
        "Review rollback error:",
        rollbackError
      );
    }

    console.error(
      "Create booking review error:",
      error
    );

    if (
      error.code === "23505"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "You have already reviewed this booking.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to submit review.",
    });
  } finally {
    client.release();
  }
}

module.exports = {
  createBooking,
  getMyBookings,
  createBookingReview,
  generateBookingStartPin,
  verifyBookingStartPin,
};