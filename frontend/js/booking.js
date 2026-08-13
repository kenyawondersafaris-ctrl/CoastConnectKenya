"use strict";

const API_BASE_URL =
  "http://localhost:5000/api";

const params =
  new URLSearchParams(
    window.location.search
  );

const providerId =
  String(
    params.get("providerId") || ""
  ).trim();

const serviceId =
  String(
    params.get("serviceId") || ""
  ).trim();

const token =
  localStorage.getItem(
    "coastConnectToken"
  );

let storedUser = null;

try {
  storedUser =
    JSON.parse(
      localStorage.getItem(
        "coastConnectUser"
      ) || "null"
    );
} catch (error) {
  console.error(
    "Stored user parse error:",
    error
  );
}

const bookingMessage =
  document.getElementById(
    "bookingMessage"
  );

const bookingContent =
  document.getElementById(
    "bookingContent"
  );

const bookingProviderName =
  document.getElementById(
    "bookingProviderName"
  );

const bookingServiceArea =
  document.getElementById(
    "bookingServiceArea"
  );

const bookingServiceTitle =
  document.getElementById(
    "bookingServiceTitle"
  );

const bookingServiceDescription =
  document.getElementById(
    "bookingServiceDescription"
  );

const bookingPrice =
  document.getElementById(
    "bookingPrice"
  );

const bookingPricingType =
  document.getElementById(
    "bookingPricingType"
  );

const bookingForm =
  document.getElementById(
    "bookingForm"
  );

const bookingDate =
  document.getElementById(
    "bookingDate"
  );

const bookingTime =
  document.getElementById(
    "bookingTime"
  );

const bookingAddress =
  document.getElementById(
    "bookingAddress"
  );

const bookingInstructions =
  document.getElementById(
    "bookingInstructions"
  );

const confirmBookingButton =
  document.getElementById(
    "confirmBookingButton"
  );

let selectedProvider = null;
let selectedService = null;

document.addEventListener(
  "DOMContentLoaded",
  initializeBookingPage
);

async function initializeBookingPage() {
  if (!providerId || !serviceId) {
    showMessage(
      "Provider or service information is missing.",
      "error"
    );

    return;
  }

  setMinimumBookingDate();

  await loadSelectedService();
}

function showMessage(
  message = "",
  type = ""
) {
  if (!bookingMessage) {
    return;
  }

  bookingMessage.textContent =
    message;

  bookingMessage.className =
    type
      ? `booking-message ${type}`
      : "booking-message";
}

function setMinimumBookingDate() {
  if (!bookingDate) {
    return;
  }

  const today =
    new Date();

  const year =
    today.getFullYear();

  const month =
    String(
      today.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      today.getDate()
    ).padStart(2, "0");

  bookingDate.min =
    `${year}-${month}-${day}`;
}

function formatMoney(value) {
  return new Intl.NumberFormat(
    "en-KE",
    {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  ).format(
    Number(value || 0)
  );
}

function formatPricingType(
  pricingType
) {
  const labels = {
    FIXED: "Fixed price",
    HOURLY: "Per hour",
    DAILY: "Per day",
    PER_VISIT: "Per visit",
    PER_TRIP: "Per trip",
  };

  return (
    labels[pricingType] ||
    pricingType ||
    "Pricing"
  );
}

function getUserRoles() {
  if (
    Array.isArray(
      storedUser?.roles
    )
  ) {
    return storedUser.roles
      .map((role) =>
        String(role || "")
          .trim()
          .toUpperCase()
      )
      .filter(Boolean);
  }

  const role =
    String(
      storedUser?.role || ""
    )
      .trim()
      .toUpperCase();

  return role
    ? [role]
    : [];
}

async function loadSelectedService() {
  showMessage(
    "Loading booking details...",
    "info"
  );

  try {
    const response =
      await fetch(
        `${API_BASE_URL}/providers/${encodeURIComponent(
          providerId
        )}`,
        {
          headers: {
            Accept:
              "application/json",
          },
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
        "Unable to load service information."
      );
    }

    selectedProvider =
      data.provider;

    selectedService =
      Array.isArray(
        selectedProvider.services
      )
        ? selectedProvider.services.find(
            (service) =>
              service.id ===
              serviceId
          )
        : null;

    if (!selectedService) {
      throw new Error(
        "The selected service is unavailable."
      );
    }

    if (
      String(
        selectedProvider.availabilityStatus ||
        ""
      ).toUpperCase() !==
      "AVAILABLE"
    ) {
      throw new Error(
        "This provider is currently unavailable for new bookings."
      );
    }

    renderBookingSummary();

    bookingContent.hidden =
      false;

    showMessage();
  } catch (error) {
    console.error(
      "Load booking details error:",
      error
    );

    showMessage(
      error.message ||
        "Unable to load booking details.",
      "error"
    );
  }
}

function renderBookingSummary() {
  bookingProviderName.textContent =
    selectedProvider.fullName ||
    "Provider";

  bookingServiceArea.textContent =
    selectedProvider.serviceArea ||
    "Service area not specified";

  bookingServiceTitle.textContent =
    selectedService.title ||
    "Service";

  bookingServiceDescription.textContent =
    selectedService.description ||
    "No service description provided.";

  bookingPrice.textContent =
    formatMoney(
      selectedService.price
    );

  bookingPricingType.textContent =
    formatPricingType(
      selectedService.pricingType
    );
}

bookingForm?.addEventListener(
  "submit",
  prepareBooking
);

async function prepareBooking(
  event
) {
  event.preventDefault();

  showMessage();

  if (!token || !storedUser) {
    const returnUrl =
      `${window.location.pathname}${window.location.search}`;

    sessionStorage.setItem(
      "coastConnectReturnUrl",
      returnUrl
    );

    window.location.href =
      "login.html";

    return;
  }

  const roles =
    getUserRoles();

  if (
    !roles.includes("CUSTOMER")
  ) {
    showMessage(
      "Only customer accounts can create bookings.",
      "error"
    );

    return;
  }

  const date =
    bookingDate.value;

  const time =
    bookingTime.value;

  const address =
    bookingAddress.value.trim();

  const instructions =
    bookingInstructions.value.trim();

  if (
    !date ||
    !time ||
    !address
  ) {
    showMessage(
      "Date, time and service address are required.",
      "error"
    );

    return;
  }

  const selectedDateTime =
    new Date(
      `${date}T${time}`
    );

  if (
    Number.isNaN(
      selectedDateTime.getTime()
    ) ||
    selectedDateTime <=
      new Date()
  ) {
    showMessage(
      "Choose a valid future booking date and time.",
      "error"
    );

    return;
  }

  const payload = {
    providerId:
      selectedProvider.id,

    providerServiceId:
      selectedService.id,

    serviceAddress:
      address,

    bookingDate:
      date,

    startTime:
      time,

    instructions:
      instructions || null,
  };

  confirmBookingButton.disabled =
    true;

  confirmBookingButton.textContent =
    "Creating booking...";

  try {
    const response =
      await fetch(
        `${API_BASE_URL}/bookings`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },

          body:
            JSON.stringify(
              payload
            ),
        }
      );

    const data =
      await response.json();

    if (
      response.status === 401
    ) {
      localStorage.removeItem(
        "coastConnectToken"
      );

      localStorage.removeItem(
        "coastConnectUser"
      );

      const returnUrl =
        `${window.location.pathname}${window.location.search}`;

      sessionStorage.setItem(
        "coastConnectReturnUrl",
        returnUrl
      );

      window.location.replace(
        "login.html"
      );

      return;
    }

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.message ||
        "Unable to create booking."
      );
    }

    showMessage(
      data.message ||
        "Booking created successfully.",
      "success"
    );

    bookingForm.reset();

    window.setTimeout(
      () => {
       window.location.href =
  `customer-bookings.html?bookingId=${encodeURIComponent(
    data.booking.id
  )}`;
      },
      1200
    );
  } catch (error) {
    console.error(
      "Create booking error:",
      error
    );

    showMessage(
      error.message ||
        "Unable to create booking.",
      "error"
    );
  } finally {
    confirmBookingButton.disabled =
      false;

    confirmBookingButton.textContent =
      "Confirm Booking";
  }
}