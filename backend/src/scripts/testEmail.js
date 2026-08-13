"use strict";

require("dotenv").config();

const {
  sendEmail,
} = require("../services/emailService");

async function testEmail() {
  try {
    await sendEmail({
      to: "megahub254@gmail.com",

      subject:
        "Coast Connect Email Test",

      text:
        "Your Coast Connect email service is working.",

      html:
        `
          <h2>Coast Connect Kenya</h2>
          <p>
            Your email service is working correctly.
          </p>
        `,
    });

    console.log(
      "Test email sent successfully."
    );

    process.exit(0);
  } catch (error) {
    console.error(
      "Test email failed:",
      error
    );

    process.exit(1);
  }
}

testEmail();