"use strict";

const pool = require("../config/db");

function cleanText(value) {
  return String(value ?? "").trim();
}

function mapProviderProfile(row) {
  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    bio: row.bio,
    experienceYears: Number(
      row.experience_years || 0
    ),
    serviceArea: row.service_area,
    profilePhoto: row.profile_photo,
    verificationStatus:
      row.verification_status,
    availabilityStatus:
      row.availability_status,
    averageRating: Number(
      row.average_rating || 0
    ),
    totalReviews: Number(
      row.total_reviews || 0
    ),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findProviderProfile(
  userId
) {
  const result =
    await pool.query(
      `
        SELECT
          pp.id,
          pp.user_id,
          pp.bio,
          pp.experience_years,
          pp.service_area,
          pp.profile_photo,
          pp.verification_status,
          pp.availability_status,
          pp.average_rating,
          pp.total_reviews,
          pp.created_at,
          pp.updated_at,

          u.full_name,
          u.email,
          u.phone

        FROM provider_profiles pp

        INNER JOIN users u
          ON u.id = pp.user_id

        WHERE pp.user_id =
          $1::uuid

        LIMIT 1
      `,
      [userId]
    );

  return result.rows[0] || null;
}

async function getMyProviderProfile(
  req,
  res
) {
  try {
    const userId =
      req.user.userId;

    const provider =
      await findProviderProfile(
        userId
      );

    if (!provider) {
      return res.status(404).json({
        success: false,
        message:
          "Provider profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      provider:
        mapProviderProfile(
          provider
        ),
    });
  } catch (error) {
    console.error(
      "Get provider profile error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load provider profile.",
    });
  }
}

async function createMyProviderProfile(
  req,
  res
) {
  const client =
    await pool.connect();

  try {
    const userId =
      req.user.userId;

    const bio =
      cleanText(
        req.body.bio
      );

    const serviceArea =
      cleanText(
        req.body.serviceArea
      );

    const profilePhoto =
      cleanText(
        req.body.profilePhoto
      );

    const experienceYears =
      Number(
        req.body.experienceYears ??
        0
      );

    if (!serviceArea) {
      return res.status(400).json({
        success: false,
        message:
          "Service area is required.",
      });
    }

    if (
      serviceArea.length > 255
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Service area is too long.",
      });
    }

    if (
      bio.length > 1500
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Professional bio cannot exceed 1500 characters.",
      });
    }

    if (
      !Number.isInteger(
        experienceYears
      ) ||
      experienceYears < 0 ||
      experienceYears > 60
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Experience years must be between 0 and 60.",
      });
    }

    if (
      profilePhoto &&
      !/^https?:\/\/.+/i.test(
        profilePhoto
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Profile photo must be a valid HTTP or HTTPS URL.",
      });
    }

    await client.query(
      "BEGIN"
    );

    const userResult =
      await client.query(
        `
          SELECT
            id,
            full_name,
            email,
            phone,
            role,
            account_status

          FROM users

          WHERE id =
            $1::uuid

          LIMIT 1

          FOR UPDATE
        `,
        [userId]
      );

    if (
      userResult.rows.length === 0
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(404).json({
        success: false,
        message:
          "User account not found.",
      });
    }

    const user =
      userResult.rows[0];

    if (
      String(user.role)
        .toUpperCase() !==
      "PROVIDER"
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(403).json({
        success: false,
        message:
          "Only provider accounts can manage provider profiles.",
      });
    }

    if (
      String(
        user.account_status
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

    const existingResult =
      await client.query(
        `
          SELECT id

          FROM provider_profiles

          WHERE user_id =
            $1::uuid

          LIMIT 1

          FOR UPDATE
        `,
        [userId]
      );

    let profileResult;
    let created = false;

    if (
      existingResult.rows.length ===
      0
    ) {
      created = true;

      profileResult =
        await client.query(
          `
            INSERT INTO provider_profiles (
              user_id,
              bio,
              experience_years,
              service_area,
              profile_photo,
              verification_status,
              availability_status
            )
            VALUES (
              $1::uuid,
              $2::text,
              $3::integer,
              $4::varchar,
              $5::text,
              'PENDING',
              'OFFLINE'
            )
            RETURNING
              id,
              user_id,
              bio,
              experience_years,
              service_area,
              profile_photo,
              verification_status,
              availability_status,
              average_rating,
              total_reviews,
              created_at,
              updated_at
          `,
          [
            userId,
            bio || null,
            experienceYears,
            serviceArea,
            profilePhoto || null,
          ]
        );
    } else {
      profileResult =
        await client.query(
          `
            UPDATE provider_profiles

            SET
              bio =
                $2::text,
              experience_years =
                $3::integer,
              service_area =
                $4::varchar,
              profile_photo =
                $5::text,
              updated_at =
                NOW()

            WHERE user_id =
              $1::uuid

            RETURNING
              id,
              user_id,
              bio,
              experience_years,
              service_area,
              profile_photo,
              verification_status,
              availability_status,
              average_rating,
              total_reviews,
              created_at,
              updated_at
          `,
          [
            userId,
            bio || null,
            experienceYears,
            serviceArea,
            profilePhoto || null,
          ]
        );
    }

    await client.query(
      "COMMIT"
    );

    return res
      .status(
        created ? 201 : 200
      )
      .json({
        success: true,
        message: created
          ? "Provider profile created successfully."
          : "Provider profile updated successfully.",

        provider:
          mapProviderProfile({
            ...profileResult.rows[0],
            full_name:
              user.full_name,
            email:
              user.email,
            phone:
              user.phone,
          }),
      });
  } catch (error) {
    await client.query(
      "ROLLBACK"
    );

    console.error(
      "Save provider profile error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to save provider profile.",
    });
  } finally {
    client.release();
  }
}

async function updateMyAvailability(
  req,
  res
) {
  try {
    const userId =
      req.user.userId;

    const availabilityStatus =
      String(
        req.body.availabilityStatus ||
        ""
      )
        .trim()
        .toUpperCase();

    const allowedStatuses = [
      "OFFLINE",
      "AVAILABLE",
      "BUSY",
      "AWAY",
    ];

    if (
      !allowedStatuses.includes(
        availabilityStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid availability status.",
      });
    }

    const result =
      await pool.query(
        `
          UPDATE provider_profiles

          SET
            availability_status =
              $2::varchar,
            updated_at =
              CURRENT_TIMESTAMP

          WHERE user_id =
            $1::uuid

          RETURNING
            id,
            availability_status,
            updated_at
        `,
        [
          userId,
          availabilityStatus,
        ]
      );

    if (
      result.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Create your provider profile before changing availability.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Availability updated successfully.",

      availabilityStatus:
        result.rows[0]
          .availability_status,

      updatedAt:
        result.rows[0]
          .updated_at,
    });
  } catch (error) {
    console.error(
      "Update provider availability error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update availability.",
    });
  }
}

async function getProviders(
  req,
  res
) {
  try {

    const search =
      String(
        req.query.search || ""
      ).trim();

    const categoryId =
      String(
        req.query.categoryId || ""
      ).trim();

      const location =
  String(
    req.query.location || ""
  ).trim();

    const values = [];
    const where = [
  `pp.availability_status = 'AVAILABLE'`,
  `pp.verification_status = 'APPROVED'`,
  `ps.is_active = TRUE`,
  `
    EXISTS (
      SELECT 1
      FROM business_subscriptions bs
      WHERE bs.user_id = pp.user_id
        AND bs.business_type = 'PROVIDER'
        AND UPPER(bs.status) = 'ACTIVE'
        AND (
          bs.expires_at IS NULL
          OR bs.expires_at > CURRENT_TIMESTAMP
        )
    )
  `
];

    if (search) {
      values.push(
        `%${search}%`
      );

      where.push(
        `(pp.service_area ILIKE $${values.length}
        OR u.full_name ILIKE $${values.length}
        OR ps.title ILIKE $${values.length})`
      );
    }

    if (categoryId) {
      values.push(categoryId);

      where.push(
        `ps.category_id = $${values.length}::uuid`
      );
    }

    if (location) {
  values.push(
    `%${location}%`
  );

  where.push(
    `pp.service_area ILIKE $${values.length}`
  );
}

    const result =
      await pool.query(
        `
        SELECT

          pp.id,
          pp.service_area,
          pp.profile_photo,
          pp.average_rating,
          pp.total_reviews,
          pp.verification_status,

          u.full_name,

          ps.id AS service_id,
          ps.title,
          ps.description,
          ps.pricing_type,
          ps.price,

          sc.name
            AS category_name

        FROM provider_profiles pp

        INNER JOIN users u
          ON u.id = pp.user_id

        INNER JOIN provider_services ps
          ON ps.provider_id = pp.id

        INNER JOIN service_categories sc
          ON sc.id = ps.category_id

        WHERE
          ${where.join(" AND ")}

        ORDER BY
          pp.average_rating DESC,
          ps.created_at DESC
        `,
        values
      );

    return res.json({
      success: true,
      providers:
        result.rows,
    });

  } catch (error) {

    console.error(
      "Get providers error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load providers."
    });

  }
}

async function getProviderDetails(
  req,
  res
) {
  try {
    const providerId =
      String(
        req.params.providerId || ""
      ).trim();

    const providerResult =
      await pool.query(
        `
          SELECT
            pp.id,
            pp.bio,
            pp.experience_years,
            pp.service_area,
            pp.profile_photo,
            pp.verification_status,
            pp.availability_status,
            pp.average_rating,
            pp.total_reviews,
            pp.created_at,

            u.full_name,
            u.email,
            u.phone

          FROM provider_profiles pp

          INNER JOIN users u
            ON u.id = pp.user_id

         WHERE pp.id =
  $1::uuid

AND pp.verification_status =
  'APPROVED'

AND pp.availability_status =
  'AVAILABLE'

AND EXISTS (
  SELECT 1
  FROM business_subscriptions bs
  WHERE bs.user_id = pp.user_id
    AND bs.business_type = 'PROVIDER'
    AND UPPER(bs.status) = 'ACTIVE'
    AND (
      bs.expires_at IS NULL
      OR bs.expires_at > CURRENT_TIMESTAMP
    )
)

LIMIT 1
        `,
        [providerId]
      );

    if (
      providerResult.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Provider not found.",
      });
    }

    const servicesResult =
      await pool.query(
        `
          SELECT
            ps.id,
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

          INNER JOIN service_categories sc
            ON sc.id = ps.category_id

          WHERE ps.provider_id =
            $1::uuid

            AND ps.is_active =
              TRUE

            AND sc.is_active =
              TRUE

          ORDER BY
            ps.created_at DESC
        `,
        [providerId]
      );

      const reviewsResult =
  await pool.query(
    `
      SELECT
        r.id,
        r.rating,
        r.comment,
        r.created_at,

        u.full_name

      FROM reviews r

      INNER JOIN users u
        ON u.id =
          r.customer_id

      WHERE r.provider_id =
        $1::uuid

        AND r.is_approved =
          TRUE

      ORDER BY
        r.created_at DESC
    `,
    [providerId]
  );

    const provider =
      providerResult.rows[0];

    return res.status(200).json({
      success: true,

      provider: {
        id:
          provider.id,

        fullName:
          provider.full_name,

        email:
          provider.email,

        phone:
          provider.phone,

        bio:
          provider.bio,

        experienceYears:
          Number(
            provider.experience_years ||
            0
          ),

        serviceArea:
          provider.service_area,

        profilePhoto:
          provider.profile_photo,

        verificationStatus:
          provider.verification_status,

        availabilityStatus:
          provider.availability_status,

        averageRating:
          Number(
            provider.average_rating ||
            0
          ),

        totalReviews:
          Number(
            provider.total_reviews ||
            0
          ),

        createdAt:
          provider.created_at,

        services:
          servicesResult.rows.map(
            (service) => ({
              id:
                service.id,

              categoryId:
                service.category_id,

              categoryName:
                service.category_name,

              title:
                service.title,

              description:
                service.description,

              pricingType:
                service.pricing_type,

              price:
                Number(
                  service.price || 0
                ),
              isActive:
                Boolean(
                  service.is_active
                ),

              createdAt:
                service.created_at,

              updatedAt:
                service.updated_at,
            })
          ),

          reviews:
  reviewsResult.rows.map(
    (review) => ({
      id:
        review.id,

      customerName:
        review.full_name,

      rating:
        Number(
          review.rating
        ),

      comment:
        review.comment,

      createdAt:
        review.created_at,
    })
  )
      },
    });
  } catch (error) {
    console.error(
      "Get provider details error:",
      error
    );

    if (
      error.code === "22P02"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid provider ID.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to load provider details.",
    });
  }
}

async function getMyProviderBookings(
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
            b.id,
            b.customer_id,
            b.provider_service_id,
            b.provider_id,
            b.service_address,
            b.booking_date,
            b.start_time,
            b.instructions,
            b.estimated_price,
            b.booking_status,
            b.payment_status,
            b.created_at,
            b.updated_at,

            customer.full_name
              AS customer_name,

            customer.phone
              AS customer_phone,

            customer.email
              AS customer_email,

            ps.title
              AS service_title,

            ps.pricing_type

          FROM bookings b

          INNER JOIN provider_profiles pp
            ON pp.id =
              b.provider_id

          INNER JOIN users customer
            ON customer.id =
              b.customer_id

          LEFT JOIN provider_services ps
            ON ps.id =
              b.provider_service_id

          WHERE pp.user_id =
            $1::uuid

          ORDER BY
            CASE
              WHEN b.booking_status = 'PENDING'
                THEN 1
              WHEN b.booking_status = 'CONFIRMED'
                THEN 2
              WHEN b.booking_status = 'IN_PROGRESS'
                THEN 3
              WHEN b.booking_status = 'AWAITING_CUSTOMER_CONFIRMATION'
                THEN 4
              WHEN b.booking_status = 'COMPLETED'
                THEN 5
              ELSE 6
            END,
            b.booking_date ASC,
            b.start_time ASC
        `,
        [userId]
      );

    return res.status(200).json({
      success: true,

      bookings:
        result.rows.map(
          (booking) => ({
            id:
              booking.id,

            customerId:
              booking.customer_id,

            customerName:
              booking.customer_name,

            customerPhone:
              booking.customer_phone,

            customerEmail:
              booking.customer_email,

            providerServiceId:
              booking.provider_service_id,

            providerId:
              booking.provider_id,

            serviceTitle:
              booking.service_title,

            pricingType:
              booking.pricing_type,

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
          })
        ),
    });
  } catch (error) {
    console.error(
      "Get provider bookings error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load provider bookings.",
    });
  }
}


async function updateProviderBookingStatus(
  req,
  res
) {
  const client =
    await pool.connect();

  try {
    const userId =
      req.user.userId;

    const bookingId =
      cleanText(
        req.params.bookingId
      );

    const requestedStatus =
      cleanText(
        req.body.bookingStatus
      ).toUpperCase();

   const allowedStatuses = [
  "CONFIRMED",
  "REJECTED",
  "IN_PROGRESS",
  "AWAITING_CUSTOMER_CONFIRMATION",
];

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
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
      !allowedStatuses.includes(
        requestedStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid booking status.",
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
        b.provider_service_id,
        b.booking_status,
        b.payment_status,
        b.booking_date,
        b.start_time,
        b.service_address,
        b.estimated_price,

        pp.user_id
          AS provider_user_id,

        (
          SELECT ps.title
          FROM provider_services ps
          WHERE ps.id =
            b.provider_service_id
          LIMIT 1
        ) AS service_title

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
      booking.provider_user_id !==
      userId
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(403).json({
        success: false,
        message:
          "You cannot manage this booking.",
      });
    }

    const currentStatus =
      String(
        booking.booking_status ||
        ""
      ).toUpperCase();

    const allowedTransitions = {
      PENDING: [
        "CONFIRMED",
        "REJECTED",
      ],

      CONFIRMED: [
        "IN_PROGRESS",
      ],

      IN_PROGRESS: [
        "AWAITING_CUSTOMER_CONFIRMATION",
      ],

      AWAITING_CUSTOMER_CONFIRMATION: [],

      COMPLETED: [],

      REJECTED: [],

      CANCELLED: [],
    };

    const nextStatuses =
      allowedTransitions[
        currentStatus
      ] || [];

    if (
      !nextStatuses.includes(
        requestedStatus
      )
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(409).json({
        success: false,
        message:
          `Booking cannot move from ${currentStatus} to ${requestedStatus}.`,
      });
    }

    const updateResult =
      await client.query(
        `
          UPDATE bookings

          SET
            booking_status =
              $2::varchar,

            updated_at =
              CURRENT_TIMESTAMP

          WHERE id =
            $1::uuid

          RETURNING
            id,
            customer_id,
            provider_id,
            provider_service_id,
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
          bookingId,
          requestedStatus,
        ]
      );

    await client.query(
      "COMMIT"
    );

    const updatedBooking =
      updateResult.rows[0];

    const io =
  req.app.get("io");

if (io) {
  io
    .to(
      `customer:${updatedBooking.customer_id}`
    )
    .emit(
      "customer-booking-status-updated",
      {
        bookingId:
          updatedBooking.id,

        customerId:
          updatedBooking.customer_id,

        providerId:
          updatedBooking.provider_id,

        bookingStatus:
          updatedBooking.booking_status,

        serviceTitle:
          booking.service_title,

        updatedAt:
          updatedBooking.updated_at,
      }
    );

    io
  .to(
    `provider:${updatedBooking.provider_id}`
  )
  .emit(
    "provider-booking-status-updated",
    {
      bookingId:
        updatedBooking.id,

      customerId:
        updatedBooking.customer_id,

      providerId:
        updatedBooking.provider_id,

      bookingStatus:
        updatedBooking.booking_status,
    }
  );
}

    return res.status(200).json({
      success: true,
      message:
        `Booking status updated to ${requestedStatus}.`,

      booking: {
        id:
          updatedBooking.id,

        customerId:
          updatedBooking.customer_id,

        providerId:
          updatedBooking.provider_id,

        providerServiceId:
          updatedBooking.provider_service_id,

        serviceTitle:
          booking.service_title,

        serviceAddress:
          updatedBooking.service_address,

        bookingDate:
          updatedBooking.booking_date,

        startTime:
          updatedBooking.start_time,

        instructions:
          updatedBooking.instructions,

        estimatedPrice:
          Number(
            updatedBooking.estimated_price ||
            0
          ),

        bookingStatus:
          updatedBooking.booking_status,

        paymentStatus:
          updatedBooking.payment_status,

        createdAt:
          updatedBooking.created_at,

        updatedAt:
          updatedBooking.updated_at,
      },
    });
  } catch (error) {
    try {
      await client.query(
        "ROLLBACK"
      );
    } catch (rollbackError) {
      console.error(
        "Booking status rollback error:",
        rollbackError
      );
    }

    console.error(
      "Update provider booking status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update booking status.",
    });
  } finally {
    client.release();
  }
}
module.exports = {
  getProviders,
  getProviderDetails,
  getMyProviderProfile,
  createMyProviderProfile,
  updateMyAvailability,
  getMyProviderBookings,
  updateProviderBookingStatus,
};