"use strict";

const { z } =
  require("zod");

const allowedRoles = [
  "CUSTOMER",
  "PROVIDER",
  "RESTAURANT_OWNER",
];

const emailSchema =
  z
    .string({
      required_error:
        "Email is required",
    })
    .trim()
    .toLowerCase()
    .email(
      "Please enter a valid email address"
    )
    .max(
      180,
      "Email is too long"
    );

const registrationSchema =
  z.object({
    body: z.object({
      fullName:
        z
          .string({
            required_error:
              "Full name is required",
          })
          .trim()
          .min(
            2,
            "Full name must contain at least 2 characters"
          )
          .max(
            120,
            "Full name is too long"
          ),

      email:
        emailSchema,

      phone:
        z
          .string()
          .trim()
          .max(
            30,
            "Phone number is too long"
          )
          .optional()
          .nullable(),

      password:
        z
          .string({
            required_error:
              "Password is required",
          })
          .min(
            8,
            "Password must contain at least 8 characters"
          )
          .max(
            128,
            "Password is too long"
          ),

      role:
        z
          .string()
          .trim()
          .transform(
            (value) =>
              value.toUpperCase()
          )
          .refine(
            (value) =>
              allowedRoles.includes(
                value
              ),
            "Invalid account role"
          )
          .default(
            "CUSTOMER"
          ),
    }),

    params:
      z.object({}),

    query:
      z.object({}),
  });

const loginSchema =
  z.object({
    body: z.object({
      email:
        emailSchema,

      password:
        z
          .string({
            required_error:
              "Password is required",
          })
          .min(
            1,
            "Password is required"
          )
          .max(
            128,
            "Password is too long"
          ),
    }),

    params:
      z.object({}),

    query:
      z.object({}),
  });

  const verifyEmailSchema =
  z.object({
    body:
      z.object({
        userId:
          z
            .string({
              required_error:
                "User ID is required",
            })
            .trim()
            .uuid(
              "Invalid verification request"
            ),

        code:
          z
            .string({
              required_error:
                "Verification code is required",
            })
            .trim()
            .regex(
              /^\d{6}$/,
              "Verification code must contain exactly 6 digits"
            ),
      }),

    params:
      z.object({}),

    query:
      z.object({}),
  });

const resendVerificationSchema =
  z.object({
    body:
      z.object({
        userId:
          z
            .string({
              required_error:
                "User ID is required",
            })
            .trim()
            .uuid(
              "Invalid verification request"
            ),
      }),

    params:
      z.object({}),

    query:
      z.object({}),
  });

module.exports = {
  registrationSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
};