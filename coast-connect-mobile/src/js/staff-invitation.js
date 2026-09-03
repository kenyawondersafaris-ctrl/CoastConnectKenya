"use strict";

const API_BASE_URL =
  "https://coastconnectkenya.onrender.com/api";

const invitationLoading =
  document.getElementById(
    "invitationLoading"
  );

const invitationError =
  document.getElementById(
    "invitationError"
  );

const invitationErrorMessage =
  document.getElementById(
    "invitationErrorMessage"
  );

const invitationContent =
  document.getElementById(
    "invitationContent"
  );

const invitationSuccess =
  document.getElementById(
    "invitationSuccess"
  );

const invitationRestaurantName =
  document.getElementById(
    "invitationRestaurantName"
  );

const invitationFullName =
  document.getElementById(
    "invitationFullName"
  );

const invitationRole =
  document.getElementById(
    "invitationRole"
  );

const invitationContact =
  document.getElementById(
    "invitationContact"
  );

const invitationInitials =
  document.getElementById(
    "invitationInitials"
  );

const invitationForm =
  document.getElementById(
    "invitationForm"
  );

const staffPassword =
  document.getElementById(
    "staffPassword"
  );

const staffConfirmPassword =
  document.getElementById(
    "staffConfirmPassword"
  );

const invitationFormMessage =
  document.getElementById(
    "invitationFormMessage"
  );

const activateStaffButton =
  document.getElementById(
    "activateStaffButton"
  );

const urlParameters =
  new URLSearchParams(
    window.location.search
  );

const invitationToken =
  String(
    urlParameters.get("token") || ""
  ).trim();

function formatStaffRole(role) {
  const roles = {
    MANAGER: "Manager",
    CASHIER: "Cashier",
    KITCHEN_STAFF: "Kitchen Staff",
  };

  return roles[role] ||
    role ||
    "Restaurant Staff";
}

function getInitials(name) {
  const words =
    String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

  if (words.length === 0) {
    return "ST";
  }

  return words
    .map((word) =>
      word.charAt(0).toUpperCase()
    )
    .join("");
}

function showInvitationError(message) {
  invitationLoading.hidden = true;
  invitationContent.hidden = true;
  invitationSuccess.hidden = true;

  invitationErrorMessage.textContent =
    message;

  invitationError.hidden = false;
}

function showFormMessage(
  message,
  type = "error"
) {
  invitationFormMessage.textContent =
    message;

  invitationFormMessage.className =
    `form-message ${type}`;
}

function clearFormMessage() {
  invitationFormMessage.textContent = "";

  invitationFormMessage.className =
    "form-message";
}

function populateInvitation(invitation) {
  invitationRestaurantName.textContent =
    invitation.restaurantName ||
    "the restaurant team";

  invitationFullName.textContent =
    invitation.fullName ||
    "Staff Member";

  invitationRole.textContent =
    formatStaffRole(
      invitation.role
    );

  invitationContact.textContent =
    invitation.email ||
    invitation.phone ||
    "Contact unavailable";

  invitationInitials.textContent =
    getInitials(
      invitation.fullName
    );

  invitationLoading.hidden = true;
  invitationError.hidden = true;
  invitationSuccess.hidden = true;
  invitationContent.hidden = false;

  staffPassword.focus();
}

async function loadInvitation() {
  if (!invitationToken) {
    showInvitationError(
      "The invitation link is missing its token."
    );

    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/restaurants/staff-invitations/${encodeURIComponent(
        invitationToken
      )}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
        "Unable to load this invitation."
      );
    }

    populateInvitation(
      data.invitation || {}
    );
  } catch (error) {
    console.error(
      "Load staff invitation error:",
      error
    );

    showInvitationError(
      error.message ||
      "Unable to load this invitation."
    );
  }
}

async function acceptInvitation(event) {
  event.preventDefault();

  clearFormMessage();

  const password =
    staffPassword.value;

  const confirmPassword =
    staffConfirmPassword.value;

  if (!password) {
    showFormMessage(
      "Enter a password."
    );

    return;
  }

  if (password.length < 8) {
    showFormMessage(
      "Password must contain at least 8 characters."
    );

    return;
  }

  if (password !== confirmPassword) {
    showFormMessage(
      "Passwords do not match."
    );

    return;
  }

  activateStaffButton.disabled = true;
  activateStaffButton.textContent =
    "Activating Account...";

  try {
    const response = await fetch(
      `${API_BASE_URL}/restaurants/staff-invitations/${encodeURIComponent(
        invitationToken
      )}/accept`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Accept:
            "application/json",
        },

        body: JSON.stringify({
          password,
          confirmPassword,
        }),
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
        "Unable to activate the staff account."
      );
    }

    invitationContent.hidden = true;
    invitationError.hidden = true;
    invitationLoading.hidden = true;
    invitationSuccess.hidden = false;
  } catch (error) {
    console.error(
      "Accept staff invitation error:",
      error
    );

    showFormMessage(
      error.message ||
      "Unable to activate the staff account."
    );
  } finally {
    activateStaffButton.disabled = false;

    activateStaffButton.textContent =
      "Activate Staff Account";
  }
}

invitationForm.addEventListener(
  "submit",
  acceptInvitation
);

loadInvitation();