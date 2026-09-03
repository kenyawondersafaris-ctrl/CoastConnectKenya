"use strict";

const API_BASE_URL =
  "https://coastconnectkenya.onrender.com/api";

const forgotPasswordForm =
  document.getElementById(
    "forgotPasswordForm"
  );

const emailInput =
  document.getElementById(
    "email"
  );

const forgotPasswordButton =
  document.getElementById(
    "forgotPasswordButton"
  );

const forgotPasswordMessage =
  document.getElementById(
    "forgotPasswordMessage"
  );


function showMessage(
  message,
  type = "error"
) {
  if (!forgotPasswordMessage) {
    return;
  }

  forgotPasswordMessage.textContent =
    message;

  forgotPasswordMessage.className =
    `login-message ${type}`;
}


function clearMessage() {
  if (!forgotPasswordMessage) {
    return;
  }

  forgotPasswordMessage.textContent = "";

  forgotPasswordMessage.className =
    "login-message";
}


function setLoading(
  isLoading
) {
  if (!forgotPasswordButton) {
    return;
  }

  forgotPasswordButton.disabled =
    isLoading;

  forgotPasswordButton.textContent =
    isLoading
      ? "Sending code..."
      : "Send reset code";
}


forgotPasswordForm?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    clearMessage();

    const email =
      emailInput?.value
        .trim()
        .toLowerCase() ||
      "";

    if (!email) {
      showMessage(
        "Email address is required."
      );

      return;
    }

    setLoading(true);

    try {
      const response =
        await fetch(
          `${API_BASE_URL}/auth/forgot-password`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body:
              JSON.stringify({
                email,
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
          "Unable to request password reset."
        );
      }

      if (
        data.userId
      ) {
        sessionStorage.setItem(
          "coastConnectPasswordResetUserId",
          data.userId
        );
      }

      sessionStorage.setItem(
        "coastConnectPasswordResetEmail",
        email
      );

      showMessage(
        data.message ||
        "If an account exists for that email, a password reset code has been sent.",
        "success"
      );

      window.setTimeout(
        () => {
          window.location.href =
            "reset-password.html";
        },
        900
      );
    } catch (error) {
      console.error(
        "Forgot password error:",
        error
      );

      showMessage(
        error.message ||
        "Unable to request password reset."
      );
    } finally {
      setLoading(false);
    }
  }
);