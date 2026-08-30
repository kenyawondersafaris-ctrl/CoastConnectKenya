"use strict";

const pool = require("../config/db");

const {
  convertSuccessfulCheckoutToOrder,
  emitSuccessfulRestaurantOrderEvents,
} = require(
  "../services/restaurantPaymentService"
);

const ALLOWED_SORTS = {
  recommended: `
    r.average_rating DESC,
    r.total_reviews DESC,
    r.created_at DESC
  `,
  "rating-desc": `
    r.average_rating DESC,
    r.total_reviews DESC
  `,
  newest: `
    r.created_at DESC
  `,
  "price-low": `
    CASE r.price_range
      WHEN 'budget' THEN 1
      WHEN 'moderate' THEN 2
      WHEN 'premium' THEN 3
      ELSE 4
    END ASC,
    r.average_rating DESC
  `,
  "price-high": `
    CASE r.price_range
      WHEN 'premium' THEN 1
      WHEN 'moderate' THEN 2
      WHEN 'budget' THEN 3
      ELSE 4
    END ASC,
    r.average_rating DESC
  `,
};

function parsePositiveInteger(value, fallback, maximum) {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    return fallback;
  }

  return Math.min(parsedValue, maximum);
}

function parseBoolean(value) {
  return String(value).toLowerCase() === "true";
}

function normalizeCuisines(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(",")
    .map((cuisine) => cuisine.trim().toLowerCase())
    .filter(Boolean);
}

function formatOpeningHours(openingTime, closingTime) {
  if (!openingTime || !closingTime) {
    return null;
  }

  return `${String(openingTime).slice(0, 5)} - ${String(
    closingTime
  ).slice(0, 5)}`;
}

function mapRestaurant(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortDescription: row.description,
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    address: row.address,
    latitude:
      row.latitude !== null ? Number(row.latitude) : null,
    longitude:
      row.longitude !== null ? Number(row.longitude) : null,
    openingTime: row.opening_time,
    closingTime: row.closing_time,
    priceRange: row.price_range,
    cuisines: Array.isArray(row.cuisines)
      ? row.cuisines
      : [],
    coverImage: row.cover_image_url,
    isHalal: row.is_halal,
    offersDelivery: row.offers_delivery,
    isVerified: row.approval_status === "APPROVED",
    isOpen: row.is_open,
    rating: Number(row.average_rating || 0),
    reviewCount: Number(row.total_reviews || 0),
    locationName: [
      row.area,
      row.town,
      row.county,
    ]
      .filter(Boolean)
      .join(", "),
    location: {
      id: row.location_id,
      county: row.county,
      town: row.town,
      area: row.area,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRestaurantDetails(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    address: row.address,

    latitude:
      row.latitude !== null ? Number(row.latitude) : null,

    longitude:
      row.longitude !== null ? Number(row.longitude) : null,

    openingTime: row.opening_time,
    closingTime: row.closing_time,

    openingHours: formatOpeningHours(
      row.opening_time,
      row.closing_time
    ),

    priceRange: row.price_range,

    cuisines: Array.isArray(row.cuisines)
      ? row.cuisines
      : [],

    coverImageUrl: row.cover_image_url,

    isHalal: Boolean(row.is_halal),
    offersDelivery: Boolean(row.offers_delivery),
    isAcceptingOrders:
  row.is_accepting_orders !== false,

temporaryClosedReason:
  row.temporary_closed_reason,

    isVerified:
      row.approval_status === "APPROVED",

    isOpenNow: Boolean(row.is_open),

    averageRating: Number(
      row.average_rating || 0
    ),

    totalReviews: Number(
      row.total_reviews || 0
    ),

    locationName: [
      row.area,
      row.town,
      row.county,
    ]
      .filter(Boolean)
      .join(", "),

    location: {
      id: row.location_id,
      county: row.county,
      town: row.town,
      area: row.area,
    },

    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMenuItem(row) {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    description: row.description,
    category: row.category,
    categoryName: row.category,
    price: Number(row.price || 0),
    imageUrl: row.image_url,
    isAvailable: Boolean(row.is_available),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getRestaurants(req, res) {
  try {
    const page = parsePositiveInteger(
      req.query.page,
      1,
      100000
    );

    const limit = parsePositiveInteger(
      req.query.limit,
      12,
      50
    );

    const offset = (page - 1) * limit;

    const search = String(
      req.query.search || ""
    ).trim();

    const location = String(
      req.query.location || ""
    )
      .trim()
      .toLowerCase();

    const cuisines = normalizeCuisines(
      req.query.cuisines
    );

    const priceRange = String(
      req.query.priceRange || ""
    )
      .trim()
      .toLowerCase();

    const minimumRating = Number(
      req.query.rating
    );

    const openNow = parseBoolean(
      req.query.openNow
    );

    const verifiedOnly = parseBoolean(
      req.query.verified
    );

    const sort = String(
      req.query.sort || "recommended"
    ).toLowerCase();

    const orderBy =
      ALLOWED_SORTS[sort] ||
      ALLOWED_SORTS.recommended;

   const conditions = [
  "r.approval_status = 'APPROVED'",

  `EXISTS (
    SELECT 1
    FROM business_subscriptions bs

    WHERE bs.user_id = r.owner_id
      AND bs.business_type = 'RESTAURANT'
      AND bs.status = 'ACTIVE'
      AND (
        bs.expires_at IS NULL
        OR bs.expires_at > CURRENT_TIMESTAMP
      )
  )`,
];

    const values = [];

    function addValue(value) {
      values.push(value);
      return `$${values.length}`;
    }

    if (search) {
      const searchPlaceholder = addValue(
        `%${search}%`
      );

      conditions.push(`
        (
          r.name ILIKE ${searchPlaceholder}
          OR COALESCE(r.description, '') ILIKE ${searchPlaceholder}
          OR COALESCE(r.address, '') ILIKE ${searchPlaceholder}

          OR EXISTS (
            SELECT 1
            FROM unnest(r.cuisines) AS cuisine
            WHERE cuisine ILIKE ${searchPlaceholder}
          )

          OR EXISTS (
            SELECT 1
            FROM menu_items mi
            WHERE mi.restaurant_id = r.id
              AND mi.is_available = TRUE
              AND (
                mi.name ILIKE ${searchPlaceholder}
                OR COALESCE(mi.description, '') ILIKE ${searchPlaceholder}
                OR COALESCE(mi.category, '') ILIKE ${searchPlaceholder}
              )
          )
        )
      `);
    }

    if (location) {
      const locationPlaceholder = addValue(
        location
      );

      conditions.push(`
        (
          LOWER(COALESCE(l.county, '')) =
            ${locationPlaceholder}

          OR LOWER(COALESCE(l.town, '')) =
            ${locationPlaceholder}

          OR LOWER(COALESCE(l.area, '')) =
            ${locationPlaceholder}
        )
      `);
    }

    if (cuisines.length > 0) {
      const cuisinePlaceholder = addValue(
        cuisines
      );

      conditions.push(`
        ARRAY(
          SELECT LOWER(cuisine)
          FROM unnest(r.cuisines) AS cuisine
        ) && ${cuisinePlaceholder}::TEXT[]
      `);
    }

    if (
      ["budget", "moderate", "premium"].includes(
        priceRange
      )
    ) {
      const pricePlaceholder = addValue(
        priceRange
      );

      conditions.push(`
        LOWER(COALESCE(r.price_range, '')) =
        ${pricePlaceholder}
      `);
    }

    if (
      Number.isFinite(minimumRating) &&
      minimumRating >= 1 &&
      minimumRating <= 5
    ) {
      const ratingPlaceholder = addValue(
        minimumRating
      );

      conditions.push(`
        r.average_rating >= ${ratingPlaceholder}
      `);
    }

    if (verifiedOnly) {
      conditions.push(`
        r.approval_status = 'APPROVED'
      `);
    }

    if (openNow) {
      conditions.push(`
        (
          r.opening_time IS NOT NULL
          AND r.closing_time IS NOT NULL

          AND (
            (
              r.opening_time <= r.closing_time
                AND
                  (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Nairobi')::time
                  BETWEEN r.opening_time AND r.closing_time
            )

            OR

            (
              (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Nairobi')::time
  >= r.opening_time

OR

(CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Nairobi')::time
  <= r.closing_time
              )
            )
          )
        )
      `);
    }

    const whereClause = conditions.join(
      " AND "
    );

    const countQuery = `
      SELECT COUNT(*)::INTEGER AS total
      FROM restaurants r

      LEFT JOIN locations l
        ON l.id = r.location_id

      WHERE ${whereClause}
    `;

    const countResult = await pool.query(
      countQuery,
      values
    );

    const totalItems = Number(
      countResult.rows[0]?.total || 0
    );

    const limitPlaceholder =
      `$${values.length + 1}`;

    const offsetPlaceholder =
      `$${values.length + 2}`;

    const dataValues = [
      ...values,
      limit,
      offset,
    ];

    const restaurantsQuery = `
      SELECT
        r.id,
        r.owner_id,
        r.location_id,
        r.slug,
        r.name,
        r.description,
        r.phone,
        r.whatsapp,
        r.email,
        r.address,
        r.latitude,
        r.longitude,
        r.opening_time,
        r.closing_time,
        r.price_range,
        r.cuisines,
        r.cover_image_url,
        r.is_halal,
        r.offers_delivery,
        r.is_accepting_orders,
        r.temporary_closed_reason,
        r.approval_status,
        r.average_rating,
        r.total_reviews,
        r.created_at,
        r.updated_at,
        l.county,
        l.town,
        l.area,

        CASE
  WHEN
    r.opening_time IS NULL
    OR r.closing_time IS NULL
  THEN FALSE

  WHEN r.opening_time <= r.closing_time
  THEN
    (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Nairobi')::time
    BETWEEN r.opening_time AND r.closing_time

  ELSE
    (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Nairobi')::time
      >= r.opening_time
    OR
    (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Nairobi')::time
      <= r.closing_time
END AS is_open

      FROM restaurants r

      LEFT JOIN locations l
        ON l.id = r.location_id

      WHERE ${whereClause}

      ORDER BY ${orderBy}

      LIMIT ${limitPlaceholder}
      OFFSET ${offsetPlaceholder}
    `;

    const restaurantsResult = await pool.query(
      restaurantsQuery,
      dataValues
    );

    const totalPages =
      totalItems === 0
        ? 0
        : Math.ceil(totalItems / limit);

    return res.status(200).json({
      success: true,

      restaurants:
        restaurantsResult.rows.map(
          mapRestaurant
        ),

      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      },
    });
  } catch (error) {
    console.error(
      "Get restaurants error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load restaurants at the moment.",
    });
  }
}

async function getRestaurantByIdentifier(
  req,
  res
) {
  try {
    const identifier = String(
      req.params.identifier || ""
    ).trim();

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message:
          "A restaurant ID or slug is required.",
      });
    }

    const restaurantQuery = `
      SELECT
        r.id,
        r.owner_id,
        r.location_id,
        r.slug,
        r.name,
        r.description,
        r.phone,
        r.whatsapp,
        r.email,
        r.address,
        r.latitude,
        r.longitude,
        r.opening_time,
        r.closing_time,
        r.price_range,
        r.cuisines,
        r.cover_image_url,
        r.is_halal,
        r.offers_delivery,
        r.approval_status,
        r.average_rating,
        r.total_reviews,
        r.created_at,
        r.updated_at,
        l.county,
        l.town,
        l.area,

        CASE
  WHEN
    r.opening_time IS NULL
    OR r.closing_time IS NULL
  THEN FALSE

  WHEN r.opening_time <= r.closing_time
  THEN
    (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Nairobi')::time
    BETWEEN r.opening_time AND r.closing_time

  ELSE
    (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Nairobi')::time
      >= r.opening_time
    OR
    (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Nairobi')::time
      <= r.closing_time
END AS is_open

      FROM restaurants r

      LEFT JOIN locations l
        ON l.id = r.location_id

     WHERE
  r.approval_status = 'APPROVED'

  AND EXISTS (
    SELECT 1
    FROM business_subscriptions bs

    WHERE bs.user_id = r.owner_id
      AND bs.business_type = 'RESTAURANT'
      AND bs.status = 'ACTIVE'
      AND (
        bs.expires_at IS NULL
        OR bs.expires_at > CURRENT_TIMESTAMP
      )
  )

  AND (
    LOWER(COALESCE(r.slug, '')) =
      LOWER($1)

    OR r.id::TEXT = $1
  )

      LIMIT 1
    `;

    const restaurantResult = await pool.query(
      restaurantQuery,
      [identifier]
    );

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found.",
      });
    }

    const restaurantRow =
      restaurantResult.rows[0];

    const menuQuery = `
      SELECT
        id,
        restaurant_id,
        name,
        description,
        category,
        price,
        image_url,
        is_available,
        created_at,
        updated_at

      FROM menu_items

      WHERE restaurant_id = $1
        AND is_available = TRUE

      ORDER BY
        category ASC NULLS LAST,
        name ASC
    `;

    const menuResult = await pool.query(
      menuQuery,
      [restaurantRow.id]
    );

    const reviewsQuery = `
  SELECT
    rv.id,
    rv.rating,
    rv.comment,
    rv.created_at,

    COALESCE(
      u.full_name,
      ro.customer_name,
      'Coast Connect customer'
    ) AS customer_name

  FROM reviews rv

  LEFT JOIN users u
    ON u.id = rv.customer_id

  LEFT JOIN restaurant_orders ro
    ON ro.id = rv.restaurant_order_id

  WHERE rv.restaurant_id = $1
    AND rv.is_approved = TRUE

  ORDER BY
    rv.created_at DESC
`;

const reviewsResult =
  await pool.query(
    reviewsQuery,
    [restaurantRow.id]
  );

    return res.status(200).json({
      success: true,

      restaurant:
        mapRestaurantDetails(
          restaurantRow
        ),

      menuItems:
        menuResult.rows.map(mapMenuItem),

     reviews:
  reviewsResult.rows.map(
    (review) => ({
      id:
        review.id,

      customerName:
        review.customer_name,

      rating:
        Number(review.rating),

      comment:
        review.comment,

      createdAt:
        review.created_at,
    })
  ),

    });
  } catch (error) {
    console.error(
      "Get restaurant details error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load restaurant details at the moment.",
    });
  }
}

function cleanText(value) {
  const cleaned = String(value ?? "").trim();
  return cleaned || null;
}

function createRestaurantSlug(name, ownerId) {
  const baseSlug = String(name)
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  const ownerSuffix = String(ownerId)
    .replace(/-/g, "")
    .slice(0, 8);

  return `${baseSlug || "restaurant"}-${ownerSuffix}`;
}

function normalizeRestaurantCuisines(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
      .slice(0, 20);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 20);
  }

  return [];
}

function mapOwnerRestaurant(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    ownerId: row.owner_id,
    locationId: row.location_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    address: row.address,

    latitude:
      row.latitude !== null
        ? Number(row.latitude)
        : null,

    longitude:
      row.longitude !== null
        ? Number(row.longitude)
        : null,

    openingTime: row.opening_time,
    closingTime: row.closing_time,
    priceRange: row.price_range,

    cuisines: Array.isArray(row.cuisines)
      ? row.cuisines
      : [],

    coverImageUrl: row.cover_image_url,
    isHalal: Boolean(row.is_halal),
    offersDelivery: Boolean(row.offers_delivery),
    isAcceptingOrders:
  Boolean(
    row.is_accepting_orders
  ),

temporaryClosedReason:
  row.temporary_closed_reason,

temporarilyClosedAt:
  row.temporarily_closed_at,

ordersResumedAt:
  row.orders_resumed_at,
    approvalStatus: row.approval_status,

    averageRating: Number(
      row.average_rating || 0
    ),

    totalReviews: Number(
      row.total_reviews || 0
    ),

    location: {
      id: row.location_id,
      county: row.county,
      town: row.town,
      area: row.area,
    },

    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const OWNER_RESTAURANT_SELECT = `
  SELECT
    r.id,
    r.owner_id,
    r.location_id,
    r.slug,
    r.name,
    r.description,
    r.phone,
    r.whatsapp,
    r.email,
    r.address,
    r.latitude,
    r.longitude,
    r.opening_time,
    r.closing_time,
    r.price_range,
    r.cuisines,
    r.cover_image_url,
    r.is_halal,
    r.offers_delivery,
    r.is_accepting_orders,
    r.temporary_closed_reason,
    r.temporarily_closed_at,
    r.orders_resumed_at,
    r.approval_status,
    r.average_rating,
    r.total_reviews,
    r.created_at,
    r.updated_at,
    l.county,
    l.town,
    l.area

  FROM restaurants r

  LEFT JOIN locations l
    ON l.id = r.location_id
`;

async function getOwnerRestaurant(req, res) {
  try {
    const ownerId = req.user.userId;

    const result = await pool.query(
      `
        ${OWNER_RESTAURANT_SELECT}
        WHERE r.owner_id = $1
        LIMIT 1
      `,
      [ownerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Restaurant profile not found for this account.",
      });
    }

    return res.status(200).json({
      success: true,
      restaurant: mapOwnerRestaurant(
        result.rows[0]
      ),
    });
  } catch (error) {
    console.error(
      "Get owner restaurant error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load your restaurant profile.",
    });
  }
}

async function createOwnerRestaurant(req, res) {
  const client = await pool.connect();

  try {
    const ownerId = req.user.userId;

    const name = cleanText(req.body.name);
    const description = cleanText(
      req.body.description
    );
    const phone = cleanText(req.body.phone);
    const whatsapp = cleanText(
      req.body.whatsapp
    );
    const email = cleanText(req.body.email);
    const address = cleanText(req.body.address);
    const county = cleanText(req.body.county);
    const town = cleanText(req.body.town);
    const area = cleanText(req.body.area);
    const coverImageUrl = cleanText(
      req.body.coverImageUrl
    );

    const latitude =
      req.body.latitude === "" ||
      req.body.latitude === null ||
      req.body.latitude === undefined
        ? null
        : Number(req.body.latitude);

    const longitude =
      req.body.longitude === "" ||
      req.body.longitude === null ||
      req.body.longitude === undefined
        ? null
        : Number(req.body.longitude);

    const priceRange = String(
      req.body.priceRange || ""
    )
      .trim()
      .toLowerCase();

    const cuisines = normalizeRestaurantCuisines(
      req.body.cuisines
    );

    const isHalal =
      req.body.isHalal === true ||
      String(req.body.isHalal).toLowerCase() ===
        "true";

    const offersDelivery =
      req.body.offersDelivery === true ||
      String(
        req.body.offersDelivery
      ).toLowerCase() === "true";

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Restaurant name is required.",
      });
    }

    if (!county || !town) {
      return res.status(400).json({
        success: false,
        message:
          "County and town are required.",
      });
    }

    if (
      priceRange &&
      !["budget", "moderate", "premium"].includes(
        priceRange
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Price range must be budget, moderate, or premium.",
      });
    }

    if (
      latitude !== null &&
      !Number.isFinite(latitude)
    ) {
      return res.status(400).json({
        success: false,
        message: "Latitude must be a valid number.",
      });
    }

    if (
      longitude !== null &&
      !Number.isFinite(longitude)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Longitude must be a valid number.",
      });
    }

    await client.query("BEGIN");

    const existingResult = await client.query(
      `
        SELECT id
        FROM restaurants
        WHERE owner_id = $1
        LIMIT 1
      `,
      [ownerId]
    );

    if (existingResult.rows.length > 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message:
          "This account already has a restaurant profile.",
      });
    }

    const locationResult = await client.query(
      `
        INSERT INTO locations (
          county,
          town,
          area,
          latitude,
          longitude
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [
        county,
        town,
        area,
        latitude,
        longitude,
      ]
    );

    const locationId =
      locationResult.rows[0].id;

    const slug = createRestaurantSlug(
      name,
      ownerId
    );

    const restaurantResult =
      await client.query(
        `
          INSERT INTO restaurants (
            owner_id,
            location_id,
            slug,
            name,
            description,
            phone,
            whatsapp,
            email,
            address,
            latitude,
            longitude,
            price_range,
            cuisines,
            cover_image_url,
            is_halal,
            offers_delivery,
            approval_status
          )
          VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11, $12,
            $13, $14, $15, $16, 'PENDING'
          )
          RETURNING id
        `,
        [
          ownerId,
          locationId,
          slug,
          name,
          description,
          phone,
          whatsapp,
          email,
          address,
          latitude,
          longitude,
          priceRange || null,
          cuisines,
          coverImageUrl,
          isHalal,
          offersDelivery,
        ]
      );

    const restaurantId =
      restaurantResult.rows[0].id;

    const completeResult = await client.query(
      `
        ${OWNER_RESTAURANT_SELECT}
        WHERE r.id = $1
        LIMIT 1
      `,
      [restaurantId]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message:
        "Restaurant profile created successfully.",
      restaurant: mapOwnerRestaurant(
        completeResult.rows[0]
      ),
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Create owner restaurant error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to create your restaurant profile.",
    });
  } finally {
    client.release();
  }
}

async function updateOwnerRestaurant(req, res) {
  const client = await pool.connect();

  try {
    const ownerId = req.user.userId;

    const name = cleanText(req.body.name);
    const description = cleanText(
      req.body.description
    );
    const phone = cleanText(req.body.phone);
    const whatsapp = cleanText(
      req.body.whatsapp
    );
    const email = cleanText(req.body.email);
    const address = cleanText(req.body.address);
    const county = cleanText(req.body.county);
    const town = cleanText(req.body.town);
    const area = cleanText(req.body.area);
    const coverImageUrl = cleanText(
      req.body.coverImageUrl
    );

    const latitude =
      req.body.latitude === "" ||
      req.body.latitude === null ||
      req.body.latitude === undefined
        ? null
        : Number(req.body.latitude);

    const longitude =
      req.body.longitude === "" ||
      req.body.longitude === null ||
      req.body.longitude === undefined
        ? null
        : Number(req.body.longitude);

    const priceRange = String(
      req.body.priceRange || ""
    )
      .trim()
      .toLowerCase();

    const cuisines = normalizeRestaurantCuisines(
      req.body.cuisines
    );

    const isHalal =
      req.body.isHalal === true ||
      String(req.body.isHalal).toLowerCase() ===
        "true";

    const offersDelivery =
      req.body.offersDelivery === true ||
      String(
        req.body.offersDelivery
      ).toLowerCase() === "true";

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Restaurant name is required.",
      });
    }

    if (!county || !town) {
      return res.status(400).json({
        success: false,
        message:
          "County and town are required.",
      });
    }

    if (
      priceRange &&
      !["budget", "moderate", "premium"].includes(
        priceRange
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Price range must be budget, moderate, or premium.",
      });
    }

    if (
      latitude !== null &&
      !Number.isFinite(latitude)
    ) {
      return res.status(400).json({
        success: false,
        message: "Latitude must be a valid number.",
      });
    }

    if (
      longitude !== null &&
      !Number.isFinite(longitude)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Longitude must be a valid number.",
      });
    }

    await client.query("BEGIN");

    const existingResult = await client.query(
      `
        SELECT id, location_id
        FROM restaurants
        WHERE owner_id = $1
        LIMIT 1
        FOR UPDATE
      `,
      [ownerId]
    );

    if (existingResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message:
          "Restaurant profile not found.",
      });
    }

    const restaurant =
      existingResult.rows[0];

    let locationId = restaurant.location_id;

    if (locationId) {
      await client.query(
        `
          UPDATE locations
          SET
            county = $1,
            town = $2,
            area = $3,
            latitude = $4,
            longitude = $5
          WHERE id = $6
        `,
        [
          county,
          town,
          area,
          latitude,
          longitude,
          locationId,
        ]
      );
    } else {
      const locationResult =
        await client.query(
          `
            INSERT INTO locations (
              county,
              town,
              area,
              latitude,
              longitude
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
          `,
          [
            county,
            town,
            area,
            latitude,
            longitude,
          ]
        );

      locationId =
        locationResult.rows[0].id;
    }

    const slug = createRestaurantSlug(
      name,
      ownerId
    );

    await client.query(
      `
        UPDATE restaurants
        SET
          location_id = $1,
          slug = $2,
          name = $3,
          description = $4,
          phone = $5,
          whatsapp = $6,
          email = $7,
          address = $8,
          latitude = $9,
          longitude = $10,
          price_range = $11,
          cuisines = $12,
          cover_image_url = $13,
          is_halal = $14,
          offers_delivery = $15,
          approval_status = CASE
            WHEN approval_status = 'REJECTED'
              THEN 'PENDING'
            ELSE approval_status
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $16
      `,
      [
        locationId,
        slug,
        name,
        description,
        phone,
        whatsapp,
        email,
        address,
        latitude,
        longitude,
        priceRange || null,
        cuisines,
        coverImageUrl,
        isHalal,
        offersDelivery,
        restaurant.id,
      ]
    );

    const completeResult = await client.query(
      `
        ${OWNER_RESTAURANT_SELECT}
        WHERE r.id = $1
        LIMIT 1
      `,
      [restaurant.id]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message:
        "Restaurant profile updated successfully.",
      restaurant: mapOwnerRestaurant(
        completeResult.rows[0]
      ),
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Update owner restaurant error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update your restaurant profile.",
    });
  } finally {
    client.release();
  }
}

function normalizeTimeValue(value) {
  const time = String(value ?? "").trim();

  if (!time) {
    return null;
  }

  const validTimePattern =
    /^([01]\d|2[0-3]):([0-5]\d)$/;

  return validTimePattern.test(time)
    ? time
    : null;
}

function normalizeOpenDays(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .map((day) => Number(day))
        .filter(
          (day) =>
            Number.isInteger(day) &&
            day >= 0 &&
            day <= 6
        )
    ),
  ];
}

function mapOpeningHour(row) {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    dayOfWeek: Number(row.day_of_week),
    isOpen: Boolean(row.is_open),
    openingTime: row.opening_time
      ? String(row.opening_time).slice(0, 5)
      : null,
    closingTime: row.closing_time
      ? String(row.closing_time).slice(0, 5)
      : null,
    updatedAt: row.updated_at,
  };
}

async function getOwnerOpeningHours(req, res) {
  try {
    const ownerId = req.user.userId;

    const restaurantResult = await pool.query(
      `
        SELECT id
        FROM restaurants
        WHERE owner_id = $1
        LIMIT 1
      `,
      [ownerId]
    );

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Create your restaurant profile before setting opening hours.",
      });
    }

    const restaurantId =
      restaurantResult.rows[0].id;

    const scheduleResult = await pool.query(
      `
        SELECT
          id,
          restaurant_id,
          day_of_week,
          is_open,
          opening_time,
          closing_time,
          updated_at

        FROM restaurant_opening_hours

        WHERE restaurant_id = $1

        ORDER BY day_of_week ASC
      `,
      [restaurantId]
    );

    const existingSchedule = new Map(
      scheduleResult.rows.map((row) => [
        Number(row.day_of_week),
        mapOpeningHour(row),
      ])
    );

    const openingHours = [];

    for (let day = 0; day <= 6; day += 1) {
      openingHours.push(
        existingSchedule.get(day) || {
          id: null,
          restaurantId,
          dayOfWeek: day,
          isOpen: false,
          openingTime: null,
          closingTime: null,
          updatedAt: null,
        }
      );
    }

    return res.status(200).json({
      success: true,
      openingHours,
    });
  } catch (error) {
    console.error(
      "Get owner opening hours error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load your opening hours.",
    });
  }
}

async function updateOwnerOpeningHours(req, res) {
  const client = await pool.connect();

  try {
    const ownerId = req.user.userId;

    const openingTime = normalizeTimeValue(
      req.body.openingTime
    );

    const closingTime = normalizeTimeValue(
      req.body.closingTime
    );

    const openDays = normalizeOpenDays(
      req.body.openDays
    );

    if (openDays.length > 0) {
      if (!openingTime || !closingTime) {
        return res.status(400).json({
          success: false,
          message:
            "Opening and closing times are required when the restaurant is open.",
        });
      }
    }

    await client.query("BEGIN");

    const restaurantResult =
      await client.query(
        `
          SELECT id
          FROM restaurants
          WHERE owner_id = $1
          LIMIT 1
          FOR UPDATE
        `,
        [ownerId]
      );

    if (restaurantResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message:
          "Create your restaurant profile before setting opening hours.",
      });
    }

    const restaurantId =
      restaurantResult.rows[0].id;

    for (let day = 0; day <= 6; day += 1) {
      const isOpen = openDays.includes(day);

      await client.query(
        `
          INSERT INTO restaurant_opening_hours (
            restaurant_id,
            day_of_week,
            is_open,
            opening_time,
            closing_time
          )
          VALUES ($1, $2, $3, $4, $5)

          ON CONFLICT (
            restaurant_id,
            day_of_week
          )

          DO UPDATE SET
            is_open = EXCLUDED.is_open,
            opening_time =
              EXCLUDED.opening_time,
            closing_time =
              EXCLUDED.closing_time,
            updated_at =
              CURRENT_TIMESTAMP
        `,
        [
          restaurantId,
          day,
          isOpen,
          isOpen ? openingTime : null,
          isOpen ? closingTime : null,
        ]
      );
    }

    /*
      Keep the existing restaurant columns updated
      while the public restaurant API is migrated to
      the weekly schedule table.
    */
    await client.query(
      `
        UPDATE restaurants
        SET
          opening_time = $1,
          closing_time = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `,
      [
        openDays.length > 0
          ? openingTime
          : null,

        openDays.length > 0
          ? closingTime
          : null,

        restaurantId,
      ]
    );

    const savedResult = await client.query(
      `
        SELECT
          id,
          restaurant_id,
          day_of_week,
          is_open,
          opening_time,
          closing_time,
          updated_at

        FROM restaurant_opening_hours

        WHERE restaurant_id = $1

        ORDER BY day_of_week ASC
      `,
      [restaurantId]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message:
        "Opening hours saved successfully.",
      openingHours:
        savedResult.rows.map(
          mapOpeningHour
        ),
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Update owner opening hours error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to save your opening hours.",
    });
  } finally {
    client.release();
  }
}

async function getOwnerRestaurantReviews(
  req,
  res
) {
  try {

    const ownerId =
  req.user.userId;

    const restaurantResult =
      await pool.query(
        `
        SELECT
          id,
          average_rating,
          total_reviews

        FROM restaurants

        WHERE owner_id = $1

        LIMIT 1
        `,
        [ownerId]
      );

    if (
      restaurantResult.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Restaurant not found.",
      });
    }

    const restaurant =
      restaurantResult.rows[0];

    const reviewsResult =
      await pool.query(
        `
        SELECT

          rv.id,
          rv.rating,
          rv.comment,
          rv.created_at,

          COALESCE(
            u.full_name,
            ro.customer_name,
            'Customer'
          ) AS customer_name

        FROM reviews rv

        LEFT JOIN users u
          ON u.id = rv.customer_id

        LEFT JOIN restaurant_orders ro
          ON ro.id =
            rv.restaurant_order_id

        WHERE
          rv.restaurant_id = $1

          AND rv.is_approved = TRUE

        ORDER BY
          rv.created_at DESC
        `,
        [restaurant.id]
      );

    return res.json({

      success: true,

      summary: {

        averageRating:
          Number(
            restaurant.average_rating || 0
          ),

        totalReviews:
          Number(
            restaurant.total_reviews || 0
          ),

      },

      reviews:
        reviewsResult.rows.map(
          (review) => ({

            id:
              review.id,

            customerName:
              review.customer_name,

            rating:
              Number(review.rating),

            comment:
              review.comment,

            createdAt:
              review.created_at,

          })
        ),

    });

  } catch (error) {

    console.error(
      "Owner reviews error:",
      error
    );

    return res.status(500).json({

      success: false,

      message:
        "Unable to load reviews.",

    });

  }
}

async function getOwnerRestaurantAnalytics(
  req,
  res
) {
  try {
    const ownerId =
      req.user.userId;

    const restaurantResult =
      await pool.query(
        `
        SELECT id
        FROM restaurants
        WHERE owner_id = $1
        LIMIT 1
        `,
        [ownerId]
      );

    if (
      restaurantResult.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Restaurant not found.",
      });
    }

    const restaurantId =
      restaurantResult.rows[0].id;

    const analyticsResult =
      await pool.query(
        `
        SELECT

          COUNT(*) AS total_orders,

          COUNT(*) FILTER (
            WHERE payment_status='PAID'
          ) AS paid_orders,

          COUNT(*) FILTER (
            WHERE status='COMPLETED'
          ) AS completed_orders,

          COUNT(*) FILTER (
            WHERE status='PENDING'
          ) AS pending_orders,

          COUNT(*) FILTER (
            WHERE status='CANCELLED'
          ) AS cancelled_orders,

          COALESCE(
            SUM(total_amount)
            FILTER (
              WHERE payment_status='PAID'
            ),
            0
          ) AS total_revenue,

          COALESCE(
            AVG(total_amount)
            FILTER (
              WHERE payment_status='PAID'
            ),
            0
          ) AS average_order_value

        FROM restaurant_orders

        WHERE restaurant_id = $1
        `,
        [restaurantId]
      );

       const todaySalesResult =
  await pool.query(
    `
    SELECT
      COUNT(*) AS orders_today,
      COALESCE(
        SUM(total_amount),
        0
      ) AS revenue_today

    FROM restaurant_orders

    WHERE restaurant_id = $1

      AND payment_status='PAID'

      AND DATE(created_at)=CURRENT_DATE
    `,
    [restaurantId]
  );

  const weeklySalesResult =
  await pool.query(
    `
    SELECT
      COUNT(*) AS orders_week,

      COALESCE(
        SUM(total_amount),
        0
      ) AS revenue_week

    FROM restaurant_orders

    WHERE restaurant_id=$1

      AND payment_status='PAID'

      AND created_at >=
      date_trunc(
        'week',
        CURRENT_DATE
      )
    `,
    [restaurantId]
  );

  const monthlySalesResult =
  await pool.query(
    `
    SELECT

      COUNT(*) AS orders_month,

      COALESCE(
        SUM(total_amount),
        0
      ) AS revenue_month

    FROM restaurant_orders

    WHERE restaurant_id=$1

      AND payment_status='PAID'

      AND created_at >=
      date_trunc(
        'month',
        CURRENT_DATE
      )
    `,
    [restaurantId]
  );

  
   const bestSellingItemsResult =
  await pool.query(
    `
    SELECT

      roi.menu_item_id,

      roi.item_name,

      SUM(
        roi.quantity
      ) AS total_quantity,

      SUM(
        roi.line_total
      ) AS total_revenue

    FROM restaurant_order_items roi

    INNER JOIN restaurant_orders ro

      ON ro.id = roi.order_id

    WHERE

      ro.restaurant_id = $1

      AND ro.payment_status = 'PAID'

    GROUP BY

      roi.menu_item_id,

      roi.item_name

    ORDER BY

      total_quantity DESC,

      total_revenue DESC

    LIMIT 10
    `,
    [restaurantId]
  );

  const revenueTrendResult =
  await pool.query(
    `
    WITH date_series AS (
      SELECT
        generate_series(
          CURRENT_DATE - INTERVAL '6 days',
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date AS sales_date
    )

    SELECT
      ds.sales_date,

      COUNT(ro.id) AS total_orders,

      COALESCE(
        SUM(ro.total_amount),
        0
      ) AS total_revenue

    FROM date_series ds

    LEFT JOIN restaurant_orders ro
      ON ro.restaurant_id = $1

      AND ro.payment_status = 'PAID'

      AND ro.created_at::date =
        ds.sales_date

    GROUP BY
      ds.sales_date

    ORDER BY
      ds.sales_date ASC
    `,
    [restaurantId]
  );

    const stats =
      analyticsResult.rows[0];

      const todayStats =
  todaySalesResult.rows[0];

const weeklyStats =
  weeklySalesResult.rows[0];

const monthlyStats =
  monthlySalesResult.rows[0];

  const bestSellingItems =
  bestSellingItemsResult.rows.map(
    (item) => ({
      menuItemId:
        item.menu_item_id,

      itemName:
        item.item_name,

      totalQuantity:
        Number(
          item.total_quantity || 0
        ),

      totalRevenue:
        Number(
          item.total_revenue || 0
        ),
    })
  );

  const revenueTrend =
  revenueTrendResult.rows.map(
    (day) => ({
      date:
        day.sales_date,

      orders:
        Number(
          day.total_orders || 0
        ),

      revenue:
        Number(
          day.total_revenue || 0
        ),
    })
  );

    return res.json({
      success: true,

      analytics: {

        totalOrders:
          Number(
            stats.total_orders
          ),

        paidOrders:
          Number(
            stats.paid_orders
          ),

        completedOrders:
          Number(
            stats.completed_orders
          ),

        pendingOrders:
          Number(
            stats.pending_orders
          ),

        cancelledOrders:
          Number(
            stats.cancelled_orders
          ),

        totalRevenue:
          Number(
            stats.total_revenue
          ),

        averageOrderValue:
          Number(
            stats.average_order_value
          ),

          today: {
  orders:
    Number(
      todayStats.orders_today || 0
    ),

  revenue:
    Number(
      todayStats.revenue_today || 0
    ),
},

thisWeek: {
  orders:
    Number(
      weeklyStats.orders_week || 0
    ),

  revenue:
    Number(
      weeklyStats.revenue_week || 0
    ),
},

thisMonth: {
  orders:
    Number(
      monthlyStats.orders_month || 0
    ),

  revenue:
    Number(
      monthlyStats.revenue_month || 0
    ),
},

bestSellingItems,
revenueTrend,

      }

    });


  } catch (error) {

    console.error(
      "Restaurant analytics error:",
      error
    );

    return res.status(500).json({

      success: false,

      message:
        "Unable to load analytics."

    });

  }
}

async function updateOwnerOrderAvailability(
  req,
  res
) {
  try {
    const ownerId =
      req.user.userId;

    const isAcceptingOrders =
      req.body.isAcceptingOrders === true ||
      String(
        req.body.isAcceptingOrders
      ).toLowerCase() === "true";

    const reason =
      String(
        req.body.reason || ""
      ).trim() || null;

    if (
      !isAcceptingOrders &&
      !reason
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide a reason for pausing orders.",
      });
    }

    const result =
      await pool.query(
        `
        UPDATE restaurants

        SET
          is_accepting_orders = $1,

          temporary_closed_reason =
            CASE
              WHEN $1 = TRUE
                THEN NULL
              ELSE $2
            END,

          temporarily_closed_at =
            CASE
              WHEN $1 = FALSE
                THEN CURRENT_TIMESTAMP
              ELSE NULL
            END,

          orders_resumed_at =
            CASE
              WHEN $1 = TRUE
                THEN CURRENT_TIMESTAMP
              ELSE orders_resumed_at
            END,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE owner_id = $3

        RETURNING
          id,
          is_accepting_orders,
          temporary_closed_reason,
          temporarily_closed_at,
          orders_resumed_at,
          updated_at
        `,
        [
          isAcceptingOrders,
          reason,
          ownerId,
        ]
      );

    if (
      result.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Restaurant profile not found.",
      });
    }

    const restaurant =
      result.rows[0];

    return res.status(200).json({
      success: true,

      message:
        isAcceptingOrders
          ? "Restaurant is now accepting orders."
          : "Restaurant orders have been paused.",

      orderAvailability: {
        restaurantId:
          restaurant.id,

        isAcceptingOrders:
          Boolean(
            restaurant.is_accepting_orders
          ),

        reason:
          restaurant.temporary_closed_reason,

        temporarilyClosedAt:
          restaurant.temporarily_closed_at,

        ordersResumedAt:
          restaurant.orders_resumed_at,

        updatedAt:
          restaurant.updated_at,
      },
    });
  } catch (error) {
    console.error(
      "Update order availability error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update order availability.",
    });
  }
}

async function getOwnerRestaurantPaymentSettings(
  req,
  res
) {
  try {
    const ownerId =
      req.user.userId;

    const result =
      await pool.query(
        `
          SELECT
            mpesa_payment_type,
            mpesa_business_number,
            mpesa_account_number,
            mpesa_payment_enabled

          FROM restaurants

          WHERE owner_id = $1

          LIMIT 1
        `,
        [
          ownerId,
        ]
      );

    if (
      result.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Restaurant profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      paymentSettings:
        result.rows[0],
    });
  } catch (error) {
    console.error(
      "Get restaurant payment settings error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load restaurant payment settings.",
    });
  }
}

async function updateOwnerRestaurantPaymentSettings(
  req,
  res
) {
  try {
    const ownerId =
      req.user.userId;

    const paymentType =
      cleanText(
        req.body.paymentType
      )
        ?.toUpperCase();

    const businessNumber =
      cleanText(
        req.body.businessNumber
      );

    const accountNumber =
      cleanText(
        req.body.accountNumber
      );

    const paymentEnabled =
      Boolean(
        req.body.paymentEnabled
      );

    if (
      paymentEnabled &&
      !["PAYBILL", "TILL"].includes(
        paymentType
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Select PAYBILL or TILL as the M-Pesa payment type.",
      });
    }

    if (
      paymentEnabled &&
      !businessNumber
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Enter the M-Pesa PayBill or Till number.",
      });
    }

    const result =
      await pool.query(
        `
          UPDATE restaurants

          SET
            mpesa_payment_type = $1,
            mpesa_business_number = $2,
            mpesa_account_number = $3,
            mpesa_payment_enabled = $4,
            updated_at = CURRENT_TIMESTAMP

          WHERE owner_id = $5

          RETURNING
            mpesa_payment_type,
            mpesa_business_number,
            mpesa_account_number,
            mpesa_payment_enabled
        `,
        [
          paymentType || null,
          businessNumber || null,
          accountNumber || null,
          paymentEnabled,
          ownerId,
        ]
      );

    if (
      result.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Restaurant profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Restaurant payment settings updated successfully.",
      paymentSettings:
        result.rows[0],
    });
  } catch (error) {
    console.error(
      "Update restaurant payment settings error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update restaurant payment settings.",
    });
  }
}

async function getRestaurantPaymentInstructions(
  req,
  res
) {
  try {
    const sessionToken =
      cleanText(
        req.query.sessionToken
      );

    if (!sessionToken) {
      return res.status(400).json({
        success: false,
        message:
          "Checkout session token is required.",
      });
    }

    const result =
      await pool.query(
        `
          SELECT
            cs.id,
            cs.restaurant_id,

            r.mpesa_payment_type,
            r.mpesa_business_number,
            r.mpesa_account_number,
            r.mpesa_payment_enabled

          FROM checkout_sessions cs

          INNER JOIN restaurants r
            ON r.id = cs.restaurant_id

          WHERE cs.session_token = $1

          LIMIT 1
        `,
        [
          sessionToken,
        ]
      );

    if (
      result.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Checkout session was not found.",
      });
    }

    const checkout =
      result.rows[0];

    if (
      !checkout.mpesa_payment_enabled
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This restaurant has not enabled manual M-Pesa payments.",
      });
    }

    if (
      !checkout.mpesa_payment_type ||
      !checkout.mpesa_business_number
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This restaurant has not configured its M-Pesa payment details.",
      });
    }

    return res.status(200).json({
      success: true,

      paymentInstructions: {
        paymentMethod:
          checkout.mpesa_payment_type,

        businessNumber:
          checkout.mpesa_business_number,

        accountNumber:
          checkout.mpesa_account_number ||
          "",

        instructions:
          checkout.mpesa_payment_type ===
          "PAYBILL"
            ? "Open M-Pesa, select Lipa na M-Pesa, then PayBill. Enter the business number and account number shown above."
            : "Open M-Pesa, select Lipa na M-Pesa, then Buy Goods. Enter the Till number shown above.",
      },
    });
  } catch (error) {
    console.error(
      "Get restaurant payment instructions error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load restaurant payment instructions.",
    });
  }
}


async function confirmRestaurantManualPayment(
  req,
  res
) {
  try {
    const sessionToken =
      cleanText(
        req.body.sessionToken
      );

    if (!sessionToken) {
      return res.status(400).json({
        success: false,
        message:
          "Checkout session token is required.",
      });
    }

    const result =
      await pool.query(
        `
          SELECT
            cs.id,
            cs.restaurant_id,
            cs.converted_order_id,
            cs.status,
            cs.total_amount,

            r.mpesa_payment_enabled,
            r.mpesa_payment_type,
            r.mpesa_business_number

          FROM checkout_sessions cs

          INNER JOIN restaurants r
            ON r.id = cs.restaurant_id

          WHERE cs.session_token = $1

          LIMIT 1
        `,
        [
          sessionToken,
        ]
      );

    if (
      result.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Checkout session was not found.",
      });
    }

    const checkout =
      result.rows[0];

    if (
      checkout.converted_order_id
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This checkout session has already been processed.",
      });
    }

    if (
      !checkout.mpesa_payment_enabled ||
      !checkout.mpesa_payment_type ||
      !checkout.mpesa_business_number
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Manual payment is not available for this restaurant.",
      });
    }

    const existingPayment =
      await pool.query(
        `
          SELECT
            id,
            status

          FROM restaurant_payments

          WHERE checkout_session_id =
            $1::uuid

            AND payment_method =
              'MANUAL'

          LIMIT 1
        `,
        [
          checkout.id,
        ]
      );

    if (
      existingPayment.rows.length > 0
    ) {
      return res.status(200).json({
        success: true,
        message:
          "Your payment confirmation has already been submitted.",
      });
    }

    const paymentReference =
      `CCKMANUAL-${Date.now()}-${Math.floor(
        1000 +
        Math.random() * 9000
      )}`;

    await pool.query(
      `
        INSERT INTO restaurant_payments (
          checkout_session_id,
          order_id,
          restaurant_id,
          payment_reference,
          payment_method,
          payment_provider,
          amount,
          currency,
          status
        )

        VALUES (
          $1::uuid,
          NULL,
          $2::uuid,
          $3::varchar,
          'MANUAL',
          'MANUAL_MPESA',
          $4::numeric,
          'KES',
          'PENDING_VERIFICATION'
        )
      `,
      [
        checkout.id,
        checkout.restaurant_id,
        paymentReference,
        checkout.total_amount,
      ]
    );

    return res.status(201).json({
      success: true,
      message:
        "Payment confirmation submitted. The restaurant will verify your payment shortly.",
    });
  } catch (error) {
    console.error(
      "Confirm restaurant manual payment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to confirm your payment.",
    });
  }
}

async function getOwnerPendingManualPayments(
  req,
  res
) {
  try {
    const ownerId =
  req.user.userId;

    const result =
      await pool.query(
        `
          SELECT
            rp.id,
            rp.checkout_session_id,
            rp.payment_reference,
            rp.payment_method,
            rp.payment_provider,
            rp.amount,
            rp.currency,
            rp.status,
            rp.created_at,

            cs.customer_name,
            cs.customer_phone,
            cs.order_type,
            cs.total_amount,

            r.name AS restaurant_name

          FROM restaurant_payments rp

          INNER JOIN restaurants r
            ON r.id = rp.restaurant_id

          INNER JOIN checkout_sessions cs
            ON cs.id = rp.checkout_session_id

          WHERE r.owner_id =
            $1::uuid

            AND rp.payment_method =
              'MANUAL'

            AND rp.status =
              'PENDING_VERIFICATION'

          ORDER BY
            rp.created_at ASC
        `,
        [
          ownerId,
        ]
      );

    return res.status(200).json({
      success: true,

      payments:
        result.rows.map(
          (payment) => ({
            id:
              payment.id,

            checkoutSessionId:
              payment.checkout_session_id,

            paymentReference:
              payment.payment_reference,

            paymentMethod:
              payment.payment_method,

            paymentProvider:
              payment.payment_provider,

            amount:
              Number(
                payment.amount || 0
              ),

            currency:
              payment.currency,

            status:
              payment.status,

            createdAt:
              payment.created_at,

            customerName:
              payment.customer_name,

            customerPhone:
              payment.customer_phone,

            orderType:
              payment.order_type,

            totalAmount:
              Number(
                payment.total_amount || 0
              ),

            restaurantName:
              payment.restaurant_name,
          })
        ),
    });
  } catch (error) {
    console.error(
      "Get owner pending manual payments error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load pending payment confirmations.",
    });
  }
}

async function verifyOwnerManualPayment(
  req,
  res
) {
  const client =
    await pool.connect();

  try {
    const ownerId =
      req.user.userId;

    const paymentId =
      req.params.paymentId;

    await client.query(
      "BEGIN"
    );

    const paymentResult =
      await client.query(
        `
          SELECT
            rp.id AS payment_id,
            rp.checkout_session_id,
            rp.restaurant_id,
            rp.payment_reference,
            rp.amount AS payment_amount,
            rp.status AS payment_status,

            cs.id AS session_id,
            cs.session_token,

            cs.restaurant_id
              AS session_restaurant_id,

            cs.customer_id
              AS session_customer_id,

            cs.customer_name,
            cs.customer_phone,
            cs.order_type,
            cs.delivery_address,
            cs.customer_notes,
            cs.table_number,
            cs.guest_count,
            cs.subtotal,
            cs.delivery_fee,
            cs.delivery_zone_id,
            cs.estimated_delivery_minutes,
            cs.discount_amount,
            cs.total_amount,
            cs.promotion_id,
            cs.promo_code,
            cs.estimated_preparation_minutes,
            cs.status
              AS session_status,

            cs.converted_order_id,

            r.owner_id,
            r.name AS restaurant_name

          FROM restaurant_payments rp

          INNER JOIN checkout_sessions cs
            ON cs.id =
              rp.checkout_session_id

          INNER JOIN restaurants r
            ON r.id =
              rp.restaurant_id

          WHERE rp.id =
            $1::uuid

            AND r.owner_id =
              $2::uuid

          LIMIT 1

          FOR UPDATE OF rp, cs
        `,
        [
          paymentId,
          ownerId,
        ]
      );

    if (
      paymentResult.rows.length === 0
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(404).json({
        success: false,
        message:
          "Payment confirmation was not found.",
      });
    }

    const payment =
      paymentResult.rows[0];

    if (
      payment.payment_status !==
      "PENDING_VERIFICATION"
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(409).json({
        success: false,
        message:
          "This payment has already been processed.",
      });
    }

    /*
    |----------------------------------------------------------------
    | Already converted protection
    |----------------------------------------------------------------
    */

    if (
      payment.converted_order_id
    ) {
      await client.query(
        `
          UPDATE restaurant_payments

          SET
            order_id =
              $1::uuid,

            status =
              'PAID',

            paid_at =
              COALESCE(
                paid_at,
                CURRENT_TIMESTAMP
              ),

            updated_at =
              CURRENT_TIMESTAMP

          WHERE id =
            $2::uuid
        `,
        [
          payment.converted_order_id,
          payment.payment_id,
        ]
      );

      await client.query(
        "COMMIT"
      );

      return res.status(200).json({
        success: true,
        message:
          "Payment was already verified.",
        orderId:
          payment.converted_order_id,
      });
    }

     /*
    |----------------------------------------------------------------
    | Convert verified checkout into restaurant order
    |----------------------------------------------------------------
    */

    const conversion =
      await convertSuccessfulCheckoutToOrder({
        client,
        payment,
        paymentMethod:
          "MANUAL",
      });

    /*
    |----------------------------------------------------------------
    | Mark manual payment as paid
    |----------------------------------------------------------------
    */

    await client.query(
      `
        UPDATE restaurant_payments

        SET
          order_id =
            $1::uuid,

          status =
            'PAID',

          paid_at =
            CURRENT_TIMESTAMP,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id =
          $2::uuid
      `,
      [
        conversion.order.id,
        payment.payment_id,
      ]
    );

    await client.query(
      "COMMIT"
    );

    const io =
      req.app.get("io");

    emitSuccessfulRestaurantOrderEvents({
      io,
      order:
        conversion.order,
      sessionToken:
        conversion.sessionToken,
      restaurantId:
        conversion.restaurantId,
      customerId:
        conversion.customerId,
    });

    return res.status(200).json({
      success: true,
      message:
        "Payment verified successfully. The order has been created.",
      order:
        conversion.order,
    });
  } catch (error) {
    try {
      await client.query(
        "ROLLBACK"
      );
    } catch (rollbackError) {
      console.error(
        "Verify manual payment rollback error:",
        rollbackError
      );
    }

    console.error(
      "Verify owner manual payment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to verify the payment.",
    });
  } finally {
    client.release();
  }
}

module.exports = {
  getRestaurants,
  getRestaurantByIdentifier,
  getOwnerRestaurant,
  createOwnerRestaurant,
  updateOwnerRestaurant,
  getOwnerOpeningHours,
  updateOwnerOpeningHours,
  getOwnerRestaurantReviews,
  getOwnerRestaurantAnalytics,
  updateOwnerOrderAvailability,
  getOwnerRestaurantPaymentSettings,
  updateOwnerRestaurantPaymentSettings,
  getRestaurantPaymentInstructions,
  confirmRestaurantManualPayment,
  getOwnerPendingManualPayments,
  verifyOwnerManualPayment,
};