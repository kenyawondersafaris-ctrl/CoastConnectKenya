"use strict";

const API_BASE =
  "https://coastconnectkenya.onrender.com/api";

const token =
  localStorage.getItem(
    "coastConnectToken"
  );

const storedUser =
  JSON.parse(
    localStorage.getItem(
      "coastConnectUser"
    ) || "null"
  );

  if (
  !token ||
  !storedUser
) {
  window.location.replace(
    "login.html"
  );

  throw new Error(
    "Authentication required."
  );
}

const userRoles =
  Array.isArray(
    storedUser.roles
  )
    ? storedUser.roles.map(
        (role) =>
          String(role)
            .trim()
            .toUpperCase()
      )
    : [];

const isAdmin =
  String(
    storedUser.role || ""
  )
    .trim()
    .toUpperCase() === "ADMIN" ||
  userRoles.includes(
    "ADMIN"
  );

if (!isAdmin) {

  window.location.replace(
    "index.html"
  );

  throw new Error(
    "Administrator access required."
  );

}

const adminCustomersCount =
  document.getElementById(
    "adminCustomersCount"
  );

const adminProvidersCount =
  document.getElementById(
    "adminProvidersCount"
  );

const adminRestaurantsCount =
  document.getElementById(
    "adminRestaurantsCount"
  );

const adminPendingApprovalsCount =
  document.getElementById(
    "adminPendingApprovalsCount"
  );

const adminName =
  document.getElementById(
    "adminName"
  );

const adminEmail =
  document.getElementById(
    "adminEmail"
  );

const adminAvatar =
  document.getElementById(
    "adminAvatar"
  );

const adminMessage =
  document.getElementById(
    "adminMessage"
  );

const logoutButton =
  document.getElementById(
    "adminLogoutButton"
  );

  const adminProvidersContainer =
  document.getElementById(
    "adminProvidersContainer"
  );

  const adminNavLinks =
  document.querySelectorAll(
    ".admin-nav-link"
  );

const adminSections =
  document.querySelectorAll(
    ".admin-section"
  );

const adminPageTitle =
  document.getElementById(
    "adminPageTitle"
  );

  const adminRestaurantsContainer =
  document.getElementById(
    "adminRestaurantsContainer"
  );

  const adminUsersContainer =
  document.getElementById(
    "adminUsersContainer"
  );

  const adminPayoutsContainer =
  document.getElementById(
    "adminPayoutsContainer"
  );

  const adminSupportMessagesContainer =
  document.getElementById(
    "adminSupportMessagesContainer"
  );

  const adminNotificationButton =
  document.getElementById(
    "adminNotificationButton"
  );

const adminNotificationDropdown =
  document.getElementById(
    "adminNotificationDropdown"
  );

const adminNotificationBadge =
  document.getElementById(
    "adminNotificationBadge"
  );

const adminNotificationList =
  document.getElementById(
    "adminNotificationList"
  );

const adminNotificationSummary =
  document.getElementById(
    "adminNotificationSummary"
  );

const adminMarkAllReadButton =
  document.getElementById(
    "adminMarkAllReadButton"
  );

  const adminMobileMenuButton =
  document.getElementById(
    "adminMobileMenuButton"
  );

const adminSidebar =
  document.getElementById(
    "adminSidebar"
  );

const adminSidebarCloseButton =
  document.getElementById(
    "adminSidebarCloseButton"
  );

const adminSidebarOverlay =
  document.getElementById(
    "adminSidebarOverlay"
  );

  const adminPayoutHistoryContainer =
  document.getElementById(
    "adminPayoutHistoryContainer"
  );

  const adminProviderVerificationsContainer =
  document.getElementById(
    "adminProviderVerificationsContainer"
  );

  const providerVerificationModal =
  document.getElementById(
    "providerVerificationModal"
  );

const providerVerificationModalContent =
  document.getElementById(
    "providerVerificationModalContent"
  );

const closeProviderVerificationModal =
  document.getElementById(
    "closeProviderVerificationModal"
  );



function showMessage(
  message,
  type = "success"
) {
  adminMessage.className =
    `admin-message ${type}`;

  adminMessage.textContent =
    message;
}

function handleUnauthorizedResponse(
  response
) {
  if (
    response.status !== 401
  ) {
    return false;
  }

  localStorage.removeItem(
    "coastConnectToken"
  );

  localStorage.removeItem(
    "coastConnectUser"
  );

  sessionStorage.removeItem(
    "coastConnectReturnUrl"
  );

  window.location.replace(
    "login.html"
  );

  return true;
}

function openAdminSidebar() {
  if (
    !adminSidebar ||
    !adminSidebarOverlay
  ) {
    return;
  }

  adminSidebar.classList.add(
    "open"
  );

  adminSidebarOverlay.hidden =
    false;

  adminMobileMenuButton?.setAttribute(
    "aria-expanded",
    "true"
  );

  document.body.style.overflow =
    "hidden";
}

function closeAdminSidebar() {
  if (
    !adminSidebar ||
    !adminSidebarOverlay
  ) {
    return;
  }

  adminSidebar.classList.remove(
    "open"
  );

  adminSidebarOverlay.hidden =
    true;

  adminMobileMenuButton?.setAttribute(
    "aria-expanded",
    "false"
  );

  document.body.style.overflow =
    "";
}

adminMobileMenuButton?.addEventListener(
  "click",
  openAdminSidebar
);

adminSidebarCloseButton?.addEventListener(
  "click",
  closeAdminSidebar
);

adminSidebarOverlay?.addEventListener(
  "click",
  closeAdminSidebar
);

document.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key === "Escape"
    ) {
      closeAdminSidebar();
    }
  }
);

if (closeProviderVerificationModal) {

  closeProviderVerificationModal.addEventListener(
    "click",
    closeProviderVerificationReview
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

function formatMoney(
  value,
  currency = "KES"
) {
  const amount =
    Number(value || 0);

  return new Intl.NumberFormat(
    "en-KE",
    {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }
  ).format(amount);
}

async function loadOverview() {

  try {

    const response =
      await fetch(
        `${API_BASE}/admin/overview`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`
          }
        }
      );

      if (
  handleUnauthorizedResponse(
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
        data.message
      );
    }

    adminCustomersCount.textContent =
      data.stats.customers;

    adminProvidersCount.textContent =
      data.stats.providers;

    adminRestaurantsCount.textContent =
      data.stats.restaurants;

    adminPendingApprovalsCount.textContent =
      data.stats.pendingApprovals;

  } catch (error) {

    console.error(error);

    showMessage(
      error.message,
      "error"
    );

  }

}

async function loadProviders() {
  if (!adminProvidersContainer) {
    return;
  }

  adminProvidersContainer.innerHTML =
    "<p>Loading providers...</p>";

  try {
    const response =
      await fetch(
        `${API_BASE}/admin/providers`,
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
  handleUnauthorizedResponse(
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
        "Unable to load providers."
      );
    }

    const providers =
      Array.isArray(data.providers)
        ? data.providers
        : [];

    if (providers.length === 0) {
      adminProvidersContainer.innerHTML =
        "<p>No providers found.</p>";

      return;
    }

    adminProvidersContainer.innerHTML =
      providers
        .map(
          (provider) => `
            <article class="admin-list-card">
              <div>
                <h3>
                  ${provider.full_name || "Provider"}
                </h3>

                <p>
                  ${provider.email || ""}
                </p>

                <p>
                  ${provider.service_area || "No service area"}
                </p>

                <span
                  class="admin-status-badge ${String(
                    provider.verification_status || "PENDING"
                  ).toLowerCase()}"
                >
                  ${provider.verification_status || "PENDING"}
                </span>
              </div>

              <div class="admin-card-actions">

  ${
    String(
      provider.verification_status || ""
    ).toUpperCase() === "PENDING"
      ? `
          <button
            type="button"
            class="admin-approve-button"
            data-provider-id="${provider.id}"
          >
            Approve
          </button>

          <button
            type="button"
            class="admin-reject-button"
            data-provider-id="${provider.id}"
          >
            Reject
          </button>
        `
      : `
          <span
            class="admin-status-badge ${String(
              provider.verification_status
            ).toLowerCase()}"
          >
            ${provider.verification_status}
          </span>
        `
  }

</div>
            </article>
          `
        )
        .join("");

  } catch (error) {
    console.error(
      "Load admin providers error:",
      error
    );

    adminProvidersContainer.innerHTML =
      "<p>Unable to load providers.</p>";

    showMessage(
      error.message ||
      "Unable to load providers.",
      "error"
    );
  }
}

  async function loadProviderVerifications() {

  if (!adminProviderVerificationsContainer) {
    return;
  }

  adminProviderVerificationsContainer.innerHTML = `
    <p>
      Loading professional verification requests...
    </p>
  `;

  try {

    const response = await fetch(
      `${API_BASE}/admin/provider-verifications`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    if (handleUnauthorizedResponse(response)) {
      return;
    }

   const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message ||
        "Unable to load professional verifications."
      );
    }

    renderProviderVerifications(
      data.verifications || []
    );

  } catch (error) {

    console.error(
      "Load provider verifications error:",
      error
    );

    adminProviderVerificationsContainer.innerHTML = `
      <p class="admin-empty-state">
        ${escapeHtml(
          error.message ||
          "Unable to load professional verifications."
        )}
      </p>
    `;
  }
}


function renderProviderVerifications(
  verifications
) {

  if (
    !adminProviderVerificationsContainer
  ) {
    return;
  }

  if (verifications.length === 0) {

    adminProviderVerificationsContainer.innerHTML = `
      <p class="admin-empty-state">
        No professional verification requests are waiting for review.
      </p>
    `;

    return;
  }

  adminProviderVerificationsContainer.innerHTML =
    verifications
      .map(
        (verification) => `
          <article class="admin-list-card">

            <div class="admin-list-card__content">

              <div>
                <h3>
                  ${escapeHtml(
                    verification.full_name || "Provider"
                  )}
                </h3>

                <p>
                  ${escapeHtml(
                    verification.email || ""
                  )}
                </p>
              </div>

              <div class="admin-list-card__details">

  <span>
    <strong>Qualification:</strong>
    ${escapeHtml(
      verification.qualification_summary ||
      "Not provided"
    )}
  </span>

  <span>
    <strong>Portfolio:</strong>
    ${escapeHtml(
      verification.portfolio_description ||
      "Not provided"
    )}
  </span>

</div>

            </div>

            <div class="admin-list-card__actions">

              <button
                type="button"
                class="secondary-button"
                onclick="reviewProviderVerification(
                  '${verification.provider_id}'
                )"
              >
                Review
              </button>

            </div>

          </article>
        `
      )
      .join("");
}

async function loadProviderPayouts() {
  if (!adminPayoutsContainer) {
    return;
  }

  adminPayoutsContainer.innerHTML =
    "<p>Loading provider payouts...</p>";

  try {
    const response =
      await fetch(
        `${API_BASE}/admin/provider-payouts`,
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
      handleUnauthorizedResponse(
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
          "Unable to load provider payouts."
      );
    }

    const payouts =
      Array.isArray(
        data.payouts
      )
        ? data.payouts
        : [];

        window.adminProviderPayouts =
  payouts;

    if (
      payouts.length === 0
    ) {
      adminPayoutsContainer.innerHTML = `
        <div class="admin-list-card">
          <h3>No provider payouts ready</h3>
          <p>
            Paid provider earnings that are ready for manual settlement
            will appear here.
          </p>
        </div>
      `;

      return;
    }

    adminPayoutsContainer.innerHTML =
      payouts
        .map(
          (payout) => `
            <article
              class="admin-list-card provider-payout-card"
              data-payment-id="${escapeHtml(
                payout.id
              )}"
            >
              <div>
                <h3>
                  ${escapeHtml(
                    payout.provider_name ||
                    "Provider"
                  )}
                </h3>

                <p>
                  ${escapeHtml(
                    payout.payment_stage ||
                    "Payment"
                  )}
                  ·
                  ${escapeHtml(
                    payout.booking_id ||
                    ""
                  )}
                </p>

                <p>
                  ${escapeHtml(
                    payout.provider_phone ||
                    payout.provider_email ||
                    "No contact information"
                  )}
                </p>

                <span class="admin-status-badge eligible">
                  READY TO PAY
                </span>
              </div>

              <div class="admin-card-actions">
                <strong>
                  ${formatMoney(
                    payout.provider_share_amount
                  )}
                </strong>

                <button
                  type="button"
                  class="admin-mark-payout-paid-button"
                  data-payment-id="${escapeHtml(
                    payout.id
                  )}"
                >
                  Mark as Paid
                </button>
              </div>
            </article>
          `
        )
        .join("");

  } catch (error) {
    console.error(
      "Load provider payouts error:",
      error
    );

    adminPayoutsContainer.innerHTML = `
      <div class="admin-list-card">
        <h3>Unable to load provider payouts</h3>
        <p>
          ${escapeHtml(
            error.message ||
            "Please try again."
          )}
        </p>
      </div>
    `;

    showMessage(
      error.message ||
        "Unable to load provider payouts.",
      "error"
    );
  }
}

async function loadProviderPayoutHistory() {
  if (!adminPayoutHistoryContainer) {
    return;
  }

  adminPayoutHistoryContainer.innerHTML =
    "<p>Loading paid provider payouts...</p>";

  try {
    const response =
      await fetch(
        `${API_BASE}/admin/provider-payouts/history`,
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
      handleUnauthorizedResponse(
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
          "Unable to load payout history."
      );
    }

    const payouts =
      Array.isArray(
        data.payouts
      )
        ? data.payouts
        : [];

    if (
      payouts.length === 0
    ) {
      adminPayoutHistoryContainer.innerHTML = `
        <div class="admin-list-card">
          <h3>No settled payouts yet</h3>
          <p>
            Provider payments recorded as paid will appear here.
          </p>
        </div>
      `;

      return;
    }

    adminPayoutHistoryContainer.innerHTML =
      payouts
        .map(
          (payout) => `
            <article
              class="admin-list-card provider-payout-history-card"
            >
              <div>
                <h3>
                  ${escapeHtml(
                    payout.provider_name ||
                    "Provider"
                  )}
                </h3>

                <p>
                  ${escapeHtml(
                    payout.payment_stage ||
                    "Payment"
                  )}
                  ·
                  ${escapeHtml(
                    payout.booking_id ||
                    ""
                  )}
                </p>

                <p>
                  Method:
                  ${escapeHtml(
                    payout.manual_payout_method ||
                    "Not recorded"
                  )}
                </p>

                <p>
                  Reference:
                  ${escapeHtml(
                    payout.manual_payout_reference ||
                    "Not recorded"
                  )}
                </p>

                ${
                  payout.manual_payout_notes
                    ? `
                      <p>
                        Notes:
                        ${escapeHtml(
                          payout.manual_payout_notes
                        )}
                      </p>
                    `
                    : ""
                }
              </div>

              <div class="admin-card-actions">
                <strong>
                  ${formatMoney(
                    payout.provider_share_amount,
                    payout.currency ||
                      "KES"
                  )}
                </strong>

                <span class="admin-status-badge approved">
                  PAID
                </span>

                <small>
                  ${
                    payout.manual_payout_paid_at
                      ? new Date(
                          payout.manual_payout_paid_at
                        ).toLocaleString(
                          "en-KE"
                        )
                      : ""
                  }
                </small>
              </div>
            </article>
          `
        )
        .join("");

  } catch (error) {
    console.error(
      "Load provider payout history error:",
      error
    );

    adminPayoutHistoryContainer.innerHTML = `
      <div class="admin-list-card">
        <h3>
          Unable to load payout history
        </h3>

        <p>
          ${escapeHtml(
            error.message ||
            "Please try again."
          )}
        </p>
      </div>
    `;

    showMessage(
      error.message ||
        "Unable to load payout history.",
      "error"
    );
  }
}

async function loadRestaurants() {
  if (!adminRestaurantsContainer) {
    return;
  }

  adminRestaurantsContainer.innerHTML =
    "<p>Loading restaurants...</p>";

  try {
    const response =
      await fetch(
        `${API_BASE}/admin/restaurants`,
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
  handleUnauthorizedResponse(
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
        "Unable to load restaurants."
      );
    }

    const restaurants =
      Array.isArray(
        data.restaurants
      )
        ? data.restaurants
        : [];

    if (
      restaurants.length === 0
    ) {
      adminRestaurantsContainer.innerHTML =
        "<p>No restaurants found.</p>";

      return;
    }

    adminRestaurantsContainer.innerHTML =
      restaurants
        .map(
          (restaurant) => `
            <article class="admin-list-card">

              <div>

                <h3>
                  ${restaurant.name || "Restaurant"}
                </h3>

                <p>
                  Owner:
                  ${restaurant.full_name || "Unknown"}
                </p>

                <p>
                  ${restaurant.email || ""}
                </p>

                <span
                  class="admin-status-badge ${String(
                    restaurant.approval_status ||
                    "PENDING"
                  ).toLowerCase()}"
                >
                  ${
                    restaurant.approval_status ||
                    "PENDING"
                  }
                </span>

              </div>

             <div class="admin-card-actions">

  ${
    String(
      restaurant.approval_status || ""
    ).toUpperCase() === "PENDING"
      ? `
          <button
            type="button"
            class="admin-approve-restaurant-button"
            data-restaurant-id="${restaurant.id}"
          >
            Approve
          </button>

          <button
            type="button"
            class="admin-reject-restaurant-button"
            data-restaurant-id="${restaurant.id}"
          >
            Reject
          </button>
        `
      : `
          <span
            class="admin-status-badge ${String(
              restaurant.approval_status ||
              "PENDING"
            ).toLowerCase()}"
          >
            ${restaurant.approval_status}
          </span>
        `
  }

</div>

            </article>
          `
        )
        .join("");

  } catch (error) {
    console.error(
      "Load admin restaurants error:",
      error
    );

    adminRestaurantsContainer.innerHTML =
      "<p>Unable to load restaurants.</p>";

    showMessage(
      error.message ||
      "Unable to load restaurants.",
      "error"
    );
  }
}

async function loadUsers() {
  if (!adminUsersContainer) {
    return;
  }

  adminUsersContainer.innerHTML =
    "<p>Loading users...</p>";

  try {
    const response =
      await fetch(
        `${API_BASE}/admin/users`,
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
  handleUnauthorizedResponse(
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
        "Unable to load users."
      );
    }

    const users =
      Array.isArray(data.users)
        ? data.users
        : [];

    if (users.length === 0) {
      adminUsersContainer.innerHTML =
        "<p>No users found.</p>";

      return;
    }

    adminUsersContainer.innerHTML =
      users
        .map(
          (user) => `
            <article class="admin-list-card">

              <div>

                <h3>
                  ${user.full_name || "User"}
                </h3>

                <p>
                  ${user.email || ""}
                </p>

                <p>
                  Role:
                  ${user.role || "UNKNOWN"}
                </p>

                <span
                  class="admin-status-badge ${String(
                    user.account_status ||
                    "ACTIVE"
                  ).toLowerCase()}"
                >
                  ${
                    user.account_status ||
                    "ACTIVE"
                  }
                </span>

              </div>

              <div class="admin-card-actions">

  ${
    String(
      user.role || ""
    ).toUpperCase() === "ADMIN"
      ? `
          <span
            class="admin-status-badge active"
          >
            Protected Admin
          </span>
        `
      : String(
          user.account_status || ""
        ).toUpperCase() === "ACTIVE"
        ? `
            <button
              type="button"
              class="admin-suspend-user-button"
              data-user-id="${user.id}"
            >
              Suspend
            </button>
          `
        : `
            <button
              type="button"
              class="admin-reactivate-user-button"
              data-user-id="${user.id}"
            >
              Reactivate
            </button>
          `
  }

</div>

            </article>
          `
        )
        .join("");

  } catch (error) {
    console.error(
      "Load admin users error:",
      error
    );

    adminUsersContainer.innerHTML =
      "<p>Unable to load users.</p>";

    showMessage(
      error.message ||
      "Unable to load users.",
      "error"
    );
  }
}

async function loadSupportMessages() {
  if (!adminSupportMessagesContainer) {
    return;
  }

  adminSupportMessagesContainer.innerHTML =
    "<p>Loading support messages...</p>";

  try {
    const response =
      await fetch(
        `${API_BASE}/admin/contact-messages`,
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
      handleUnauthorizedResponse(
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
        "Unable to load support messages."
      );
    }

    const messages =
      Array.isArray(data.messages)
        ? data.messages
        : [];

    if (messages.length === 0) {
      adminSupportMessagesContainer.innerHTML =
        "<p>No support messages found.</p>";

      return;
    }

   adminSupportMessagesContainer.innerHTML =
  messages
    .map(
      (item) => `
        <article class="admin-list-card admin-support-card">

          <div class="admin-support-card-main">

            <div class="admin-support-card-header">

              <div>
                <h3>
                  ${escapeHtml(
                    item.full_name || "User"
                    )}
                </h3>

                <p>
                  ${escapeHtml(
                    item.email || ""
                    )}
                </p>
              </div>

              <span
                class="admin-status-badge ${String(
                  item.status || "OPEN"
                ).toLowerCase()}"
              >
                ${item.status || "OPEN"}
              </span>

            </div>

            <div class="admin-support-meta">
              <span>
                Subject
              </span>

              <strong>
                ${escapeHtml(
                    item.subject || "OTHER"
                    )}
              </strong>
            </div>

            <div class="admin-support-message-box">

              <span>
                Customer Message
              </span>

              <p>
                ${escapeHtml(
                    item.message || ""
                    )}
              </p>

            </div>

            <div class="admin-support-notes">

              <label
                for="adminNotes-${item.id}"
              >
                Internal Admin Notes
              </label>

              <textarea
                id="adminNotes-${item.id}"
                class="admin-notes-input"
                data-message-id="${item.id}"
                maxlength="5000"
                placeholder="Add internal notes for this support case..."
              >${escapeHtml(item.admin_notes || "")}</textarea>

            </div>

            <div class="admin-support-actions">

              <button
                type="button"
                class="admin-save-notes-button"
                data-message-id="${item.id}"
              >
                Save Notes
              </button>

              ${
                String(
                  item.status || "OPEN"
                ).toUpperCase() === "OPEN"
                  ? `
                      <button
                        type="button"
                        class="admin-resolve-message-button"
                        data-message-id="${item.id}"
                      >
                        ✓ Mark Resolved
                      </button>
                    `
                  : ""
              }

            </div>

          </div>

        </article>
      `
    )
    .join("");

  } catch (error) {
    console.error(
      "Load support messages error:",
      error
    );

    adminSupportMessagesContainer.innerHTML =
      "<p>Unable to load support messages.</p>";

    showMessage(
      error.message ||
      "Unable to load support messages.",
      "error"
    );
  }
}

function showAdminSection(
  sectionName
) {
  adminSections.forEach(
    (section) => {
      const isActive =
        section.dataset.adminPanel ===
        sectionName;

      section.hidden =
        !isActive;

      section.classList.toggle(
        "active",
        isActive
      );
    }
  );

  adminNavLinks.forEach(
    (link) => {
      const isActive =
        link.dataset.adminSection ===
        sectionName;

      link.classList.toggle(
        "active",
        isActive
      );
    }
  );

  const titles = {
    overview: "Overview",
    providers: "Providers",
    restaurants: "Restaurants",
    users: "Users",
    support: "Support Messages",
  };

  if (adminPageTitle) {
    adminPageTitle.textContent =
      titles[sectionName] ||
      "Admin Dashboard";
  }

  sessionStorage.setItem(
    "adminActiveSection",
    sectionName
  );
}

async function reviewProviderVerification(
  providerId
) {

  if (
    !providerVerificationModal ||
    !providerVerificationModalContent
  ) {
    return;
  }

  providerVerificationModal.hidden = false;

  providerVerificationModalContent.innerHTML = `
    <p>
      Loading verification details...
    </p>
  `;

  try {

    const response = await fetch(
      `${API_BASE}/admin/provider-verifications/${providerId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    if (
      handleUnauthorizedResponse(response)
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
        "Unable to load verification details."
      );
    }

    renderProviderVerificationDetails(
      data.verification,
      data.documents || []
    );

  } catch (error) {

    console.error(
      "Load provider verification details error:",
      error
    );

    providerVerificationModalContent.innerHTML = `
      <p class="admin-empty-state">
        ${escapeHtml(
          error.message ||
          "Unable to load verification details."
        )}
      </p>
    `;
  }
}

function renderProviderVerificationDetails(
  verification,
  documents
) {

  const documentHtml =
    documents.length > 0
      ? documents
          .map(
            (document) => {

              const documentUrl =
                document.document_url ||
                document.file_url ||
                "";

              const documentName =
                document.document_name ||
                document.file_name ||
                "Verification Document";

              if (!documentUrl) {
                return `
                  <div
                    class="provider-verification-document"
                  >
                    ${escapeHtml(
                      documentName
                    )}
                    <span>
                      Document unavailable
                    </span>
                  </div>
                `;
              }

              return `
                <a
                  href="${escapeHtml(
                    documentUrl
                  )}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="provider-verification-document"
                >
                  View:
                  ${escapeHtml(
                    documentName
                  )}
                </a>
              `;
            }
          )
          .join("")
      : `
          <p class="admin-empty-state">
            No verification documents uploaded.
          </p>
        `;

  providerVerificationModalContent.innerHTML = `
    <div class="provider-verification-review">

      <div
        class="provider-verification-review__header"
      >
        <h2>
          ${escapeHtml(
            verification.full_name ||
            "Provider Verification"
          )}
        </h2>

        <p>
          ${escapeHtml(
            verification.email || ""
          )}
        </p>

        <p>
          ${escapeHtml(
            verification.phone || ""
          )}
        </p>
      </div>

      <div
        class="provider-verification-review__section"
      >
        <h3>
          Professional Qualification
        </h3>

        <p>
          ${escapeHtml(
            verification.qualification_summary ||
            "Not provided"
          )}
        </p>
      </div>

      <div
        class="provider-verification-review__section"
      >
        <h3>
          Professional Experience
        </h3>

        <p>
          ${escapeHtml(
            verification.portfolio_description ||
            "Not provided"
          )}
        </p>
      </div>

      ${
        verification.portfolio_url
          ? `
            <div
              class="provider-verification-review__section"
            >
              <h3>
                Portfolio Link
              </h3>

              <a
                href="${escapeHtml(
                  verification.portfolio_url
                )}"
                target="_blank"
                rel="noopener noreferrer"
              >
                View Portfolio
              </a>
            </div>
          `
          : ""
      }

      <div
        class="provider-verification-review__section"
      >
        <h3>
          Provider Notes
        </h3>

        <p>
          ${escapeHtml(
            verification.provider_notes ||
            "No additional notes provided."
          )}
        </p>
      </div>

      <div
        class="provider-verification-review__section"
      >
        <h3>
          Supporting Documents
        </h3>

        <div
          class="provider-verification-documents"
        >
          ${documentHtml}
        </div>
      </div>

      <div
        class="provider-verification-review__actions"
      >
        <button
          type="button"
          class="primary-button"
          onclick="approveProviderVerification(
            '${verification.provider_id}'
          )"
        >
          Approve Verification
        </button>

        <button
          type="button"
          class="danger-button"
          onclick="rejectProviderVerification(
            '${verification.provider_id}'
          )"
        >
          Reject Verification
        </button>
      </div>

    </div>
  `;
}

function closeProviderVerificationReview() {

  if (!providerVerificationModal) {
    return;
  }

  providerVerificationModal.hidden = true;

  providerVerificationModalContent.innerHTML = "";
}


adminNavLinks.forEach(
  (link) => {
    link.addEventListener(
      "click",
      () => {
        const sectionName =
          link.dataset.adminSection;

        if (!sectionName) {
          return;
        }

        showAdminSection(
          sectionName
        );

        if (
  window.innerWidth < 1024
) {
  closeAdminSidebar();
}

        if (
          sectionName ===
          "providers"
        ) {
          loadProviders();
        }

        if (
  sectionName ===
  "provider-verifications"
) {
  loadProviderVerifications();
}

        if (
  sectionName ===
  "payouts"
) {
  loadProviderPayouts();
}

if (
  sectionName ===
  "payout-history"
) {
  loadProviderPayoutHistory();
}

        if (
          sectionName ===
          "restaurants"
        ) {
          loadRestaurants();
        }

        if (
          sectionName ===
          "users"
        ) {
          loadUsers();
        }

        if (
  sectionName ===
  "support"
) {
  loadSupportMessages();
}
      }
    );
  }
);

adminProvidersContainer?.addEventListener(
  "click",
  async (event) => {
    const button =
      event.target.closest(
        "button[data-provider-id]"
      );

    if (!button) {
      return;
    }

    const providerId =
      button.dataset.providerId;

    /*
      APPROVE PROVIDER
    */
    if (
      button.classList.contains(
        "admin-approve-button"
      )
    ) {
      const confirmed =
  await showConfirm({
    title:
      "Approve provider?",
    message:
      "This provider will be approved and allowed to operate on Coast Connect.",
    confirmText:
      "Approve provider",
    cancelText:
      "Cancel",
    danger:
      false,
  });

      if (!confirmed) {
        return;
      }

      button.disabled = true;

      const originalText =
        button.textContent;

      button.textContent =
        "Approving...";

      try {
        const response =
          await fetch(
            `${API_BASE}/admin/providers/${encodeURIComponent(
              providerId
            )}/approve`,
            {
              method: "PATCH",

              headers: {
                Authorization:
                  `Bearer ${token}`,

                Accept:
                  "application/json",
              },
            }
          );

          if (
  handleUnauthorizedResponse(
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
            "Unable to approve provider."
          );
        }

        showMessage(
          data.message ||
          "Provider approved.",
          "success"
        );

        await Promise.all([
          loadProviders(),
          loadOverview(),
        ]);

      } catch (error) {
        console.error(
          "Approve provider error:",
          error
        );

        showMessage(
          error.message ||
          "Unable to approve provider.",
          "error"
        );

        button.disabled =
          false;

        button.textContent =
          originalText;
      }

      return;
    }

    /*
      REJECT PROVIDER
    */
    if (
      button.classList.contains(
        "admin-reject-button"
      )
    ) {
      const confirmed =
  await showConfirm({
    title:
      "Reject provider?",
    message:
      "This provider application will be rejected.",
    confirmText:
      "Reject provider",
    cancelText:
      "Cancel",
    danger:
      true,
  });

      if (!confirmed) {
        return;
      }

      button.disabled = true;

      const originalText =
        button.textContent;

      button.textContent =
        "Rejecting...";

      try {
        const response =
          await fetch(
            `${API_BASE}/admin/providers/${encodeURIComponent(
              providerId
            )}/reject`,
            {
              method: "PATCH",

              headers: {
                Authorization:
                  `Bearer ${token}`,

                Accept:
                  "application/json",
              },
            }
          );

 if (
  handleUnauthorizedResponse(
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
            "Unable to reject provider."
          );
        }

        showMessage(
          data.message ||
          "Provider rejected.",
          "success"
        );

        await Promise.all([
          loadProviders(),
          loadOverview(),
        ]);

      } catch (error) {
        console.error(
          "Reject provider error:",
          error
        );

        showMessage(
          error.message ||
          "Unable to reject provider.",
          "error"
        );

        button.disabled =
          false;

        button.textContent =
          originalText;
      }
    }
  }
);

adminRestaurantsContainer?.addEventListener(
  "click",
  async (event) => {
    const button =
      event.target.closest(
        "button[data-restaurant-id]"
      );

    if (!button) {
      return;
    }

    const restaurantId =
      button.dataset.restaurantId;

    /*
      APPROVE RESTAURANT
    */
    if (
      button.classList.contains(
        "admin-approve-restaurant-button"
      )
    ) {
     const confirmed =
  await showConfirm({
    title:
      "Approve restaurant?",
    message:
      "This restaurant will be approved and made available on Coast Connect.",
    confirmText:
      "Approve restaurant",
    cancelText:
      "Cancel",
    danger:
      false,
  });

      if (!confirmed) {
        return;
      }

      button.disabled = true;

      const originalText =
        button.textContent;

      button.textContent =
        "Approving...";

      try {
        const response =
          await fetch(
            `${API_BASE}/admin/restaurants/${encodeURIComponent(
              restaurantId
            )}/approve`,
            {
              method: "PATCH",

              headers: {
                Authorization:
                  `Bearer ${token}`,

                Accept:
                  "application/json",
              },
            }
          );

          if (
  handleUnauthorizedResponse(
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
            "Unable to approve restaurant."
          );
        }

        showMessage(
          data.message ||
          "Restaurant approved.",
          "success"
        );

        await Promise.all([
          loadRestaurants(),
          loadOverview(),
        ]);

      } catch (error) {
        console.error(
          "Approve restaurant error:",
          error
        );

        showMessage(
          error.message ||
          "Unable to approve restaurant.",
          "error"
        );

        button.disabled =
          false;

        button.textContent =
          originalText;
      }

      return;
    }

    /*
      REJECT RESTAURANT
    */
    if (
      button.classList.contains(
        "admin-reject-restaurant-button"
      )
    ) {
     const confirmed =
  await showConfirm({
    title:
      "Reject restaurant?",
    message:
      "This restaurant application will be rejected.",
    confirmText:
      "Reject restaurant",
    cancelText:
      "Cancel",
    danger:
      true,
  });
      if (!confirmed) {
        return;
      }

      button.disabled = true;

      const originalText =
        button.textContent;

      button.textContent =
        "Rejecting...";

      try {
        const response =
          await fetch(
            `${API_BASE}/admin/restaurants/${encodeURIComponent(
              restaurantId
            )}/reject`,
            {
              method: "PATCH",

              headers: {
                Authorization:
                  `Bearer ${token}`,

                Accept:
                  "application/json",
              },
            }
          );

          if (
  handleUnauthorizedResponse(
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
            "Unable to reject restaurant."
          );
        }

        showMessage(
          data.message ||
          "Restaurant rejected.",
          "success"
        );

        await Promise.all([
          loadRestaurants(),
          loadOverview(),
        ]);

      } catch (error) {
        console.error(
          "Reject restaurant error:",
          error
        );

        showMessage(
          error.message ||
          "Unable to reject restaurant.",
          "error"
        );

        button.disabled =
          false;

        button.textContent =
          originalText;
      }
    }
  }
);

adminUsersContainer?.addEventListener(
  "click",
  async (event) => {

    const button =
      event.target.closest(
        "button[data-user-id]"
      );

    if (!button) {
      return;
    }

    const userId =
      button.dataset.userId;

    const suspend =
      button.classList.contains(
        "admin-suspend-user-button"
      );

    const accountStatus =
      suspend
        ? "SUSPENDED"
        : "ACTIVE";

    const confirmed =
  await showConfirm({
    title:
      suspend
        ? "Suspend user?"
        : "Reactivate user?",
    message:
      suspend
        ? "This user will lose access to their Coast Connect account until reactivated."
        : "This user's account access will be restored.",
    confirmText:
      suspend
        ? "Suspend user"
        : "Reactivate user",
    cancelText:
      "Cancel",
    danger:
      suspend,
  });

    if (!confirmed) {
      return;
    }

    button.disabled = true;

    const originalText =
      button.textContent;

    button.textContent =
      suspend
        ? "Suspending..."
        : "Reactivating...";

    try {

      const response =
        await fetch(
          `${API_BASE}/admin/users/${encodeURIComponent(
            userId
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
              accountStatus,
            }),
          }
        );

        if (
  handleUnauthorizedResponse(
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
          "Unable to update user."
        );
      }

      showMessage(
        data.message,
        "success"
      );

      await loadUsers();

    } catch (error) {

      console.error(error);

      showMessage(
        error.message,
        "error"
      );

      button.disabled =
        false;

      button.textContent =
        originalText;

    }

  }
);

adminSupportMessagesContainer?.addEventListener(
  "click",
  async (event) => {

    const button =
      event.target.closest(
        "button[data-message-id]"
      );

    if (!button) {
      return;
    }

    /*
      SAVE ADMIN NOTES
    */
    if (
      button.classList.contains(
        "admin-save-notes-button"
      )
    ) {
      const messageId =
        button.dataset.messageId;

      const textarea =
        adminSupportMessagesContainer.querySelector(
          `textarea.admin-notes-input[data-message-id="${messageId}"]`
        );

      if (!textarea) {
        return;
      }

      const notes =
        String(
          textarea.value || ""
        ).trim();

      button.disabled = true;

      const originalText =
        button.textContent;

      button.textContent =
        "Saving...";

      try {
        const response =
          await fetch(
            `${API_BASE}/admin/contact-messages/${encodeURIComponent(
              messageId
            )}/notes`,
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
                notes,
              }),
            }
          );

        if (
          handleUnauthorizedResponse(
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
            "Unable to save admin notes."
          );
        }

        showMessage(
          data.message ||
          "Admin notes saved.",
          "success"
        );

        button.textContent =
          "Saved";

        window.setTimeout(
          () => {
            button.disabled =
              false;

            button.textContent =
              originalText;
          },
          900
        );

      } catch (error) {
        console.error(
          "Save admin notes error:",
          error
        );

        showMessage(
          error.message ||
          "Unable to save admin notes.",
          "error"
        );

        button.disabled =
          false;

        button.textContent =
          originalText;
      }

      return;
    }

    /*
      MARK SUPPORT MESSAGE RESOLVED
    */
    if (
      button.classList.contains(
        "admin-resolve-message-button"
      )
    ) {
      const messageId =
        button.dataset.messageId;

      const confirmed =
  await showConfirm({
    title:
      "Resolve support message?",
    message:
      "This support message will be marked as resolved.",
    confirmText:
      "Mark resolved",
    cancelText:
      "Cancel",
    danger:
      false,
  });

      if (!confirmed) {
        return;
      }

      button.disabled = true;

      const originalText =
        button.textContent;

      button.textContent =
        "Resolving...";

      try {
        const response =
          await fetch(
            `${API_BASE}/admin/contact-messages/${encodeURIComponent(
              messageId
            )}/resolve`,
            {
              method: "PATCH",

              headers: {
                Authorization:
                  `Bearer ${token}`,

                Accept:
                  "application/json",
              },
            }
          );

        if (
          handleUnauthorizedResponse(
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
            "Unable to resolve support message."
          );
        }

        showMessage(
          data.message ||
          "Support message resolved.",
          "success"
        );

        await loadSupportMessages();

      } catch (error) {
        console.error(
          "Resolve support message error:",
          error
        );

        showMessage(
          error.message ||
          "Unable to resolve support message.",
          "error"
        );

        button.disabled =
          false;

        button.textContent =
          originalText;
      }

      return;
    }

  }
);


if (storedUser) {

  adminName.textContent =
    storedUser.fullName ||
    storedUser.name;

  adminEmail.textContent =
    storedUser.email;

  adminAvatar.textContent =
    (
      storedUser.fullName ||
      "A"
    )
      .charAt(0)
      .toUpperCase();

}

adminNotificationButton?.addEventListener(
  "click",
  (event) => {

    event.stopPropagation();

    const isOpen =
      !adminNotificationDropdown.hidden;

    adminNotificationDropdown.hidden =
      isOpen;

    adminNotificationButton.setAttribute(
      "aria-expanded",
      String(!isOpen)
    );

  }
);

adminNotificationList?.addEventListener(
  "click",
  async (event) => {

    const item =
      event.target.closest(
        ".admin-notification-item"
      );

    if (!item) {
      return;
    }

    const notificationId =
      item.dataset.notificationId;

    const entityType =
      String(
        item.dataset.entityType || ""
      ).toUpperCase();

  try {
  const response =
    await fetch(
      `${API_BASE}/admin/notifications/${encodeURIComponent(
        notificationId
      )}/read`,
      {
        method: "PATCH",

        headers: {
          Authorization:
            `Bearer ${token}`,

          Accept:
            "application/json",
        },
      }
    );

  if (
    handleUnauthorizedResponse(
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
      "Unable to mark notification as read."
    );
  }

 if (
  entityType ===
  "CONTACT_MESSAGE"
) {

  showAdminSection(
    "support"
  );

  await loadSupportMessages();

  adminNotificationDropdown.hidden =
    true;

  adminNotificationButton.setAttribute(
    "aria-expanded",
    "false"
  );

  await loadAdminNotifications();

  return;
}

} catch (error) {
  console.error(
    "Mark notification read error:",
    error
  );
}

  }
);

adminMarkAllReadButton?.addEventListener(
  "click",
  async (event) => {

    event.stopPropagation();

    adminMarkAllReadButton.disabled =
      true;

    const originalText =
      adminMarkAllReadButton.textContent;

    adminMarkAllReadButton.textContent =
      "Updating...";

    try {
      const response =
        await fetch(
          `${API_BASE}/admin/notifications/read-all`,
          {
            method: "PATCH",

            headers: {
              Authorization:
                `Bearer ${token}`,

              Accept:
                "application/json",
            },
          }
        );

      if (
        handleUnauthorizedResponse(
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
          "Unable to mark notifications as read."
        );
      }

      await loadAdminNotifications();

      showMessage(
        data.message ||
        "All notifications marked as read.",
        "success"
      );

    } catch (error) {
      console.error(
        "Mark all notifications read error:",
        error
      );

      showMessage(
        error.message ||
        "Unable to update notifications.",
        "error"
      );

    } finally {
      adminMarkAllReadButton.disabled =
        false;

      adminMarkAllReadButton.textContent =
        originalText;
    }

  }
);

document.addEventListener(
  "click",
  (event) => {

    if (
      adminNotificationDropdown &&
      adminNotificationButton &&
      !adminNotificationDropdown.contains(
        event.target
      ) &&
      !adminNotificationButton.contains(
        event.target
      )
    ) {

      adminNotificationDropdown.hidden =
        true;

      adminNotificationButton.setAttribute(
        "aria-expanded",
        "false"
      );

    }

  }
);


logoutButton.addEventListener(
  "click",
  () => {

    localStorage.removeItem(
      "coastConnectToken"
    );

    localStorage.removeItem(
      "coastConnectUser"
    );

    window.location.href =
      "login.html";

  }
);

async function loadAdminNotifications() {
  if (
    !adminNotificationList ||
    !adminNotificationBadge ||
    !adminNotificationSummary
  ) {
    return;
  }

  adminNotificationList.innerHTML =
    "<p>Loading notifications...</p>";

  try {
    const response =
      await fetch(
        `${API_BASE}/admin/notifications`,
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
      handleUnauthorizedResponse(
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
        "Unable to load notifications."
      );
    }

    const notifications =
      Array.isArray(
        data.notifications
      )
        ? data.notifications
        : [];

    const unreadCount =
      Number(
        data.unreadCount || 0
      );

    if (unreadCount > 0) {
      adminNotificationBadge.hidden =
        false;

      adminNotificationBadge.textContent =
        unreadCount > 99
          ? "99+"
          : String(unreadCount);

      adminNotificationSummary.textContent =
        `${unreadCount} unread`;
    } else {
      adminNotificationBadge.hidden =
        true;

      adminNotificationBadge.textContent =
        "0";

      adminNotificationSummary.textContent =
        "No unread notifications";
    }

    if (
      notifications.length === 0
    ) {
      adminNotificationList.innerHTML =
        "<p>No notifications yet.</p>";

      return;
    }

    adminNotificationList.innerHTML =
      notifications
        .map(
          (item) => `
           <button
            type="button"
            class="admin-notification-item ${
                item.is_read
                ? "read"
                : "unread"
            }"
            data-notification-id="${item.id}"
            data-entity-type="${item.entity_type || ""}"
            data-entity-id="${item.entity_id || ""}"
            >

              <strong>
                ${item.title || "Notification"}
              </strong>

              <span>
                ${item.message || ""}
              </span>

            </button>
          `
        )
        .join("");

  } catch (error) {
    console.error(
      "Load admin notifications error:",
      error
    );

    adminNotificationList.innerHTML =
      "<p>Unable to load notifications.</p>";
  }
}

const savedAdminSection =
  sessionStorage.getItem(
    "adminActiveSection"
  ) || "overview";

showAdminSection(
  savedAdminSection
);

if (
  savedAdminSection ===
  "overview"
) {
  loadOverview();
}

if (
  savedAdminSection ===
  "providers"
) {
  loadProviders();
}

if (
  savedAdminSection ===
  "provider-verifications"
) {
  loadProviderVerifications();
}

if (
  savedAdminSection ===
  "restaurants"
) {
  loadRestaurants();
}

if (
  savedAdminSection ===
  "users"
) {
  loadUsers();
}

if (
  savedAdminSection ===
  "support"
) {
  loadSupportMessages();
}

loadAdminNotifications();


let selectedManualPayout = null;

const manualPayoutModal =
  document.getElementById(
    "manualPayoutModal"
  );

const manualPayoutProviderName =
  document.getElementById(
    "manualPayoutProviderName"
  );

const manualPayoutAmount =
  document.getElementById(
    "manualPayoutAmount"
  );

const manualPayoutMethod =
  document.getElementById(
    "manualPayoutMethod"
  );

const manualPayoutReference =
  document.getElementById(
    "manualPayoutReference"
  );

const manualPayoutNotes =
  document.getElementById(
    "manualPayoutNotes"
  );

const manualPayoutModalError =
  document.getElementById(
    "manualPayoutModalError"
  );

const confirmManualPayoutButton =
  document.getElementById(
    "confirmManualPayoutButton"
  );

function openManualPayoutModal(
  payout
) {
  selectedManualPayout =
    payout;

  manualPayoutProviderName.textContent =
    payout.provider_name ||
    "Provider";

  manualPayoutAmount.textContent =
    formatMoney(
      payout.provider_share_amount,
      payout.currency || "KES"
    );

  manualPayoutMethod.value =
    "";

  manualPayoutReference.value =
    "";

  manualPayoutNotes.value =
    "";

  manualPayoutModalError.hidden =
    true;

  manualPayoutModalError.textContent =
    "";

  confirmManualPayoutButton.disabled =
    false;

  confirmManualPayoutButton.textContent =
    "Mark as Paid";

  manualPayoutModal.hidden =
    false;

  document.body.style.overflow =
    "hidden";

  requestAnimationFrame(() => {
    manualPayoutModal.classList.add(
      "is-visible"
    );

    manualPayoutMethod.focus();
  });
}

function closeManualPayoutModal() {
  manualPayoutModal.classList.remove(
    "is-visible"
  );

  setTimeout(() => {
    manualPayoutModal.hidden =
      true;

    document.body.style.overflow =
      "";

    selectedManualPayout =
      null;
  }, 160);
}

manualPayoutModal
  ?.querySelectorAll(
    "[data-manual-payout-close]"
  )
  .forEach(
    (element) => {
      element.addEventListener(
        "click",
        closeManualPayoutModal
      );
    }
  );

adminPayoutsContainer?.addEventListener(
  "click",
  (event) => {
    const button =
      event.target.closest(
        ".admin-mark-payout-paid-button"
      );

    if (!button) {
      return;
    }

    const paymentId =
      button.dataset.paymentId;

    const payout =
      Array.isArray(
        window.adminProviderPayouts
      )
        ? window.adminProviderPayouts.find(
            (item) =>
              item.id === paymentId
          )
        : null;

    if (!payout) {
      showMessage(
        "Provider payout information could not be found.",
        "error"
      );

      return;
    }

    openManualPayoutModal(
      payout
    );
  }
);

confirmManualPayoutButton?.addEventListener(
  "click",
  async () => {
    if (
      !selectedManualPayout
    ) {
      return;
    }

    const payoutMethodValue =
      String(
        manualPayoutMethod.value ||
        ""
      ).trim();

    const payoutReferenceValue =
      String(
        manualPayoutReference.value ||
        ""
      ).trim();

    const notesValue =
      String(
        manualPayoutNotes.value ||
        ""
      ).trim();

    if (!payoutMethodValue) {
      manualPayoutModalError.textContent =
        "Please select the payment method.";

      manualPayoutModalError.hidden =
        false;

      manualPayoutMethod.focus();

      return;
    }

    if (!payoutReferenceValue) {
      manualPayoutModalError.textContent =
        "Please enter the payment reference.";

      manualPayoutModalError.hidden =
        false;

      manualPayoutReference.focus();

      return;
    }

    manualPayoutModalError.hidden =
      true;

    confirmManualPayoutButton.disabled =
      true;

    confirmManualPayoutButton.textContent =
      "Recording...";

    try {
      const response =
        await fetch(
          `${API_BASE}/admin/provider-payouts/${encodeURIComponent(
            selectedManualPayout.id
          )}/mark-paid`,
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
              JSON.stringify({
                payoutMethod:
                  payoutMethodValue,

                payoutReference:
                  payoutReferenceValue,

                notes:
                  notesValue,
              }),
          }
        );

      if (
        handleUnauthorizedResponse(
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
          "Unable to record provider payout."
        );
      }

      closeManualPayoutModal();

      showMessage(
        "Provider payout recorded successfully.",
        "success"
      );

      await Promise.all([
        loadProviderPayouts(),
        loadProviderPayoutHistory(),
      ]);

    } catch (error) {
      console.error(
        "Record provider payout error:",
        error
      );

      manualPayoutModalError.textContent =
        error.message ||
        "Unable to record provider payout.";

      manualPayoutModalError.hidden =
        false;

      confirmManualPayoutButton.disabled =
        false;

      confirmManualPayoutButton.textContent =
        "Mark as Paid";
    }
  }
);


async function approveProviderVerification(
  providerId
) {

  const confirmed =
    window.confirm(
      "Approve this provider's professional verification?"
    );

  if (!confirmed) {
    return;
  }

  try {

    const response = await fetch(
      `${API_BASE}/admin/provider-verifications/${providerId}/approve`,
      {
        method: "PATCH",

        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    if (
      handleUnauthorizedResponse(response)
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
        "Unable to approve provider verification."
      );
    }

    alert(
      data.message ||
      "Provider verification approved."
    );

    closeProviderVerificationReview();

    await loadProviderVerifications();

  } catch (error) {

    console.error(
      "Approve provider verification error:",
      error
    );

    alert(
      error.message ||
      "Unable to approve provider verification."
    );
  }
}

async function rejectProviderVerification(
  providerId
) {

  const rejectionReason =
    window.prompt(
      "Enter the reason for rejecting this verification:"
    );

  if (
    rejectionReason === null
  ) {
    return;
  }

  if (
    !rejectionReason.trim()
  ) {
    alert(
      "A rejection reason is required."
    );

    return;
  }

  try {

    const response = await fetch(
      `${API_BASE}/admin/provider-verifications/${providerId}/reject`,
      {
        method: "PATCH",

        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          rejectionReason:
            rejectionReason.trim(),
        }),
      }
    );

    if (
      handleUnauthorizedResponse(response)
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
        "Unable to reject provider verification."
      );
    }

    alert(
      data.message ||
      "Provider verification rejected."
    );

    closeProviderVerificationReview();

    await loadProviderVerifications();

  } catch (error) {

    console.error(
      "Reject provider verification error:",
      error
    );

    alert(
      error.message ||
      "Unable to reject provider verification."
    );
  }
}

window.reviewProviderVerification =
  reviewProviderVerification;

  window.approveProviderVerification =
  approveProviderVerification;

  window.rejectProviderVerification =
  rejectProviderVerification;