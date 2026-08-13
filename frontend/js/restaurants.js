"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const API_BASE_URL = "http://localhost:5000/api";

  const restaurantSearchForm = document.getElementById(
    "restaurantSearchForm"
  );

  const restaurantSearch = document.getElementById("restaurantSearch");
  const restaurantLocation = document.getElementById("restaurantLocation");
  const filterLocation = document.getElementById("filterLocation");
  const restaurantSort = document.getElementById("restaurantSort");

  const restaurantGrid = document.getElementById("restaurantGrid");
  const restaurantStatus = document.getElementById("restaurantStatus");
  const restaurantResultCount = document.getElementById(
    "restaurantResultCount"
  );

  const restaurantEmptyState = document.getElementById(
    "restaurantEmptyState"
  );

  const restaurantPagination = document.getElementById(
    "restaurantPagination"
  );

  const activeFilters = document.getElementById("activeFilters");
  const applyFiltersButton = document.getElementById(
    "applyFiltersButton"
  );

  const clearFiltersButton = document.getElementById(
    "clearFiltersButton"
  );

  const resetSearchButton = document.getElementById(
    "resetSearchButton"
  );

  const mobileFilterButton = document.getElementById(
    "mobileFilterButton"
  );

  const restaurantFilters = document.getElementById(
    "restaurantFilters"
  );

  const state = {
    page: 1,
    limit: 12,
    search: "",
    location: "",
    cuisines: [],
    priceRange: "",
    rating: "",
    openNow: false,
    verified: false,
    sort: "recommended",
  };

  function getSelectedCheckboxValues(name) {
    return Array.from(
      document.querySelectorAll(
        `input[name="${name}"]:checked`
      )
    ).map((input) => input.value);
  }

  function getSelectedRadioValue(name) {
    return (
      document.querySelector(
        `input[name="${name}"]:checked`
      )?.value || ""
    );
  }

  function syncFiltersToState() {
    state.location = filterLocation?.value || "";
    state.cuisines = getSelectedCheckboxValues("cuisine");
    state.priceRange = getSelectedRadioValue("priceRange");
    state.rating = getSelectedRadioValue("rating");
    state.openNow =
      document.getElementById("openNowFilter")?.checked || false;
    state.verified =
      document.getElementById("verifiedFilter")?.checked || false;
    state.sort = restaurantSort?.value || "recommended";
  }

  function buildQueryString() {
    const params = new URLSearchParams();

    params.set("page", String(state.page));
    params.set("limit", String(state.limit));

    if (state.search) {
      params.set("search", state.search);
    }

    if (state.location) {
      params.set("location", state.location);
    }

    if (state.cuisines.length > 0) {
      params.set("cuisines", state.cuisines.join(","));
    }

    if (state.priceRange) {
      params.set("priceRange", state.priceRange);
    }

    if (state.rating) {
      params.set("rating", state.rating);
    }

    if (state.openNow) {
      params.set("openNow", "true");
    }

    if (state.verified) {
      params.set("verified", "true");
    }

    if (state.sort) {
      params.set("sort", state.sort);
    }

    return params.toString();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatPriceRange(priceRange) {
    const labels = {
      budget: "Budget friendly",
      moderate: "Moderately priced",
      premium: "Premium dining",
    };

    return labels[priceRange] || "Pricing available";
  }

  function createRestaurantCard(restaurant) {
    const cuisines = Array.isArray(restaurant.cuisines)
      ? restaurant.cuisines.join(", ")
      : restaurant.cuisine || "Restaurant";

    const imageMarkup = restaurant.coverImage
      ? `
        <img
          src="${escapeHtml(restaurant.coverImage)}"
          alt="${escapeHtml(restaurant.name)}"
          loading="lazy"
        >
      `
      : "";

    const verifiedBadge = restaurant.isVerified
      ? `
        <span class="restaurant-badge verified">
          Verified
        </span>
      `
      : "<span></span>";

    const openBadge = restaurant.isOpen
      ? `
        <span class="restaurant-badge open">
          Open now
        </span>
      `
      : `
        <span class="restaurant-badge closed">
          Closed
        </span>
      `;

    const rating = Number(restaurant.rating || 0).toFixed(1);
    const reviewCount = Number(restaurant.reviewCount || 0);

    const detailsUrl = restaurant.slug
      ? `restaurant-details.html?slug=${encodeURIComponent(
          restaurant.slug
        )}`
      : `restaurant-details.html?id=${encodeURIComponent(
          restaurant.id
        )}`;

    return `
      <article class="restaurant-card">

        <div class="restaurant-card-image">
          ${imageMarkup}

          <div class="restaurant-badges">
            ${verifiedBadge}
            ${openBadge}
          </div>
        </div>

        <div class="restaurant-card-content">

          <div class="restaurant-card-heading">
            <h3>${escapeHtml(restaurant.name)}</h3>

            <span
              class="restaurant-rating"
              aria-label="${rating} out of 5 stars"
            >
              ★ ${rating}
            </span>
          </div>

          <div class="restaurant-meta">
            <span>${escapeHtml(restaurant.locationName)}</span>
            <span>${escapeHtml(cuisines)}</span>
            <span>${reviewCount} reviews</span>
          </div>

          <p class="restaurant-description">
            ${escapeHtml(
              restaurant.shortDescription ||
                "View menu, prices, opening hours and restaurant details."
            )}
          </p>

          <div class="restaurant-card-footer">
            <span class="restaurant-price">
              ${escapeHtml(
                formatPriceRange(restaurant.priceRange)
              )}
            </span>

            <a
              href="${detailsUrl}"
              class="restaurant-view-link"
            >
              View restaurant
            </a>
          </div>

        </div>
      </article>
    `;
  }

  function renderRestaurants(restaurants) {
    if (!Array.isArray(restaurants) || restaurants.length === 0) {
      restaurantGrid.innerHTML = "";
      restaurantEmptyState.hidden = false;
      return;
    }

    restaurantEmptyState.hidden = true;

    restaurantGrid.innerHTML = restaurants
      .map(createRestaurantCard)
      .join("");
  }

  function renderPagination(pagination) {
    restaurantPagination.innerHTML = "";

    const currentPage = Number(pagination?.page || 1);
    const totalPages = Number(pagination?.totalPages || 1);

    if (totalPages <= 1) {
      return;
    }

    const previousButton = document.createElement("button");
    previousButton.type = "button";
    previousButton.className = "pagination-button";
    previousButton.textContent = "Previous";
    previousButton.disabled = currentPage === 1;

    previousButton.addEventListener("click", () => {
      state.page = currentPage - 1;
      loadRestaurants();
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });

    restaurantPagination.appendChild(previousButton);

    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (
      let pageNumber = startPage;
      pageNumber <= endPage;
      pageNumber += 1
    ) {
      const pageButton = document.createElement("button");

      pageButton.type = "button";
      pageButton.className = "pagination-button";
      pageButton.textContent = String(pageNumber);

      if (pageNumber === currentPage) {
        pageButton.classList.add("active");
        pageButton.setAttribute("aria-current", "page");
      }

      pageButton.addEventListener("click", () => {
        state.page = pageNumber;
        loadRestaurants();

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      });

      restaurantPagination.appendChild(pageButton);
    }

    const nextButton = document.createElement("button");
    nextButton.type = "button";
    nextButton.className = "pagination-button";
    nextButton.textContent = "Next";
    nextButton.disabled = currentPage === totalPages;

    nextButton.addEventListener("click", () => {
      state.page = currentPage + 1;
      loadRestaurants();

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });

    restaurantPagination.appendChild(nextButton);
  }

  function renderActiveFilters() {
    const chips = [];

    if (state.search) {
      chips.push(`Search: ${state.search}`);
    }

    if (state.location) {
      chips.push(`Location: ${state.location}`);
    }

    state.cuisines.forEach((cuisine) => {
      chips.push(`Cuisine: ${cuisine}`);
    });

    if (state.priceRange) {
      chips.push(formatPriceRange(state.priceRange));
    }

    if (state.rating) {
      chips.push(`${state.rating}+ rating`);
    }

    if (state.openNow) {
      chips.push("Open now");
    }

    if (state.verified) {
      chips.push("Verified only");
    }

    activeFilters.innerHTML = chips
      .map(
        (chip) => `
          <span class="active-filter-chip">
            ${escapeHtml(chip)}
          </span>
        `
      )
      .join("");
  }

  function setLoadingState() {
    restaurantStatus.hidden = false;
    restaurantStatus.textContent = "Loading restaurants...";
    restaurantGrid.innerHTML = "";
    restaurantPagination.innerHTML = "";
    restaurantEmptyState.hidden = true;
  }

  function setErrorState(message) {
    restaurantStatus.hidden = false;
    restaurantStatus.textContent = message;
    restaurantGrid.innerHTML = "";
    restaurantPagination.innerHTML = "";
    restaurantEmptyState.hidden = true;
    restaurantResultCount.textContent = "0";
  }

  async function loadRestaurants() {
    setLoadingState();
    renderActiveFilters();

    try {
      const response = await fetch(
        `${API_BASE_URL}/restaurants?${buildQueryString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to load restaurants."
        );
      }

      restaurantStatus.hidden = true;

      const restaurants = data.restaurants || [];
      const pagination = data.pagination || {};

      restaurantResultCount.textContent = String(
        pagination.totalItems ?? restaurants.length
      );

      renderRestaurants(restaurants);
      renderPagination(pagination);
    } catch (error) {
      console.error("Restaurant loading error:", error);

      setErrorState(
        error.message ||
          "Restaurants could not be loaded. Please try again."
      );
    }
  }

  function clearAllFilters() {
    state.page = 1;
    state.search = "";
    state.location = "";
    state.cuisines = [];
    state.priceRange = "";
    state.rating = "";
    state.openNow = false;
    state.verified = false;
    state.sort = "recommended";

    restaurantSearch.value = "";
    restaurantLocation.value = "";
    filterLocation.value = "";
    restaurantSort.value = "recommended";

    document
      .querySelectorAll('input[name="cuisine"]')
      .forEach((input) => {
        input.checked = false;
      });

    const anyPrice = document.querySelector(
      'input[name="priceRange"][value=""]'
    );

    const anyRating = document.querySelector(
      'input[name="rating"][value=""]'
    );

    if (anyPrice) {
      anyPrice.checked = true;
    }

    if (anyRating) {
      anyRating.checked = true;
    }

    const openNowFilter =
      document.getElementById("openNowFilter");

    const verifiedFilter =
      document.getElementById("verifiedFilter");

    if (openNowFilter) {
      openNowFilter.checked = false;
    }

    if (verifiedFilter) {
      verifiedFilter.checked = false;
    }

    loadRestaurants();
  }

  function applyUrlParameters() {
    const params = new URLSearchParams(window.location.search);

    const urlLocation = params.get("location") || "";
    const urlSearch = params.get("search") || "";

    if (urlLocation) {
      state.location = urlLocation;
      restaurantLocation.value = urlLocation;
      filterLocation.value = urlLocation;
    }

    if (urlSearch) {
      state.search = urlSearch;
      restaurantSearch.value = urlSearch;
    }
  }

  restaurantSearchForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    state.page = 1;
    state.search = restaurantSearch.value.trim();
    state.location = restaurantLocation.value;

    filterLocation.value = state.location;

    loadRestaurants();
  });

  applyFiltersButton?.addEventListener("click", () => {
    state.page = 1;
    syncFiltersToState();

    restaurantLocation.value = state.location;

    loadRestaurants();

    if (window.innerWidth <= 860) {
      restaurantFilters.classList.remove("open");
      mobileFilterButton.setAttribute(
        "aria-expanded",
        "false"
      );
    }
  });

  restaurantSort?.addEventListener("change", () => {
    state.page = 1;
    state.sort = restaurantSort.value;
    loadRestaurants();
  });

  clearFiltersButton?.addEventListener(
    "click",
    clearAllFilters
  );

  resetSearchButton?.addEventListener(
    "click",
    clearAllFilters
  );

  mobileFilterButton?.addEventListener("click", () => {
    const isOpen =
      restaurantFilters.classList.toggle("open");

    mobileFilterButton.setAttribute(
      "aria-expanded",
      String(isOpen)
    );
  });

  applyUrlParameters();
  loadRestaurants();
});