"use strict";

const axios =
  require("axios");

const PAYHERO_BASE_URL =
  "https://backend.payhero.co.ke/api/v2";

function getPayHeroCredentials() {
  const username =
    String(
      process.env.PAYHERO_API_USERNAME || ""
    ).trim();

  const password =
    String(
      process.env.PAYHERO_API_PASSWORD || ""
    ).trim();

  if (
    !username ||
    !password
  ) {
    throw new Error(
      "PayHero API username and password are required."
    );
  }

  return Buffer.from(
    `${username}:${password}`
  ).toString("base64");
}

function normalizePayHeroPhone(
  value
) {
  const digits =
    String(value || "")
      .replace(/\D/g, "");

  if (
    /^2547\d{8}$/.test(
      digits
    )
  ) {
    return digits;
  }

  if (
    /^07\d{8}$/.test(
      digits
    )
  ) {
    return `254${digits.slice(1)}`;
  }

  if (
    /^7\d{8}$/.test(
      digits
    )
  ) {
    return `254${digits}`;
  }

  throw new Error(
    "Enter a valid Kenyan M-Pesa phone number."
  );
}

async function initiatePayHeroStkPush({
  phoneNumber,
  amount,
  externalReference,
  customerName,
  callbackUrl,
}) {
  const normalizedPhone =
    normalizePayHeroPhone(
      phoneNumber
    );

  const normalizedAmount =
    Math.round(
      Number(amount)
    );

  if (
    !Number.isFinite(
      normalizedAmount
    ) ||
    normalizedAmount < 1
  ) {
    throw new Error(
      "PayHero payment amount must be at least KES 1."
    );
  }

 const channelId =
  String(
    process.env.PAYHERO_CHANNEL_ID ||
    ""
  ).trim();

if (!channelId) {
  throw new Error(
    "PayHero payment channel is not configured."
  );
}


  const resolvedCallbackUrl =
    String(
      callbackUrl ||
      process.env.PAYHERO_CALLBACK_URL ||
      ""
    ).trim();

  if (
    !resolvedCallbackUrl
  ) {
    throw new Error(
      "PayHero callback URL is required."
    );
  }

  console.log(
  "PayHero STK request:",
  {
    url:
      `${PAYHERO_BASE_URL}/payments`,

    channelId,

    amount:
      normalizedAmount,

    phone:
      normalizedPhone,

    provider:
      "m-pesa",

    externalReference:
      String(
        externalReference || ""
      ).slice(0, 100),
  }
);

  const response =
    await axios.post(
      `${PAYHERO_BASE_URL}/payments/initiate-stk-push`,
      {
        amount:
          normalizedAmount,

        phone_number:
          normalizedPhone,

        channel_id:
          channelId,

        provider:
          "m-pesa",

        external_reference:
          String(
            externalReference ||
            ""
          ).slice(
            0,
            100
          ),

        ...(customerName
          ? {
              customer_name:
                String(
                  customerName
                ).slice(
                  0,
                  100
                ),
            }
          : {}),

        callback_url:
          resolvedCallbackUrl,
      },
      {
        headers: {
          Authorization:
            `Basic ${getPayHeroCredentials()}`,

          "Content-Type":
            "application/json",

          Accept:
            "application/json",
        },

        timeout:
          30000,
      }
    );

  return {
    response:
      response.data,

    normalizedPhone,

    amount:
      normalizedAmount,
  };
}

module.exports = {
  normalizePayHeroPhone,
  initiatePayHeroStkPush,
};