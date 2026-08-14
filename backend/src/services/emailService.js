"use strict";

async function verifyEmailTransport() {
  if (!process.env.BREVO_API_KEY) {
    throw new Error(
      "BREVO_API_KEY is missing."
    );
  }

  if (!process.env.SMTP_FROM) {
    throw new Error(
      "SMTP_FROM is missing."
    );
  }

  console.log(
    "Brevo email API configured."
  );
}


function parseSender() {
  const rawSender =
    String(
      process.env.SMTP_FROM || ""
    ).trim();

  /*
    Supports either:

    Coast Connect Kenya <hello@example.com>

    or:

    hello@example.com
  */

  const match =
    rawSender.match(
      /^(.+?)\s*<([^>]+)>$/
    );

  if (match) {
    return {
      name:
        match[1]
          .trim()
          .replace(
            /^["']|["']$/g,
            ""
          ),

      email:
        match[2].trim(),
    };
  }

  return {
    name:
      "Coast Connect Kenya",

    email:
      rawSender,
  };
}


async function sendEmail({
  to,
  subject,
  text,
  html,
}) {
  const apiKey =
    String(
      process.env.BREVO_API_KEY ||
      ""
    ).trim();

  if (!apiKey) {
    throw new Error(
      "BREVO_API_KEY is missing."
    );
  }

  const recipient =
    String(to || "").trim();

  if (!recipient) {
    throw new Error(
      "Email recipient is required."
    );
  }

  const sender =
    parseSender();

  if (!sender.email) {
    throw new Error(
      "SMTP_FROM is missing."
    );
  }

  const response =
    await fetch(
      "https://api.brevo.com/v3/smtp/email",
      {
        method: "POST",

        headers: {
          accept:
            "application/json",

          "content-type":
            "application/json",

          "api-key":
            apiKey,
        },

        body:
          JSON.stringify({
            sender,

            to: [
              {
                email:
                  recipient,
              },
            ],

            subject,

            textContent:
              text || "",

            htmlContent:
              html || "",
          }),
      }
    );

  let data =
    null;

  try {
    data =
      await response.json();
  } catch (error) {
    data = null;
  }

  if (!response.ok) {
    console.error(
      "Brevo email API error:",
      data
    );

    throw new Error(
      data?.message ||
      "Unable to send email."
    );
  }

  return data;
}


module.exports = {
  verifyEmailTransport,
  sendEmail,
};