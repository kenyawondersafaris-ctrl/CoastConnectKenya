"use strict";

const API_BASE_URL =
  "http://localhost:5000/api";

const registerForm =
  document.getElementById(
    "registerForm"
  );

const fullNameInput =
  document.getElementById(
    "fullName"
  );

const emailInput =
  document.getElementById(
    "email"
  );

const phoneInput =
  document.getElementById(
    "phone"
  );

const passwordInput =
  document.getElementById(
    "password"
  );

const confirmPasswordInput =
  document.getElementById(
    "confirmPassword"
  );

const acceptTermsInput =
  document.getElementById(
    "acceptTerms"
  );

const registerButton =
  document.getElementById(
    "registerButton"
  );

const registerMessage =
  document.getElementById(
    "registerMessage"
  );

const togglePasswordButton =
  document.getElementById(
    "togglePassword"
  );

const toggleConfirmPasswordButton =
  document.getElementById(
    "toggleConfirmPassword"
  );

const registerEyebrow =
  document.getElementById(
    "registerEyebrow"
  );

const registerTitle =
  document.getElementById(
    "registerTitle"
  );

const registerDescription =
  document.getElementById(
    "registerDescription"
  );

const params =
  new URLSearchParams(
    window.location.search
  );

const requestedRole =
  String(
    params.get("role") || ""
  )
    .trim()
    .toLowerCase()
    .replaceAll("_", "-");

const roleConfig = {
  customer: {
    apiRole: "CUSTOMER",
    eyebrow:
      "Customer Registration",
    title:
      "Create your customer account",
    description:
      "Create an account to order from restaurants, book trusted local services, track requests and leave reviews.",
    button:
      "Create customer account",
    success:
      "Customer account created successfully. Redirecting to login...",
  },

  provider: {
    apiRole: "PROVIDER",
    eyebrow:
      "Service Provider Portal",
    title:
      "Create your provider account",
    description:
      "Register as a local service provider and manage your profile, services, availability and customer bookings.",
    button:
      "Create provider account",
    success:
      "Provider account created successfully. Redirecting to login...",
  },

  "restaurant-owner": {
    apiRole:
      "RESTAURANT_OWNER",
    eyebrow:
      "Restaurant Partner Portal",
    title:
      "Create your partner account",
    description:
      "Register as a restaurant owner and start managing your restaurant, menu, availability and customer orders.",
    button:
      "Create partner account",
    success:
      "Partner account created successfully. Redirecting to login...",
  },
};

const activeRole =
  roleConfig[requestedRole];

if (!activeRole) {
  window.location.replace(
    "join.html"
  );

  throw new Error(
    "A valid registration role is required."
  );
}

if (registerEyebrow) {
  registerEyebrow.textContent =
    activeRole.eyebrow;
}

if (registerTitle) {
  registerTitle.textContent =
    activeRole.title;
}

if (registerDescription) {
  registerDescription.textContent =
    activeRole.description;
}

if (registerButton) {
  registerButton.textContent =
    activeRole.button;
}

function showMessage(
  message,
  type = "error"
) {
  if (!registerMessage) {
    return;
  }

  registerMessage.textContent =
    message;

  registerMessage.className =
    `register-message ${type}`;
}

function clearMessage() {
  if (!registerMessage) {
    return;
  }

  registerMessage.textContent = "";

  registerMessage.className =
    "register-message";
}

function setLoading(isLoading) {
  if (!registerButton) {
    return;
  }

  registerButton.disabled =
    isLoading;

  registerButton.textContent =
    isLoading
      ? "Creating account..."
      : activeRole.button;
}

function configurePasswordToggle(
  button,
  input
) {
  if (!button || !input) {
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

registerForm?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    clearMessage();

    const fullName =
      fullNameInput?.value.trim() ||
      "";

    const email =
      emailInput?.value
        .trim()
        .toLowerCase() ||
      "";

    const phone =
      phoneInput?.value.trim() ||
      "";

    const password =
      passwordInput?.value ||
      "";

    const confirmPassword =
      confirmPasswordInput?.value ||
      "";

    if (
      !fullName ||
      !email ||
      !password
    ) {
      showMessage(
        "Full name, email and password are required."
      );

      return;
    }

    if (password.length < 8) {
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

    if (
      !acceptTermsInput?.checked
    ) {
      showMessage(
        "You must accept the Terms of Service and Privacy Policy."
      );

      return;
    }

    setLoading(true);

    try {
      const response =
        await fetch(
          `${API_BASE_URL}/auth/register`,
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
                fullName,
                email,
                phone:
                  phone || null,
                password,
                role:
                  activeRole.apiRole,
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
          "Unable to create account."
        );
      }

     localStorage.setItem(
  "coastConnectPendingVerificationUserId",
  data.user.id
);

localStorage.setItem(
  "coastConnectPendingVerificationEmail",
  data.user.email
);

showMessage(
  "Account created successfully. Check your email for the 6-digit verification code.",
  "success"
);

registerForm.reset();

window.setTimeout(
  () => {
    window.location.href =
      "verify-email.html";
  },
  1200
);
    } catch (error) {
      console.error(
        "Registration error:",
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