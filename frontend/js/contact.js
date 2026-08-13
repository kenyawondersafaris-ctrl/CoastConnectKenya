"use strict";

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const contactForm =
      document.getElementById(
        "contactForm"
      );

    const contactName =
      document.getElementById(
        "contactName"
      );

    const contactEmail =
      document.getElementById(
        "contactEmail"
      );

    const contactSubject =
      document.getElementById(
        "contactSubject"
      );

    const contactMessage =
      document.getElementById(
        "contactMessage"
      );

    const contactFormMessage =
      document.getElementById(
        "contactFormMessage"
      );

    const contactSubmitButton =
      document.getElementById(
        "contactSubmitButton"
      );

    function showContactMessage(
      message,
      type
    ) {
      if (!contactFormMessage) {
        return;
      }

      contactFormMessage.textContent =
        message;

      contactFormMessage.className =
        `contact-form-message ${type}`;
    }

    contactForm?.addEventListener(
      "submit",
      async (event) => {

        event.preventDefault();

        const name =
          String(
            contactName?.value ||
            ""
          ).trim();

        const email =
          String(
            contactEmail?.value ||
            ""
          )
            .trim()
            .toLowerCase();

        const subject =
          String(
            contactSubject?.value ||
            ""
          ).trim();

        const message =
          String(
            contactMessage?.value ||
            ""
          ).trim();

        if (
          !name ||
          !email ||
          !subject ||
          !message
        ) {
          showContactMessage(
            "Please complete all required fields.",
            "error"
          );

          return;
        }

        if (
          !email.includes("@")
        ) {
          showContactMessage(
            "Please enter a valid email address.",
            "error"
          );

          return;
        }

        contactSubmitButton.disabled =
          true;

        contactSubmitButton.textContent =
          "Sending...";

        try {

         const response =
  await fetch(
    "http://localhost:5000/api/contact",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        Accept:
          "application/json",
      },

      body: JSON.stringify({
        fullName: name,
        email,
        subject,
        message,
      }),
    }
  );

const data =
  await response.json();

if (
  !response.ok ||
  !data.success
) {
  throw new Error(
    data.message ||
    "Unable to send your message."
  );
}

showContactMessage(
  data.message ||
  "Your message has been received.",
  "success"
);

contactForm.reset();

        } catch (error) {

          console.error(
            "Contact form error:",
            error
          );

          showContactMessage(
            "Unable to send your message.",
            "error"
          );

        } finally {

          contactSubmitButton.disabled =
            false;

          contactSubmitButton.textContent =
            "Send Message";

        }

      }
    );

  }
);