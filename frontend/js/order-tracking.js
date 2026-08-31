"use strict";

const API_BASE_URL =
  "https://coastconnectkenya.onrender.com/api";

const token =
  localStorage.getItem(
    "coastConnectToken"
  );

const socket = io(
  "https://coastconnectkenya.onrender.com",
  {
    auth: {
      token,
    },
  }
);

const trackingLoadingState =
  document.getElementById(
    "trackingLoadingState"
  );

const trackingErrorState =
  document.getElementById(
    "trackingErrorState"
  );

const trackingErrorMessage =
  document.getElementById(
    "trackingErrorMessage"
  );

const trackingContent =
  document.getElementById(
    "trackingContent"
  );

const trackingOrderNumber =
  document.getElementById(
    "trackingOrderNumber"
  );

const trackingStatusBadge =
  document.getElementById(
    "trackingStatusBadge"
  );

const trackingRestaurantName =
  document.getElementById(
    "trackingRestaurantName"
  );

const trackingOrderType =
  document.getElementById(
    "trackingOrderType"
  );

const trackingTotalAmount =
  document.getElementById(
    "trackingTotalAmount"
  );

const trackingItems =
  document.getElementById(
    "trackingItems"
  );

const STATUS_ORDER = [
  "PENDING",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
];

document.addEventListener(
  "DOMContentLoaded",
  loadTrackedOrder
);

const trackingLiveMessage =
  document.getElementById(
    "trackingLiveMessage"
  );

  const trackingEstimatedTime =
  document.getElementById(
    "trackingEstimatedTime"
  );

  const trackingTimeProgressBar =
    document.getElementById(
        "trackingTimeProgressBar"
    );

    const trackingReviewSection =
  document.getElementById(
    "trackingReviewSection"
  );

const trackingReviewForm =
  document.getElementById(
    "trackingReviewForm"
  );

const trackingReviewComment =
  document.getElementById(
    "trackingReviewComment"
  );

const trackingReviewMessage =
  document.getElementById(
    "trackingReviewMessage"
  );

const submitTrackingReviewButton =
  document.getElementById(
    "submitTrackingReviewButton"
  );

  const customerOrderNotification =
  document.getElementById(
    "customerOrderNotification"
  );

const customerOrderNotificationTitle =
  document.getElementById(
    "customerOrderNotificationTitle"
  );

const customerOrderNotificationMessage =
  document.getElementById(
    "customerOrderNotificationMessage"
  );

  function showCustomerOrderNotification(
  status
) {
  if (
    !customerOrderNotification ||
    !customerOrderNotificationTitle ||
    !customerOrderNotificationMessage
  ) {
    return;
  }

  const normalizedStatus =
    String(status || "")
      .trim()
      .toUpperCase();

  customerOrderNotification.className =
    "customer-order-notification";

  if (normalizedStatus === "ACCEPTED") {
    customerOrderNotificationTitle.textContent =
      "Order accepted";

    customerOrderNotificationMessage.textContent =
      "The restaurant has accepted your order.";

    customerOrderNotification.classList.add(
      "success"
    );
  } else if (
    normalizedStatus === "PREPARING"
  ) {
    customerOrderNotificationTitle.textContent =
      "Preparing your order";

    customerOrderNotificationMessage.textContent =
      "The restaurant has started preparing your food.";

    customerOrderNotification.classList.add(
      "warning"
    );
  } else if (
    normalizedStatus === "READY"
  ) {
    customerOrderNotificationTitle.textContent =
      "Your order is ready";

    customerOrderNotificationMessage.textContent =
      "Your order is ready for the next step.";

    customerOrderNotification.classList.add(
      "success"
    );
  } else if (
    normalizedStatus === "COMPLETED"
  ) {
    customerOrderNotificationTitle.textContent =
      "Order completed";

    customerOrderNotificationMessage.textContent =
      "Your restaurant order has been completed successfully.";

    customerOrderNotification.classList.add(
      "success"
    );
  } else if (
    normalizedStatus === "CANCELLED" ||
    normalizedStatus === "REJECTED"
  ) {
    customerOrderNotificationTitle.textContent =
      normalizedStatus === "REJECTED"
        ? "Order rejected"
        : "Order cancelled";

    customerOrderNotificationMessage.textContent =
      "This order is no longer active.";

    customerOrderNotification.classList.add(
      "error"
    );
  } else {
    return;
  }

  customerOrderNotification.hidden =
    false;

    if (customerNotificationTimeout) {
  clearTimeout(
    customerNotificationTimeout
  );
}

customerNotificationTimeout =
  setTimeout(
    () => {
      customerOrderNotification.hidden =
        true;
    },
    6000
  );
}

function getTrackingToken() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  return String(
    params.get("token") || ""
  ).trim();
}

async function loadTrackedOrder() {
  const trackingToken =
    getTrackingToken();

  if (!trackingToken) {
    showTrackingError(
      "The tracking token is missing."
    );

    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/orders/track/${encodeURIComponent(
        trackingToken
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
        "Unable to load this order."
      );
    }

    renderTrackedOrder(
      data.order
    );
  } catch (error) {
    console.error(
      "Load tracked order error:",
      error
    );

    showTrackingError(
      error.message ||
      "Unable to load this order."
    );
  }
}

function renderTrackedOrder(order) {
  currentTrackedOrder = order;

    const orderType =
    String(
      order.orderType || ""
    )
      .trim()
      .toUpperCase();

  const outForDeliveryStep =
    document.querySelector(
      '[data-status-step="OUT_FOR_DELIVERY"]'
    );

  if (outForDeliveryStep) {
    outForDeliveryStep.hidden =
      orderType !== "DELIVERY";
  }
  if (
  order.hasReview &&
  trackingReviewSection
) {
  trackingReviewSection.hidden = true;

  trackingReviewMessage.textContent =
    `You rated this restaurant ${order.review.rating} out of 5.`;

  submitTrackingReviewButton.disabled =
    true;
}
  trackingLoadingState.hidden = true;
  trackingErrorState.hidden = true;
  trackingContent.hidden = false;

  trackingOrderNumber.textContent =
    order.orderNumber || "—";

  trackingRestaurantName.textContent =
    order.restaurantName || "—";

  trackingOrderType.textContent =
    formatOrderType(
      order.orderType
    );

  trackingTotalAmount.textContent =
    formatCurrency(
      order.totalAmount
    );

    trackingEstimatedTime.textContent =
  `${Number(
    order.estimatedPreparationMinutes || 20
  )} minutes`;

  startPreparationCountdown(order);

  if (
  order.trackingToken &&
  joinedTrackingRoom !== order.trackingToken
) {
  joinTrackingRoom(
    order.trackingToken
  );
}

    joinTrackingRoom(
  order.trackingToken
);

  updateTrackingStatus(
    order.status
  );

  renderTrackingItems(
    order.items
  );
}

function updateTrackingStatus(status) {
  const normalizedStatus =
    String(status || "")
      .toUpperCase();

  trackingStatusBadge.textContent =
  normalizedStatus ===
  "OUT_FOR_DELIVERY"
    ? "Out for Delivery"
    : normalizedStatus.replaceAll(
        "_",
        " "
      );

    const statusMessages = {
  PENDING:
    "Your order has been received and is waiting for the restaurant to accept it.",

  ACCEPTED:
    "The restaurant has accepted your order.",

  PREPARING:
    "Your food is now being prepared.",

  READY:
    "Your order is ready.",

  COMPLETED:
    "Your order has been completed. Enjoy your meal!",

  CANCELLED:
    "This order has been cancelled.",

  REJECTED:
    "The restaurant could not accept this order.",

    OUT_FOR_DELIVERY:
  "Your order is on the way to your delivery address.",
};

trackingLiveMessage.textContent =
  statusMessages[normalizedStatus] ||
  "Your order status has been updated.";

  trackingReviewSection.hidden =
  normalizedStatus !== "COMPLETED" ||
  Boolean(
    currentTrackedOrder?.hasReview
  );

  if (
  normalizedStatus === "READY"
) {
  trackingEstimatedTime.textContent =
    "Ready now";
}

if (
  normalizedStatus === "COMPLETED"
) {
  trackingEstimatedTime.textContent =
    "Completed";
}

if (
  normalizedStatus === "CANCELLED" ||
  normalizedStatus === "REJECTED"
) {
  trackingEstimatedTime.textContent =
    "Not available";
}

    const isStoppedOrder =
  normalizedStatus === "CANCELLED" ||
  normalizedStatus === "REJECTED";

document
  .querySelector(".tracking-progress")
  ?.classList.toggle(
    "order-stopped",
    isStoppedOrder
  );

  if (isStoppedOrder) {
  document
    .querySelectorAll(
      "[data-status-step]"
    )
    .forEach((step) => {
      step.classList.remove(
        "active",
        "completed"
      );
    });

  return;
}

  trackingStatusBadge.className =
  `tracking-status-badge status-${normalizedStatus
    .toLowerCase()
    .replaceAll("_", "-")}`;

  const currentIndex =
    STATUS_ORDER.indexOf(
      normalizedStatus
    );

  document
    .querySelectorAll(
      "[data-status-step]"
    )
    .forEach((step) => {
      const stepStatus =
        step.dataset.statusStep;

      const stepIndex =
        STATUS_ORDER.indexOf(
          stepStatus
        );

      step.classList.remove(
        "active",
        "completed"
      );

      if (
  currentIndex >= 0 &&
  (
    stepIndex < currentIndex ||
    (
      normalizedStatus ===
        "COMPLETED" &&
      stepIndex === currentIndex
    )
  )
) {
  step.classList.add(
    "completed"
  );
}

if (
  stepIndex === currentIndex &&
  normalizedStatus !==
    "COMPLETED"
) {
  step.classList.add(
    "active"
  );
}
    });
}

function renderTrackingItems(items) {
  trackingItems.innerHTML = "";

  const orderItems =
    Array.isArray(items)
      ? items
      : [];

  orderItems.forEach((item) => {
    const row =
      document.createElement(
        "div"
      );

    row.className =
      "tracking-item-row";

    const itemName =
      document.createElement(
        "span"
      );

    itemName.textContent =
      `${item.itemName} × ${item.quantity}`;

    const itemTotal =
      document.createElement(
        "strong"
      );

    itemTotal.textContent =
      formatCurrency(
        item.lineTotal
      );

    row.appendChild(
      itemName
    );

    row.appendChild(
      itemTotal
    );

    trackingItems.appendChild(
      row
    );
  });
}

function formatOrderType(value) {
  const labels = {
    DINE_IN: "Dine in",
    PICKUP: "Pickup",
    DELIVERY: "Delivery",
  };

  return (
    labels[
      String(value || "")
        .toUpperCase()
    ] ||
    value ||
    "—"
  );
}

function formatCurrency(amount) {
  return new Intl.NumberFormat(
    "en-KE",
    {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }
  ).format(
    Number(amount || 0)
  );
}

function showTrackingError(message) {
  trackingLoadingState.hidden = true;
  trackingContent.hidden = true;
  trackingErrorState.hidden = false;

  trackingErrorMessage.textContent =
    message;
}

let joinedTrackingRoom = null;
let preparationCountdownInterval = null;
let customerNotificationTimeout = null;
let currentTrackedOrder = null;

function joinTrackingRoom(
  trackingToken
) {
  if (
    !trackingToken ||
    joinedTrackingRoom ===
      trackingToken
  ) {
    return;
  }

  joinedTrackingRoom =
    trackingToken;

  socket.emit(
    "join-order-room",
    trackingToken
  );
}


function startPreparationCountdown(order) {
  if (preparationCountdownInterval) {
    clearInterval(
      preparationCountdownInterval
    );

    preparationCountdownInterval = null;
  }

  const status =
    String(order.status || "")
      .toUpperCase();

 if (status === "READY") {

    trackingEstimatedTime.textContent =
        "Ready now";

    trackingTimeProgressBar.style.width =
        "100%";

    return;
}

if (status === "COMPLETED") {

    trackingEstimatedTime.textContent =
        "Completed";

    trackingTimeProgressBar.style.width =
        "100%";

    return;
}

if (
    status === "CANCELLED" ||
    status === "REJECTED"
) {

    trackingEstimatedTime.textContent =
        "Not available";

    trackingTimeProgressBar.style.width =
        "0%";

    return;
}

  const estimatedMinutes =
    Number(
      order.estimatedPreparationMinutes || 20
    );

  if (!order.acceptedAt) {
    trackingEstimatedTime.textContent =
      `${estimatedMinutes} minutes`;

    return;
  }

  function updateCountdown() {
    const acceptedTime =
      new Date(order.acceptedAt);

    const readyTime =
      acceptedTime.getTime() +
      estimatedMinutes * 60 * 1000;

    const remainingMilliseconds =
      readyTime - Date.now();

    const remainingMinutes =
      Math.max(
        0,
        Math.ceil(
          remainingMilliseconds /
          60000
        )
      );

      const elapsedMilliseconds =
  Math.max(
    0,
    Date.now() -
      acceptedTime.getTime()
  );

const totalMilliseconds =
  estimatedMinutes *
  60 *
  1000;

const progressPercentage =
  Math.min(
    100,
    Math.max(
      0,
      (
        elapsedMilliseconds /
        totalMilliseconds
      ) * 100
    )
  );

trackingTimeProgressBar.style.width =
  `${progressPercentage}%`;

    trackingEstimatedTime.textContent =
      remainingMinutes > 0
        ? `${remainingMinutes} minutes remaining`
        : "Expected any moment";
  }

  updateCountdown();

  preparationCountdownInterval =
    setInterval(
      updateCountdown,
      30000
    );
}
socket.on(
  "customer-order-updated",
  (order) => {

    currentTrackedOrder = {
      ...currentTrackedOrder,
      ...order,
    };

    renderTrackedOrder(
      currentTrackedOrder
    );

    showCustomerOrderNotification(
      order.status
    );
  }
);

window.addEventListener(
  "pageshow",
  (event) => {
    if (
      event.persisted &&
      !socket.connected
    ) {
      socket.connect();
    }
  }
);

socket.on(
  "connect",
  () => {
    if (joinedTrackingRoom) {
      socket.emit(
        "join-order-room",
        joinedTrackingRoom
      );
    }
  }
);

trackingReviewForm?.addEventListener(
  "submit",
  handleTrackingReviewSubmit
);

async function handleTrackingReviewSubmit(
  event
) {
  event.preventDefault();

  const ratingInput =
    trackingReviewForm.querySelector(
      'input[name="rating"]:checked'
    );

  if (!ratingInput) {
    trackingReviewMessage.textContent =
      "Please select a rating.";

    return;
  }

  submitTrackingReviewButton.disabled =
    true;

  trackingReviewMessage.textContent =
    "Submitting your review...";

  try {

    const response =
      await fetch(
        `${API_BASE_URL}/orders/track/${encodeURIComponent(
          currentTrackedOrder.trackingToken
        )}/review`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },

          body: JSON.stringify({
            rating: Number(
              ratingInput.value
            ),

            comment:
              trackingReviewComment.value.trim(),
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

    trackingReviewMessage.textContent =
      "★★★★★ Thank you for your review!";

    trackingReviewForm.reset();
    currentTrackedOrder = {
  ...currentTrackedOrder,
  hasReview: true,
  review: data.review,
};

  submitTrackingReviewButton.disabled =
  true;

trackingReviewSection.hidden =
  true;

  } catch (error) {

    console.error(error);

    trackingReviewMessage.textContent =
      error.message ||
      "Unable to submit your review.";

    submitTrackingReviewButton.disabled =
      false;
  }
}