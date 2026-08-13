"use strict";

const API_BASE_URL =
  "http://localhost:5000/api";

const verificationInputs =
  Array.from(
    document.querySelectorAll(
      ".verification-digit"
    )
  );

const verifyEmailButton =
  document.getElementById(
    "verifyEmailButton"
  );

const resendCodeButton =
  document.getElementById(
    "resendCodeButton"
  );

const verificationMessage =
  document.getElementById(
    "verificationMessage"
  );

  const verificationEmail =
  document.getElementById(
    "verificationEmail"
  );

  const pendingVerificationEmail =
  localStorage.getItem(
    "coastConnectPendingVerificationEmail"
  );

if (verificationEmail) {
  verificationEmail.textContent =
    maskEmail(
      pendingVerificationEmail
    );
}

  function maskEmail(
  email
) {
  const normalizedEmail =
    String(email || "")
      .trim();

  if (
    !normalizedEmail.includes("@")
  ) {
    return "your email address";
  }

  const [
    localPart,
    domain,
  ] =
    normalizedEmail.split("@");

  if (!localPart || !domain) {
    return "your email address";
  }

  const visiblePart =
    localPart.slice(
      0,
      Math.min(
        2,
        localPart.length
      )
    );

  return `${visiblePart}***@${domain}`;
}

function getPendingVerificationUserId() {
  return localStorage.getItem(
    "coastConnectPendingVerificationUserId"
  );
}

function getVerificationCode() {
  return verificationInputs
    .map((input) => input.value)
    .join("");
}

verificationInputs.forEach(
  (input, index) => {
    input.addEventListener(
      "input",
      () => {
        input.value =
          input.value.replace(
            /\D/g,
            ""
          );

        if (
          input.value &&
          index <
            verificationInputs.length - 1
        ) {
          verificationInputs[
            index + 1
          ].focus();
        }
      }
    );

    input.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Backspace" &&
          !input.value &&
          index > 0
        ) {
          verificationInputs[
            index - 1
          ].focus();
        }
      }
    );

    input.addEventListener(
      "paste",
      (event) => {
        const pastedText =
          event.clipboardData
            .getData("text")
            .replace(/\D/g, "")
            .slice(0, 6);

        if (!pastedText) {
          return;
        }

        event.preventDefault();

        pastedText
          .split("")
          .forEach(
            (digit, digitIndex) => {
              if (
                verificationInputs[
                  digitIndex
                ]
              ) {
                verificationInputs[
                  digitIndex
                ].value = digit;
              }
            }
          );

        verificationInputs[
          Math.min(
            pastedText.length,
            6
          ) - 1
        ]?.focus();
      }
    );
  }
);

verifyEmailButton.addEventListener(
  "click",
  async () => {
    const userId =
      getPendingVerificationUserId();

    const code =
      getVerificationCode();

    if (!userId) {
      verificationMessage.textContent =
        "Verification session not found. Please register again.";

      verificationMessage.className =
        "auth-message verification-message error";

      return;
    }

    if (!/^\d{6}$/.test(code)) {
      verificationMessage.textContent =
        "Please enter the 6-digit verification code.";

      verificationMessage.className =
        "auth-message verification-message error";

      return;
    }

    verifyEmailButton.disabled =
      true;

    verifyEmailButton.textContent =
      "Verifying...";

    try {
      const response =
        await fetch(
          `${API_BASE_URL}/auth/verify-email`,
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
          "Unable to verify email."
        );
      }

      verificationMessage.textContent =
        "Email verified successfully. Redirecting to login...";

      verificationMessage.className =
        "auth-message verification-message success";

      localStorage.removeItem(
        "coastConnectPendingVerificationUserId"
      );

      setTimeout(
        () => {
          window.location.href =
            "login.html";
        },
        1500
      );
    } catch (error) {
      verificationMessage.textContent =
        error.message ||
        "Unable to verify email.";

      verificationMessage.className =
        "auth-message verification-message error";

      verifyEmailButton.disabled =
        false;

      verifyEmailButton.textContent =
        "Verify Email";
    }
  }
);

let resendCountdown =
  0;

let resendInterval =
  null;

function startResendCountdown(
  seconds
) {
  resendCountdown =
    seconds;

  resendCodeButton.disabled =
    true;

  resendCodeButton.textContent =
    `Resend Code (${resendCountdown}s)`;

  clearInterval(
    resendInterval
  );

  resendInterval =
    setInterval(
      () => {
        resendCountdown -= 1;

        if (
          resendCountdown <= 0
        ) {
          clearInterval(
            resendInterval
          );

          resendInterval =
            null;

          resendCodeButton.disabled =
            false;

          resendCodeButton.textContent =
            "Resend Code";

          return;
        }

        resendCodeButton.textContent =
          `Resend Code (${resendCountdown}s)`;
      },
      1000
    );
}

resendCodeButton.addEventListener(
  "click",
  async () => {
    const userId =
      getPendingVerificationUserId();

    if (!userId) {
      verificationMessage.textContent =
        "Verification session not found. Please register again.";

      verificationMessage.className =
        "auth-message verification-message error";

      return;
    }

    resendCodeButton.disabled =
      true;

    resendCodeButton.textContent =
      "Sending...";

    try {
      const response =
        await fetch(
          `${API_BASE_URL}/auth/resend-verification-code`,
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
              }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        if (
          response.status === 429 &&
          data.retryAfter
        ) {
          startResendCountdown(
            Number(
              data.retryAfter
            )
          );
        }

        throw new Error(
          data.message ||
          "Unable to resend verification code."
        );
      }

      verificationMessage.textContent =
        "A new verification code has been sent to your email.";

      verificationMessage.className =
        "auth-message verification-message success";

      verificationInputs.forEach(
        (input) => {
          input.value = "";
        }
      );

      verificationInputs[0]?.focus();

      startResendCountdown(
        60
      );
    } catch (error) {
      verificationMessage.textContent =
        error.message ||
        "Unable to resend verification code.";

      verificationMessage.className =
        "auth-message verification-message error";

      if (
        !resendInterval
      ) {
        resendCodeButton.disabled =
          false;

        resendCodeButton.textContent =
          "Resend Code";
      }
    }
  }
);