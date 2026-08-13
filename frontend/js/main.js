"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const mobileMenuButton = document.getElementById("mobileMenuButton");
  const mainNavigation = document.getElementById("mainNavigation");
  const heroSearchForm = document.getElementById("heroSearchForm");
  const currentYear = document.getElementById("currentYear");


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
    Array.isArray(
      storedUser?.roles
    )
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

  const isCustomer =
    userRoles.includes(
      "CUSTOMER"
    );

  const isProvider =
    userRoles.includes(
      "PROVIDER"
    );

  const isRestaurantOwner =
    userRoles.includes(
      "RESTAURANT_OWNER"
    );

    const isRestaurantStaff =
  userRoles.includes(
    "RESTAURANT_STAFF"
  );

    const isAdmin =
  userRoles.includes(
    "ADMIN"
  );
const homeRestaurantsCount =
  document.getElementById(
    "homeRestaurantsCount"
  );

const homeProvidersCount =
  document.getElementById(
    "homeProvidersCount"
  );

const homeReviewsCount =
  document.getElementById(
    "homeReviewsCount"
  );

const homeOrdersCount =
  document.getElementById(
    "homeOrdersCount"
  );

  const customerBookingsLink =
  document.getElementById(
    "customerBookingsLink"
  );

const providerDashboardLink =
  document.getElementById(
    "providerDashboardLink"
  );

const restaurantOwnerDashboardLink =
  document.getElementById(
    "restaurantOwnerDashboardLink"
  );

  const loginLink =
  document.getElementById(
    "loginLink"
  );

const joinLink =
  document.getElementById(
    "joinLink"
  );

const dashboardLink =
  document.getElementById(
    "dashboardLink"
  );

  const logoutButton =
  document.getElementById(
    "logoutButton"
  );

  const accountMenu =
  document.getElementById(
    "accountMenu"
  );

const accountMenuButton =
  document.getElementById(
    "accountMenuButton"
  );

const accountDropdown =
  document.getElementById(
    "accountDropdown"
  );

const accountAvatar =
  document.getElementById(
    "accountAvatar"
  );

const accountName =
  document.getElementById(
    "accountName"
  );

const accountDropdownName =
  document.getElementById(
    "accountDropdownName"
  );

const accountDropdownEmail =
  document.getElementById(
    "accountDropdownEmail"
  );

const accountDashboardLink =
  document.getElementById(
    "accountDashboardLink"
  );

if (storedUser) {
  console.log(
    "Logged in user detected"
  );

  if (loginLink) {
    loginLink.hidden =
      true;
  }

  if (joinLink) {
    joinLink.hidden =
      true;
  }

  if (dashboardLink) {
  dashboardLink.hidden = false;

  if (isAdmin) {
    dashboardLink.href =
      "admin-dashboard.html";

    dashboardLink.textContent =
      "Admin Dashboard";

  } else if (isProvider) {
    dashboardLink.href =
      "provider-dashboard.html";

    dashboardLink.textContent =
      "Provider Dashboard";

  } else if (isRestaurantStaff) {
    dashboardLink.href =
      "restaurant-staff-dashboard.html";

    dashboardLink.textContent =
      "Staff Dashboard";

  } else if (isRestaurantOwner) {
    dashboardLink.href =
      "restaurant-owner-dashboard.html";

    dashboardLink.textContent =
      "Restaurant Dashboard";

  } else if (isCustomer) {
    dashboardLink.href =
      "customer-bookings.html";

    dashboardLink.textContent =
      "My Bookings";
  }
}

  if (accountMenu) {
    accountMenu.hidden =
      false;
  }

  const displayName =
    String(
      storedUser.fullName ||
      storedUser.name ||
      "Account"
    ).trim();

  const firstName =
    displayName
      .split(" ")
      .filter(Boolean)[0] ||
    "Account";

  if (accountName) {
    accountName.textContent =
      firstName;
  }

  if (accountDropdownName) {
    accountDropdownName.textContent =
      displayName;
  }

  if (accountDropdownEmail) {
    accountDropdownEmail.textContent =
      storedUser.email || "";
  }

  if (accountAvatar) {
    accountAvatar.textContent =
      firstName
        .charAt(0)
        .toUpperCase();
  }

  if (accountDashboardLink) {
  if (isAdmin) {
    accountDashboardLink.href =
      "admin-dashboard.html";

    accountDashboardLink.textContent =
      "Admin Dashboard";
  } else if (isProvider) {
    accountDashboardLink.href =
      "provider-dashboard.html";

    accountDashboardLink.textContent =
      "Provider Dashboard";
  } else if (
    isRestaurantOwner
  ) {
    accountDashboardLink.href =
      "restaurant-owner-dashboard.html";

    accountDashboardLink.textContent =
      "Restaurant Dashboard";
  } else if (
    isCustomer
  ) {
    accountDashboardLink.href =
      "customer-bookings.html";

    accountDashboardLink.textContent =
      "My Bookings";
  }
}
} else {
  if (loginLink) {
    loginLink.hidden =
      false;
  }

  if (joinLink) {
    joinLink.hidden =
      false;
  }

  if (dashboardLink) {
    dashboardLink.hidden =
      true;
  }

  if (accountMenu) {
    accountMenu.hidden =
      true;
  }
}

logoutButton?.addEventListener(
  "click",
  () => {
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
      "index.html"
    );
  }
);

accountMenuButton?.addEventListener(
  "click",
  (event) => {
    event.stopPropagation();

    const isOpen =
      !accountDropdown.hidden;

    accountDropdown.hidden =
      isOpen;

    accountMenuButton.setAttribute(
      "aria-expanded",
      String(!isOpen)
    );
  }
);

document.addEventListener(
  "click",
  (event) => {
    if (
      accountMenu &&
      !accountMenu.contains(
        event.target
      )
    ) {
      accountDropdown.hidden =
        true;

      accountMenuButton?.setAttribute(
        "aria-expanded",
        "false"
      );
    }
  }
);


  async function loadHomeStats() {
  try {
    const response = await fetch(
      "https://coastconnectkenya.onrender.com/api/home/stats",
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
        "Unable to load platform statistics."
      );
    }

    const stats =
      data.stats || {};

    homeRestaurantsCount.textContent =
      Number(
        stats.restaurants || 0
      ).toLocaleString("en-KE");

    homeProvidersCount.textContent =
      Number(
        stats.providers || 0
      ).toLocaleString("en-KE");

    homeReviewsCount.textContent =
      Number(
        stats.reviews || 0
      ).toLocaleString("en-KE");

    homeOrdersCount.textContent =
      Number(
        stats.orders || 0
      ).toLocaleString("en-KE");
  } catch (error) {
    console.error(
      "Load homepage statistics error:",
      error
    );

    homeRestaurantsCount.textContent =
      "0";

    homeProvidersCount.textContent =
      "0";

    homeReviewsCount.textContent =
      "0";

    homeOrdersCount.textContent =
      "0";
  }
}

if (
  homeRestaurantsCount &&
  homeProvidersCount &&
  homeReviewsCount &&
  homeOrdersCount
) {
  loadHomeStats();
}
  if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
  }

  if (mobileMenuButton && mainNavigation) {
    mobileMenuButton.addEventListener("click", () => {
      const isOpen = mainNavigation.classList.toggle("open");

      mobileMenuButton.setAttribute("aria-expanded", String(isOpen));
      document.body.classList.toggle("menu-open", isOpen);
    });

    document.addEventListener("click", (event) => {
  const isMenuOpen =
    mainNavigation.classList.contains("open");

  if (!isMenuOpen) {
    return;
  }

  const clickedInsideMenu =
    mainNavigation.contains(event.target);

  const clickedMenuButton =
    mobileMenuButton.contains(event.target);

  if (
    clickedInsideMenu ||
    clickedMenuButton
  ) {
    return;
  }

  mainNavigation.classList.remove("open");

  mobileMenuButton.setAttribute(
    "aria-expanded",
    "false"
  );

  document.body.classList.remove(
    "menu-open"
  );
});

    mainNavigation.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", (event) => {
    const destination =
      link.getAttribute("href");

    mainNavigation.classList.remove("open");

    mobileMenuButton.setAttribute(
      "aria-expanded",
      "false"
    );

    document.body.classList.remove(
      "menu-open"
    );

    if (
      destination &&
      destination !== "#"
    ) {
      window.location.href =
        destination;
    }
  });
});
    window.addEventListener("resize", () => {
      if (window.innerWidth > 860) {
        mainNavigation.classList.remove("open");
        mobileMenuButton.setAttribute("aria-expanded", "false");
        document.body.classList.remove("menu-open");
      }
    });
  }

 if (heroSearchForm) {
  heroSearchForm.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();

      const searchType =
        document.getElementById(
          "searchType"
        )?.value || "restaurants";

      const searchLocation =
        document.getElementById(
          "searchLocation"
        )?.value || "";

      const params =
        new URLSearchParams();

      if (searchLocation) {
        params.set(
          "location",
          searchLocation
        );
      }

      if (
        searchType ===
        "restaurants"
      ) {
        const query =
          params.toString();

        window.location.href =
          query
            ? `restaurants.html?${query}`
            : "restaurants.html";

        return;
      }

      params.set(
        "category",
        searchType
      );

      window.location.href =
  `providers.html?${params.toString()}`;
    }
  );
}
});