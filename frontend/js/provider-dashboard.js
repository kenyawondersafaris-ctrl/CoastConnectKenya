"use strict";

const API_BASE_URL =
  "https://coastconnectkenya.onrender.com/api";

const token =
  localStorage.getItem(
    "coastConnectToken"
  );

const socket =
  io("https://coastconnectkenya.onrender.com", {
    auth: {
      token,
    },
  });

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

async function loadCurrentSubscription() {
  if (!providerSubscriptionStatusContainer) {
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/subscriptions/me`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    const data = await response.json();

    if (response.status === 401) {
  clearSessionAndRedirect();
  return;
}

    if (!response.ok || !data.success) {
      throw new Error(
        data.message ||
        "Unable to load subscription."
      );
    }

    currentSubscription =
      data.subscription || null;

    renderCurrentSubscription();
  } catch (error) {
    console.error(
      "Load subscription error:",
      error
    );

    currentSubscription = null;

    providerSubscriptionStatusContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          ⚠️
        </div>

        <h3>
          Unable to load subscription
        </h3>

        <p>
          ${escapeHtml(
            error.message ||
            "Please try again later."
          )}
        </p>
      </div>
    `;
  }
}

function renderCurrentSubscription() {
  if (!providerSubscriptionStatusContainer) {
    return;
  }

  if (!currentSubscription) {
    providerSubscriptionStatusContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          📋
        </div>

        <h3>
          No active subscription
        </h3>

        <p>
          Choose a subscription plan below to get
          started.
        </p>
      </div>
    `;

    return;
  }

  const status =
    String(
      currentSubscription.status || "PENDING"
    ).toUpperCase();

  providerSubscriptionStatusContainer.innerHTML = `
    <div class="subscription-status-card">
      <div class="subscription-status-header">
        <div>
          <span class="provider-label">
            Current subscription
          </span>

          <h3>
            ${escapeHtml(
              currentSubscription.plan_name ||
              "Subscription"
            )}
          </h3>
        </div>

        <span class="subscription-status-badge">
          ${escapeHtml(status)}
        </span>
      </div>

      <div class="subscription-status-details">
        <div>
          <span>Billing</span>

          <strong>
            ${escapeHtml(
              currentSubscription.billing_period ||
              "-"
            )}
          </strong>
        </div>

        <div>
          <span>Amount</span>

          <strong>
            KES ${Number(
              currentSubscription.amount_kes || 0
            ).toLocaleString("en-KE")}
          </strong>
        </div>

        <div>
          <span>Duration</span>

          <strong>
            ${escapeHtml(
              String(
                currentSubscription.duration_days || 0
              )
            )} days
          </strong>
        </div>
      </div>
    </div>
  `;
}

async function loadSubscriptionPlans() {
  if (!providerSubscriptionPlansContainer) {
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/subscriptions/plans`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    const data = await response.json();

   if (response.status === 401) {
  clearSessionAndRedirect();
  return;
}

    if (!response.ok || !data.success) {
      throw new Error(
        data.message ||
        "Unable to load subscription plans."
      );
    }

    subscriptionPlans =
      (data.plans || []).filter(
        (plan) =>
          plan.business_type === "PROVIDER"
      );

    renderSubscriptionPlans();
  } catch (error) {
    console.error(
      "Load subscription plans error:",
      error
    );

    subscriptionPlans = [];

    providerSubscriptionPlansContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          ⚠️
        </div>

        <h3>
          Unable to load subscription plans
        </h3>

        <p>
          ${escapeHtml(
            error.message ||
            "Please try again later."
          )}
        </p>
      </div>
    `;
  }
}

function renderSubscriptionPlans() {
  if (!providerSubscriptionPlansContainer) {
    return;
  }

  if (subscriptionPlans.length === 0) {
    providerSubscriptionPlansContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          📋
        </div>

        <h3>
          No subscription plans available
        </h3>

        <p>
          Please check again later.
        </p>
      </div>
    `;

    return;
  }

  providerSubscriptionPlansContainer.innerHTML =
    subscriptionPlans
      .map((plan) => {
        const planName =
          plan.name ||
          plan.plan_name ||
          "Subscription Plan";

        const amount =
          Number(
            plan.amount_kes ??
            plan.amount ??
            0
          );

        const billingPeriod =
          plan.billing_period ||
          plan.billingPeriod ||
          "MONTHLY";

        const durationDays =
          plan.duration_days ||
          plan.durationDays ||
          30;

        return `
          <article class="subscription-plan-card">
            <div class="subscription-plan-card-header">
              <h3>
                ${escapeHtml(planName)}
              </h3>

              <strong>
                KES ${amount.toLocaleString("en-KE")}
              </strong>
            </div>

            <p>
              ${escapeHtml(
                String(billingPeriod)
              )}
              ·
              ${escapeHtml(
                String(durationDays)
              )} days
            </p>

            <button
              type="button"
              class="primary-button provider-subscription-action-button"
              data-plan-id="${escapeHtml(
                String(plan.id || "")
              )}"
            >
              ${currentSubscription?.status === "ACTIVE" ? "Renew" : "Subscribe"}
            </button>
          </article>
        `;
      })
      .join("");
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

  const providerSubscriptionMessage =
  document.getElementById(
    "providerSubscriptionMessage"
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

const providerProfilePhotoUrl =
  document.getElementById(
    "providerProfilePhotoUrl"
  );

const providerProfilePhotoPreview =
  document.getElementById(
    "providerProfilePhotoPreview"
  );

const providerProfilePhotoPreviewImage =
  document.getElementById(
    "providerProfilePhotoPreviewImage"
  );

const providerLogoutButton =
  document.getElementById(
    "providerLogoutButton"
  );

  const providerSubscriptionStatusContainer =
  document.getElementById(
    "providerSubscriptionStatusContainer"
  );

const providerSubscriptionPlansContainer =
  document.getElementById(
    "providerSubscriptionPlansContainer"
  );

  const providerSubscriptionPhone =
  document.getElementById(
    "providerSubscriptionPhone"
  );

  const providerSubscriptionPaymentModal =
  document.getElementById(
    "providerSubscriptionPaymentModal"
  );

const providerSubscriptionPaymentClose =
  document.getElementById(
    "providerSubscriptionPaymentClose"
  );

const providerSubscriptionPaymentCancel =
  document.getElementById(
    "providerSubscriptionPaymentCancel"
  );

const providerSubscriptionPaymentConfirm =
  document.getElementById(
    "providerSubscriptionPaymentConfirm"
  );

  function closeProviderSubscriptionPaymentModal() {
  providerSubscriptionPaymentModal
    ?.classList.remove(
      "is-visible"
    );

  providerSubscriptionPaymentModal
    ?.setAttribute(
      "aria-hidden",
      "true"
    );

  selectedSubscriptionPlanId =
    null;

  selectedSubscriptionButton =
    null;

  setMessage(
  providerSubscriptionMessage,
  "Subscription payment was cancelled."
);
}


providerSubscriptionPaymentClose
  ?.addEventListener(
    "click",
    closeProviderSubscriptionPaymentModal
  );


providerSubscriptionPaymentCancel
  ?.addEventListener(
    "click",
    closeProviderSubscriptionPaymentModal
  );

providerSubscriptionPaymentConfirm
  ?.addEventListener(
    "click",
    async () => {
      if (
        !selectedSubscriptionPlanId ||
        !selectedSubscriptionButton
      ) {
        setMessage(
  providerSubscriptionMessage,
          "Please select a subscription plan again."
        );

        closeProviderSubscriptionPaymentModal();

        return;
      }

      const phoneNumber =
        providerSubscriptionPhone?.value
          .trim();

      if (!phoneNumber) {
        setMessage(
  providerSubscriptionMessage,
          "Please enter the M-Pesa number you would like to use for this payment."
        );

        providerSubscriptionPhone
          ?.focus();

        return;
      }

      const button =
        selectedSubscriptionButton;

      const planId =
        selectedSubscriptionPlanId;

      const originalText =
        button.textContent;

      providerSubscriptionPaymentConfirm.disabled =
        true;

      providerSubscriptionPaymentConfirm.textContent =
        "Processing...";

      try {
        const response =
          await fetch(
            `${API_BASE_URL}/subscriptions/initialize`,
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

              body: JSON.stringify({
                planId,
                phoneNumber,
              }),
            }
          );

        const data =
          await response.json();

        if (
          response.status === 401
        ) {
          clearSessionAndRedirect();
          return;
        }

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
            "Unable to initialize subscription payment."
          );
        }

        if (
          data.paymentMethod !==
          "PAYHERO_STK"
        ) {
          throw new Error(
            "Unable to start the M-Pesa payment."
          );
        }

        providerSubscriptionPaymentModal
          ?.classList.remove(
            "is-visible"
          );

        providerSubscriptionPaymentModal
          ?.setAttribute(
            "aria-hidden",
            "true"
          );

        setMessage(
  providerSubscriptionMessage,
          "M-Pesa payment prompt has been sent to your phone. Please complete the payment.",
          "success"
        );

        button.disabled = true;

        button.textContent =
          "Waiting for payment...";

        const paymentReference =
          data.reference;

        let attempts = 0;

        const maxAttempts = 60;

        let checkingPayment = false;

        const paymentStatusInterval =
          setInterval(
            async () => {
              if (
                checkingPayment
              ) {
                return;
              }

              checkingPayment = true;

              attempts += 1;

              try {
                const verifyResponse =
                  await fetch(
                    `${API_BASE_URL}/subscriptions/verify/${encodeURIComponent(
                      paymentReference
                    )}`,
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

                const verifyData =
                  await verifyResponse.json();

                if (
                  verifyData.paymentStatus ===
                  "SUCCESS"
                ) {
                  clearInterval(
                    paymentStatusInterval
                  );

                  setMessage(
  providerSubscriptionMessage,
                    "Payment completed successfully. Your subscription is now active.",
                    "success"
                  );

                  button.textContent =
                    "Subscribed";

                  await loadCurrentSubscription();

                  await loadSubscriptionPlans();

                  selectedSubscriptionPlanId =
                    null;

                  selectedSubscriptionButton =
                    null;

                  return;
                }

                if (
  [
    "FAILED",
    "CANCELLED",
    "CANCELED",
  ].includes(
    verifyData.paymentStatus
  )
) {
  clearInterval(
    paymentStatusInterval
  );

  const paymentMessage =
    verifyData.message ||
    verifyData.failureReason ||
    "The M-Pesa payment was not completed."

  button.disabled =
    false;

  button.textContent =
    originalText;

  selectedSubscriptionPlanId =
    null;

  selectedSubscriptionButton =
    null;

 setMessage(
  providerSubscriptionMessage,
  paymentMessage,
  "error"
);

providerSubscriptionMessage
  ?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });

  return;
}

                if (
                  attempts >=
                  maxAttempts
                ) {
                  clearInterval(
                    paymentStatusInterval
                  );

                  button.disabled =
                    false;

                  button.textContent =
                    originalText;

                  setMessage(
  providerSubscriptionMessage,
                    "Payment confirmation is taking longer than expected. Please check your M-Pesa and try again if payment was not completed."
                  );

                  selectedSubscriptionPlanId =
                    null;

                  selectedSubscriptionButton =
                    null;

                  return;
                }

              } catch (error) {
                console.error(
                  "Verify provider subscription payment error:",
                  error
                );

                clearInterval(
                  paymentStatusInterval
                );

                button.disabled =
                  false;

                button.textContent =
                  originalText;

                setMessage(
  providerSubscriptionMessage,
                  error.message ||
                    "Unable to verify subscription payment."
                );

                selectedSubscriptionPlanId =
                  null;

                selectedSubscriptionButton =
                  null;

              } finally {
                checkingPayment = false;
              }
            },
            3000
          );

      } catch (error) {
        console.error(
          "Initialize provider subscription error:",
          error
        );

        setMessage(
  providerSubscriptionMessage,
          error.message ||
            "Unable to start subscription payment."
        );

        button.disabled =
          false;

        button.textContent =
          originalText;

      } finally {
        providerSubscriptionPaymentConfirm.disabled =
          false;

        providerSubscriptionPaymentConfirm.textContent =
          "Continue";
      }
    }
  );

  let selectedSubscriptionPlanId =
  null;

let selectedSubscriptionButton =
  null;

  const providerPaymentDisputesContainer =
  document.getElementById(
    "providerPaymentDisputesContainer"
  );
providerSubscriptionPlansContainer?.addEventListener(
  "click",
  async (event) => {
    const button = event.target.closest(
      ".provider-subscription-action-button"
    );

    if (!button) {
      return;
    }

    const planId =
      button.dataset.planId;

    if (!planId) {
      setMessage(
        providerDashboardMessage,
        "Unable to identify the selected subscription plan."
      );

      return;
    }

    selectedSubscriptionPlanId =
      planId;

    selectedSubscriptionButton =
      button;

    providerSubscriptionPaymentModal
      ?.classList.add(
        "is-visible"
      );

    providerSubscriptionPaymentModal
      ?.setAttribute(
        "aria-hidden",
        "false"
      );

    providerSubscriptionPhone
      ?.focus();
  }
);

  if (providerProfilePhoto) {
  providerProfilePhoto.addEventListener(
    "change",
    function () {

      const file =
        providerProfilePhoto.files?.[0];

      if (!file) {

        providerProfilePhotoPreview.hidden =
          true;

        providerProfilePhotoPreviewImage.src =
          "";

        return;
      }

      const previewUrl =
        URL.createObjectURL(file);

      providerProfilePhotoPreviewImage.src =
        previewUrl;

      providerProfilePhotoPreview.hidden =
        false;
    }
  );
}



  /*
|--------------------------------------------------------------------------
| Professional verification elements
|--------------------------------------------------------------------------
*/

const professionalVerificationForm =
  document.getElementById(
    "professionalVerificationForm"
  );

const professionalVerificationStatus =
  document.getElementById(
    "professionalVerificationStatus"
  );

const qualificationTitle =
  document.getElementById(
    "qualificationTitle"
  );

const institutionName =
  document.getElementById(
    "institutionName"
  );

const qualificationYear =
  document.getElementById(
    "qualificationYear"
  );

const professionalExperience =
  document.getElementById(
    "professionalExperience"
  );

  const providerNotes =
  document.getElementById(
    "providerNotes"
  );

  const verificationReviewFeedback =
  document.getElementById(
    "verificationReviewFeedback"
  );

const verificationReviewFeedbackStatus =
  document.getElementById(
    "verificationReviewFeedbackStatus"
  );

const verificationReviewFeedbackText =
  document.getElementById(
    "verificationReviewFeedbackText"
  );

const verificationDocumentType =
  document.getElementById(
    "verificationDocumentType"
  );

const verificationDocument =
  document.getElementById(
    "verificationDocument"
  );

const verificationDocumentsList =
  document.getElementById(
    "verificationDocumentsList"
  );

const professionalVerificationMessage =
  document.getElementById(
    "professionalVerificationMessage"
  );

const submitVerificationButton =
  document.getElementById(
    "submitVerificationButton"
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

  const providerInputModal =
  document.getElementById(
    "providerInputModal"
  );

const providerInputModalTitle =
  document.getElementById(
    "providerInputModalTitle"
  );

const providerInputModalMessage =
  document.getElementById(
    "providerInputModalMessage"
  );

const providerInputModalTextarea =
  document.getElementById(
    "providerInputModalTextarea"
  );

const providerInputModalError =
  document.getElementById(
    "providerInputModalError"
  );

const providerInputModalSubmit =
  document.getElementById(
    "providerInputModalSubmit"
  );

let providerBookings = [];

let providerServices = [];
let providerCategories = [];
let providerProfileExists = false;

let currentSubscription = null;
let subscriptionPlans = [];

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
    loadProfessionalVerification(),
    loadCurrentSubscription(),
    loadSubscriptionPlans(),
  ]);

  await handleProviderSubscriptionPaymentReturn();

  await loadProviderServices();
await loadProviderPaymentDisputes();
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

  element.classList.remove(
    "success",
    "error"
  );

  if (type) {
    element.classList.add(type);
  }
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
    PER_PERSON: "Per person",
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

function showProviderInputModal({
  title,
  message,
  placeholder,
  submitText,
}) {
  return new Promise(
    (resolve) => {
      if (
        !providerInputModal ||
        !providerInputModalTitle ||
        !providerInputModalMessage ||
        !providerInputModalTextarea ||
        !providerInputModalError ||
        !providerInputModalSubmit
      ) {
        resolve(null);
        return;
      }

      providerInputModalTitle.textContent =
        title;

      providerInputModalMessage.textContent =
        message;

      providerInputModalTextarea.placeholder =
        placeholder;

      providerInputModalTextarea.value =
        "";

      providerInputModalError.textContent =
        "";

      providerInputModalError.hidden =
        true;

      providerInputModalSubmit.textContent =
        submitText;

      providerInputModal.hidden =
        false;

      document.body.classList.add(
        "modal-open"
      );

      window.setTimeout(
        () => {
          providerInputModalTextarea.focus();
        },
        50
      );

      const closeModal =
        (value = null) => {
          providerInputModal.hidden =
            true;

          document.body.classList.remove(
            "modal-open"
          );

          providerInputModalSubmit.onclick =
            null;

          providerInputModal
            .querySelectorAll(
              "[data-provider-input-close]"
            )
            .forEach(
              (element) => {
                element.onclick = null;
              }
            );

          resolve(value);
        };

      providerInputModal
        .querySelectorAll(
          "[data-provider-input-close]"
        )
        .forEach(
          (element) => {
            element.onclick =
              () => {
                closeModal();
              };
          }
        );

      providerInputModalSubmit.onclick =
        () => {
          const value =
            providerInputModalTextarea.value.trim();

          if (!value) {
            providerInputModalError.textContent =
              "Please enter the required information.";

            providerInputModalError.hidden =
              false;

            providerInputModalTextarea.focus();

            return;
          }

          closeModal(
            value
          );
        };
    }
  );
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
  providerProfilePhotoPreviewImage &&
  providerProfilePhotoPreview
) {

  if (provider.profilePhoto) {

    providerProfilePhotoPreviewImage.src =
      provider.profilePhoto;

    providerProfilePhotoPreview.hidden =
      false;

  } else {

    providerProfilePhotoPreviewImage.src =
      "";

    providerProfilePhotoPreview.hidden =
      true;

  }

}
}

providerProfileForm?.addEventListener(
  "submit",
  saveProviderProfile
);

async function uploadProviderProfilePhoto() {

  const file =
    providerProfilePhoto?.files?.[0];

  if (!file) {
    return (
      providerProfilePhotoUrl?.value || ""
    );
  }

  const formData =
    new FormData();

  formData.append(
    "profilePhoto",
    file
  );

  const response =
    await fetch(
      `${API_BASE_URL}/providers/me/profile-photo`,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${token}`,
        },

        body: formData,
      }
    );

  if (
    handleUnauthorized(response)
  ) {
    throw new Error(
      "Your session has expired."
    );
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
      "Unable to upload profile photo."
    );
  }

  if (!data.profilePhoto) {
    throw new Error(
      "Profile photo upload did not return an image URL."
    );
  }

  providerProfilePhotoUrl.value =
    data.profilePhoto;

  return data.profilePhoto;
}

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
  providerProfilePhotoPreviewImage?.src ||
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

    /*
    |--------------------------------------------------
    | Upload Profile Photo To Cloudinary
    |--------------------------------------------------
    */
const uploadedProfilePhoto =
  await uploadProviderProfilePhoto();

if (uploadedProfilePhoto) {
  payload.profilePhoto =
    uploadedProfilePhoto;
}

    /*
    |--------------------------------------------------
    | Save Provider Profile
    |--------------------------------------------------
    */

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

async function openCreateServiceForm() {
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

  if (
  !currentSubscription ||
  String(
    currentSubscription.status || ""
  ).toUpperCase() !== "ACTIVE"
) {
  showMessage(
    "An active subscription is required before adding services.",
    "error"
  );

  providerDashboardMessage?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });

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
  } catch (error) {
    console.error(
      "Start service error:",
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
  "AWAITING_CUSTOMER_CONFIRMATION";
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

providerPaymentDisputesContainer?.addEventListener(
  "click",
  async (event) => {
    const button =
      event.target.closest(
        ".respond-payment-dispute-button"
      );

    if (!button) {
      return;
    }

    const disputeId =
      button.dataset.disputeId;

    if (!disputeId) {
      return;
    }

  const responseMessage =
  await showProviderInputModal({
    title:
      "Respond to Payment Dispute",

    message:
      "Provide your response for the customer dispute. The administrator will review it during resolution.",

    placeholder:
      "Explain your response to this dispute...",

    submitText:
      "Submit Response",
  });

if (
  responseMessage === null
) {
  return;
}

   

    const originalText =
      button.textContent;

    button.disabled =
      true;

    button.textContent =
      "Submitting...";

    try {
      const response =
        await fetch(
          `${API_BASE_URL}/provider-payments/disputes/${encodeURIComponent(
            disputeId
          )}/respond`,
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
                response:
                  responseMessage,
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
          "Unable to submit dispute response."
        );
      }

   setMessage(
  providerSubscriptionMessage,
  data.message ||
    "Dispute response submitted successfully.",
  "success"
);

      await loadProviderPaymentDisputes();

    } catch (error) {
      console.error(
        "Respond to payment dispute error:",
        error
      );

   setMessage(
  providerSubscriptionMessage,
  error.message ||
    "Unable to submit dispute response.",
  "error"
);

      button.disabled =
        false;

      button.textContent =
        originalText;
    }
  }
);

providerPaymentDisputesContainer?.addEventListener(
  "click",
  async (event) => {
    const button =
      event.target.closest(
        ".submit-dispute-evidence-button"
      );

    if (!button) {
      return;
    }

    const disputeId =
      button.dataset.disputeId;

    if (!disputeId) {
      return;
    }

    const evidence =
  await showProviderInputModal({
    title:
      "Submit Dispute Evidence",

    message:
      "Provide supporting information or evidence for this payment dispute. The administrator will review it during resolution.",

    placeholder:
      "Enter your supporting evidence or explanation...",

    submitText:
      "Submit Evidence",
  });

if (
  evidence === null
) {
  return;
}
  
    const originalText =
      button.textContent;

    button.disabled =
      true;

    button.textContent =
      "Submitting...";

    try {
      const response =
        await fetch(
          `${API_BASE_URL}/provider-payments/disputes/${encodeURIComponent(
            disputeId
          )}/evidence`,
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
                evidence,
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
          "Unable to submit dispute evidence."
        );
      }

  setMessage(
  providerSubscriptionMessage,
  data.message ||
    "Dispute evidence submitted successfully.",
  "success"
);
      await loadProviderPaymentDisputes();

    } catch (error) {
      console.error(
        "Submit dispute evidence error:",
        error
      );

    setMessage(
  providerSubscriptionMessage,
  error.message ||
    "Unable to submit dispute evidence.",
  "error"
);

      button.disabled =
        false;

      button.textContent =
        originalText;
    }
  }
);

/*
|--------------------------------------------------------------------------
| Professional Verification
|--------------------------------------------------------------------------
*/

async function loadProfessionalVerification() {

  if (
    !professionalVerificationForm
  ) {
    return;
  }

  try {

    const response =
      await fetch(
        `${API_BASE_URL}/providers/me/verification`,
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
      handleUnauthorized(response)
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
        "Unable to load verification details."
      );
    }

    populateProfessionalVerification(
      data
    );

  } catch (error) {

    console.error(
      "Load professional verification error:",
      error
    );

    setMessage(
      professionalVerificationMessage,
      error.message ||
        "Unable to load verification details.",
      "error"
    );
  }
}


function populateProfessionalVerification(
  data
) {

  const verification =
    data.verification || {};

  const qualificationParts =
    (
      verification.qualification_summary ||
      ""
    ).split(" | ");

  const qualificationTitleValue =
    qualificationParts[0] || "";

  const institutionPart =
    qualificationParts.find(
      (part) =>
        part.startsWith(
          "Institution: "
        )
    );

  const yearPart =
    qualificationParts.find(
      (part) =>
        part.startsWith(
          "Year completed: "
        )
    );

  if (qualificationTitle) {
    qualificationTitle.value =
      qualificationTitleValue;
  }

  if (institutionName) {
    institutionName.value =
      institutionPart
        ? institutionPart.replace(
            "Institution: ",
            ""
          )
        : "";
  }

  if (qualificationYear) {
    qualificationYear.value =
      yearPart
        ? yearPart.replace(
            "Year completed: ",
            ""
          )
        : "";
  }

  if (professionalExperience) {
    professionalExperience.value =
      verification.portfolio_description ||
      "";
  }

  if (providerNotes) {
    providerNotes.value =
      verification.provider_notes ||
      "";
  }

  const status =
    String(
      verification.status ||
      data.providerVerificationStatus ||
      "PENDING"
    ).toUpperCase();

  if (
    professionalVerificationStatus
  ) {

    professionalVerificationStatus.textContent =
      status;

    professionalVerificationStatus.className =
      `verification-status-badge ${status.toLowerCase()}`;
  }

  if (
  verificationReviewFeedback
) {

  const adminNotes =
    verification.admin_notes?.trim();

  const showFeedback =
    status === "REJECTED" &&
    adminNotes;

  verificationReviewFeedback.hidden =
    !showFeedback;

  if (
    showFeedback
  ) {

    if (
      verificationReviewFeedbackStatus
    ) {
      verificationReviewFeedbackStatus.textContent =
        "Action Required";
    }

    if (
      verificationReviewFeedbackText
    ) {
      verificationReviewFeedbackText.textContent =
        adminNotes;
    }
  }
}

  renderVerificationDocuments(
    Array.isArray(data.documents)
      ? data.documents
      : []
  );
}


function renderVerificationDocuments(
  documents
) {

  if (
    !verificationDocumentsList
  ) {
    return;
  }

  if (
    !documents ||
    documents.length === 0
  ) {

    verificationDocumentsList.innerHTML =
      `
        <p class="verification-empty">
          No supporting documents uploaded yet.
        </p>
      `;

    return;
  }

  verificationDocumentsList.innerHTML =
    documents
      .map(
        (document) => {

          const documentName =
            document.document_name ||
            document.documentName ||
            "Verification document";

          const documentUrl =
            document.document_url ||
            document.documentUrl ||
            "";

          return `
            <div
              class="verification-document-item"
            >

              <div>

                <strong>
                  ${escapeHtml(
                    documentName
                  )}
                </strong>

              </div>

              <div
                class="verification-document-actions"
              >

                ${
                  documentUrl
                    ? `
                      <a
                        href="${escapeHtml(
                          documentUrl
                        )}"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View
                      </a>
                    `
                    : ""
                }

                <button
                  type="button"
                  onclick="deleteVerificationDocument('${document.id}')"
                >
                  Remove
                </button>

              </div>

            </div>
          `;
        }
      )
      .join("");
}


async function saveProfessionalVerification(
  event
) {

  event.preventDefault();

  setMessage(
    professionalVerificationMessage
  );

  const qualificationTitleValue =
    qualificationTitle?.value.trim() || "";

  const institutionNameValue =
    institutionName?.value.trim() || "";

  const qualificationYearValue =
    qualificationYear?.value
      ? Number(qualificationYear.value)
      : null;

  const professionalExperienceValue =
    professionalExperience?.value.trim() || "";

  const providerNotesValue =
    providerNotes?.value.trim() || "";

  const missingFields = [];

  if (!qualificationTitleValue) {
    missingFields.push(
      "Professional Qualification"
    );
  }

  if (!institutionNameValue) {
    missingFields.push(
      "Institution Name"
    );
  }

  if (!qualificationYearValue) {
    missingFields.push(
      "Year Completed"
    );
  }

  if (!professionalExperienceValue) {
    missingFields.push(
      "Professional Experience"
    );
  }

  if (!providerNotesValue) {
    missingFields.push(
      "Provider Notes"
    );
  }

  if (missingFields.length > 0) {

    setMessage(
      professionalVerificationMessage,
      `Please complete: ${missingFields.join(", ")}.`,
      "error"
    );

    return;
  }

  const payload = {
    qualificationTitle:
      qualificationTitleValue,

    institutionName:
      institutionNameValue,

    qualificationYear:
      qualificationYearValue,

    professionalExperience:
      professionalExperienceValue,

    providerNotes:
      providerNotesValue,
  };

  try {

    const response =
      await fetch(
        `${API_BASE_URL}/providers/me/verification`,
        {
          method: "PUT",

          headers: {
            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },

          body:
            JSON.stringify(payload),
        }
      );

    if (
      handleUnauthorized(response)
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
        "Unable to save verification details."
      );
    }

    setMessage(
      professionalVerificationMessage,
      data.message ||
        "Verification details saved.",
      "success"
    );

    await Promise.all([
      loadProfessionalVerification(),
      loadProviderProfile(),
    ]);

  } catch (error) {

    console.error(
      "Save verification error:",
      error
    );

    setMessage(
      professionalVerificationMessage,
      error.message ||
        "Unable to save verification details.",
      "error"
    );
  }
}


verificationDocument?.addEventListener(
  "change",
  async () => {

    const file =
      verificationDocument.files?.[0];

    if (!file) {
      return;
    }

    setMessage(
      professionalVerificationMessage
    );

  const documentType =
  verificationDocumentType?.value.trim() ||
  "";

const documentName =
  file.name;

if (!documentType) {

  setMessage(
    professionalVerificationMessage,
    "Please select a document type before uploading.",
    "error"
  );

  verificationDocument.value = "";

  return;
}

const formData =
  new FormData();

formData.append(
  "document",
  file
);

formData.append(
  "documentType",
  documentType
);

formData.append(
  "documentName",
  documentName
);

    try {

      const response =
        await fetch(
          `${API_BASE_URL}/providers/me/verification/documents`,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${token}`,

              Accept:
                "application/json",
            },

            body: formData,
          }
        );

      if (
        handleUnauthorized(response)
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
          "Unable to upload document."
        );
      }

      verificationDocument.value =
        "";

      setMessage(
        professionalVerificationMessage,
        data.message ||
          "Document uploaded successfully.",
        "success"
      );

      await loadProfessionalVerification();

    } catch (error) {

      console.error(
        "Upload verification document error:",
        error
      );

      setMessage(
        professionalVerificationMessage,
        error.message ||
          "Unable to upload document.",
        "error"
      );
    }
  }
);


async function deleteVerificationDocument(
  documentId
) {

  if (
    !window.confirm(
      "Remove this verification document?"
    )
  ) {
    return;
  }

  try {

    const response =
      await fetch(
        `${API_BASE_URL}/providers/me/verification/documents/${encodeURIComponent(
          documentId
        )}`,
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
      handleUnauthorized(response)
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
        "Unable to remove document."
      );
    }

    setMessage(
      professionalVerificationMessage,
      data.message ||
        "Document removed successfully.",
      "success"
    );

    await loadProfessionalVerification();

  } catch (error) {

    console.error(
      "Delete verification document error:",
      error
    );

    setMessage(
      professionalVerificationMessage,
      error.message ||
        "Unable to remove document.",
      "error"
    );
  }
}


async function submitProfessionalVerification() {

  setMessage(
    professionalVerificationMessage
  );

  try {

    const response =
      await fetch(
        `${API_BASE_URL}/providers/me/verification/submit`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,

            Accept:
              "application/json",
          },
        }
      );

    if (
      handleUnauthorized(response)
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
        "Unable to submit verification."
      );
    }

    setMessage(
      professionalVerificationMessage,
      data.message ||
        "Verification submitted successfully and is now awaiting review.",
      "success"
    );

    await loadProfessionalVerification();

  } catch (error) {

    console.error(
      "Submit verification error:",
      error
    );

    setMessage(
      professionalVerificationMessage,
      error.message ||
        "Unable to submit verification.",
      "error"
    );
  }
}

professionalVerificationForm?.addEventListener(
  "submit",
  saveProfessionalVerification
);

submitVerificationButton?.addEventListener(
  "click",
  submitProfessionalVerification
);

function initializeBookingSocket() {
  const joinProviderRoom = async () => {

    await loadProviderProfileForSocket();
  };

  socket.on(
    "connect",
    joinProviderRoom
  );

  socket.on(
    "provider-booking-created",
    async (booking) => {

      await loadProviderBookings();

      setMessage(
        providerBookingsMessage,
        "New booking received.",
        "success"
      );
    }
  );

  socket.on(
    "provider-booking-status-updated",
    async (booking) => {

      await loadProviderBookings();
    }
  );

 socket.on(
  "provider-booking-payment-updated",
  async (payment) => {

    await loadProviderBookings();

    const paymentResult =
      String(
        payment.paymentResult || ""
      ).toUpperCase();

    const message =
      payment.message ||
      (
        paymentResult === "CANCELLED"
  ? "The customer cancelled the M-Pesa payment."
  : paymentResult === "FAILED"
    ? "The customer did not complete the payment."
    : "Booking payment received."
      );

    setMessage(
      providerBookingsMessage,
      message,
      (
  paymentResult === "FAILED" ||
  paymentResult === "CANCELLED"
)
  ? "error"
  : "success"
    );
  }
);
  // IMPORTANT:
  // Socket may already be connected before
  // initializeBookingSocket() is called.
  if (socket.connected) {
    joinProviderRoom();
  }
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
    }
  } catch (error) {
    console.error(
      "Provider socket room error:",
      error
    );
  }
}


function showStartPinModal() {
  return new Promise((resolve) => {
    const existingModal =
      document.getElementById(
        "startPinModal"
      );

    if (existingModal) {
      existingModal.remove();
    }

    const modal =
      document.createElement("div");

    modal.id =
      "startPinModal";

    modal.className =
      "start-pin-modal";

    modal.innerHTML = `
      <div
        class="start-pin-modal__backdrop"
        data-start-pin-cancel
      ></div>

      <div
        class="start-pin-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="startPinModalTitle"
      >
        <div class="start-pin-modal__icon">
          <span>Ã°Å¸â€Â</span>
        </div>

        <div class="start-pin-modal__content">
          <p class="start-pin-modal__eyebrow">
            SECURE START
          </p>

          <h2
            id="startPinModalTitle"
            class="start-pin-modal__title"
          >
            Start service
          </h2>

          <p class="start-pin-modal__text">
            Enter the 6-digit PIN provided by the customer
            to securely start this booking.
          </p>

          <label
            class="start-pin-modal__label"
            for="startPinInput"
          >
            Customer PIN
          </label>

          <input
            id="startPinInput"
            class="start-pin-modal__input"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            placeholder="000000"
          />

          <p
            id="startPinModalError"
            class="start-pin-modal__error"
            hidden
          >
            Enter a valid 6-digit PIN.
          </p>
        </div>

        <div class="start-pin-modal__actions">
          <button
            type="button"
            class="secondary-button"
            data-start-pin-cancel
          >
            Cancel
          </button>

          <button
            type="button"
            class="primary-button"
            id="confirmStartPinButton"
          >
            Start Service
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const input =
      modal.querySelector(
        "#startPinInput"
      );

    const error =
      modal.querySelector(
        "#startPinModalError"
      );

    const confirmButton =
      modal.querySelector(
        "#confirmStartPinButton"
      );

    const close =
      (value) => {
        modal.classList.remove(
          "is-visible"
        );

        setTimeout(() => {
          modal.remove();
          resolve(value);
        }, 160);
      };

    modal
      .querySelectorAll(
        "[data-start-pin-cancel]"
      )
      .forEach((element) => {
        element.addEventListener(
          "click",
          () => close(null)
        );
      });

    input.addEventListener(
      "input",
      () => {
        input.value =
          input.value
            .replace(/\D/g, "")
            .slice(0, 6);

        error.hidden =
          true;

        input.classList.remove(
          "has-error"
        );
      }
    );

    const submit =
      () => {
        const value =
          input.value.trim();

        if (!/^\d{6}$/.test(value)) {
          error.hidden =
            false;

          input.classList.add(
            "has-error"
          );

          input.focus();

          return;
        }

        close(value);
      };

    confirmButton.addEventListener(
      "click",
      submit
    );

    input.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Enter"
        ) {
          event.preventDefault();
          submit();
        }

        if (
          event.key === "Escape"
        ) {
          event.preventDefault();
          close(null);
        }
      }
    );

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        modal.classList.add(
          "is-visible"
        );

        input.focus();
      });
    });
  });
}


async function handleProviderSubscriptionPaymentReturn() {
  const url =
    new URL(window.location.href);

  const reference =
    url.searchParams.get(
      "subscription_reference"
    );

  if (!reference) {
    return;
  }

  try {
    const response =
      await fetch(
        `${API_BASE_URL}/subscriptions/verify/${encodeURIComponent(
          reference
        )}`,
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

   if (response.status === 401) {
  window.location.href = "login.html";
  return;
}

if (response.status === 403) {
  throw new Error(
    data.message ||
    "Your account is not allowed to purchase this subscription yet."
  );
}

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.message ||
        "Unable to verify subscription payment."
      );
    }

    url.searchParams.delete(
      "subscription_reference"
    );

    window.history.replaceState(
      {},
      document.title,
      url.toString()
    );

    setMessage(
     providerSubscriptionMessage,
      "Payment successful. Your subscription is now active.",
      "success"
    );

    await Promise.allSettled([
      loadCurrentSubscription(),
      loadSubscriptionPlans(),
    ]);

  } catch (error) {
    console.error(
      "Verify provider subscription payment error:",
      error
    );

    setMessage(
      providerDashboardMessage,
      error.message ||
        "Unable to verify your payment.",
      "error"
    );
  }
}


async function loadProviderPaymentDisputes() {
  if (
    !providerPaymentDisputesContainer
  ) {
    return;
  }

  providerPaymentDisputesContainer.innerHTML =
    `
      <p>
        Loading payment disputes...
      </p>
    `;

  try {
    const response =
      await fetch(
        `${API_BASE_URL}/provider-payments/disputes`,
        {
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
      response.status === 401
    ) {
      clearSessionAndRedirect();
      return;
    }

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.message ||
        "Unable to load payment disputes."
      );
    }

    const disputes =
      Array.isArray(data.disputes)
        ? data.disputes
        : [];

    if (
      disputes.length === 0
    ) {
      providerPaymentDisputesContainer.innerHTML =
        `
          <div class="empty-state">
            <p>
              No payment disputes at the moment.
            </p>
          </div>
        `;

      return;
    }

    providerPaymentDisputesContainer.innerHTML =
      disputes.map(
        (dispute) => `
          <article
            class="provider-payment-dispute-card"
          >
            <div
              class="provider-payment-dispute-card__header"
            >
              <div>
                <span
                  class="provider-payment-dispute-card__status"
                >
                  ${escapeHtml(
                    dispute.status || "UNKNOWN"
                  )}
                </span>

                <h3>
                  Payment Dispute
                </h3>
              </div>

              <strong>
                ${escapeHtml(
                  dispute.currency || "KES"
                )}
                ${Number(
                  dispute.amount || 0
                ).toLocaleString()}
              </strong>
            </div>

            <div
              class="provider-payment-dispute-card__details"
            >
              <p>
                <strong>Customer:</strong>
                ${escapeHtml(
                  dispute.customer_name ||
                    "Unknown"
                )}
              </p>

              <p>
                <strong>Reason:</strong>
                ${escapeHtml(
                  dispute.dispute_reason ||
                    "Not provided"
                )}
              </p>

              <p>
                <strong>Description:</strong>
                ${escapeHtml(
                  dispute.description ||
                    "Not provided"
                )}
              </p>

              ${
 dispute.status === "OPEN" ||
dispute.status === "UNDER_REVIEW"
    ? `
      <div class="provider-payment-dispute-notice">
        ${
          dispute.resolution_notes &&
          dispute.evidence
            ? "Your response and evidence have been submitted. The dispute is awaiting administrator review."
            : dispute.resolution_notes
              ? "Your response has been submitted. You can still provide supporting evidence."
              : dispute.evidence
                ? "Your evidence has been submitted. You can still provide your response."
                : "This dispute requires your review and response."
        }
      </div>
    `
    : ""
}

              ${
  dispute.resolution_notes
    ? `
      <p>
        <strong>Your Response:</strong>
        ${escapeHtml(
          dispute.resolution_notes
        )}
      </p>
    `
    : ""
}

${
  dispute.evidence
    ? `
      <p>
        <strong>Your Evidence:</strong>
        ${escapeHtml(
          dispute.evidence
        )}
      </p>
    `
    : ""
}

${
  dispute.status === "RESOLVED"
    ? `
      <div class="provider-payment-dispute-resolution">
        <strong>
          Dispute Resolution
        </strong>

        <p>
          ${
            dispute.resolution_notes
              ? escapeHtml(
                  dispute.resolution_notes
                )
              : "This dispute has been resolved."
          }
        </p>
      </div>
    `
    : ""
}
            </div>

                       ${
             dispute.status === "OPEN" ||
              dispute.status === "UNDER_REVIEW"
                ? `
                  <div class="provider-payment-dispute-actions">
                    ${
                      !dispute.resolution_notes
                        ? `
                          <button
                            type="button"
                            class="respond-payment-dispute-button"
                            data-dispute-id="${escapeHtml(
                              dispute.id
                            )}"
                          >
                            Respond to Dispute
                          </button>
                        `
                        : ""
                    }

                    ${
                      !dispute.evidence
                        ? `
                          <button
                            type="button"
                            class="submit-dispute-evidence-button"
                            data-dispute-id="${escapeHtml(
                              dispute.id
                            )}"
                          >
                            Submit Evidence
                          </button>
                        `
                        : ""
                    }
                  </div>
                `
                : ""
            }
          </article>
        `
      ).join("");
  } catch (error) {
    console.error(
      "Load provider payment disputes error:",
      error
    );

    providerPaymentDisputesContainer.innerHTML =
      `
        <div class="empty-state">
          <p>
            ${escapeHtml(
              error.message ||
                "Unable to load payment disputes."
            )}
          </p>
        </div>
      `;
  }
}
