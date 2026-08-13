"use strict";

const API_BASE_URL =
  "https://coastconnectkenya.onrender.com/api";

const loginForm =
  document.getElementById(
    "loginForm"
  );

const emailInput =
  document.getElementById(
    "email"
  );

const passwordInput =
  document.getElementById(
    "password"
  );

const loginButton =
  document.getElementById(
    "loginButton"
  );

const loginMessage =
  document.getElementById(
    "loginMessage"
  );

const togglePasswordButton =
  document.getElementById(
    "togglePassword"
  );

function showMessage(
  message,
  type = "error"
) {
  if (!loginMessage) {
    return;
  }

  loginMessage.textContent =
    message;

  loginMessage.className =
    `login-message ${type}`;
}

function clearMessage() {
  if (!loginMessage) {
    return;
  }

  loginMessage.textContent = "";

  loginMessage.className =
    "login-message";
}

function setLoading(isLoading) {
  if (!loginButton) {
    return;
  }

  loginButton.disabled =
    isLoading;

  loginButton.textContent =
    isLoading
      ? "Signing in..."
      : "Sign in";
}

function clearStoredSession() {
  localStorage.removeItem(
    "coastConnectToken"
  );

  localStorage.removeItem(
    "coastConnectUser"
  );
}

function redirectUserByRole(user) {
  const primaryRole =
    String(user?.role || "")
      .trim()
      .toUpperCase();

  const roles =
    Array.isArray(user?.roles)
      ? user.roles
          .map((role) =>
            String(role || "")
              .trim()
              .toUpperCase()
          )
          .filter(Boolean)
      : [];

  if (
    primaryRole === "PROVIDER"
  ) {
    window.location.replace(
      "provider-dashboard.html"
    );

    return;
  }

  if (
    primaryRole ===
    "RESTAURANT_OWNER"
  ) {
    window.location.replace(
      "restaurant-owner-dashboard.html"
    );

    return;
  }

  if (
    primaryRole ===
    "RESTAURANT_STAFF"
  ) {
    window.location.replace(
      "restaurant-staff-dashboard.html"
    );

    return;
  }

if (
  primaryRole === "CUSTOMER"
) {
  const savedReturnUrl =
    sessionStorage.getItem(
      "coastConnectReturnUrl"
    );

  sessionStorage.removeItem(
    "coastConnectReturnUrl"
  );

  const safeReturnUrl =
    savedReturnUrl &&
    savedReturnUrl.startsWith("/") &&
    !savedReturnUrl.startsWith("//");

  window.location.replace(
    safeReturnUrl
      ? savedReturnUrl
      : "index.html"
  );

  return;
}

  if (
    roles.length > 1
  ) {
    window.location.replace(
      "select-workspace.html"
    );

    return;
  }

  if (
    roles.includes("PROVIDER")
  ) {
    window.location.replace(
      "provider-dashboard.html"
    );

    return;
  }

  if (
    roles.includes(
      "RESTAURANT_OWNER"
    )
  ) {
    window.location.replace(
      "restaurant-owner-dashboard.html"
    );

    return;
  }

  if (
    roles.includes(
      "RESTAURANT_STAFF"
    )
  ) {
    window.location.replace(
      "restaurant-staff-dashboard.html"
    );

    return;
  }

  if (
  roles.includes("ADMIN")
) {
  window.location.replace(
    "admin-dashboard.html"
  );

  return;
}

if (
  roles.includes("CUSTOMER")
) {
  const savedReturnUrl =
    sessionStorage.getItem(
      "coastConnectReturnUrl"
    );

  sessionStorage.removeItem(
    "coastConnectReturnUrl"
  );

  const safeReturnUrl =
    savedReturnUrl &&
    savedReturnUrl.startsWith("/") &&
    !savedReturnUrl.startsWith("//");

  window.location.replace(
    safeReturnUrl
      ? savedReturnUrl
      : "index.html"
  );

  return;
}
  clearStoredSession();

  showMessage(
    "This account role is not supported."
  );
}

togglePasswordButton?.addEventListener(
  "click",
  () => {
    if (!passwordInput) {
      return;
    }

    const passwordIsHidden =
      passwordInput.type ===
      "password";

    passwordInput.type =
      passwordIsHidden
        ? "text"
        : "password";

    togglePasswordButton.textContent =
      passwordIsHidden
        ? "Hide"
        : "Show";

    togglePasswordButton.setAttribute(
      "aria-label",
      passwordIsHidden
        ? "Hide password"
        : "Show password"
    );
  }
);

loginForm?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    clearMessage();

    const email =
      emailInput?.value
        .trim()
        .toLowerCase() ||
      "";

    const password =
      passwordInput?.value ||
      "";

    if (!email || !password) {
      showMessage(
        "Email and password are required."
      );

      return;
    }

    if (password.length < 8) {
      showMessage(
        "Password must contain at least 8 characters."
      );

      return;
    }

    setLoading(true);

    try {
      const response =
        await fetch(
          `${API_BASE_URL}/auth/login`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body: JSON.stringify({
              email,
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
  if (
    data.requiresEmailVerification &&
    data.userId
  ) {
    localStorage.setItem(
      "coastConnectPendingVerificationUserId",
      data.userId
    );

    localStorage.setItem(
      "coastConnectPendingVerificationEmail",
      data.email || email
    );

    showMessage(
      "Please verify your email. Redirecting...",
      "error"
    );

    window.setTimeout(
      () => {
        window.location.href =
          "verify-email.html";
      },
      900
    );

    return;
  }

  throw new Error(
    data.message ||
    "Unable to sign in."
  );
}

      if (
        !data.token ||
        !data.user
      ) {
        throw new Error(
          "The server returned incomplete login information."
        );
      }

      localStorage.setItem(
        "coastConnectToken",
        data.token
      );

      localStorage.setItem(
        "coastConnectUser",
        JSON.stringify(
          data.user
        )
      );

      console.log(
        "Logged-in user:",
        data.user
      );

      showMessage(
        "Login successful. Redirecting...",
        "success"
      );

      window.setTimeout(
        () => {
          redirectUserByRole(
            data.user
          );
        },
        500
      );
    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      showMessage(
        error.message ||
        "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  }
);