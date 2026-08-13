"use strict";

const API_BASE_URL =
  "https://coastconnectkenya.onrender.com/api";

  const SOCKET_URL =
  "https://coastconnectkenya.onrender.com";

let socket = null;

const token =
  localStorage.getItem(
    "coastConnectToken"
  );

let currentUser = null;
let staffOrders = [];
let currentStaffOrdersPage = 1;
let staffOrdersPaginationData = null;

try {
  currentUser = JSON.parse(
    localStorage.getItem(
      "coastConnectUser"
    ) || "null"
  );
} catch (error) {
  console.error(
    "Invalid stored user data:",
    error
  );
}

if (
  !token ||
  !currentUser ||
  currentUser.role !==
    "RESTAURANT_STAFF"
) {
  window.location.replace(
    "login.html"
  );
}

const staffWelcomeTitle =
  document.getElementById(
    "staffWelcomeTitle"
  );

const staffDashboardDescription =
  document.getElementById(
    "staffDashboardDescription"
  );

const staffRestaurantName =
  document.getElementById(
    "staffRestaurantName"
  );

const staffRoleName =
  document.getElementById(
    "staffRoleName"
  );

const staffAccountStatus =
  document.getElementById(
    "staffAccountStatus"
  );

const staffPermissionsContainer =
  document.getElementById(
    "staffPermissionsContainer"
  );

const staffDashboardMessage =
  document.getElementById(
    "staffDashboardMessage"
  );

const staffLogoutButton =
  document.getElementById(
    "staffLogoutButton"
  );

  const staffOrdersSection =
  document.getElementById(
    "staffOrdersSection"
  );

const refreshStaffOrdersButton =
  document.getElementById(
    "refreshStaffOrdersButton"
  );

const staffOrdersSummary =
  document.getElementById(
    "staffOrdersSummary"
  );

const staffPendingOrdersCount =
  document.getElementById(
    "staffPendingOrdersCount"
  );

const staffAcceptedOrdersCount =
  document.getElementById(
    "staffAcceptedOrdersCount"
  );

const staffPreparingOrdersCount =
  document.getElementById(
    "staffPreparingOrdersCount"
  );

const staffReadyOrdersCount =
  document.getElementById(
    "staffReadyOrdersCount"
  );

const staffOrdersMessage =
  document.getElementById(
    "staffOrdersMessage"
  );

const staffOrdersContainer =
  document.getElementById(
    "staffOrdersContainer"
  );

const staffOrdersPagination =
  document.getElementById(
    "staffOrdersPagination"
  );

const previousStaffOrdersButton =
  document.getElementById(
    "previousStaffOrdersButton"
  );

const nextStaffOrdersButton =
  document.getElementById(
    "nextStaffOrdersButton"
  );

const staffOrdersPageInfo =
  document.getElementById(
    "staffOrdersPageInfo"
  );

function formatStaffRole(role) {
  const roles = {
    MANAGER: "Manager",
    CASHIER: "Cashier",
    KITCHEN_STAFF:
      "Kitchen Staff",
  };

  return roles[role] ||
    role ||
    "Restaurant Staff";
}

function showMessage(
  message,
  type = "error"
) {
  staffDashboardMessage.textContent =
    message;

  staffDashboardMessage.className =
    `dashboard-message ${type}`;
}

function logout() {
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


function initializeSocket() {
  if (typeof io === "undefined") {
    console.error(
      "Socket.IO client is not loaded."
    );

    return;
  }

  socket = io(SOCKET_URL);

  socket.on(
    "connect",
    () => {
      console.log(
        "Kitchen connected:",
        socket.id
      );

      if (
        window.currentStaffRestaurantId
      ) {
        joinStaffRestaurantRoom(
          window.currentStaffRestaurantId
        );
      }
    }
  );

  socket.on(
    "restaurant-order-created",
    () => {
      console.log(
        "New restaurant order received."
      );

      loadStaffOrders(
        currentStaffOrdersPage
      );
    }
  );

  socket.on(
    "restaurant-order-updated",
    () => {
      console.log(
        "Restaurant order updated."
      );

      loadStaffOrders(
        currentStaffOrdersPage
      );
    }
  );

  socket.on(
    "disconnect",
    (reason) => {
      console.log(
        "Kitchen disconnected:",
        reason
      );
    }
  );

  socket.on(
    "connect_error",
    (error) => {
      console.error(
        "Kitchen socket error:",
        error.message
      );
    }
  );
}


function joinStaffRestaurantRoom(
  restaurantId
) {
  if (
    !socket?.connected ||
    !restaurantId
  ) {
    return;
  }

  socket.emit(
    "join-restaurant-room",
    restaurantId
  );

  console.log(
    "Kitchen joined restaurant room:",
    restaurantId
  );
}


function renderPermissions(
  permissions
) {
  const permissionItems = [
    {
      key: "canManageOrders",
      title: "Orders",
      description:
        "View and manage restaurant orders.",
      icon: "▤",
    },
    {
      key: "canManageMenu",
      title: "Menu",
      description:
        "Create and update menu items.",
      icon: "☰",
    },
    {
      key: "canManageGallery",
      title: "Gallery",
      description:
        "Manage restaurant photos.",
      icon: "▧",
    },
    {
      key: "canViewAnalytics",
      title: "Analytics",
      description:
        "View sales and performance.",
      icon: "▥",
    },
    {
      key:
        "canManageOpeningHours",
      title: "Opening Hours",
      description:
        "Update restaurant schedule.",
      icon: "◷",
    },
    {
      key:
        "canManageOrderAvailability",
      title: "Order Availability",
      description:
        "Pause or resume new orders.",
      icon: "✓",
    },
    {
      key: "canManageStaff",
      title: "Staff",
      description:
        "Manage team members.",
      icon: "👥",
    },
    {
      key: "canManageSettings",
      title: "Settings",
      description:
        "Update restaurant settings.",
      icon: "⚙",
    },
  ];

  const allowedPermissions =
    permissionItems.filter(
      (item) =>
        permissions?.[item.key] ===
        true
    );

  if (
    allowedPermissions.length === 0
  ) {
    staffPermissionsContainer.innerHTML = `
      <div class="empty-permissions">
        No dashboard permissions have been assigned yet.
      </div>
    `;

    return;
  }

  staffPermissionsContainer.innerHTML =
    allowedPermissions
      .map(
        (item) => `
          <article class="permission-card">
            <div class="permission-icon">
              ${item.icon}
            </div>

            <div class="permission-details">
              <strong>
                ${item.title}
              </strong>

              <span>
                ${item.description}
              </span>
            </div>
          </article>
        `
      )
      .join("");
}

function getStaffOrderAction(order) {
  const status =
    String(order.status || "")
      .toUpperCase();

  if (status === "PENDING") {
    return `
      <button
        type="button"
        class="staff-order-action-button"
        data-staff-order-id="${order.id}"
        data-staff-order-status="ACCEPTED"
      >
        Accept Order
      </button>
    `;
  }

  if (status === "ACCEPTED") {
    return `
      <button
        type="button"
        class="staff-order-action-button"
        data-staff-order-id="${order.id}"
        data-staff-order-status="PREPARING"
      >
        Start Preparing
      </button>
    `;
  }

  if (status === "PREPARING") {
    return `
      <button
        type="button"
        class="staff-order-action-button"
        data-staff-order-id="${order.id}"
        data-staff-order-status="READY"
      >
        Mark Ready
      </button>
    `;
  }

  return "";
}

function renderStaffOrders() {
  staffPendingOrdersCount.textContent =
    String(
      staffOrders.filter(
        (order) =>
          order.status === "PENDING"
      ).length
    );

  staffAcceptedOrdersCount.textContent =
    String(
      staffOrders.filter(
        (order) =>
          order.status === "ACCEPTED"
      ).length
    );

  staffPreparingOrdersCount.textContent =
    String(
      staffOrders.filter(
        (order) =>
          order.status === "PREPARING"
      ).length
    );

  staffReadyOrdersCount.textContent =
    String(
      staffOrders.filter(
        (order) =>
          order.status === "READY"
      ).length
    );

  if (staffOrders.length === 0) {
    staffOrdersSummary.textContent =
      "No restaurant orders found.";

    staffOrdersContainer.innerHTML = `
      <div class="empty-permissions">
        No orders are available right now.
      </div>
    `;

    return;
  }

  staffOrdersSummary.textContent =
    `${staffOrders.length} order${
      staffOrders.length === 1
        ? ""
        : "s"
    } on this page`;

  staffOrdersContainer.innerHTML =
    staffOrders
      .map((order) => {
        const items =
          Array.isArray(order.items)
            ? order.items
            : [];

        return `
          <article class="staff-order-card">
            <div class="staff-order-header">
              <div>
                <div class="staff-order-number">
                  ${order.orderNumber}
                </div>

                <div class="staff-order-customer">
                  ${order.customerName}
                  · ${order.orderType}
                </div>
              </div>

              <span
                class="staff-order-status staff-status-${String(
                  order.status || ""
                ).toLowerCase()}"
              >
                ${order.status}
              </span>
            </div>

            <div class="staff-order-items">
              ${items
                .map(
                  (item) => `
                    <div class="staff-order-item">
                      <span>
                        ${item.quantity}
                        ×
                        ${item.itemName}
                      </span>

                      <span>
                        KSh ${Number(
                          item.lineTotal || 0
                        ).toLocaleString(
                          "en-KE"
                        )}
                      </span>
                    </div>
                  `
                )
                .join("")}
            </div>

            ${
              order.customerNotes
                ? `
                  <div class="staff-order-notes">
                    ${order.customerNotes}
                  </div>
                `
                : ""
            }

            <div class="staff-order-footer">
              <div class="staff-order-meta">
                <span>
                  Payment:
                  ${order.paymentStatus}
                </span>

                <span>
                  Estimated preparation:
                  ${Number(
                    order.estimatedPreparationMinutes ||
                    20
                  )} minutes
                </span>
              </div>

              <div class="staff-order-actions">
                ${getStaffOrderAction(
                  order
                )}
              </div>
            </div>
          </article>
        `;
      })
      .join("");
}

async function loadStaffOrders(
  page = 1
) {
  try {
    refreshStaffOrdersButton.disabled = true;

    const response =
      await fetch(
        `${API_BASE_URL}/orders/staff?page=${page}`,
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
      response.status === 401 ||
      response.status === 403
    ) {
      logout();
      return;
    }

    if (!response.ok) {
      throw new Error(
        data.message ||
        "Unable to load restaurant orders."
      );
    }

    staffOrders =
      data.orders || [];

    currentStaffOrdersPage =
      page;

    staffOrdersPaginationData =
      data.pagination;

    staffOrdersSection.hidden =
      false;

    renderStaffOrders();

    updateStaffOrdersPagination();
  } catch (error) {
    console.error(
      "Load staff orders error:",
      error
    );

    staffOrdersContainer.innerHTML = `
      <div class="empty-permissions">
        ${error.message}
      </div>
    `;
  } finally {
    refreshStaffOrdersButton.disabled = false;
  }
}

async function updateStaffOrderStatus(
  orderId,
  nextStatus,
  button
) {
  const confirmations = {
    ACCEPTED:
      "Accept this order?",

    PREPARING:
      "Start preparing this order?",

    READY:
      "Mark this order as ready?",
  };

  const confirmationMessage =
    confirmations[nextStatus];

  if (!confirmationMessage) {
    showMessage(
      "Invalid staff order action."
    );

    return;
  }

  const confirmed =
    window.confirm(
      confirmationMessage
    );

  if (!confirmed) {
    return;
  }

  const originalText =
    button.textContent;

  button.disabled = true;
  button.textContent =
    "Updating...";

  try {
    const response = await fetch(
      `${API_BASE_URL}/orders/staff/${encodeURIComponent(
        orderId
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
          status: nextStatus,
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

    if (!response.ok) {
      throw new Error(
        data.message ||
        "Unable to update the order."
      );
    }

    showMessage(
      data.message ||
      "Order updated successfully.",
      "success"
    );

    await loadStaffOrders(
      currentStaffOrdersPage
    );
  } catch (error) {
    console.error(
      "Update staff order error:",
      error
    );

    showMessage(
      error.message ||
      "Unable to update the order."
    );
  } finally {
    button.disabled = false;
    button.textContent =
      originalText;
  }
}

function updateStaffOrdersPagination() {

  if (
    !staffOrdersPaginationData
  ) {
    staffOrdersPagination.hidden =
      true;

    return;
  }

  staffOrdersPagination.hidden =
    false;

  staffOrdersPageInfo.textContent =
    `Page ${staffOrdersPaginationData.page} of ${staffOrdersPaginationData.totalPages}`;

  previousStaffOrdersButton.disabled =
    !staffOrdersPaginationData.hasPreviousPage;

  nextStaffOrdersButton.disabled =
    !staffOrdersPaginationData.hasNextPage;
}

async function loadStaffProfile() {
  try {
    const response = await fetch(
      `${API_BASE_URL}/restaurants/staff/me`,
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

    if (!response.ok) {
      throw new Error(
        data.message ||
        "Unable to load your staff account."
      );
    }

    const staff =
      data.staff || {};

      window.currentStaffRestaurantId =
  staff.restaurantId;

      joinStaffRestaurantRoom(
  staff.restaurantId
);

    staffWelcomeTitle.textContent =
      `Welcome, ${
        staff.fullName ||
        currentUser.fullName ||
        "Staff Member"
      }`;

    staffDashboardDescription.textContent =
      `You are signed in as ${formatStaffRole(
        staff.role
      )}.`;

    staffRestaurantName.textContent =
      staff.restaurantName ||
      "Restaurant";

    staffRoleName.textContent =
      formatStaffRole(
        staff.role
      );

    staffAccountStatus.textContent =
      staff.status ||
      "ACTIVE";

    renderPermissions(
      staff.permissions || {}
    );

    loadStaffOrders();
  } catch (error) {
    console.error(
      "Load staff dashboard error:",
      error
    );

    showMessage(
      error.message ||
      "Unable to load the staff dashboard."
    );
  }
}

staffLogoutButton.addEventListener(
  "click",
  logout
);

refreshStaffOrdersButton.addEventListener(
  "click",
  () => {
    loadStaffOrders(
      currentStaffOrdersPage
    );
  }
);

previousStaffOrdersButton.addEventListener(
  "click",
  () => {
    if (
      staffOrdersPaginationData?.hasPreviousPage
    ) {
      loadStaffOrders(
        currentStaffOrdersPage - 1
      );
    }
  }
);

nextStaffOrdersButton.addEventListener(
  "click",
  () => {
    if (
      staffOrdersPaginationData?.hasNextPage
    ) {
      loadStaffOrders(
        currentStaffOrdersPage + 1
      );
    }
  }
);

staffOrdersContainer.addEventListener(
  "click",
  async (event) => {
    const button =
      event.target.closest(
        "[data-staff-order-id]"
      );

    if (!button) {
      return;
    }

    const orderId =
      button.dataset.staffOrderId;

    const nextStatus =
      button.dataset.staffOrderStatus;

    if (
      !orderId ||
      !nextStatus
    ) {
      return;
    }

    await updateStaffOrderStatus(
      orderId,
      nextStatus,
      button
    );
  }
);

initializeSocket();

loadStaffProfile();