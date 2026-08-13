"use strict";


const API_BASE_URL =
  "https://coastconnectkenya.onrender.com/api";


const token =
  localStorage.getItem(
    "coastConnectToken"
  );


const accountMessage =
  document.getElementById(
    "accountMessage"
  );


const profileInitials =
  document.getElementById(
    "profileInitials"
  );


const profileDisplayName =
  document.getElementById(
    "profileDisplayName"
  );


const profileDisplayEmail =
  document.getElementById(
    "profileDisplayEmail"
  );


const verificationBadge =
  document.getElementById(
    "verificationBadge"
  );


const accountStatusBadge =
  document.getElementById(
    "accountStatusBadge"
  );


const profileForm =
  document.getElementById(
    "profileForm"
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


const memberSinceInput =
  document.getElementById(
    "memberSince"
  );


const saveProfileButton =
  document.getElementById(
    "saveProfileButton"
  );


const passwordForm =
  document.getElementById(
    "passwordForm"
  );


const currentPasswordInput =
  document.getElementById(
    "currentPassword"
  );


const newPasswordInput =
  document.getElementById(
    "newPassword"
  );


const confirmNewPasswordInput =
  document.getElementById(
    "confirmNewPassword"
  );


const changePasswordButton =
  document.getElementById(
    "changePasswordButton"
  );


const logoutButton =
  document.getElementById(
    "logoutButton"
  );


let currentUser = null;


/*
|--------------------------------------------------------------------------
| Init
|--------------------------------------------------------------------------
*/

document.addEventListener(
  "DOMContentLoaded",
  initializeCustomerAccount
);


async function initializeCustomerAccount() {

  if (!token) {
    window.location.href =
      "login.html";

    return;
  }

  await loadCustomerProfile();
}


/*
|--------------------------------------------------------------------------
| Load profile
|--------------------------------------------------------------------------
*/

async function loadCustomerProfile() {

  showMessage(
    "Loading your account...",
    "info"
  );

  try {

    const response =
      await fetch(
        `${API_BASE_URL}/users/profile`,
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${token}`,

            Accept:
              "application/json",
          },
        }
      );


    const data =
      await response.json();


    if (
      response.status === 401 ||
      response.status === 403
    ) {
      logout();
      return;
    }


    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.message ||
        "Unable to load your account."
      );
    }


    currentUser =
      data.user;


    renderCustomerProfile(
      currentUser
    );


    clearMessage();

  } catch (error) {

    console.error(
      "Load customer profile error:",
      error
    );


    showMessage(
      error.message ||
      "Unable to load your account.",
      "error"
    );
  }
}


/*
|--------------------------------------------------------------------------
| Render profile
|--------------------------------------------------------------------------
*/

function renderCustomerProfile(
  user
) {

  const fullName =
    String(
      user.fullName || ""
    ).trim();


  const email =
    String(
      user.email || ""
    ).trim();


  const phone =
    String(
      user.phone || ""
    ).trim();


  profileDisplayName.textContent =
    fullName ||
    "Coast Connect Customer";


  profileDisplayEmail.textContent =
    email ||
    "Email unavailable";


  profileInitials.textContent =
    getInitials(
      fullName
    );


  fullNameInput.value =
    fullName;


  emailInput.value =
    email;


  phoneInput.value =
    phone;


  memberSinceInput.value =
    formatDate(
      user.createdAt
    );


  /*
  |--------------------------------------------------------------------------
  | Verification badge
  |--------------------------------------------------------------------------
  */

  if (
    user.isVerified
  ) {

    verificationBadge.textContent =
      "Verified";

    verificationBadge.className =
      "account-badge verified";

  } else {

    verificationBadge.textContent =
      "Not Verified";

    verificationBadge.className =
      "account-badge unverified";
  }


  /*
  |--------------------------------------------------------------------------
  | Account status badge
  |--------------------------------------------------------------------------
  */

  const accountStatus =
    String(
      user.accountStatus ||
      "UNKNOWN"
    ).toUpperCase();


  accountStatusBadge.textContent =
    formatLabel(
      accountStatus
    );


  accountStatusBadge.className =
    `account-badge status-${accountStatus
      .toLowerCase()
      .replaceAll("_", "-")}`;
}


/*
|--------------------------------------------------------------------------
| Update profile
|--------------------------------------------------------------------------
*/

profileForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    const fullName =
      fullNameInput.value
        .trim();


    const phone =
      phoneInput.value
        .trim();


    if (!fullName) {

      showMessage(
        "Please enter your full name.",
        "error"
      );

      return;
    }


    saveProfileButton.disabled =
      true;


    saveProfileButton.textContent =
      "Saving...";


    clearMessage();


    try {

      const response =
        await fetch(
          `${API_BASE_URL}/users/profile`,
          {
            method:
              "PATCH",

            headers: {
              Authorization:
                `Bearer ${token}`,

              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body:
              JSON.stringify({
                fullName,
                phone,
              }),
          }
        );


      const data =
        await response.json();


      if (
        response.status === 401 ||
        response.status === 403
      ) {
        logout();
        return;
      }


      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
          "Unable to update your account."
        );
      }


      currentUser =
        data.user;


      renderCustomerProfile(
        currentUser
      );


      updateStoredUser(
        currentUser
      );


      showMessage(
        data.message ||
        "Account updated successfully.",
        "success"
      );

    } catch (error) {

      console.error(
        "Update customer account error:",
        error
      );


      showMessage(
        error.message ||
        "Unable to update your account.",
        "error"
      );

    } finally {

      saveProfileButton.disabled =
        false;


      saveProfileButton.textContent =
        "Save Changes";
    }
  }
);


/*
|--------------------------------------------------------------------------
| Change password
|--------------------------------------------------------------------------
*/

passwordForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    const currentPassword =
      currentPasswordInput.value;


    const newPassword =
      newPasswordInput.value;


    const confirmNewPassword =
      confirmNewPasswordInput.value;


    if (
      !currentPassword ||
      !newPassword ||
      !confirmNewPassword
    ) {

      showMessage(
        "Please complete all password fields.",
        "error"
      );

      return;
    }


    if (
      newPassword.length < 8
    ) {

      showMessage(
        "New password must be at least 8 characters.",
        "error"
      );

      return;
    }


    if (
      newPassword !==
      confirmNewPassword
    ) {

      showMessage(
        "New password confirmation does not match.",
        "error"
      );

      return;
    }


    if (
      currentPassword ===
      newPassword
    ) {

      showMessage(
        "Your new password must be different from your current password.",
        "error"
      );

      return;
    }


    changePasswordButton.disabled =
      true;


    changePasswordButton.textContent =
      "Changing Password...";


    clearMessage();


    try {

      const response =
        await fetch(
          `${API_BASE_URL}/users/password`,
          {
            method:
              "PATCH",

            headers: {
              Authorization:
                `Bearer ${token}`,

              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body:
              JSON.stringify({
                currentPassword,
                newPassword,
              }),
          }
        );


      const data =
        await response.json();


      if (
        response.status === 401 ||
        response.status === 403
      ) {
        logout();
        return;
      }


      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
          "Unable to change your password."
        );
      }


      passwordForm.reset();


      showMessage(
        data.message ||
        "Password changed successfully.",
        "success"
      );

    } catch (error) {

      console.error(
        "Change password error:",
        error
      );


      showMessage(
        error.message ||
        "Unable to change your password.",
        "error"
      );

    } finally {

      changePasswordButton.disabled =
        false;


      changePasswordButton.textContent =
        "Change Password";
    }
  }
);


/*
|--------------------------------------------------------------------------
| Logout
|--------------------------------------------------------------------------
*/

logoutButton.addEventListener(
  "click",
  () => {

    const confirmed =
      window.confirm(
        "Log out of your Coast Connect account?"
      );


    if (!confirmed) {
      return;
    }


    logout();
  }
);


function logout() {

  localStorage.removeItem(
    "coastConnectToken"
  );


  localStorage.removeItem(
    "coastConnectUser"
  );


  sessionStorage.removeItem(
    "coastConnectCardPaymentReference"
  );


  sessionStorage.removeItem(
    "coastConnectCardCheckoutSessionToken"
  );


  window.location.href =
    "login.html";
}


/*
|--------------------------------------------------------------------------
| Update stored user
|--------------------------------------------------------------------------
*/

function updateStoredUser(
  user
) {

  try {

    const existingUser =
      JSON.parse(
        localStorage.getItem(
          "coastConnectUser"
        ) || "{}"
      );


    const updatedUser = {
      ...existingUser,

      id:
        user.id,

      fullName:
        user.fullName,

      email:
        user.email,

      phone:
        user.phone,

      role:
        user.role,

      roles:
        user.roles,

      accountStatus:
        user.accountStatus,

      isVerified:
        user.isVerified,
    };


    localStorage.setItem(
      "coastConnectUser",
      JSON.stringify(
        updatedUser
      )
    );

  } catch (error) {

    console.error(
      "Update stored user error:",
      error
    );
  }
}


/*
|--------------------------------------------------------------------------
| Messages
|--------------------------------------------------------------------------
*/

function showMessage(
  message,
  type = "info"
) {

  accountMessage.textContent =
    message;


  accountMessage.className =
    `page-message ${type}`;
}


function clearMessage() {

  accountMessage.textContent =
    "";


  accountMessage.className =
    "page-message";
}


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function getInitials(
  fullName
) {

  const names =
    String(
      fullName || ""
    )
      .trim()
      .split(/\s+/)
      .filter(Boolean);


  if (
    names.length === 0
  ) {
    return "CC";
  }


  if (
    names.length === 1
  ) {
    return names[0]
      .slice(0, 2)
      .toUpperCase();
  }


  return (
    names[0][0] +
    names[
      names.length - 1
    ][0]
  ).toUpperCase();
}


function formatDate(
  value
) {

  if (!value) {
    return "Unavailable";
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Unavailable";
  }


  return date.toLocaleDateString(
    "en-KE",
    {
      day:
        "numeric",

      month:
        "long",

      year:
        "numeric",
    }
  );
}


function formatLabel(
  value
) {

  return String(
    value || ""
  )
    .trim()
    .toLowerCase()
    .replaceAll(
      "_",
      " "
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}