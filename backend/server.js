const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit =require("express-rate-limit");
const jwt = require("jsonwebtoken");
const http = require("http");
const { Server } = require("socket.io");
const pool = require("./src/config/db");
const authRoutes = require("./src/routes/authRoutes");
const userRoutes = require("./src/routes/userRoutes");
const favoriteRoutes =require("./src/routes/favoriteRoutes");
const restaurantRoutes = require("./src/routes/restaurantRoutes");
const restaurantStaffRoutes = require("./src/routes/restaurantStaffRoutes");
const menuRoutes = require("./src/routes/menuRoutes");
const uploadRoutes = require("./src/routes/uploadRoutes");
const restaurantGalleryRoutes = require("./src/routes/restaurantGalleryRoutes");
const orderRoutes =require("./src/routes/orderRoutes");
const mpesaRoutes =require("./src/routes/mpesaRoutes");
const payheroRoutes =require("./src/routes/payheroRoutes");
const cardPaymentRoutes =require("./src/routes/cardPaymentRoutes");
const checkoutRoutes =require("./src/routes/checkoutRoutes");
const restaurantNotificationRoutes =require("./src/routes/restaurantNotificationRoutes");
const restaurantPromotionRoutes =require("./src/routes/restaurantPromotionRoutes");
const restaurantDeliveryZoneRoutes =require("./src/routes/restaurantDeliveryZoneRoutes");
const homeRoutes =require("./src/routes/homeRoutes");
const serviceCategoryRoutes =require("./src/routes/serviceCategoryRoutes");
const providerRoutes =require("./src/routes/providerRoutes");
const bookingRoutes = require("./src/routes/bookingRoutes");
const providerPaymentRoutes =require("./src/routes/providerPaymentRoutes");
const adminRoutes =require("./src/routes/adminRoutes");
const contactRoutes =require("./src/routes/contactRoutes");
const errorHandler =require("./src/middleware/errorHandler");
const validateEnvironment =require("./src/config/validateEnvironment");
const {verifyEmailTransport,} = require("./src/services/emailService");


validateEnvironment();

const app = express();
app.set(
  "trust proxy",
  1
);
const server = http.createServer(app);

const isProduction =
  process.env.NODE_ENV ===
  "production";

const allowedOrigins =
  isProduction
    ? [
        process.env.FRONTEND_URL,
      ].filter(Boolean)
    : [
        process.env.FRONTEND_URL,
        "http://127.0.0.1:5500",
        "http://localhost:5500",
      ].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,

    methods: [
      "GET",
      "POST",
    ],

    allowedHeaders: [
      "Authorization",
      "Content-Type",
    ],
  },
});

app.set("io", io);
io.use((socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token;

    if (!token) {
      socket.user = null;
      return next();
    }

    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    socket.user = decoded;

    return next();
  } catch (error) {
    return next(
      new Error(
        "Invalid or expired socket token"
      )
    );
  }
});
app.use(helmet());
app.use(
  cors({
    origin: (
      origin,
      callback
    ) => {
      if (!origin) {
        return callback(
          null,
          true
        );
      }

      if (
        allowedOrigins.includes(
          origin
        )
      ) {
        return callback(
          null,
          true
        );
      }

      return callback(
        new Error(
          "Origin not allowed by CORS."
        )
      );
    },

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);
const apiLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit: 300,

    standardHeaders:
      "draft-7",

    legacyHeaders:
      false,

    message: {
      success: false,
      message:
        "Too many requests. Please try again later.",
    },
  });

app.use(
  "/api",
  apiLimiter
);

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  })
);

app.use(
  "/api/home",
  homeRoutes
);

app.use(
  "/api/contact",
  contactRoutes
);

app.use(
  "/api/service-categories",
  serviceCategoryRoutes
);

app.use(
  "/api/providers",
  providerRoutes
);

app.use(
  "/api/bookings",
  bookingRoutes
);

app.use(
  "/api/provider-payments",
  providerPaymentRoutes
);

app.use(
  "/api/admin",
  adminRoutes
);

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/users",
  userRoutes
);

app.use(
  "/api/favorites",
  favoriteRoutes
);



app.use(
  "/api/restaurants",
  restaurantStaffRoutes
);

app.use(
  "/api/orders",
  orderRoutes
);

app.use(
  "/api/checkout-sessions",
  checkoutRoutes
);

app.use(
  "/api/payments/mpesa",
  mpesaRoutes
);

app.use(
  "/api/payments/payhero",
  payheroRoutes
);

app.use(
  "/api/payments/card",
  cardPaymentRoutes
);

/*
  Broad /api routes must stay last.
*/

app.use(
  "/api/restaurants",
  restaurantNotificationRoutes
);

app.use(
  "/api/restaurants",
  restaurantPromotionRoutes
);

app.use(
  "/api/restaurants",
  restaurantDeliveryZoneRoutes
);

app.use(
  "/api/restaurants",
  restaurantRoutes
);
app.use(
  "/api/restaurants",
  menuRoutes
);

app.use(
  "/api/uploads",
  uploadRoutes
);

app.use(
  "/api/restaurants/owner/gallery",
  restaurantGalleryRoutes
);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Coast Connect Kenya API is running",
  });
});

app.get("/api/health/database", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS current_time");

    res.json({
      success: true,
      message: "PostgreSQL connection is working",
      databaseTime: result.rows[0].current_time,
    });
  } catch (error) {
  console.error(
    "Database health check failed:",
    error
  );

  res.status(500).json({
    success: false,
    message:
      "Database connection unavailable.",
  });
}
});

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

 socket.on(
  "join-order-room",
  async (trackingToken) => {
    try {
      const normalizedTrackingToken =
        String(trackingToken || "")
          .trim();

      if (!normalizedTrackingToken) {
        return;
      }

      const result =
        await pool.query(
          `
            SELECT
              id,
              tracking_token,
              status
            FROM restaurant_orders
            WHERE tracking_token = $1::uuid
            LIMIT 1
          `,
          [
            normalizedTrackingToken,
          ]
        );

      if (
        result.rows.length === 0
      ) {
        console.warn(
          `Socket ${socket.id} attempted to join an invalid order room`
        );

        return;
      }

      socket.join(
        `order:${normalizedTrackingToken}`
      );

      console.log(
        `Socket ${socket.id} joined order:${normalizedTrackingToken}`
      );
    } catch (error) {
      console.error(
        "Order room authorization error:",
        error.message
      );
    }
  }
);

socket.on(
  "join-customer-room",
  (customerId) => {
    const normalizedCustomerId =
      String(customerId || "")
        .trim();

    if (!normalizedCustomerId) {
      return;
    }

    if (!socket.user) {
      console.warn(
        `Unauthorized customer room join attempt from socket ${socket.id}`
      );

      return;
    }

    const authenticatedUserId =
      String(
        socket.user.userId || ""
      ).trim();

    const authenticatedRole =
      String(
        socket.user.role || ""
      )
        .trim()
        .toUpperCase();

    if (
      authenticatedRole !==
      "CUSTOMER"
    ) {
      console.warn(
        `Socket ${socket.id} attempted customer room access with role ${authenticatedRole}`
      );

      return;
    }

    if (
      authenticatedUserId !==
      normalizedCustomerId
    ) {
      console.warn(
        `Socket ${socket.id} attempted to join another customer's room`
      );

      return;
    }

    socket.join(
      `customer:${authenticatedUserId}`
    );

    socket.emit(
  "customer-room-joined",
  {
    customerId:
      authenticatedUserId,

    room:
      `customer:${authenticatedUserId}`,
  }
);

    console.log(
      `Socket ${socket.id} joined customer:${authenticatedUserId}`
    );
  }
);

socket.on(
  "join-provider-room",
  async (providerId) => {
    try {
      const normalizedProviderId =
        String(providerId || "")
          .trim();

      if (!normalizedProviderId) {
        return;
      }

      if (!socket.user) {
        console.warn(
          `Unauthorized provider room join attempt from socket ${socket.id}`
        );

        return;
      }

      const authenticatedUserId =
        String(
          socket.user.userId || ""
        ).trim();

      const authenticatedRole =
        String(
          socket.user.role || ""
        )
          .trim()
          .toUpperCase();

      if (
        authenticatedRole !==
        "PROVIDER"
      ) {
        console.warn(
          `Socket ${socket.id} attempted provider room access with role ${authenticatedRole}`
        );

        return;
      }

      const result =
        await pool.query(
          `
            SELECT id
            FROM provider_profiles
            WHERE id = $1::uuid
              AND user_id = $2::uuid
            LIMIT 1
          `,
          [
            normalizedProviderId,
            authenticatedUserId,
          ]
        );

      if (
        result.rows.length === 0
      ) {
        console.warn(
          `Socket ${socket.id} attempted to join an unauthorized provider room`
        );

        return;
      }

      socket.join(
        `provider:${normalizedProviderId}`
      );

      console.log(
        `Socket ${socket.id} joined provider:${normalizedProviderId}`
      );
    } catch (error) {
      console.error(
        "Provider room authorization error:",
        error.message
      );
    }
  }
);

socket.on(
  "join-checkout-room",
  async (sessionToken) => {
    try {
      const normalizedSessionToken =
        String(sessionToken || "")
          .trim();

      if (!normalizedSessionToken) {
        return;
      }

      const result =
        await pool.query(
          `
            SELECT
              id,
              session_token,
              status,
              expires_at
            FROM checkout_sessions
            WHERE session_token = $1::uuid
            LIMIT 1
          `,
          [
            normalizedSessionToken,
          ]
        );

      if (
        result.rows.length === 0
      ) {
        console.warn(
          `Socket ${socket.id} attempted to join an invalid checkout room`
        );

        return;
      }

      const checkoutSession =
        result.rows[0];

      if (
        checkoutSession.expires_at &&
        new Date(
          checkoutSession.expires_at
        ).getTime() <= Date.now()
      ) {
        console.warn(
          `Socket ${socket.id} attempted to join an expired checkout room`
        );

        return;
      }

      socket.join(
        `checkout:${normalizedSessionToken}`
      );

      console.log(
        `Socket ${socket.id} joined checkout:${normalizedSessionToken}`
      );
    } catch (error) {
      console.error(
        "Checkout room authorization error:",
        error.message
      );
    }
  }
);

socket.on(
  "join-restaurant-room",
  async (restaurantId) => {
    try {
      const normalizedRestaurantId =
        String(restaurantId || "")
          .trim();

      if (!normalizedRestaurantId) {
        return;
      }

      if (!socket.user) {
        console.warn(
          `Unauthorized restaurant room join attempt from socket ${socket.id}`
        );

        return;
      }

      const authenticatedUserId =
        String(
          socket.user.userId || ""
        ).trim();

      const authenticatedRole =
        String(
          socket.user.role || ""
        )
          .trim()
          .toUpperCase();

      if (
        authenticatedRole !==
        "RESTAURANT_OWNER"
      ) {
        console.warn(
          `Socket ${socket.id} attempted restaurant room access with role ${authenticatedRole}`
        );

        return;
      }

      const result =
        await pool.query(
          `
            SELECT id
            FROM restaurants
            WHERE id = $1::uuid
              AND owner_id = $2::uuid
            LIMIT 1
          `,
          [
            normalizedRestaurantId,
            authenticatedUserId,
          ]
        );

      if (
        result.rows.length === 0
      ) {
        console.warn(
          `Socket ${socket.id} attempted to join an unauthorized restaurant room`
        );

        return;
      }

      socket.join(
        `restaurant:${normalizedRestaurantId}`
      );

      console.log(
        `Socket ${socket.id} joined restaurant:${normalizedRestaurantId}`
      );
    } catch (error) {
      console.error(
        "Restaurant room authorization error:",
        error.message
      );
    }
  }
);

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Resource not found.",
  });
});
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Coast Connect Kenya server running on port ${PORT}`);

  verifyEmailTransport()
  .then(() => {
    console.log(
      "Email service ready."
    );
  })
  .catch((error) => {
    console.error(
      "Email service failed:",
      error.message
    );
  });
});