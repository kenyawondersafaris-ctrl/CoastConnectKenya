"use strict";

const API_BASE_URL =
  "https://coastconnectkenya.onrender.com/api";
  const socket =
  io("https://coastconnectkenya.onrender.com");

const token =
  localStorage.getItem(
    "coastConnectToken"
  );

  const reviewRatings =
  {};

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

const bookingsMessage =
  document.getElementById(
    "bookingsMessage"
  );

const customerBookingsGrid =
  document.getElementById(
    "customerBookingsGrid"
  );

const pendingCount =
  document.getElementById(
    "pendingCount"
  );

const confirmedCount =
  document.getElementById(
    "confirmedCount"
  );

const progressCount =
  document.getElementById(
    "progressCount"
  );

const completedCount =
  document.getElementById(
    "completedCount"
  );

  const mpesaPaymentModal =
  document.getElementById(
    "mpesaPaymentModal"
  );

const closePaymentModal =
  document.getElementById(
    "closePaymentModal"
  );

const cancelPaymentButton =
  document.getElementById(
    "cancelPaymentButton"
  );

const confirmPaymentButton =
  document.getElementById(
    "confirmPaymentButton"
  );

const paymentProviderName =
  document.getElementById(
    "paymentProviderName"
  );

const paymentAmount =
  document.getElementById(
    "paymentAmount"
  );

const paymentPhoneNumber =
  document.getElementById(
    "paymentPhoneNumber"
  );

  const customerBookingNotification =
  document.getElementById(
    "customerBookingNotification"
  );

const customerBookingNotificationTitle =
  document.getElementById(
    "customerBookingNotificationTitle"
  );

const customerBookingNotificationMessage =
  document.getElementById(
    "customerBookingNotificationMessage"
  );


  let customerBookingNotificationTimeout =
  null;

function showCustomerBookingNotification(
  status
) {
  if (
    !customerBookingNotification ||
    !customerBookingNotificationTitle ||
    !customerBookingNotificationMessage
  ) {
    return;
  }

  const normalizedStatus =
    String(status || "")
      .trim()
      .toUpperCase();

  customerBookingNotification.className =
    "customer-booking-notification";

  if (normalizedStatus === "CONFIRMED") {
    customerBookingNotificationTitle.textContent =
      "Booking accepted";

    customerBookingNotificationMessage.textContent =
      "Your provider has accepted your service request.";

    customerBookingNotification.classList.add(
      "success"
    );
  } else if (
    normalizedStatus === "IN_PROGRESS"
  ) {
    customerBookingNotificationTitle.textContent =
      "Service started";

    customerBookingNotificationMessage.textContent =
      "Your provider has started the job.";

    customerBookingNotification.classList.add(
      "warning"
    );
  } else if (
    normalizedStatus === "COMPLETED"
  ) {
    customerBookingNotificationTitle.textContent =
      "Service completed";

    customerBookingNotificationMessage.textContent =
      "Your provider has marked the service as completed.";

    customerBookingNotification.classList.add(
      "success"
    );
  } else if (
    normalizedStatus === "REJECTED" ||
    normalizedStatus === "CANCELLED"
  ) {
    customerBookingNotificationTitle.textContent =
      normalizedStatus === "REJECTED"
        ? "Booking rejected"
        : "Booking cancelled";

    customerBookingNotificationMessage.textContent =
      "This booking is no longer active.";

    customerBookingNotification.classList.add(
      "error"
    );
  } else {
    return;
  }

  customerBookingNotification.hidden =
    false;

  if (
    customerBookingNotificationTimeout
  ) {
    clearTimeout(
      customerBookingNotificationTimeout
    );
  }

  customerBookingNotificationTimeout =
    setTimeout(
      () => {
        customerBookingNotification.hidden =
          true;
      },
      6000
    );
}

let selectedPaymentBooking =
  null;

let customerBookings = [];

document.addEventListener(
  "DOMContentLoaded",
  initializeCustomerBookings
);

async function initializeCustomerBookings() {
  if (!token || !storedUser) {
    sessionStorage.setItem(
      "coastConnectReturnUrl",
      `${window.location.pathname}${window.location.search}`
    );

    window.location.replace(
      "login.html"
    );

    return;
  }

  const roles =
    getUserRoles();

  if (
    !roles.includes("CUSTOMER")
  ) {
    window.location.replace(
      "index.html"
    );

    return;
  }

  await loadCustomerBookings();
  initializeCustomerBookingSocket();
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

function showMessage(
  message = "",
  type = ""
) {
  if (!bookingsMessage) {
    return;
  }

  bookingsMessage.textContent =
    message;

  bookingsMessage.className =
    type
      ? `page-message ${type}`
      : "page-message";
}

function clearSessionAndRedirect() {
  localStorage.removeItem(
    "coastConnectToken"
  );

  localStorage.removeItem(
    "coastConnectUser"
  );

  sessionStorage.setItem(
    "coastConnectReturnUrl",
    `${window.location.pathname}${window.location.search}`
  );

  window.location.replace(
    "login.html"
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

function formatBookingDate(value) {
  if (!value) {
    return "Not specified";
  }

  const datePart =
    String(value).slice(
      0,
      10
    );

  const parts =
    datePart.split("-");

  if (parts.length !== 3) {
    return datePart;
  }

  const [
    year,
    month,
    day,
  ] = parts;

  return `${day}/${month}/${year}`;
}

function formatBookingTime(value) {
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

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function formatStatus(value) {
  return normalizeStatus(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

async function loadCustomerBookings() {
  customerBookingsGrid.innerHTML =
    `
      <p>
        Loading bookings...
      </p>
    `;

  showMessage();

  try {
    const response =
      await fetch(
        `${API_BASE_URL}/bookings/me`,
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
      response.status === 401
    ) {
      clearSessionAndRedirect();

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
        "Unable to load bookings."
      );
    }

    customerBookings =
      Array.isArray(
        data.bookings
      )
        ? data.bookings
        : [];

    updateSummaryCounts();
    renderCustomerBookings();
  } catch (error) {
    console.error(
      "Load customer bookings error:",
      error
    );

    customerBookingsGrid.innerHTML =
      `
        <p>
          Unable to load bookings.
        </p>
      `;

    showMessage(
      error.message ||
        "Unable to load bookings.",
      "error"
    );
  }
}

function updateSummaryCounts() {
  const counts = {
    PENDING: 0,
    CONFIRMED: 0,
    IN_PROGRESS: 0,
    COMPLETED: 0,
  };

  customerBookings.forEach(
    (booking) => {
      const status =
        normalizeStatus(
          booking.booking_status
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

  pendingCount.textContent =
    counts.PENDING;

  confirmedCount.textContent =
    counts.CONFIRMED;

  progressCount.textContent =
    counts.IN_PROGRESS;

  completedCount.textContent =
    counts.COMPLETED;
}

function renderCustomerBookings() {
  if (
    customerBookings.length ===
    0
  ) {
    customerBookingsGrid.innerHTML =
      `
        <div class="bookings-empty-state">
          <h3>
            No bookings yet
          </h3>

          <p>
            Browse available providers and book a service.
          </p>
        </div>
      `;

    return;
  }

  customerBookingsGrid.innerHTML =
    customerBookings
      .map(
        (booking) => {
          const bookingStatus =
            normalizeStatus(
              booking.booking_status
            );

          const paymentStatus =
            normalizeStatus(
              booking.payment_status
            );

          return `
            <article
              class="customer-booking-card"
              data-booking-id="${escapeHtml(
                booking.id
              )}"
            >

              <div class="booking-card-header">

                <div>
                  <span class="booking-category">
                    Service booking
                  </span>

                  <h3>
                    ${escapeHtml(
                      booking.title ||
                      "Booked service"
                    )}
                  </h3>
                </div>

                <span
                  class="booking-status-badge status-${escapeHtml(
                    bookingStatus.toLowerCase()
                  )}"
                >
                  ${escapeHtml(
                    formatStatus(
                      bookingStatus
                    )
                  )}
                </span>

              </div>

              <div class="booking-card-body">

                <div class="booking-detail">
                  <span>
                    Provider
                  </span>

                  <strong>
                    ${escapeHtml(
                      booking.provider_name ||
                      "Provider unavailable"
                    )}
                  </strong>
                </div>

                <div class="booking-detail">
                  <span>
                    Date
                  </span>

                  <strong>
                    ${escapeHtml(
                      formatBookingDate(
                        booking.booking_date
                      )
                    )}
                  </strong>
                </div>

                <div class="booking-detail">
                  <span>
                    Time
                  </span>

                  <strong>
                    ${escapeHtml(
                      formatBookingTime(
                        booking.start_time
                      )
                    )}
                  </strong>
                </div>

                <div class="booking-detail">
                  <span>
                    Booking ID
                  </span>

                  <strong>
                    ${escapeHtml(
                      String(
                        booking.id
                      ).slice(0, 8)
                    )}
                  </strong>
                </div>

                <div class="booking-detail full-width">
                  <span>
                    Service address
                  </span>

                  <p>
                    ${escapeHtml(
                      booking.service_address ||
                      "Not specified"
                    )}
                  </p>
                </div>

                ${
                  booking.instructions
                    ? `
                      <div class="booking-detail full-width">
                        <span>
                          Instructions
                        </span>

                        <p>
                          ${escapeHtml(
                            booking.instructions
                          )}
                        </p>
                      </div>
                    `
                    : ""
                }

              </div>

              <div class="booking-card-footer">

                <div class="booking-price">
                    <span>
                    Estimated price
                    </span>

                    <strong>
                    ${formatMoney(
                        booking.estimated_price
                    )}
                    </strong>
                </div>

                <div class="booking-payment-actions">

                    <span
                    class="payment-status-badge payment-${escapeHtml(
                        paymentStatus.toLowerCase()
                    )}"
                    >
                    ${escapeHtml(
                        formatStatus(
                        paymentStatus
                        )
                    )}
                    </span>

                    ${
                      (
                        bookingStatus === "CONFIRMED" &&
                        paymentStatus === "UNPAID"
                      ) ||
                      (
                        bookingStatus === "COMPLETED" &&
                        paymentStatus === "PARTIALLY_PAID"
                      )
                        ? `
                        
                        <button
                            type="button"
                            class="pay-provider-booking-button"
                            data-booking-id="${escapeHtml(
                            booking.id
                            )}"
                            data-provider-name="${escapeHtml(
                            booking.provider_name || ""
                            )}"
                        >
                            ${
                          paymentStatus === "PARTIALLY_PAID"
                            ? "Pay Remaining 50%"
                            : "Pay 50% Deposit"
                        }
                        </button>
                        `
                        : ""
                    }

                </div>

                </div>
${
  bookingStatus === "COMPLETED"
    ? `
      <div
        class="booking-review-section"
        data-booking-id="${escapeHtml(
          booking.id
        )}"
      >

        <h4>
          Leave a Review
        </h4>

       <div class="review-rating-group">

    <label>
        Rate your experience
    </label>

    <div
        class="star-rating"
        data-booking-id="${escapeHtml(
            booking.id
        )}"
    >

        <span data-rating="1">★</span>
        <span data-rating="2">★</span>
        <span data-rating="3">★</span>
        <span data-rating="4">★</span>
        <span data-rating="5">★</span>

    </div>

</div>

        <textarea
          class="review-comment-input"
          data-booking-id="${escapeHtml(
            booking.id
          )}"
          rows="4"
          maxlength="2000"
          placeholder="Share your experience with this provider..."
        ></textarea>

        <button
          type="button"
          class="submit-review-button"
          data-booking-id="${escapeHtml(
            booking.id
          )}"
        >
          Submit Review
        </button>

        <div
          class="review-message"
          data-review-message="${escapeHtml(
            booking.id
          )}"
        ></div>

      </div>
    `
    : ""
}

</article>
`;
        }
      )
      .join("");
}

customerBookingsGrid.addEventListener(
  "click",
  (event) => {
    const button =
      event.target.closest(
        ".pay-provider-booking-button"
      );

    if (!button) {
      return;
    }

    const bookingId =
      button.dataset.bookingId;

    selectedPaymentBooking =
      customerBookings.find(
        (booking) =>
          booking.id === bookingId
      );

    if (!selectedPaymentBooking) {
      showMessage(
        "Booking information could not be found.",
        "error"
      );

      return;
    }

    paymentProviderName.textContent =
      selectedPaymentBooking.provider_name ||
      "Service provider";

    const paymentStageAmount =
  Number(
    selectedPaymentBooking.estimated_price ||
    0
  ) * 0.5;

paymentAmount.textContent =
  formatMoney(
    paymentStageAmount
  );
    paymentPhoneNumber.value =
      storedUser?.phone || "";

      const selectedPaymentStatus =
  normalizeStatus(
    selectedPaymentBooking.payment_status
  );

confirmPaymentButton.textContent =
  selectedPaymentStatus ===
    "PARTIALLY_PAID"
    ? "Pay Remaining 50%"
    : "Pay 50% Deposit";

    mpesaPaymentModal.hidden =
      false;

    paymentPhoneNumber.focus();
  }
);

function closeMpesaPaymentModal() {
  mpesaPaymentModal.hidden =
    true;

  selectedPaymentBooking =
    null;

  paymentPhoneNumber.value =
    "";

  confirmPaymentButton.disabled =
    false;

  confirmPaymentButton.textContent =
    "Pay Now";
}

closePaymentModal?.addEventListener(
  "click",
  closeMpesaPaymentModal
);

cancelPaymentButton?.addEventListener(
  "click",
  closeMpesaPaymentModal
);

confirmPaymentButton?.addEventListener(
  "click",
  async () => {
    if (!selectedPaymentBooking) {
      showMessage(
        "No booking selected for payment.",
        "error"
      );

      return;
    }

    const phoneNumber =
      String(
        paymentPhoneNumber.value ||
        ""
      ).trim();

    if (!phoneNumber) {
      showMessage(
        "Enter your M-Pesa phone number.",
        "error"
      );

      paymentPhoneNumber.focus();

      return;
    }

    confirmPaymentButton.disabled =
      true;

    confirmPaymentButton.textContent =
      "Sending STK...";

    try {
      const response =
        await fetch(
          `${API_BASE_URL}/provider-payments/payment-attempt`,
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
                bookingId:
                  selectedPaymentBooking.id,

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
          "Unable to start payment."
        );
      }

      showMessage(
        data.message ||
        "M-Pesa prompt sent. Check your phone.",
        "success"
      );

      closeMpesaPaymentModal();

      await loadCustomerBookings();
    } catch (error) {
      console.error(
        "Provider payment error:",
        error
      );

      showMessage(
        error.message ||
        "Unable to start payment.",
        "error"
      );

      confirmPaymentButton.disabled =
        false;

      confirmPaymentButton.textContent =
        "Pay Now";
    }
  }
);

function initializeCustomerBookingSocket() {

  function joinCustomerRoom() {
    const customerId =
      String(
        storedUser?.id || ""
      ).trim();

    if (!customerId) {
      console.warn(
        "Cannot join customer room: customer ID missing."
      );

      return;
    }

    socket.emit(
      "join-customer-room",
      customerId
    );

    console.log(
      "Joined customer room:",
      `customer:${customerId}`
    );
  }

  socket.on(
    "connect",
    () => {
      console.log(
        "Customer socket connected:",
        socket.id
      );

      joinCustomerRoom();
    }
  );

  /*
    The socket may already be connected
    before this function runs.
  */
  if (socket.connected) {
    joinCustomerRoom();
  }

  socket.on(
    "customer-booking-status-updated",
    async (booking) => {

      console.log(
        "Booking updated:",
        booking
      );

      await loadCustomerBookings();

      showMessage(
        `Booking is now ${booking.bookingStatus}.`,
        "success"
      );

      showCustomerBookingNotification(
        booking.bookingStatus
      );
    }
  );
}
customerBookingsGrid?.addEventListener(
  "click",
  async (event) => {
    const button =
      event.target.closest(
        ".submit-review-button"
      );

    if (!button) {
      return;
    }

    const bookingId =
      button.dataset.bookingId;

    const ratingSelect =
      document.querySelector(
        `.review-rating-select[data-booking-id="${bookingId}"]`
      );

    const commentInput =
      document.querySelector(
        `.review-comment-input[data-booking-id="${bookingId}"]`
      );

    const messageElement =
      document.querySelector(
        `[data-review-message="${bookingId}"]`
      );

    const rating =
  reviewRatings[
    bookingId
  ];

    const comment =
      commentInput?.value.trim() ||
      "";

    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      if (messageElement) {
        messageElement.textContent =
          "Please select a rating.";

        messageElement.className =
          "review-message error";
      }

      return;
    }

    button.disabled =
      true;

    button.textContent =
      "Submitting...";

    try {
      const response =
        await fetch(
          `${API_BASE_URL}/bookings/${encodeURIComponent(
            bookingId
          )}/review`,
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
                rating,
                comment:
                  comment || null,
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
          "Unable to submit review."
        );
      }

      if (messageElement) {
        messageElement.textContent =
          "Review submitted successfully.";

        messageElement.className =
          "review-message success";
      }

      button.disabled =
        true;

      button.textContent =
        "Reviewed";
    } catch (error) {
      console.error(
        "Submit review error:",
        error
      );

      if (messageElement) {
        messageElement.textContent =
          error.message ||
          "Unable to submit review.";

        messageElement.className =
          "review-message error";
      }

      button.disabled =
        false;

      button.textContent =
        "Submit Review";
    }
  }
);

customerBookingsGrid.addEventListener(
  "click",
  (event) => {

    const star =
      event.target.closest(
        ".star-rating span"
      );

    if (!star) {
      return;
    }

    const container =
      star.parentElement;

    const bookingId =
      container.dataset.bookingId;

    const rating =
      Number(
        star.dataset.rating
      );

    reviewRatings[
      bookingId
    ] = rating;

    container
      .querySelectorAll("span")
      .forEach(
        (item) => {

          item.classList.toggle(
            "active",
            Number(
              item.dataset.rating
            ) <= rating
          );

        }
      );

  }
);