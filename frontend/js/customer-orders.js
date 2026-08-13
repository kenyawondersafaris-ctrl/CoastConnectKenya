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


const ordersMessage =
  document.getElementById(
    "ordersMessage"
  );


const customerOrdersGrid =
  document.getElementById(
    "customerOrdersGrid"
  );


const activeOrdersCount =
  document.getElementById(
    "activeOrdersCount"
  );


const preparingOrdersCount =
  document.getElementById(
    "preparingOrdersCount"
  );


const completedOrdersCount =
  document.getElementById(
    "completedOrdersCount"
  );


const cancelledOrdersCount =
  document.getElementById(
    "cancelledOrdersCount"
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


let customerOrders = [];

let notificationTimeout = null;


/*
|--------------------------------------------------------------------------
| Init
|--------------------------------------------------------------------------
*/

document.addEventListener(
  "DOMContentLoaded",
  initializeCustomerOrders
);


async function initializeCustomerOrders() {

  if (!token) {

    window.location.href =
      "login.html";

    return;
  }

  await loadCustomerOrders();
}


/*
|--------------------------------------------------------------------------
| Load orders
|--------------------------------------------------------------------------
*/

async function loadCustomerOrders() {

  setOrdersLoading();

  try {

    const response =
      await fetch(
        `${API_BASE_URL}/orders/customer`,
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

      localStorage.removeItem(
        "coastConnectToken"
      );

      localStorage.removeItem(
        "coastConnectUser"
      );

      window.location.href =
        "login.html";

      return;
    }


    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.message ||
        "Unable to load your orders."
      );
    }


    customerOrders =
      Array.isArray(data.orders)
        ? data.orders
        : [];


    renderOrderSummary();

    renderCustomerOrders();

    clearOrdersMessage();

  } catch (error) {

    console.error(
      "Load customer orders error:",
      error
    );


    showOrdersError(
      error.message ||
      "Unable to load your orders."
    );
  }
}


/*
|--------------------------------------------------------------------------
| Loading
|--------------------------------------------------------------------------
*/

function setOrdersLoading() {

  customerOrdersGrid.innerHTML =
    `
      <div class="orders-loading">
        Loading your orders...
      </div>
    `;
}


/*
|--------------------------------------------------------------------------
| Summary
|--------------------------------------------------------------------------
*/

function renderOrderSummary() {

  let active = 0;

  let preparing = 0;

  let completed = 0;

  let cancelled = 0;


  customerOrders.forEach(
    (order) => {

      const status =
        String(
          order.status || ""
        ).toUpperCase();


      if (
        [
          "PENDING",
          "ACCEPTED",
          "PREPARING",
          "READY",
          "OUT_FOR_DELIVERY",
        ].includes(status)
      ) {
        active += 1;
      }


      if (
        status === "PREPARING"
      ) {
        preparing += 1;
      }


      if (
        status === "COMPLETED"
      ) {
        completed += 1;
      }


      if (
        status === "CANCELLED" ||
        status === "REJECTED"
      ) {
        cancelled += 1;
      }
    }
  );


  activeOrdersCount.textContent =
    active;


  preparingOrdersCount.textContent =
    preparing;


  completedOrdersCount.textContent =
    completed;


  cancelledOrdersCount.textContent =
    cancelled;
}


/*
|--------------------------------------------------------------------------
| Render orders
|--------------------------------------------------------------------------
*/

function renderCustomerOrders() {

  customerOrdersGrid.innerHTML = "";


  if (
    customerOrders.length === 0
  ) {

    customerOrdersGrid.innerHTML =
      `
        <div class="orders-empty-state">

          <h3>
            No restaurant orders yet
          </h3>

          <p>
            Your restaurant orders will appear here after you place them.
          </p>

          <a
            href="restaurants.html"
            class="primary-button"
          >
            Browse Restaurants
          </a>

        </div>
      `;

    return;
  }


  customerOrders.forEach(
    (order) => {

      customerOrdersGrid.appendChild(
        createOrderCard(order)
      );
    }
  );
}


/*
|--------------------------------------------------------------------------
| Order card
|--------------------------------------------------------------------------
*/

function createOrderCard(order) {

  const card =
    document.createElement(
      "article"
    );


  card.className =
    "customer-order-card";


  const status =
    String(
      order.status || ""
    ).toUpperCase();


  const paymentStatus =
    String(
      order.paymentStatus || ""
    ).toUpperCase();


  const paymentMethod =
    String(
      order.paymentMethod || ""
    ).toUpperCase();


  card.innerHTML = `
    <div class="customer-order-card-header">

      <div>

        <span class="customer-order-restaurant">
          ${escapeHtml(
            order.restaurantName ||
            "Restaurant"
          )}
        </span>

        <h3>
          ${escapeHtml(
            order.orderNumber ||
            "Order"
          )}
        </h3>

      </div>

      <span
        class="customer-order-status status-${getStatusClass(
          status
        )}"
      >
        ${escapeHtml(
          formatOrderStatus(status)
        )}
      </span>

    </div>


    <div class="customer-order-details">

      <div>
        <span>Order Type</span>

        <strong>
          ${escapeHtml(
            formatOrderType(
              order.orderType
            )
          )}
        </strong>
      </div>


      <div>
        <span>Payment</span>

        <strong>
          ${escapeHtml(
            formatPaymentMethod(
              paymentMethod
            )
          )}
        </strong>
      </div>


      <div>
        <span>Payment Status</span>

        <strong>
          ${escapeHtml(
            formatOrderStatus(
              paymentStatus
            )
          )}
        </strong>
      </div>


      <div>
        <span>Total</span>

        <strong>
          ${formatCurrency(
            order.totalAmount
          )}
        </strong>
      </div>

    </div>


    ${
      Number(
        order.deliveryFee || 0
      ) > 0
        ? `
          <div class="customer-order-delivery">

            <span>
              Delivery Fee
            </span>

            <strong>
              ${formatCurrency(
                order.deliveryFee
              )}
            </strong>

          </div>
        `
        : ""
    }


    ${
      order.deliveryAddress
        ? `
          <div class="customer-order-address">

            <span>
              Delivery Address
            </span>

            <strong>
              ${escapeHtml(
                order.deliveryAddress
              )}
            </strong>

          </div>
        `
        : ""
    }


    <div class="customer-order-card-footer">

      <span class="customer-order-date">
        ${escapeHtml(
          formatDate(
            order.placedAt ||
            order.createdAt
          )
        )}
      </span>

      ${
        order.trackingToken
          ? `
            <a
              href="order-tracking.html?token=${encodeURIComponent(
                order.trackingToken
              )}"
              class="track-order-button"
            >
              Track Order
            </a>
          `
          : ""
      }

    </div>
  `;


  return card;
}


/*
|--------------------------------------------------------------------------
| Live updates
|--------------------------------------------------------------------------
*/

socket.on(
  "customer-order-updated",
  (updatedOrder) => {

    if (
      !updatedOrder ||
      !updatedOrder.id
    ) {
      return;
    }


    const existingIndex =
      customerOrders.findIndex(
        (order) =>
          String(order.id) ===
          String(updatedOrder.id)
      );


    if (
      existingIndex >= 0
    ) {

      customerOrders[
        existingIndex
      ] = {
        ...customerOrders[
          existingIndex
        ],

        ...updatedOrder,
      };

    } else {

      customerOrders.unshift(
        updatedOrder
      );
    }


    renderOrderSummary();

    renderCustomerOrders();

    showOrderNotification(
      updatedOrder
    );
  }
);


/*
|--------------------------------------------------------------------------
| Socket reconnect
|--------------------------------------------------------------------------
*/

socket.on(
  "connect",
  () => {

    console.log(
      "Customer orders socket connected:",
      socket.id
    );
  }
);


/*
|--------------------------------------------------------------------------
| Notification
|--------------------------------------------------------------------------
*/

function showOrderNotification(
  order
) {

  if (
    !customerOrderNotification ||
    !customerOrderNotificationTitle ||
    !customerOrderNotificationMessage
  ) {
    return;
  }


  const status =
    String(
      order.status || ""
    ).toUpperCase();


  const messages = {
    ACCEPTED:
      "The restaurant accepted your order.",

    PREPARING:
      "The restaurant is preparing your food.",

    READY:
      "Your order is ready.",

    OUT_FOR_DELIVERY:
      "Your order is out for delivery.",

    COMPLETED:
      "Your order has been completed.",

    CANCELLED:
      "Your order was cancelled.",

    REJECTED:
      "The restaurant could not accept your order.",
  };


  const titles = {
    ACCEPTED:
      "Order accepted",

    PREPARING:
      "Preparing your order",

    READY:
      "Order ready",

    OUT_FOR_DELIVERY:
      "Out for delivery",

    COMPLETED:
      "Order completed",

    CANCELLED:
      "Order cancelled",

    REJECTED:
      "Order rejected",
  };


  const message =
    messages[status];


  if (!message) {
    return;
  }


  customerOrderNotificationTitle
    .textContent =
      titles[status] ||
      "Order update";


  customerOrderNotificationMessage
    .textContent =
      message;


  customerOrderNotification.hidden =
    false;


  if (
    notificationTimeout
  ) {

    clearTimeout(
      notificationTimeout
    );
  }


  notificationTimeout =
    setTimeout(
      () => {

        customerOrderNotification.hidden =
          true;

      },
      6000
    );
}


/*
|--------------------------------------------------------------------------
| Messages
|--------------------------------------------------------------------------
*/

function clearOrdersMessage() {

  ordersMessage.textContent = "";

  ordersMessage.className =
    "page-message";
}


function showOrdersError(
  message
) {

  ordersMessage.textContent =
    message;

  ordersMessage.className =
    "page-message error";


  customerOrdersGrid.innerHTML =
    `
      <div class="orders-error-state">

        <p>
          ${escapeHtml(message)}
        </p>

        <button
          type="button"
          onclick="loadCustomerOrders()"
        >
          Try Again
        </button>

      </div>
    `;
}


/*
|--------------------------------------------------------------------------
| Formatting
|--------------------------------------------------------------------------
*/

function formatOrderStatus(
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


function formatOrderType(
  value
) {

  const labels = {
    DINE_IN:
      "Dine In",

    PICKUP:
      "Pickup",

    DELIVERY:
      "Delivery",
  };


  return (
    labels[
      String(
        value || ""
      ).toUpperCase()
    ] ||
    value ||
    "—"
  );
}


function formatPaymentMethod(
  value
) {

  const labels = {
    MPESA:
      "M-Pesa",

    CARD:
      "Card",

    CASH:
      "Cash",
  };


  return (
    labels[value] ||
    value ||
    "—"
  );
}


function getStatusClass(
  value
) {

  return String(
    value || ""
  )
    .trim()
    .toLowerCase()
    .replaceAll(
      "_",
      "-"
    );
}


function formatCurrency(
  amount
) {

  return new Intl.NumberFormat(
    "en-KE",
    {
      style:
        "currency",

      currency:
        "KES",

      maximumFractionDigits:
        0,
    }
  ).format(
    Number(
      amount || 0
    )
  );
}


function formatDate(
  value
) {

  if (!value) {
    return "Date unavailable";
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Date unavailable";
  }


  return date.toLocaleString(
    "en-KE",
    {
      day:
        "numeric",

      month:
        "short",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  );
}


/*
|--------------------------------------------------------------------------
| Escape HTML
|--------------------------------------------------------------------------
*/

function escapeHtml(
  value
) {

  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}