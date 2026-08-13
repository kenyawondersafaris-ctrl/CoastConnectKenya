"use strict";

const axios = require("axios");

function getMpesaBaseUrl() {
  return process.env.MPESA_ENVIRONMENT === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

async function getMpesaAccessToken() {
  const consumerKey =
    String(
      process.env.MPESA_CONSUMER_KEY || ""
    ).trim();

  const consumerSecret =
    String(
      process.env.MPESA_CONSUMER_SECRET || ""
    ).trim();

  if (
    !consumerKey ||
    !consumerSecret
  ) {
    throw new Error(
      "M-Pesa Consumer Key and Consumer Secret are required."
    );
  }

  const credentials =
    Buffer.from(
      `${consumerKey}:${consumerSecret}`
    ).toString("base64");

  const response = await axios.get(
    `${getMpesaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: {
        Authorization:
          `Basic ${credentials}`,
        Accept:
          "application/json",
      },

      timeout: 15000,
    }
  );

  const accessToken =
    response.data?.access_token;

  if (!accessToken) {
    throw new Error(
      "Safaricom did not return an access token."
    );
  }

  return accessToken;
}

function formatMpesaPhoneNumber(value) {
  const digits =
    String(value || "")
      .replace(/\D/g, "");

  if (/^2547\d{8}$/.test(digits)) {
    return digits;
  }

  if (/^07\d{8}$/.test(digits)) {
    return `254${digits.slice(1)}`;
  }

  if (/^7\d{8}$/.test(digits)) {
    return `254${digits}`;
  }

  throw new Error(
    "Enter a valid Kenyan M-Pesa phone number."
  );
}

function createMpesaTimestamp() {
  const now = new Date();

  const parts = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Africa/Nairobi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }
  )
    .formatToParts(now)
    .reduce((values, part) => {
      values[part.type] = part.value;
      return values;
    }, {});

  return [
    parts.year,
    parts.month,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  ].join("");
}

function createMpesaPassword(
  shortcode,
  passkey,
  timestamp
) {
  return Buffer.from(
    `${shortcode}${passkey}${timestamp}`
  ).toString("base64");
}

async function initiateMpesaStkPush({
  phoneNumber,
  amount,
  accountReference,
  transactionDescription,
}) {
  const shortcode =
    String(
      process.env.MPESA_SHORTCODE || ""
    ).trim();

  const passkey =
    String(
      process.env.MPESA_PASSKEY || ""
    ).trim();

  const callbackUrl =
    String(
      process.env.MPESA_CALLBACK_URL || ""
    ).trim();

  if (!shortcode) {
    throw new Error(
      "M-Pesa shortcode is required."
    );
  }

  if (!passkey) {
    throw new Error(
      "M-Pesa passkey is required."
    );
  }

  if (!callbackUrl) {
    throw new Error(
      "M-Pesa callback URL is required before initiating STK Push."
    );
  }

  const normalizedPhone =
    formatMpesaPhoneNumber(
      phoneNumber
    );

  const normalizedAmount =
    Math.round(
      Number(amount)
    );

  if (
    !Number.isFinite(normalizedAmount) ||
    normalizedAmount < 1
  ) {
    throw new Error(
      "M-Pesa amount must be at least KES 1."
    );
  }

  const timestamp =
    createMpesaTimestamp();

  const password =
    createMpesaPassword(
      shortcode,
      passkey,
      timestamp
    );

  const accessToken =
    await getMpesaAccessToken();

  const response =
    await axios.post(
      `${getMpesaBaseUrl()}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode:
          shortcode,

        Password:
          password,

        Timestamp:
          timestamp,

        TransactionType:
          "CustomerPayBillOnline",

        Amount:
          normalizedAmount,

        PartyA:
          normalizedPhone,

        PartyB:
          shortcode,

        PhoneNumber:
          normalizedPhone,

        CallBackURL:
          callbackUrl,

        AccountReference:
          String(
            accountReference ||
            "COASTCONNECT"
          ).slice(0, 12),

        TransactionDesc:
          String(
            transactionDescription ||
            "Restaurant order payment"
          ).slice(0, 20),
      },
      {
        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/json",

          Accept:
            "application/json",
        },

        timeout: 30000,
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
  getMpesaAccessToken,
  formatMpesaPhoneNumber,
  initiateMpesaStkPush,
};