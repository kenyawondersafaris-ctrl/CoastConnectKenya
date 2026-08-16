"use strict";

const API_BASE_URL =
  "https://coastconnectkenya.onrender.com/api";

  const socket =
  io("https://coastconnectkenya.onrender.com");

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

const userRoles =
  Array.isArray(storedUser?.roles)
    ? storedUser.roles
        .map((role) =>
          String(role || "")
            .trim()
            .toUpperCase()
        )
        .filter(Boolean)
    : [
        String(
          storedUser?.role || ""
        )
          .trim()
          .toUpperCase(),
      ].filter(Boolean);

const isProvider =
  userRoles.includes(
    "PROVIDER"
  );

if (!token || !storedUser) {
  window.location.replace(
    "login.html"
  );
} else if (!isProvider) {
  window.location.replace(
    "index.html"
  );
}

function normalizeBookingStatus(
  value
) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function formatBookingStatus(
  value
) {
  return normalizeBookingStatus(
    value
  )
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function formatProviderBookingDate(
  value
) {
  if (!value) {
    return "Not specified";
  }

  const datePart =
    String(value).slice(
      0,
      10
    );

  const [
    year,
    month,
    day,
  ] = datePart.split("-");

  if (
    !year ||
    !month ||
    !day
  ) {
    return datePart;
  }

  return `${day}/${month}/${year}`;
}

function formatProviderBookingTime(
  value
) {
  if (!value) {
    return "Not specified";
  }

  const [
    hourValue,
    minuteValue,
  ] = String(value)
    .split(":");

  const hour =
    Number(hourValue);

  if (
    Number.isNaN(hour)
  ) {
    return String(value);
  }

  const suffix =
    hour >= 12
      ? "PM"
      : "AM";

  const displayHour =
    hour % 12 || 12;

  return `${displayHour}:${minuteValue || "00"} ${suffix}`;
}

async function loadProviderBookings() {
  if (!providerBookingsGrid) {
    return;
  }

  providerBookingsGrid.innerHTML =
    `
      <p>
        Loading bookings...
      </p>
    `;

  setMessage(
    providerBookingsMessage
  );

  try {
    const response =
      await fetch(
        `${API_BASE_URL}/providers/me/bookings`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,

            Accept:
              "application/json",
          },
        }
      );

    if (
      handleUnauthorized(
        response
      )
    ) {
      return;
    }

    const data =
      await readJsonResponse(
        response
      );

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.message ||
        "Unable to load provider bookings."
      );
    }

    providerBookings =
      Array.isArray(
        data.bookings
      )
        ? data.bookings
        : [];

    updateProviderBookingCounts();
    renderProviderBookings();
  } catch (error) {
    console.error(
      "Load provider bookings error:",
      error
    );

    providerBookingsGrid.innerHTML =
      `
        <p>
          Unable to load bookings.
        </p>
      `;

    setMessage(
      providerBookingsMessage,
      error.message ||
        "Unable to load provider bookings.",
      "error"
    );
  }
}

function updateProviderBookingCounts() {
  const counts = {
    PENDING: 0,
    CONFIRMED: 0,
    IN_PROGRESS: 0,
    COMPLETED: 0,
  };

  providerBookings.forEach(
    (booking) => {
      const status =
        normalizeBookingStatus(
          booking.bookingStatus
        );

      if (
        Object.hasOwn(
          counts,
          status
        )
      ) {
        counts[status] += 1;
      }
    }
  );

  providerPendingBookings.textContent =
    counts.PENDING;

  providerConfirmedBookings.textContent =
    counts.CONFIRMED;

  providerProgressBookings.textContent =
    counts.IN_PROGRESS;

  providerCompletedBookings.textContent =
    counts.COMPLETED;
}

function renderProviderBookings() {
  if (!providerBookingsGrid) {
    return;
  }

  if (
    providerBookings.length ===
    0
  ) {
    providerBookingsGrid.innerHTML =
      `
        <div class="provider-bookings-empty">
          <h3>
            No customer bookings yet
          </h3>

          <p>
            New booking requests will appear here.
          </p>
        </div>
      `;

    return;
  }

  providerBookingsGrid.innerHTML =
    providerBookings
      .map(
        (booking) => {
          const status =
            normalizeBookingStatus(
              booking.bookingStatus
            );

          return `
            <article
              class="provider-booking-card"
              data-booking-id="${escapeHtml(
                booking.id
              )}"
            >

              <div class="provider-booking-header">

                <div>
                  <span class="provider-label">
                    ${escapeHtml(
                      booking.serviceTitle ||
                      "Customer booking"
                    )}
                  </span>

                  <h3>
                    ${escapeHtml(
                      booking.customerName ||
                      "Customer"
                    )}
                  </h3>
                </div>

                <span
                  class="status-badge status-${escapeHtml(
                    status.toLowerCase()
                  )}"
                >
                  ${escapeHtml(
                    formatBookingStatus(
                      status
                    )
                  )}
                </span>

              </div>

              <div class="provider-booking-details">

                <div>
                  <span>Date</span>

                  <strong>
                    ${escapeHtml(
                      formatProviderBookingDate(
                        booking.bookingDate
                      )
                    )}
                  </strong>
                </div>

                <div>
                  <span>Time</span>

                  <strong>
                    ${escapeHtml(
                      formatProviderBookingTime(
                        booking.startTime
                      )
                    )}
                  </strong>
                </div>

                <div>
                  <span>Price</span>

                  <strong>
                    ${formatMoney(
                      booking.estimatedPrice
                    )}
                  </strong>
                </div>

                <div>
                  <span>Payment</span>

                  <strong>
                    ${escapeHtml(
                      formatBookingStatus(
                        booking.paymentStatus
                      )
                    )}
                  </strong>
                </div>

                <div class="full-width">
                  <span>Service address</span>

                  <p>
                    ${escapeHtml(
                      booking.serviceAddress ||
                      "Not specified"
                    )}
                  </p>
                </div>

                ${
                  booking.instructions
                    ? `
                      <div class="full-width">
                        <span>Instructions</span>

                        <p>
                          ${escapeHtml(
                            booking.instructions
                          )}
                        </p>
                      </div>
                    `
                    : ""
                }

                <div class="full-width">
                  <span>Customer contact</span>

                  <p>
                    ${escapeHtml(
                      booking.customerPhone ||
                      booking.customerEmail ||
                      "Not available"
                    )}
                  </p>
                </div>

              </div>

              <div class="provider-booking-actions">

                ${
                  status === "PENDING"
                    ? `
                      <button
                        type="button"
                        class="primary-button accept-booking-button"
                        data-booking-id="${escapeHtml(
                          booking.id
                        )}"
                      >
                        Accept
                      </button>

                      <button
                        type="button"
                        class="danger-button reject-booking-button"
                        data-booking-id="${escapeHtml(
                          booking.id
                        )}"
                      >
                        Reject
                      </button>
                    `
                    : ""
                }

                ${
                  status === "CONFIRMED"
                    ? `
                      <button
                        type="button"
                        class="primary-button start-booking-button"
                        data-booking-id="${escapeHtml(
                          booking.id
                        )}"
                      >
                        Start Job
                      </button>
                    `
                    : ""
                }

                ${
                  status === "IN_PROGRESS"
                    ? `
                      <button
                        type="button"
                        class="primary-button complete-booking-button"
                        data-booking-id="${escapeHtml(
                          booking.id
                        )}"
                      >
                        Complete Job
                      </button>
                    `
                    : ""
                }

              </div>

            </article>
          `;
        }
      )
      .join("");
}

async function updateBookingStatus(
  bookingId,
  bookingStatus
) {
  setMessage(
    providerBookingsMessage
  );

  try {
    const response =
      await fetch(
        `${API_BASE_URL}/providers/me/bookings/${encodeURIComponent(
          bookingId
        )}/status`,
        {
          method: "PATCH",

          headers: {
            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },

          body: JSON.stringify({
            bookingStatus,
          }),
        }
      );

    if (
      handleUnauthorized(
        response
      )
    ) {
      return;
    }

    const data =
      await readJsonResponse(
        response
      );

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.message ||
        "Unable to update booking status."
      );
    }

    setMessage(
      providerBookingsMessage,
      data.message ||
        "Booking updated successfully.",
      "success"
    );

    await loadProviderBookings();
  } catch (error) {
    console.error(
      "Update booking status error:",
      error
    );

    setMessage(
      providerBookingsMessage,
      error.message ||
        "Unable to update booking status.",
      "error"
    );
  }
}

/*
|--------------------------------------------------------------------------
| Provider profile elements
|--------------------------------------------------------------------------
*/

const providerHeaderName =
  document.getElementById(
    "providerHeaderName"
  );

const providerProfileState =
  document.getElementById(
    "providerProfileState"
  );

const providerVerificationStatus =
  document.getElementById(
    "providerVerificationStatus"
  );

const providerAvailabilityStatus =
  document.getElementById(
    "providerAvailabilityStatus"
  );

const providerAverageRating =
  document.getElementById(
    "providerAverageRating"
  );

const providerTotalReviews =
  document.getElementById(
    "providerTotalReviews"
  );

const providerDashboardMessage =
  document.getElementById(
    "providerDashboardMessage"
  );

const providerProfileMessage =
  document.getElementById(
    "providerProfileMessage"
  );

const providerProfileForm =
  document.getElementById(
    "providerProfileForm"
  );

const saveProviderProfileButton =
  document.getElementById(
    "saveProviderProfileButton"
  );

const providerServiceArea =
  document.getElementById(
    "providerServiceArea"
  );

const providerExperienceYears =
  document.getElementById(
    "providerExperienceYears"
  );

const providerBio =
  document.getElementById(
    "providerBio"
  );

const providerProfilePhoto =
  document.getElementById(
    "providerProfilePhoto"
  );

const providerLogoutButton =
  document.getElementById(
    "providerLogoutButton"
  );

/*
|--------------------------------------------------------------------------
| Provider service elements
|--------------------------------------------------------------------------
*/

const showServiceFormButton =
  document.getElementById(
    "showServiceFormButton"
  );

const cancelServiceFormButton =
  document.getElementById(
    "cancelServiceFormButton"
  );

const providerServiceFormPanel =
  document.getElementById(
    "providerServiceFormPanel"
  );

const providerServiceForm =
  document.getElementById(
    "providerServiceForm"
  );

const providerServiceFormTitle =
  document.getElementById(
    "providerServiceFormTitle"
  );

const providerServiceId =
  document.getElementById(
    "providerServiceId"
  );

const providerServiceCategory =
  document.getElementById(
    "providerServiceCategory"
  );

const providerServiceTitle =
  document.getElementById(
    "providerServiceTitle"
  );

const providerServicePricingType =
  document.getElementById(
    "providerServicePricingType"
  );

const providerServicePrice =
  document.getElementById(
    "providerServicePrice"
  );

const providerServiceDescription =
  document.getElementById(
    "providerServiceDescription"
  );

const providerServiceActiveGroup =
  document.getElementById(
    "providerServiceActiveGroup"
  );

const providerServiceIsActive =
  document.getElementById(
    "providerServiceIsActive"
  );

const saveProviderServiceButton =
  document.getElementById(
    "saveProviderServiceButton"
  );

const providerServiceFormMessage =
  document.getElementById(
    "providerServiceFormMessage"
  );

const providerServicesMessage =
  document.getElementById(
    "providerServicesMessage"
  );

const providerServicesList =
  document.getElementById(
    "providerServicesList"
  );

  const providerAvailabilitySelect =
  document.getElementById(
    "providerAvailabilitySelect"
  );

const saveAvailabilityButton =
  document.getElementById(
    "saveAvailabilityButton"
  );

const availabilityMessage =
  document.getElementById(
    "availabilityMessage"
  );

  const providerBookingsLink =
  document.getElementById(
    "providerBookingsLink"
  );

const providerBookingsSection =
  document.getElementById(
    "providerBookingsSection"
  );

const providerBookingsMessage =
  document.getElementById(
    "providerBookingsMessage"
  );

const providerBookingsGrid =
  document.getElementById(
    "providerBookingsGrid"
  );

const providerPendingBookings =
  document.getElementById(
    "providerPendingBookings"
  );

const providerConfirmedBookings =
  document.getElementById(
    "providerConfirmedBookings"
  );

const providerProgressBookings =
  document.getElementById(
    "providerProgressBookings"
  );

const providerCompletedBookings =
  document.getElementById(
    "providerCompletedBookings"
  );

  const providerAccountButton =
  document.getElementById(
    "providerAccountButton"
  );

const providerAccountDropdown =
  document.getElementById(
    "providerAccountDropdown"
  );

const providerAccountAvatar =
  document.getElementById(
    "providerAccountAvatar"
  );

const providerDropdownName =
  document.getElementById(
    "providerDropdownName"
  );

const providerDropdownEmail =
  document.getElementById(
    "providerDropdownEmail"
  );

let providerBookings = [];

let providerServices = [];
let providerCategories = [];
let providerProfileExists = false;

/*
|--------------------------------------------------------------------------
| Initial display
|--------------------------------------------------------------------------
*/

if (providerHeaderName) {
  providerHeaderName.textContent =
    storedUser?.fullName ||
    storedUser?.name ||
    "Provider";
}

const providerDisplayName =
  String(
    storedUser?.fullName ||
    storedUser?.name ||
    "Provider"
  ).trim();

const providerFirstName =
  providerDisplayName
    .split(" ")
    .filter(Boolean)[0] ||
  "Provider";

if (providerAccountAvatar) {
  providerAccountAvatar.textContent =
    providerFirstName
      .charAt(0)
      .toUpperCase();
}

if (providerDropdownName) {
  providerDropdownName.textContent =
    providerDisplayName;
}

if (providerDropdownEmail) {
  providerDropdownEmail.textContent =
    storedUser?.email || "";
}

providerAccountButton?.addEventListener(
  "click",
  (event) => {
    event.stopPropagation();

    const isOpen =
      !providerAccountDropdown.hidden;

    providerAccountDropdown.hidden =
      isOpen;

    providerAccountButton.setAttribute(
      "aria-expanded",
      String(!isOpen)
    );
  }
);

document.addEventListener(
  "click",
  (event) => {
    if (
      providerAccountDropdown &&
      providerAccountButton &&
      !providerAccountButton.contains(
        event.target
      ) &&
      !providerAccountDropdown.contains(
        event.target
      )
    ) {
      providerAccountDropdown.hidden =
        true;

      providerAccountButton.setAttribute(
        "aria-expanded",
        "false"
      );
    }
  }
);

document.addEventListener(
  "DOMContentLoaded",
  initializeProviderDashboard
);


providerBookingsLink?.addEventListener(
  "click",
  async (event) => {
    event.preventDefault();

    providerBookingsSection.hidden =
      false;

    await loadProviderBookings();

    providerBookingsSection.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
);

async function initializeProviderDashboard() {
  await Promise.all([
    loadProviderProfile(),
    loadServiceCategories(),
    
  ]);

  await loadProviderServices();
  initializeBookingSocket();
}

/*
|--------------------------------------------------------------------------
| Shared helpers
|--------------------------------------------------------------------------
*/

function clearSessionAndRedirect() {
  localStorage.removeItem(
    "coastConnectToken"
  );

  localStorage.removeItem(
    "coastConnectUser"
  );

  window.location.replace(
    "login.html"
  );
}

async function readJsonResponse(
  response
) {
  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  if (
    !contentType.includes(
      "application/json"
    )
  ) {
    throw new Error(
      "The server returned an invalid response."
    );
  }

  return response.json();
}

function handleUnauthorized(
  response
) {
  if (
    response.status === 401
  ) {
    clearSessionAndRedirect();

    return true;
  }

  return false;
}

function setMessage(
  element,
  message = "",
  type = ""
) {
  if (!element) {
    return;
  }

  element.textContent =
    message;

  element.className =
    type
      ? `${element.className
          .split(" ")[0]} ${type}`
      : element.className
          .split(" ")[0];
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/*
|--------------------------------------------------------------------------
| Provider profile
|--------------------------------------------------------------------------
*/

async function loadProviderProfile() {
  if (providerProfileState) {
    providerProfileState.textContent =
      "Loading...";
  }

  try {
    const response =
      await fetch(
        `${API_BASE_URL}/providers/me`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,

            Accept:
              "application/json",
          },
        }
      );

    if (
      handleUnauthorized(
        response
      )
    ) {
      return;
    }

    const data =
      await readJsonResponse(
        response
      );

    if (
      response.status === 404
    ) {
      providerProfileExists =
        false;

      if (
        providerProfileState
      ) {
        providerProfileState.textContent =
          "Profile not created";
      }

      if (
        saveProviderProfileButton
      ) {
        saveProviderProfileButton.textContent =
          "Create Provider Profile";
      }

      return;
    }

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.message ||
        "Unable to load provider profile."
      );
    }

    providerProfileExists =
      true;

    populateProviderProfile(
      data.provider
    );
  } catch (error) {
    console.error(
      "Load provider profile error:",
      error
    );

    setMessage(
      providerDashboardMessage,
      error.message ||
        "Unable to load provider profile.",
      "error"
    );
  }
}

function populateProviderProfile(
  provider
) {
  providerProfileExists =
    true;

  if (providerProfileState) {
    providerProfileState.textContent =
      "Profile created";
  }

  if (
    saveProviderProfileButton
  ) {
    saveProviderProfileButton.textContent =
      "Update Profile";
  }

  if (
    providerHeaderName
  ) {
    providerHeaderName.textContent =
      provider.fullName ||
      storedUser?.fullName ||
      "Provider";
  }

  if (
    providerVerificationStatus
  ) {
    const verificationStatus =
      String(
        provider.verificationStatus ||
        "PENDING"
      ).toUpperCase();

    providerVerificationStatus.textContent =
      verificationStatus;

    providerVerificationStatus.className =
      `status-badge status-${verificationStatus.toLowerCase()}`;
  }

  if (
    providerAvailabilityStatus
  ) {
    const availabilityStatus =
      String(
        provider.availabilityStatus ||
        "OFFLINE"
      ).toUpperCase();

    providerAvailabilityStatus.textContent =
      availabilityStatus;

      providerAvailabilitySelect.value =
  provider.availabilityStatus;

    providerAvailabilityStatus.className =
      `status-badge status-${availabilityStatus.toLowerCase()}`;
  }

  if (
    providerAverageRating
  ) {
    providerAverageRating.textContent =
      Number(
        provider.averageRating || 0
      ).toFixed(1);
  }

  if (
    providerTotalReviews
  ) {
    providerTotalReviews.textContent =
      Number(
        provider.totalReviews || 0
      );
  }

  if (
    providerServiceArea
  ) {
    providerServiceArea.value =
      provider.serviceArea || "";
  }

  if (
    providerExperienceYears
  ) {
    providerExperienceYears.value =
      provider.experienceYears || 0;
  }

  if (providerBio) {
    providerBio.value =
      provider.bio || "";
  }

  if (
    providerProfilePhoto
  ) {
    providerProfilePhoto.value =
      provider.profilePhoto || "";
  }
}

providerProfileForm?.addEventListener(
  "submit",
  saveProviderProfile
);

async function saveProviderProfile(
  event
) {
  event.preventDefault();

  setMessage(
    providerProfileMessage
  );

  const payload = {
    serviceArea:
      providerServiceArea?.value.trim() ||
      "",

    experienceYears:
      Number(
        providerExperienceYears?.value ||
        0
      ),

    bio:
      providerBio?.value.trim() ||
      "",

    profilePhoto:
      providerProfilePhoto?.value.trim() ||
      "",
  };

  if (!payload.serviceArea) {
    setMessage(
      providerProfileMessage,
      "Service area is required.",
      "error"
    );

    return;
  }

  if (
    !Number.isInteger(
      payload.experienceYears
    ) ||
    payload.experienceYears <
      0 ||
    payload.experienceYears >
      60
  ) {
    setMessage(
      providerProfileMessage,
      "Experience years must be between 0 and 60.",
      "error"
    );

    return;
  }

  if (
    saveProviderProfileButton
  ) {
    saveProviderProfileButton.disabled =
      true;

    saveProviderProfileButton.textContent =
      "Saving...";
  }

  try {
    const response =
      await fetch(
        `${API_BASE_URL}/providers/me`,
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

    if (
      handleUnauthorized(
        response
      )
    ) {
      return;
    }

    const data =
      await readJsonResponse(
        response
      );

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.message ||
        "Unable to save provider profile."
      );
    }

    populateProviderProfile(
      data.provider
    );

    setMessage(
      providerProfileMessage,
      data.message ||
        "Provider profile saved successfully.",
      "success"
    );
  } catch (error) {
    console.error(
      "Save provider profile error:",
      error
    );

    setMessage(
      providerProfileMessage,
      error.message ||
        "Unable to save provider profile.",
      "error"
    );
  } finally {
    if (
      saveProviderProfileButton
    ) {
      saveProviderProfileButton.disabled =
        false;

      saveProviderProfileButton.textContent =
        providerProfileExists
          ? "Update Profile"
          : "Create Provider Profile";
    }
  }
}

/*
|--------------------------------------------------------------------------
| Service categories
|--------------------------------------------------------------------------
*/

async function loadServiceCategories() {
  try {
    const response =
      await fetch(
        `${API_BASE_URL}/service-categories`,
        {
          headers: {
            Accept:
              "application/json",
          },
        }
      );

    const data =
      await readJsonResponse(
        response
      );

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.message ||
        "Unable to load service categories."
      );
    }

    providerCategories =
      Array.isArray(
        data.categories
      )
        ? data.categories
        : [];

    renderServiceCategories();
  } catch (error) {
    console.error(
      "Load service categories error:",
      error
    );

    if (
      providerServiceCategory
    ) {
      providerServiceCategory.innerHTML =
        `
          <option value="">
            Categories unavailable
          </option>
        `;
    }

    setMessage(
      providerServicesMessage,
      error.message ||
        "Unable to load service categories.",
      "error"
    );
  }
}

function renderServiceCategories() {
  if (
    !providerServiceCategory
  ) {
    return;
  }

  providerServiceCategory.innerHTML =
    `
      <option value="">
        Select category
      </option>
    `;

  providerCategories.forEach(
    (category) => {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        category.id;

      option.textContent =
        category.name;

      providerServiceCategory.appendChild(
        option
      );
    }
  );
}

/*
|--------------------------------------------------------------------------
| Provider services
|--------------------------------------------------------------------------
*/

async function loadProviderServices() {
  if (!providerServicesList) {
    return;
  }

  providerServicesList.innerHTML =
    `
      <p class="services-empty-state">
        Loading services...
      </p>
    `;

  try {
    const response =
      await fetch(
        `${API_BASE_URL}/providers/me/services`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,

            Accept:
              "application/json",
          },
        }
      );

    if (
      handleUnauthorized(
        response
      )
    ) {
      return;
    }

    const data =
      await readJsonResponse(
        response
      );

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.message ||
        "Unable to load services."
      );
    }

    providerServices =
      Array.isArray(
        data.services
      )
        ? data.services
        : [];

    renderProviderServices();
  } catch (error) {
    console.error(
      "Load provider services error:",
      error
    );

    providerServicesList.innerHTML =
      `
        <p class="services-empty-state">
          ${escapeHtml(
            error.message ||
              "Unable to load services."
          )}
        </p>
      `;
  }
}

function renderProviderServices() {
  if (!providerServicesList) {
    return;
  }

  if (
    providerServices.length ===
    0
  ) {
    providerServicesList.innerHTML =
      `
        <div class="services-empty-state">
          <h3>No services added yet</h3>

          <p>
            Add your first service so customers can see what you offer.
          </p>
        </div>
      `;

    return;
  }

  providerServicesList.innerHTML =
    providerServices
      .map(
        (service) => `
          <article
            class="provider-service-card"
            data-service-id="${escapeHtml(
              service.id
            )}"
          >
            <div class="provider-service-card-heading">
              <div>
                <span class="provider-label">
                  ${escapeHtml(
                    service.categoryName ||
                      "Service"
                  )}
                </span>

                <h3>
                  ${escapeHtml(
                    service.title
                  )}
                </h3>
              </div>

              <span
                class="status-badge ${
                  service.isActive
                    ? "status-active"
                    : "status-inactive"
                }"
              >
                ${
                  service.isActive
                    ? "Active"
                    : "Inactive"
                }
              </span>
            </div>

            <p class="provider-service-description">
              ${escapeHtml(
                service.description ||
                  "No description provided."
              )}
            </p>

            <div class="provider-service-price">
              <strong>
                ${formatMoney(
                  service.price
                )}
              </strong>

              <span>
                ${escapeHtml(
                  formatPricingType(
                    service.pricingType
                  )
                )}
              </span>
            </div>

            <div class="provider-service-actions">
              <button
                type="button"
                class="secondary-button edit-service-button"
                data-service-id="${escapeHtml(
                  service.id
                )}"
              >
                Edit
              </button>

              <button
                type="button"
                class="secondary-button toggle-service-button"
                data-service-id="${escapeHtml(
                  service.id
                )}"
              >
                ${
                  service.isActive
                    ? "Deactivate"
                    : "Activate"
                }
              </button>

              <button
                type="button"
                class="danger-button delete-service-button"
                data-service-id="${escapeHtml(
                  service.id
                )}"
              >
                Delete
              </button>
            </div>
          </article>
        `
      )
      .join("");
}

function openCreateServiceForm() {
  if (!providerProfileExists) {
    setMessage(
      providerServicesMessage,
      "Create your provider profile before adding services.",
      "error"
    );

    providerProfileForm?.scrollIntoView(
      {
        behavior: "smooth",
        block: "start",
      }
    );

    return;
  }

  resetProviderServiceForm();

  if (
    providerServiceFormPanel
  ) {
    providerServiceFormPanel.hidden =
      false;
  }

  providerServiceFormPanel?.scrollIntoView(
    {
      behavior: "smooth",
      block: "start",
    }
  );
}

function closeProviderServiceForm() {
  resetProviderServiceForm();

  if (
    providerServiceFormPanel
  ) {
    providerServiceFormPanel.hidden =
      true;
  }
}

function resetProviderServiceForm() {
  providerServiceForm?.reset();

  if (providerServiceId) {
    providerServiceId.value =
      "";
  }

  if (
    providerServiceFormTitle
  ) {
    providerServiceFormTitle.textContent =
      "Add a new service";
  }

  if (
    saveProviderServiceButton
  ) {
    saveProviderServiceButton.textContent =
      "Save Service";
  }

  if (
    providerServiceActiveGroup
  ) {
    providerServiceActiveGroup.hidden =
      true;
  }

  if (
    providerServiceIsActive
  ) {
    providerServiceIsActive.checked =
      true;
  }

  setMessage(
    providerServiceFormMessage
  );
}

function openEditServiceForm(
  serviceId
) {
  const service =
    providerServices.find(
      (item) =>
        item.id === serviceId
    );

  if (!service) {
    setMessage(
      providerServicesMessage,
      "Service not found.",
      "error"
    );

    return;
  }

  if (providerServiceId) {
    providerServiceId.value =
      service.id;
  }

  if (
    providerServiceCategory
  ) {
    providerServiceCategory.value =
      service.categoryId;
  }

  if (
    providerServiceTitle
  ) {
    providerServiceTitle.value =
      service.title || "";
  }

  if (
    providerServicePricingType
  ) {
    providerServicePricingType.value =
      service.pricingType ||
      "FIXED";
  }

  if (
    providerServicePrice
  ) {
    providerServicePrice.value =
      service.price || "";
  }

  if (
    providerServiceDescription
  ) {
    providerServiceDescription.value =
      service.description || "";
  }

  if (
    providerServiceIsActive
  ) {
    providerServiceIsActive.checked =
      Boolean(
        service.isActive
      );
  }

  if (
    providerServiceFormTitle
  ) {
    providerServiceFormTitle.textContent =
      "Edit service";
  }

  if (
    saveProviderServiceButton
  ) {
    saveProviderServiceButton.textContent =
      "Update Service";
  }

  if (
    providerServiceActiveGroup
  ) {
    providerServiceActiveGroup.hidden =
      false;
  }

  if (
    providerServiceFormPanel
  ) {
    providerServiceFormPanel.hidden =
      false;
  }

  setMessage(
    providerServiceFormMessage
  );

  providerServiceFormPanel?.scrollIntoView(
    {
      behavior: "smooth",
      block: "start",
    }
  );
}

async function saveProviderService(
  event
) {
  event.preventDefault();

  setMessage(
    providerServiceFormMessage
  );

  const editingServiceId =
    providerServiceId?.value.trim() ||
    "";

  const payload = {
    categoryId:
      providerServiceCategory?.value.trim() ||
      "",

    title:
      providerServiceTitle?.value.trim() ||
      "",

    pricingType:
      providerServicePricingType?.value ||
      "FIXED",

    price:
      Number(
        providerServicePrice?.value
      ),

    description:
      providerServiceDescription?.value.trim() ||
      "",

    isActive:
      editingServiceId
        ? Boolean(
            providerServiceIsActive
              ?.checked
          )
        : true,
  };

  if (!payload.categoryId) {
    setMessage(
      providerServiceFormMessage,
      "Select a service category.",
      "error"
    );

    return;
  }

  if (!payload.title) {
    setMessage(
      providerServiceFormMessage,
      "Service title is required.",
      "error"
    );

    return;
  }

  if (
    !Number.isFinite(
      payload.price
    ) ||
    payload.price <= 0
  ) {
    setMessage(
      providerServiceFormMessage,
      "Price must be greater than zero.",
      "error"
    );

    return;
  }

  if (
    saveProviderServiceButton
  ) {
    saveProviderServiceButton.disabled =
      true;

    saveProviderServiceButton.textContent =
      editingServiceId
        ? "Updating..."
        : "Saving...";
  }

  try {
    const endpoint =
      editingServiceId
        ? `${API_BASE_URL}/providers/me/services/${editingServiceId}`
        : `${API_BASE_URL}/providers/me/services`;

    const method =
      editingServiceId
        ? "PATCH"
        : "POST";

    const response =
      await fetch(
        endpoint,
        {
          method,

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

    if (
      handleUnauthorized(
        response
      )
    ) {
      return;
    }

    const data =
      await readJsonResponse(
        response
      );

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.message ||
        "Unable to save service."
      );
    }

    setMessage(
      providerServicesMessage,
      data.message ||
        "Service saved successfully.",
      "success"
    );

    closeProviderServiceForm();

    await loadProviderServices();
  } catch (error) {
    console.error(
      "Save provider service error:",
      error
    );

    setMessage(
      providerServiceFormMessage,
      error.message ||
        "Unable to save service.",
      "error"
    );
  } finally {
    if (
      saveProviderServiceButton
    ) {
      saveProviderServiceButton.disabled =
        false;

      saveProviderServiceButton.textContent =
        editingServiceId
          ? "Update Service"
          : "Save Service";
    }
  }
}

async function toggleProviderService(
  serviceId
) {
  const service =
    providerServices.find(
      (item) =>
        item.id === serviceId
    );

  if (!service) {
    return;
  }

  const payload = {
    categoryId:
      service.categoryId,

    title:
      service.title,

    description:
      service.description || "",

    pricingType:
      service.pricingType,

    price:
      Number(service.price),

    isActive:
      !service.isActive,
  };

  try {
    const response =
      await fetch(
        `${API_BASE_URL}/providers/me/services/${serviceId}`,
        {
          method: "PATCH",

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

    if (
      handleUnauthorized(
        response
      )
    ) {
      return;
    }

    const data =
      await readJsonResponse(
        response
      );

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.message ||
        "Unable to update service."
      );
    }

    setMessage(
      providerServicesMessage,
      data.message ||
        "Service updated successfully.",
      "success"
    );

    await loadProviderServices();
  } catch (error) {
    console.error(
      "Toggle service error:",
      error
    );

    setMessage(
      providerServicesMessage,
      error.message ||
        "Unable to update service.",
      "error"
    );
  }
}

async function deleteProviderService(
  serviceId
) {
  const service =
    providerServices.find(
      (item) =>
        item.id === serviceId
    );

  if (!service) {
    return;
  }

  const confirmed =
  await showConfirm({
    title:
      "Delete service?",
    message:
      `"${service.title}" will be permanently removed. This action cannot be undone.`,
    confirmText:
      "Delete service",
    cancelText:
      "Keep service",
    danger:
      true,
  });

  if (!confirmed) {
    return;
  }

  try {
    const response =
      await fetch(
        `${API_BASE_URL}/providers/me/services/${serviceId}`,
        {
          method: "DELETE",

          headers: {
            Authorization:
              `Bearer ${token}`,

            Accept:
              "application/json",
          },
        }
      );

    if (
      handleUnauthorized(
        response
      )
    ) {
      return;
    }

    const data =
      await readJsonResponse(
        response
      );

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.message ||
        "Unable to delete service."
      );
    }

    setMessage(
      providerServicesMessage,
      data.message ||
        "Service deleted successfully.",
      "success"
    );

    await loadProviderServices();
  } catch (error) {
    console.error(
      "Delete provider service error:",
      error
    );

    setMessage(
      providerServicesMessage,
      error.message ||
        "Unable to delete service.",
      "error"
    );
  }
}

async function updateAvailability() {

  availabilityMessage.textContent = "";

  saveAvailabilityButton.disabled =
    true;

  saveAvailabilityButton.textContent =
    "Updating...";

  try {

    const response =
      await fetch(
        `${API_BASE_URL}/providers/me/availability`,
        {
          method: "PATCH",

          headers: {
            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },

          body: JSON.stringify({
            availabilityStatus:
              providerAvailabilitySelect.value,
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
        data.message
      );
    }

    providerAvailabilityStatus.textContent =
      data.availabilityStatus;

    providerAvailabilityStatus.className =
      `status-badge status-${data.availabilityStatus.toLowerCase()}`;

    availabilityMessage.textContent =
      "Availability updated successfully.";

    availabilityMessage.className =
      "form-message success";

  } catch (error) {

    availabilityMessage.textContent =
      error.message;

    availabilityMessage.className =
      "form-message error";

  } finally {

    saveAvailabilityButton.disabled =
      false;

    saveAvailabilityButton.textContent =
      "Update Status";
  }
}

saveAvailabilityButton?.addEventListener(
  "click",
  updateAvailability
);

/*
|--------------------------------------------------------------------------
| Events
|--------------------------------------------------------------------------
*/

showServiceFormButton?.addEventListener(
  "click",
  openCreateServiceForm
);

cancelServiceFormButton?.addEventListener(
  "click",
  closeProviderServiceForm
);

providerServiceForm?.addEventListener(
  "submit",
  saveProviderService
);

providerServicesList?.addEventListener(
  "click",
  async (event) => {
    const button =
      event.target.closest(
        "button[data-service-id]"
      );

    if (!button) {
      return;
    }

    const serviceId =
      button.dataset.serviceId;

    if (
      button.classList.contains(
        "edit-service-button"
      )
    ) {
      openEditServiceForm(
        serviceId
      );

      return;
    }

    if (
      button.classList.contains(
        "toggle-service-button"
      )
    ) {
      await toggleProviderService(
        serviceId
      );

      return;
    }

    if (
      button.classList.contains(
        "delete-service-button"
      )
    ) {
      await deleteProviderService(
        serviceId
      );
    }
  }
);

providerLogoutButton?.addEventListener(
  "click",
  () => {
    clearSessionAndRedirect();
  }
);

providerBookingsGrid?.addEventListener(
  "click",
  async (event) => {
    const button =
      event.target.closest(
        "button[data-booking-id]"
      );

    if (!button) {
      return;
    }

    const bookingId =
      button.dataset.bookingId;

    let nextStatus = "";

    if (
      button.classList.contains(
        "accept-booking-button"
      )
    ) {
      nextStatus =
        "CONFIRMED";
    } else if (
      button.classList.contains(
        "reject-booking-button"
      )
    ) {
     const confirmed =
  await showConfirm({
    title:
      "Reject booking?",
    message:
      "This booking request will be marked as rejected.",
    confirmText:
      "Reject booking",
    cancelText:
      "Keep booking",
    danger:
      true,
  });

      if (!confirmed) {
        return;
      }

      nextStatus =
        "REJECTED";
    } else if (
  button.classList.contains(
    "start-booking-button"
  )
) {
  const startPin =
  await showStartPinModal();

if (startPin === null) {
  return;
}

const normalizedPin =
  String(startPin).trim();

if (!/^\d{6}$/.test(normalizedPin)) {
  setMessage(
    providerBookingsMessage,
    "Please enter the 6-digit customer PIN.",
    "error"
  );

  return;
}


  button.disabled = true;
  const originalText =
    button.textContent;

  button.textContent =
    "Starting...";

  try {
    const response =
      await fetch(
        `${API_BASE_URL}/bookings/${encodeURIComponent(
          bookingId
        )}/start`,
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
            JSON.stringify({
              startPin:
                normalizedPin,
            }),
        }
      );

    if (
      handleUnauthorized(
        response
      )
    ) {
      return;
    }

    const data =
      await response.json();

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.message ||
        "Unable to start the service."
      );
    }

    setMessage(
      providerBookingsMessage,
      data.message ||
        "Service started successfully.",
      "success"
    );

    await loadProviderBookings();

    return;
  } catch (error) {
    console.error(
      "Start booking error:",
      error
    );

    setMessage(
      providerBookingsMessage,
      error.message ||
        "Unable to start the service.",
      "error"
    );
  } finally {
    button.disabled = false;
    button.textContent =
      originalText;
  }

  return;
} else if (
      button.classList.contains(
        "complete-booking-button"
      )
    ) {
     const confirmed =
  await showConfirm({
    title:
      "Complete job?",
    message:
      "Confirm that this job has been completed successfully.",
    confirmText:
      "Mark completed",
    cancelText:
      "Not yet",
    danger:
      false,
  });

      if (!confirmed) {
        return;
      }

      nextStatus =
        "COMPLETED";
    }

    if (!nextStatus) {
      return;
    }

    button.disabled =
      true;

    const originalText =
      button.textContent;

    button.textContent =
      "Updating...";

    await updateBookingStatus(
      bookingId,
      nextStatus
    );

    button.disabled =
      false;

    button.textContent =
      originalText;
  }
);

function initializeBookingSocket() {
  socket.on(
    "connect",
    () => {
      console.log(
        "Provider socket connected:",
        socket.id
      );

      loadProviderProfileForSocket();
    }
  );

  socket.on(
    "provider-booking-created",
    async (booking) => {
      console.log(
        "New booking received:",
        booking
      );

      await loadProviderBookings();

      setMessage(
        providerBookingsMessage,
        "New booking received.",
        "success"
      );
    }
  );
}

async function loadProviderProfileForSocket() {
  try {
    const response =
      await fetch(
        `${API_BASE_URL}/providers/me`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
            Accept:
              "application/json",
          },
        }
      );

    if (!response.ok) {
      return;
    }

    const data =
      await response.json();

    if (
      data.success &&
      data.provider?.id
    ) {
      socket.emit(
        "join-provider-room",
        data.provider.id
      );

      console.log(
        "Joined provider room:",
        data.provider.id
      );
    }
  } catch (error) {
    console.error(
      "Provider socket room error:",
      error
    );
  }
}