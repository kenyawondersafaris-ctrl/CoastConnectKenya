"use strict";

const API_BASE_URL =
  "https://coastconnectkenya.onrender.com/api";


const urlParams =
  new URLSearchParams(
    window.location.search
  );

const requestedLocation =
  String(
    urlParams.get("location") || ""
  )
    .trim()
    .toLowerCase();


const destinationTitle =
  document.getElementById(
    "destinationTitle"
  );

const destinationSubtitle =
  document.getElementById(
    "destinationSubtitle"
  );

const destinationMessage =
  document.getElementById(
    "destinationMessage"
  );

const restaurantsHeading =
  document.getElementById(
    "restaurantsHeading"
  );

const providersHeading =
  document.getElementById(
    "providersHeading"
  );

const viewAllRestaurantsLink =
  document.getElementById(
    "viewAllRestaurantsLink"
  );

const viewAllProvidersLink =
  document.getElementById(
    "viewAllProvidersLink"
  );

const destinationRestaurantsGrid =
  document.getElementById(
    "destinationRestaurantsGrid"
  );

const destinationProvidersGrid =
  document.getElementById(
    "destinationProvidersGrid"
  );


function formatLocationName(
  location
) {
  if (!location) {
    return "Coastal Kenya";
  }

  return location
    .split("-")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}


function showMessage(
  message = "",
  type = ""
) {
  if (!destinationMessage) {
    return;
  }

  destinationMessage.textContent =
    message;

  destinationMessage.className =
    type
      ? `page-message ${type}`
      : "page-message";
}


function initializeDestinationPage() {

  const locationName =
    formatLocationName(
      requestedLocation
    );

  if (destinationTitle) {
    destinationTitle.textContent =
      locationName;
  }

  if (destinationSubtitle) {
    destinationSubtitle.textContent =
      `Discover restaurants and trusted local services available in ${locationName}.`;
  }

  if (restaurantsHeading) {
    restaurantsHeading.textContent =
      `Restaurants in ${locationName}`;
  }

  if (providersHeading) {
    providersHeading.textContent =
      `Services in ${locationName}`;
  }

  if (requestedLocation) {

    if (
      viewAllRestaurantsLink
    ) {
      viewAllRestaurantsLink.href =
        `restaurants.html?location=${encodeURIComponent(
          requestedLocation
        )}`;
    }

    if (
      viewAllProvidersLink
    ) {
      viewAllProvidersLink.href =
        `providers.html?location=${encodeURIComponent(
          requestedLocation
        )}`;
    }

  }
loadDestinationProviders();
loadDestinationRestaurants();
}

async function loadDestinationRestaurants() {

  if (!destinationRestaurantsGrid) {
    return;
  }

  destinationRestaurantsGrid.innerHTML =
    `
      <p>
        Loading restaurants...
      </p>
    `;

  try {

    const params =
      new URLSearchParams();

    if (requestedLocation) {
      params.set(
        "location",
        requestedLocation
      );
    }

    params.set(
      "limit",
      "12"
    );

    const response =
      await fetch(
        `${API_BASE_URL}/restaurants?${params.toString()}`,
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
        "Unable to load restaurants."
      );
    }

    renderDestinationRestaurants(
      Array.isArray(
        data.restaurants
      )
        ? data.restaurants
        : []
    );

  } catch (error) {

    console.error(
      "Load destination restaurants error:",
      error
    );

    destinationRestaurantsGrid.innerHTML =
      `
        <p>
          Unable to load restaurants.
        </p>
      `;
  }
}

function renderDestinationRestaurants(
  restaurants
) {

  if (!restaurants.length) {

    destinationRestaurantsGrid.innerHTML =
      `
        <div class="restaurants-empty-state">
          <h3>
            No restaurants available
          </h3>

          <p>
            There are currently no approved
            restaurants in
            ${escapeHtml(
              formatLocationName(
                requestedLocation
              )
            )}.
          </p>
        </div>
      `;

    return;
  }

  destinationRestaurantsGrid.innerHTML =
    restaurants
      .map(
        (restaurant) => `
          <article class="restaurant-card">

            <div class="destination-restaurant-card-image">

              ${
                restaurant.coverImage
                  ? `
                    <img
                      src="${escapeHtml(
                        restaurant.coverImage
                      )}"
                      alt="${escapeHtml(
                        restaurant.name
                      )}"
                    >
                  `
                  : `
                    <div class="restaurant-image-placeholder">
                      🍽️
                    </div>
                  `
              }

            </div>

            <div class="destination-restaurant-card-content">

              <div class="destination-restaurant-card-header">

                <h3>
                  ${escapeHtml(
                    restaurant.name
                  )}
                </h3>

                <span>
                  ${Number(
                    restaurant.rating ||
                    0
                  ).toFixed(1)}
                  ★
                </span>

              </div>

              <p>
                ${escapeHtml(
                  restaurant.shortDescription ||
                  "Discover food and dining in this destination."
                )}
              </p>

              <div class="destination-restaurant-meta">

                <span>
                  ${escapeHtml(
                    restaurant.locationName ||
                    formatLocationName(
                      requestedLocation
                    )
                  )}
                </span>

                <span>
                  ${
                    restaurant.isOpen
                      ? "Open now"
                      : "Closed"
                  }
                </span>

              </div>

              <a
                href="restaurant-details.html?restaurantId=${encodeURIComponent(
                  restaurant.id
                )}"
                class="destination-restaurant-view-button"
              >
                View Restaurant
              </a>

            </div>

          </article>
        `
      )
      .join("");
}


if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initializeDestinationPage
  );
} else {
  initializeDestinationPage();
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

async function loadDestinationProviders() {

  if (
    !destinationProvidersGrid
  ) {
    return;
  }

  destinationProvidersGrid.innerHTML =
    `
      <p>
        Loading services...
      </p>
    `;

  try {

    const params =
      new URLSearchParams();

    if (requestedLocation) {
      params.set(
        "location",
        requestedLocation
      );
    }

    const response =
      await fetch(
        `${API_BASE_URL}/providers?${params.toString()}`,
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
        "Unable to load services."
      );
    }

    renderDestinationProviders(
      Array.isArray(
        data.providers
      )
        ? data.providers
        : []
    );

  } catch (error) {

    console.error(
      "Load destination providers error:",
      error
    );

    destinationProvidersGrid.innerHTML =
      `
        <p>
          Unable to load services.
        </p>
      `;
  }
}


function renderDestinationProviders(
  providers
) {

  if (!providers.length) {

    destinationProvidersGrid.innerHTML =
      `
        <div class="providers-empty-state">
          <h3>
            No services available
          </h3>

          <p>
            There are currently no available services in
            ${formatLocationName(
              requestedLocation
            )}.
          </p>
        </div>
      `;

    return;
  }

  destinationProvidersGrid.innerHTML =
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

                <h3>
                  ${escapeHtml(
                    provider.full_name
                  )}
                </h3>

                <p>
                  ${escapeHtml(
                    provider.title
                  )}
                </p>

              </div>

            </div>

            <div class="provider-card-body">

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
               class="destination-provider-view-button"
              >
                View Service
              </a>

            </div>

          </article>
        `
      )
      .join("");
}