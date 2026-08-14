"use strict";

const express =
  require("express");

const {
  register,
  verifyEmail,
  resendVerificationCode,
  forgotPassword,
  verifyResetCode,
  resetPassword,
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
  forgotPasswordSchema,
  verifyPasswordResetCodeSchema,
  resetPasswordSchema,
} =
  require("../validation/authValidation");

 const {
  loginLimiter,
  registrationLimiter,
  verificationLimiter,
  passwordResetLimiter,
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
  "/forgot-password",
  passwordResetLimiter,
  validateRequest(
    forgotPasswordSchema
  ),
  forgotPassword
);


router.post(
  "/verify-password-reset-code",
  passwordResetLimiter,
  validateRequest(
    verifyPasswordResetCodeSchema
  ),
  verifyResetCode
);


router.post(
  "/reset-password",
  passwordResetLimiter,
  validateRequest(
    resetPasswordSchema
  ),
  resetPassword
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