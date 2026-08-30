"use strict";

const API_BASE_URL =
  "https://coastconnectkenya.onrender.com/api";

const searchArea =
  document.getElementById(
    "searchArea"
  );

const categoryFilter =
  document.getElementById(
    "categoryFilter"
  );

  const urlParams =
  new URLSearchParams(
    window.location.search
  );

const requestedCategory =
  String(
    urlParams.get("category") || ""
  )
    .trim()
    .toLowerCase();

const searchProvidersButton =
  document.getElementById(
    "searchProvidersButton"
  );

const providersMessage =
  document.getElementById(
    "providersMessage"
  );

const providersGrid =
  document.getElementById(
    "providersGrid"
  );

let serviceCategories = [];

async function initializeProvidersPage() {

  await loadServiceCategories();

  await loadProviders();

}

if (
  document.readyState === "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initializeProvidersPage
  );
} else {
  initializeProvidersPage();
}

function showMessage(
  message = "",
  type = ""
) {
  providersMessage.textContent =
    message;

  providersMessage.className =
    type
      ? `page-message ${type}`
      : "page-message";
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
    ""
  );
}

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
      await response.json();

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.message ||
        "Unable to load service categories."
      );
    }

    serviceCategories =
      Array.isArray(
        data.categories
      )
        ? data.categories
        : [];

    renderServiceCategories();
  } catch (error) {
    console.error(
      "Load categories error:",
      error
    );

    categoryFilter.innerHTML =
      `
        <option value="">
          All Categories
        </option>
      `;

    showMessage(
      "Service categories are currently unavailable.",
      "error"
    );
  }
}

function renderServiceCategories() {
  categoryFilter.innerHTML =
    `
      <option value="">
        All Categories
      </option>
    `;

  serviceCategories.forEach(
    (category) => {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        category.id;

      option.textContent =
        category.name;

      categoryFilter.appendChild(
        option
      );
    }
  );

 if (requestedCategory) {

  const normalizeCategory =
    (value) =>
      String(value || "")
        .trim()
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

  const matchedCategory =
    serviceCategories.find(
      (category) =>
        normalizeCategory(
          category.name
        ) === requestedCategory
    );

  if (matchedCategory) {
    categoryFilter.value =
      matchedCategory.id;
  }
}
}

async function loadProviders() {
  providersGrid.innerHTML =
    `
      <p>
        Loading providers...
      </p>
    `;

  showMessage();

  const params =
    new URLSearchParams();

  const search =
    searchArea.value.trim();

  const categoryId =
    categoryFilter.value;

  if (search) {
    params.set(
      "search",
      search
    );
  }

  if (categoryId) {
    params.set(
      "categoryId",
      categoryId
    );
  }

  const queryString =
    params.toString();

  const endpoint =
    queryString
      ? `${API_BASE_URL}/providers?${queryString}`
      : `${API_BASE_URL}/providers`;

  try {
    const response =
      await fetch(
        endpoint,
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
        "Unable to load providers."
      );
    }

    const providers =
      Array.isArray(
        data.providers
      )
        ? data.providers
        : [];

    renderProviders(
      providers
    );
  } catch (error) {
    console.error(
      "Load providers error:",
      error
    );

    providersGrid.innerHTML =
      `
        <p>
          Unable to load providers.
        </p>
      `;

    showMessage(
      error.message ||
        "Unable to load providers.",
      "error"
    );
  }
}

function renderProviders(
  providers
) {
  if (providers.length === 0) {
    providersGrid.innerHTML =
      `
        <div class="providers-empty-state">
          <h2>
            No available providers found
          </h2>

          <p>
            Try another service category or search area.
          </p>
        </div>
      `;

    return;
  }

  providersGrid.innerHTML =
    providers
      .map(
        (provider) => `
          <article class="provider-card">

            <div class="provider-card-top">

              <div class="provider-avatar">

                ${
                  provider.profile_photo
                    ? `
                      <img
                        src="${escapeHtml(
                          provider.profile_photo
                        )}"
                        alt="${escapeHtml(
                          provider.full_name
                        )}"
                      >
                    `
                    : `
                      <span>
                        ${escapeHtml(
                          String(
                            provider.full_name ||
                            "P"
                          )
                            .charAt(0)
                            .toUpperCase()
                        )}
                      </span>
                    `
                }

              </div>

              <div>

                <span class="provider-category">
                  ${escapeHtml(
                    provider.category_name
                  )}
                </span>

                <h2>
                  ${escapeHtml(
                    provider.full_name
                  )}
                </h2>

                <p>
                  ${escapeHtml(
                    provider.service_area ||
                    "Service area not specified"
                  )}
                </p>

              </div>

            </div>

            <div class="provider-card-body">

              <h3>
                ${escapeHtml(
                  provider.title
                )}
              </h3>

              <p>
                ${escapeHtml(
                  provider.description ||
                  "No service description provided."
                )}
              </p>

              <div class="provider-meta">

                <span>
                  Rating:
                  ${Number(
                    provider.average_rating ||
                    0
                  ).toFixed(1)}
                </span>

                <span>
                  ${Number(
                    provider.total_reviews ||
                    0
                  )}
                  reviews
                </span>

                <span>
                  ${
                    provider.verification_status ===
                    "APPROVED"
                      ? "Verified"
                      : "Verification pending"
                  }
                </span>

              </div>

            </div>

            <div class="provider-card-footer">

              <div>

                <strong>
                  ${formatMoney(
                    provider.price
                  )}
                </strong>

                <span>
                  ${escapeHtml(
                    formatPricingType(
                      provider.pricing_type
                    )
                  )}
                </span>

              </div>

              <a
                href="provider-details.html?providerId=${encodeURIComponent(
                  provider.id
                )}&serviceId=${encodeURIComponent(
                  provider.service_id
                )}"
                class="provider-view-button"
              >
                View Service
              </a>

            </div>

          </article>
        `
      )
      .join("");
}

searchProvidersButton?.addEventListener(
  "click",
  loadProviders
);

searchArea?.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key === "Enter"
    ) {
      event.preventDefault();
      loadProviders();
    }
  }
);

categoryFilter?.addEventListener(
  "change",
  loadProviders
);