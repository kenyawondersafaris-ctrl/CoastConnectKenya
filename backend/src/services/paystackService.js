"use strict";

const axios = require("axios");
const crypto = require("crypto");

const PAYSTACK_BASE_URL =
  "https://api.paystack.co";


function getPaystackSecretKey() {
  const secretKey =
    String(
      process.env.PAYSTACK_SECRET_KEY ||
      ""
    ).trim();

  if (!secretKey) {
    throw new Error(
      "PAYSTACK_SECRET_KEY is required."
    );
  }

  return secretKey;
}


function createPaystackHeaders() {
  return {
    Authorization:
      `Bearer ${getPaystackSecretKey()}`,

    "Content-Type":
      "application/json",

    Accept:
      "application/json",
  };
}


function convertKesToSubunit(amount) {
  const numericAmount =
    Number(amount);

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0
  ) {
    throw new Error(
      "Payment amount must be greater than zero."
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Paystack amount
  |--------------------------------------------------------------------------
  |
  | Paystack expects the amount in the currency's smallest unit.
  |
  | KES 690.00
  | becomes
  | 69000
  |
  */

  return Math.round(
    numericAmount * 100
  );
}


async function initializePaystackTransaction({
  email,
  amount,
  reference,
  callbackUrl = null,
  metadata = {},
}) {
  const normalizedEmail =
    String(email || "")
      .trim()
      .toLowerCase();

  const normalizedReference =
    String(reference || "")
      .trim();

  if (!normalizedEmail) {
    throw new Error(
      "Customer email is required for card payment."
    );
  }

  if (!normalizedReference) {
    throw new Error(
      "Payment reference is required."
    );
  }

  const payload = {
    email:
      normalizedEmail,

    amount:
      convertKesToSubunit(
        amount
      ),

    currency:
      "KES",

    reference:
      normalizedReference,

    /*
    |--------------------------------------------------------------------------
    | Restrict this integration to card
    |--------------------------------------------------------------------------
    |
    | Coast Connect already uses Safaricom Daraja directly for M-Pesa.
    | We therefore do not ask Paystack to offer another M-Pesa channel here.
    |
    */

    channels: [
      "card",
    ],

    metadata:
      metadata &&
      typeof metadata === "object"
        ? metadata
        : {},
  };

  if (callbackUrl) {
    payload.callback_url =
      String(callbackUrl).trim();
  }

  const response =
    await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      payload,
      {
        headers:
          createPaystackHeaders(),

        timeout:
          30000,
      }
    );

  if (
    !response.data?.status ||
    !response.data?.data
  ) {
    throw new Error(
      response.data?.message ||
      "Paystack did not initialize the transaction."
    );
  }

  const transaction =
    response.data.data;

  if (
    !transaction.authorization_url ||
    !transaction.access_code ||
    !transaction.reference
  ) {
    throw new Error(
      "Paystack returned an incomplete transaction initialization response."
    );
  }

  return {
    authorizationUrl:
      transaction.authorization_url,

    accessCode:
      transaction.access_code,

    reference:
      transaction.reference,

    raw:
      response.data,
  };
}


async function verifyPaystackTransaction(
  reference
) {
  const normalizedReference =
    String(reference || "")
      .trim();

  if (!normalizedReference) {
    throw new Error(
      "Paystack transaction reference is required."
    );
  }

  const response =
    await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(
        normalizedReference
      )}`,
      {
        headers:
          createPaystackHeaders(),

        timeout:
          30000,
      }
    );

  if (
    !response.data?.status ||
    !response.data?.data
  ) {
    throw new Error(
      response.data?.message ||
      "Unable to verify the Paystack transaction."
    );
  }

  return {
    transaction:
      response.data.data,

    raw:
      response.data,
  };
}


function verifyPaystackWebhookSignature(
  payload,
  signature
) {
  const normalizedSignature =
    String(signature || "")
      .trim();

  if (!normalizedSignature) {
    return false;
  }

  const secretKey =
    getPaystackSecretKey();

  const expectedSignature =
    crypto
      .createHmac(
        "sha512",
        secretKey
      )
      .update(
        JSON.stringify(payload)
      )
      .digest("hex");

  /*
  |--------------------------------------------------------------------------
  | Timing-safe comparison
  |--------------------------------------------------------------------------
  */

  const expectedBuffer =
    Buffer.from(
      expectedSignature,
      "utf8"
    );

  const receivedBuffer =
    Buffer.from(
      normalizedSignature,
      "utf8"
    );

  if (
    expectedBuffer.length !==
    receivedBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    expectedBuffer,
    receivedBuffer
  );
}


function normalizePaystackTransaction(
  transaction
) {
  if (
    !transaction ||
    typeof transaction !== "object"
  ) {
    return null;
  }

  return {
    id:
      transaction.id
        ? String(
            transaction.id
          )
        : null,

    reference:
      String(
        transaction.reference ||
        ""
      ).trim(),

    status:
      String(
        transaction.status ||
        ""
      )
        .trim()
        .toLowerCase(),

    gatewayResponse:
      transaction.gateway_response ||
      null,

    amountSubunit:
      Number(
        transaction.amount || 0
      ),

    amount:
      Number(
        transaction.amount || 0
      ) / 100,

    currency:
      String(
        transaction.currency ||
        ""
      )
        .trim()
        .toUpperCase(),

    channel:
      String(
        transaction.channel ||
        ""
      )
        .trim()
        .toLowerCase(),

    paidAt:
      transaction.paid_at ||
      transaction.paidAt ||
      null,

    customerEmail:
      transaction.customer?.email ||
      null,

    authorization:
      transaction.authorization ||
      null,

    metadata:
      transaction.metadata ||
      null,

    raw:
      transaction,
  };
}


module.exports = {
  initializePaystackTransaction,
  verifyPaystackTransaction,
  verifyPaystackWebhookSignature,
  normalizePaystackTransaction,
  convertKesToSubunit,
};