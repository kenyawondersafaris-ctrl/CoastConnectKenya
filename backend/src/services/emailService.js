"use strict";

const nodemailer =
  require("nodemailer");

const transporter =
  nodemailer.createTransport({
    host:
      process.env.SMTP_HOST,

    port:
      Number(
        process.env.SMTP_PORT
      ),

    secure:
      String(
        process.env.SMTP_SECURE
      ).toLowerCase() === "true",

    auth: {
      user:
        process.env.SMTP_USER,

      pass:
        process.env.SMTP_PASS,
    },
  });

async function verifyEmailTransport() {
  await transporter.verify();

  console.log(
    "Brevo SMTP connection verified."
  );
}

async function sendEmail({
  to,
  subject,
  text,
  html,
}) {
  return transporter.sendMail({
    from:
      process.env.SMTP_FROM,

    to,
    subject,
    text,
    html,
  });
}

module.exports = {
  verifyEmailTransport,
  sendEmail,
};