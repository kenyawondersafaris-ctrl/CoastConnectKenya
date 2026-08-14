"use strict";

const API_BASE_URL =
  "https://coastconnectkenya.onrender.com/api";

const resetPasswordForm =
  document.getElementById(
    "resetPasswordForm"
  );

const codeInput =
  document.getElementById(
    "code"
  );

const passwordInput =
  document.getElementById(
    "password"
  );

const confirmPasswordInput =
  document.getElementById(
    "confirmPassword"
  );

const resetPasswordButton =
  document.getElementById(
    "resetPasswordButton"
  );

const resetPasswordMessage =
  document.getElementById(
    "resetPasswordMessage"
  );

const togglePasswordButton =
  document.getElementById(
    "togglePassword"
  );

const toggleConfirmPasswordButton =
  document.getElementById(
    "toggleConfirmPassword"
  );


function showMessage(
  message,
  type = "error"
) {
  if (!resetPasswordMessage) {
    return;
  }

  resetPasswordMessage.textContent =
    message;

  resetPasswordMessage.className =
    `login-message ${type}`;
}


function clearMessage() {
  if (!resetPasswordMessage) {
    return;
  }

  resetPasswordMessage.textContent = "";

  resetPasswordMessage.className =
    "login-message";
}


function setLoading(
  isLoading
) {
  if (!resetPasswordButton) {
    return;
  }

  resetPasswordButton.disabled =
    isLoading;

  resetPasswordButton.textContent =
    isLoading
      ? "Resetting password..."
      : "Reset password";
}


function configurePasswordToggle(
  button,
  input
) {
  if (
    !button ||
    !input
  ) {
    return;
  }

  button.addEventListener(
    "click",
    () => {
      const isHidden =
        input.type ===
        "password";

      input.type =
        isHidden
          ? "text"
          : "password";

      button.textContent =
        isHidden
          ? "Hide"
          : "Show";

      button.setAttribute(
        "aria-label",
        isHidden
          ? "Hide password"
          : "Show password"
      );
    }
  );
}


configurePasswordToggle(
  togglePasswordButton,
  passwordInput
);

configurePasswordToggle(
  toggleConfirmPasswordButton,
  confirmPasswordInput
);


resetPasswordForm?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    clearMessage();

    const userId =
      String(
        sessionStorage.getItem(
          "coastConnectPasswordResetUserId"
        ) || ""
      ).trim();

    const code =
      codeInput?.value
        .trim() ||
      "";

    const password =
      passwordInput?.value ||
      "";

    const confirmPassword =
      confirmPasswordInput?.value ||
      "";

    if (!userId) {
      showMessage(
        "Your password reset session has expired. Please request a new reset code."
      );

      return;
    }

    if (
      !/^\d{6}$/.test(
        code
      )
    ) {
      showMessage(
        "Enter the 6-digit reset code."
      );

      return;
    }

    if (
      password.length < 8
    ) {
      showMessage(
        "Password must contain at least 8 characters."
      );

      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      showMessage(
        "Passwords do not match."
      );

      return;
    }

    setLoading(true);

    try {
      const response =
        await fetch(
          `${API_BASE_URL}/auth/reset-password`,
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
                userId,
                code,
                password,
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
          "Unable to reset password."
        );
      }

      sessionStorage.removeItem(
        "coastConnectPasswordResetUserId"
      );

      sessionStorage.removeItem(
        "coastConnectPasswordResetEmail"
      );

      showMessage(
        "Password reset successfully. Redirecting to sign in...",
        "success"
      );

      resetPasswordForm.reset();

      window.setTimeout(
        () => {
          window.location.replace(
            "login.html"
          );
        },
        1200
      );
    } catch (error) {
      console.error(
        "Reset password error:",
        error
      );

      showMessage(
        error.message ||
        "Unable to reset password."
      );
    } finally {
      setLoading(false);
    }
  }
);