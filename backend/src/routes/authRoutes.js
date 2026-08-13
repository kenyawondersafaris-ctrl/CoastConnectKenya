"use strict";

const express =
  require("express");

const {
  register,
  verifyEmail,
  resendVerificationCode,
  login,
} =
  require("../controllers/authController");

const validateRequest =
  require("../middleware/validateRequest");

const {
  registrationSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} =
  require("../validation/authValidation");

  const {
  loginLimiter,
  registrationLimiter,
  verificationLimiter,
} =
  require(
    "../middleware/authRateLimiters"
  );

const router =
  express.Router();

router.post(
  "/register",
  registrationLimiter,
  validateRequest(
    registrationSchema
  ),
  register
);

router.post(
  "/verify-email",
  verificationLimiter,
  validateRequest(
    verifyEmailSchema
  ),
  verifyEmail
);

router.post(
  "/resend-verification-code",
  verificationLimiter,
  validateRequest(
    resendVerificationSchema
  ),
  resendVerificationCode
);

router.post(
  "/login",
  loginLimiter,
  validateRequest(
    loginSchema
  ),
  login
);
module.exports =
  router;