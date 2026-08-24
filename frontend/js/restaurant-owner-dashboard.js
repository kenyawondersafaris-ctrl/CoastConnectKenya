"use strict";

const API_BASE_URL = "https://coastconnectkenya.onrender.com/api";
const socket =io("https://coastconnectkenya.onrender.com");

const token = localStorage.getItem("coastConnectToken");

let currentUser = null;
let ownerRestaurant = null;
let revenueTrendChartInstance = null;

try {
  currentUser = JSON.parse(
    localStorage.getItem("coastConnectUser") || "null"
  );
} catch (error) {
  console.error("Invalid stored user data:", error);
}

if (
  !token ||
  !currentUser ||
  currentUser.role !== "RESTAURANT_OWNER"
) {
  window.location.replace("login.html");
}

const sidebar = document.getElementById("sidebar");
const sidebarOverlay =
  document.getElementById("sidebarOverlay");

const openSidebarButton =
  document.getElementById("openSidebarButton");

const closeSidebarButton =
  document.getElementById("closeSidebarButton");

const navLinks =
  document.querySelectorAll(".nav-link");

const dashboardSections =
  document.querySelectorAll(".dashboard-section");

const pageTitle =
  document.getElementById("pageTitle");

const dashboardMessage =
  document.getElementById("dashboardMessage");

const sidebarOwnerName =
  document.getElementById("sidebarOwnerName");

const sidebarOwnerEmail =
  document.getElementById("sidebarOwnerEmail");

const welcomeOwnerName =
  document.getElementById("welcomeOwnerName");

const ownerAvatar =
  document.getElementById("ownerAvatar");

const topbarLogoutButton =
  document.getElementById("topbarLogoutButton");

const sidebarLogoutButton =
  document.getElementById("sidebarLogoutButton");

const viewRestaurantButton =
  document.getElementById("viewRestaurantButton");

const addMenuItemButton =
  document.getElementById("addMenuItemButton");

const approvalStatusBadge =
  document.getElementById("approvalStatusBadge");

const openStatusBadge =
  document.getElementById("openStatusBadge");

const menuItemsCount =
  document.getElementById("menuItemsCount");

const pendingOrdersCount =
  document.getElementById("pendingOrdersCount");

const pendingOrdersBadge =
  document.getElementById("pendingOrdersBadge");

const totalOrdersCount =
  document.getElementById("totalOrdersCount");

const averageRating =
  document.getElementById("averageRating");

const setupProgressText =
  document.getElementById("setupProgressText");

const setupProgressBar =
  document.getElementById("setupProgressBar");

const profileSetupCheck =
  document.getElementById("profileSetupCheck");

const menuSetupCheck =
  document.getElementById("menuSetupCheck");

const hoursSetupCheck =
  document.getElementById("hoursSetupCheck");

  const restaurantProfileForm =
  document.getElementById("restaurantProfileForm");

const restaurantFormMessage =
  document.getElementById("restaurantFormMessage");

const saveRestaurantButton =
  document.getElementById("saveRestaurantButton");

const restaurantName =
  document.getElementById("restaurantName");

const restaurantDescription =
  document.getElementById("restaurantDescription");

const restaurantPhone =
  document.getElementById("restaurantPhone");

const restaurantWhatsapp =
  document.getElementById("restaurantWhatsapp");

const restaurantEmail =
  document.getElementById("restaurantEmail");

const restaurantPriceRange =
  document.getElementById("restaurantPriceRange");

const restaurantCuisines =
  document.getElementById("restaurantCuisines");

const restaurantCoverImage =
  document.getElementById("restaurantCoverImage");

const restaurantCounty =
  document.getElementById("restaurantCounty");

const restaurantTown =
  document.getElementById("restaurantTown");

const restaurantArea =
  document.getElementById("restaurantArea");

const restaurantAddress =
  document.getElementById("restaurantAddress");

const restaurantLatitude =
  document.getElementById("restaurantLatitude");

const restaurantLongitude =
  document.getElementById("restaurantLongitude");

const restaurantIsHalal =
  document.getElementById("restaurantIsHalal");

const restaurantOffersDelivery =
  document.getElementById(
    "restaurantOffersDelivery"
  );

  const menuFormPanel =
  document.getElementById("menuFormPanel");

const menuFormTitle =
  document.getElementById("menuFormTitle");

const menuItemForm =
  document.getElementById("menuItemForm");

const editingMenuItemId =
  document.getElementById("editingMenuItemId");

const closeMenuFormButton =
  document.getElementById("closeMenuFormButton");

const cancelMenuFormButton =
  document.getElementById("cancelMenuFormButton");

const saveMenuItemButton =
  document.getElementById("saveMenuItemButton");

const menuFormMessage =
  document.getElementById("menuFormMessage");

const menuItemsContainer =
  document.getElementById("menuItemsContainer");

const menuItemsSummary =
  document.getElementById("menuItemsSummary");

const menuItemName =
  document.getElementById("menuItemName");

const menuItemCategory =
  document.getElementById("menuItemCategory");

const menuItemPrice =
  document.getElementById("menuItemPrice");

const menuItemPreparationMinutes =
  document.getElementById(
    "menuItemPreparationMinutes"
  );

const menuItemDescription =
  document.getElementById(
    "menuItemDescription"
  );

const menuItemImageUrl =
  document.getElementById("menuItemImageUrl");

  const menuItemImage =
  document.getElementById("menuItemImage");

const menuImagePreview =
  document.getElementById("menuImagePreview");

const menuPreviewImage =
  document.getElementById("menuPreviewImage");

const menuItemDisplayOrder =
  document.getElementById(
    "menuItemDisplayOrder"
  );

const menuItemIsAvailable =
  document.getElementById(
    "menuItemIsAvailable"
  );

const menuItemIsFeatured =
  document.getElementById(
    "menuItemIsFeatured"
  );

  const addGalleryImageButton =
  document.getElementById("addGalleryImageButton");

const galleryFormPanel =
  document.getElementById("galleryFormPanel");

const galleryImageForm =
  document.getElementById("galleryImageForm");

const galleryFormTitle =
  document.getElementById("galleryFormTitle");

const closeGalleryFormButton =
  document.getElementById("closeGalleryFormButton");

const cancelGalleryFormButton =
  document.getElementById("cancelGalleryFormButton");

const saveGalleryImageButton =
  document.getElementById("saveGalleryImageButton");

const editingGalleryImageId =
  document.getElementById("editingGalleryImageId");

const galleryImageFile =
  document.getElementById("galleryImageFile");

const galleryImageUrl =
  document.getElementById("galleryImageUrl");

const galleryPublicId =
  document.getElementById("galleryPublicId");

const galleryImagePreview =
  document.getElementById("galleryImagePreview");

const galleryPreviewImage =
  document.getElementById("galleryPreviewImage");

const galleryCaption =
  document.getElementById("galleryCaption");

const galleryDisplayOrder =
  document.getElementById("galleryDisplayOrder");

const galleryIsCover =
  document.getElementById("galleryIsCover");

const galleryFormMessage =
  document.getElementById("galleryFormMessage");

const galleryImagesSummary =
  document.getElementById("galleryImagesSummary");

const galleryImagesContainer =
  document.getElementById(
    "galleryImagesContainer"
  );

const openingHoursForm =
  document.getElementById(
    "openingHoursForm"
  );

const openingTime =
  document.getElementById(
    "openingTime"
  );

const closingTime =
  document.getElementById(
    "closingTime"
  );

const openingHoursMessage =
  document.getElementById(
    "openingHoursMessage"
  );

const saveOpeningHoursButton =
  document.getElementById(
    "saveOpeningHoursButton"
  );

const openMonday =
  document.getElementById(
    "openMonday"
  );

const openTuesday =
  document.getElementById(
    "openTuesday"
  );

const openWednesday =
  document.getElementById(
    "openWednesday"
  );

const openThursday =
  document.getElementById(
    "openThursday"
  );

const openFriday =
  document.getElementById(
    "openFriday"
  );

const openSaturday =
  document.getElementById(
    "openSaturday"
  );

const openSunday =
  document.getElementById(
    "openSunday"
  );

  const refreshOrdersButton =
  document.getElementById(
    "refreshOrdersButton"
  );

const ordersStatusFilter =
  document.getElementById(
    "ordersStatusFilter"
  );

const ordersContainer =
  document.getElementById(
    "ordersContainer"
  );

const ordersSummary =
  document.getElementById(
    "ordersSummary"
  );

const ordersMessage =
  document.getElementById(
    "ordersMessage"
  );

const ordersPendingCount =
  document.getElementById(
    "ordersPendingCount"
  );

const ordersAcceptedCount =
  document.getElementById(
    "ordersAcceptedCount"
  );

const ordersPreparingCount =
  document.getElementById(
    "ordersPreparingCount"
  );

const ordersReadyCount =
  document.getElementById(
    "ordersReadyCount"
  );

const ordersCompletedCount =
  document.getElementById(
    "ordersCompletedCount"
  );

const ordersPagination =
  document.getElementById(
    "ordersPagination"
  );

const previousOrdersPageButton =
  document.getElementById(
    "previousOrdersPageButton"
  );

const nextOrdersPageButton =
  document.getElementById(
    "nextOrdersPageButton"
  );

const ordersPageInfo =
  document.getElementById(
    "ordersPageInfo"
  );

  const reviewsAverageRating =
  document.getElementById(
    "reviewsAverageRating"
  );

const reviewsTotalCount =
  document.getElementById(
    "reviewsTotalCount"
  );

const restaurantReviewsContainer =
  document.getElementById(
    "restaurantReviewsContainer"
  );

  const analyticsTotalRevenue =
  document.getElementById(
    "analyticsTotalRevenue"
  );

const analyticsTotalOrders =
  document.getElementById(
    "analyticsTotalOrders"
  );

const analyticsPaidOrders =
  document.getElementById(
    "analyticsPaidOrders"
  );

const analyticsAverageOrder =
  document.getElementById(
    "analyticsAverageOrder"
  );

const analyticsCompletedOrders =
  document.getElementById(
    "analyticsCompletedOrders"
  );

const analyticsPendingOrders =
  document.getElementById(
    "analyticsPendingOrders"
  );

const analyticsCancelledOrders =
  document.getElementById(
    "analyticsCancelledOrders"
  );

  const analyticsTodayRevenue =
  document.getElementById(
    "analyticsTodayRevenue"
  );

const analyticsTodayOrders =
  document.getElementById(
    "analyticsTodayOrders"
  );

const analyticsWeekRevenue =
  document.getElementById(
    "analyticsWeekRevenue"
  );

const analyticsWeekOrders =
  document.getElementById(
    "analyticsWeekOrders"
  );

const analyticsMonthRevenue =
  document.getElementById(
    "analyticsMonthRevenue"
  );

const analyticsMonthOrders =
  document.getElementById(
    "analyticsMonthOrders"
  );

  const bestSellingItemsContainer =
  document.getElementById(
    "bestSellingItemsContainer"
  );

  const orderAvailabilityTitle =
  document.getElementById(
    "orderAvailabilityTitle"
  );

const orderAvailabilityDescription =
  document.getElementById(
    "orderAvailabilityDescription"
  );

const orderAvailabilityBadge =
  document.getElementById(
    "orderAvailabilityBadge"
  );

const toggleOrderAvailabilityButton =
  document.getElementById(
    "toggleOrderAvailabilityButton"
  );

const pauseOrdersForm =
  document.getElementById(
    "pauseOrdersForm"
  );

const pauseOrdersReason =
  document.getElementById(
    "pauseOrdersReason"
  );

const customPauseOrdersReason =
  document.getElementById(
    "customPauseOrdersReason"
  );

const cancelPauseOrdersButton =
  document.getElementById(
    "cancelPauseOrdersButton"
  );

const confirmPauseOrdersButton =
  document.getElementById(
    "confirmPauseOrdersButton"
  );

  const staffCountBadge =
  document.getElementById(
    "staffCountBadge"
  );

const addStaffButton =
  document.getElementById(
    "addStaffButton"
  );

const staffFormPanel =
  document.getElementById(
    "staffFormPanel"
  );

const closeStaffFormButton =
  document.getElementById(
    "closeStaffFormButton"
  );

const cancelStaffFormButton =
  document.getElementById(
    "cancelStaffFormButton"
  );

const staffForm =
  document.getElementById(
    "staffForm"
  );

const staffFullName =
  document.getElementById(
    "staffFullName"
  );

const staffRole =
  document.getElementById(
    "staffRole"
  );

const staffEmail =
  document.getElementById(
    "staffEmail"
  );

const staffPhone =
  document.getElementById(
    "staffPhone"
  );

const staffFormMessage =
  document.getElementById(
    "staffFormMessage"
  );

const saveStaffButton =
  document.getElementById(
    "saveStaffButton"
  );

const staffSummary =
  document.getElementById(
    "staffSummary"
  );

const staffContainer =
  document.getElementById(
    "staffContainer"
  );

  const ownerNotificationsButton =
  document.getElementById(
    "ownerNotificationsButton"
  );

const ownerNotificationsBadge =
  document.getElementById(
    "ownerNotificationsBadge"
  );

const ownerNotificationsPanel =
  document.getElementById(
    "ownerNotificationsPanel"
  );

const clearOwnerNotificationsButton =
  document.getElementById(
    "clearOwnerNotificationsButton"
  );

const ownerNotificationsContainer =
  document.getElementById(
    "ownerNotificationsContainer"
  );

  const addPromotionButton =
  document.getElementById(
    "addPromotionButton"
  );

const promotionFormPanel =
  document.getElementById(
    "promotionFormPanel"
  );

const promotionFormTitle =
  document.getElementById(
    "promotionFormTitle"
  );

const closePromotionFormButton =
  document.getElementById(
    "closePromotionFormButton"
  );

const cancelPromotionFormButton =
  document.getElementById(
    "cancelPromotionFormButton"
  );

const promotionForm =
  document.getElementById(
    "promotionForm"
  );

const editingPromotionId =
  document.getElementById(
    "editingPromotionId"
  );

const promotionName =
  document.getElementById(
    "promotionName"
  );

const promotionType =
  document.getElementById(
    "promotionType"
  );

const promotionCode =
  document.getElementById(
    "promotionCode"
  );

const promotionDiscountValue =
  document.getElementById(
    "promotionDiscountValue"
  );

const promotionMinimumOrder =
  document.getElementById(
    "promotionMinimumOrder"
  );

const promotionMaximumDiscount =
  document.getElementById(
    "promotionMaximumDiscount"
  );

const promotionTotalUsageLimit =
  document.getElementById(
    "promotionTotalUsageLimit"
  );

const promotionPerCustomerLimit =
  document.getElementById(
    "promotionPerCustomerLimit"
  );

const promotionStartsAt =
  document.getElementById(
    "promotionStartsAt"
  );

const promotionEndsAt =
  document.getElementById(
    "promotionEndsAt"
  );

const promotionDescription =
  document.getElementById(
    "promotionDescription"
  );

const promotionIsActive =
  document.getElementById(
    "promotionIsActive"
  );

const promotionFormMessage =
  document.getElementById(
    "promotionFormMessage"
  );

const savePromotionButton =
  document.getElementById(
    "savePromotionButton"
  );

const promotionsSummary =
  document.getElementById(
    "promotionsSummary"
  );

const promotionsContainer =
  document.getElementById(
    "promotionsContainer"
  );

  const ownerAccountForm =
  document.getElementById(
    "ownerAccountForm"
  );

const ownerAccountFullName =
  document.getElementById(
    "ownerAccountFullName"
  );

const ownerAccountEmail =
  document.getElementById(
    "ownerAccountEmail"
  );

const ownerAccountPhone =
  document.getElementById(
    "ownerAccountPhone"
  );

const ownerAccountMessage =
  document.getElementById(
    "ownerAccountMessage"
  );

const saveOwnerAccountButton =
  document.getElementById(
    "saveOwnerAccountButton"
  );

  const changePasswordForm =
  document.getElementById(
    "changePasswordForm"
  );

const currentPassword =
  document.getElementById(
    "currentPassword"
  );

const newPassword =
  document.getElementById(
    "newPassword"
  );

const confirmPassword =
  document.getElementById(
    "confirmPassword"
  );

const changePasswordMessage =
  document.getElementById(
    "changePasswordMessage"
  );

const changePasswordButton =
  document.getElementById(
    "changePasswordButton"
  );

  const addDeliveryZoneButton =
  document.getElementById(
    "addDeliveryZoneButton"
  );

const deliveryZoneFormPanel =
  document.getElementById(
    "deliveryZoneFormPanel"
  );

const deliveryZoneFormTitle =
  document.getElementById(
    "deliveryZoneFormTitle"
  );

const closeDeliveryZoneFormButton =
  document.getElementById(
    "closeDeliveryZoneFormButton"
  );

const deliveryZoneForm =
  document.getElementById(
    "deliveryZoneForm"
  );

const editingDeliveryZoneId =
  document.getElementById(
    "editingDeliveryZoneId"
  );

const deliveryZoneName =
  document.getElementById(
    "deliveryZoneName"
  );

const deliveryZoneMinimumOrder =
  document.getElementById(
    "deliveryZoneMinimumOrder"
  );

const deliveryZoneFee =
  document.getElementById(
    "deliveryZoneFee"
  );

const deliveryZoneMinutes =
  document.getElementById(
    "deliveryZoneMinutes"
  );

const deliveryZoneDescription =
  document.getElementById(
    "deliveryZoneDescription"
  );

const deliveryZoneActive =
  document.getElementById(
    "deliveryZoneActive"
  );

const deliveryZoneMessage =
  document.getElementById(
    "deliveryZoneMessage"
  );

const cancelDeliveryZoneButton =
  document.getElementById(
    "cancelDeliveryZoneButton"
  );

const saveDeliveryZoneButton =
  document.getElementById(
    "saveDeliveryZoneButton"
  );

const deliveryZonesSummary =
  document.getElementById(
    "deliveryZonesSummary"
  );

const deliveryZonesContainer =
  document.getElementById(
    "deliveryZonesContainer"
  );

  const restaurantAccountButton =
  document.getElementById(
    "restaurantAccountButton"
  );

const restaurantAccountDropdown =
  document.getElementById(
    "restaurantAccountDropdown"
  );

const restaurantAccountAvatar =
  document.getElementById(
    "restaurantAccountAvatar"
  );

const restaurantAccountName =
  document.getElementById(
    "restaurantAccountName"
  );

const restaurantDropdownName =
  document.getElementById(
    "restaurantDropdownName"
  );

const restaurantDropdownEmail =
  document.getElementById(
    "restaurantDropdownEmail"
  );

  const restaurantDashboardLink =
  document.getElementById(
    "restaurantDashboardLink"
  );

  const subscriptionStatusContainer =
  document.getElementById(
    "subscriptionStatusContainer"
  );

const subscriptionPlansContainer =
  document.getElementById(
    "subscriptionPlansContainer"
  );
  let restaurantStaff = [];
let ownerDeliveryZones = [];
let ownerReviews = [];
let ownerMenuItems = [];
let ownerGalleryImages = [];
let ownerOpeningHours = [];
let ownerOrders = [];
let currentOrdersPage = 1;
let currentOrdersStatus = "";
let isRestaurantAcceptingOrders = true;
let currentPauseReason = null;
let ownerNotifications = [];
let unreadOwnerNotifications = 0;
let ownerPromotions = [];
let currentSubscription = null;
let subscriptionPlans = [];

const sectionTitles = {
  overview: "Overview",
  restaurant: "Restaurant Profile",
  menu: "Menu Management",
  promotions: "Promotions & Discounts",
  gallery: "Restaurant Gallery",
  orders: "Orders",
  reviews: "Customer Reviews",
  staff: "Staff Management",
  hours: "Opening Hours",
  analytics: "Analytics",
  subscription: "Subscription",
  settings: "Settings",
  "delivery-zones":
  "Delivery Zones",
};

function renderOwnerNotifications() {
  ownerNotificationsBadge.textContent =
    String(unreadOwnerNotifications);

  ownerNotificationsBadge.hidden =
    unreadOwnerNotifications === 0;

  if (ownerNotifications.length === 0) {
    ownerNotificationsContainer.innerHTML = `
      <div class="owner-notifications-empty">
        No new notifications.
      </div>
    `;

    return;
  }

  ownerNotificationsContainer.innerHTML =
    ownerNotifications
      .map((notification) => {
        return `
          <article class="owner-notification-item">
            <div class="owner-notification-icon">
              ${notification.icon}
            </div>

            <div class="owner-notification-content">
              <strong>
                ${escapeHtml(notification.title)}
              </strong>

              <p>
                ${escapeHtml(notification.message)}
              </p>

              <span>
                ${escapeHtml(notification.time)}
              </span>
            </div>
          </article>
        `;
      })
      .join("");
}

function addOwnerNotification({
  icon = "🔔",
  title,
  message,
}) {
  ownerNotifications.unshift({
    id: crypto.randomUUID(),
    icon,
    title,
    message,
    time: new Date().toLocaleTimeString(
      "en-KE",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    ),
  });

  ownerNotifications =
    ownerNotifications.slice(0, 20);

  unreadOwnerNotifications += 1;

  renderOwnerNotifications();
}

function toggleOwnerNotifications() {
  const isHidden =
    ownerNotificationsPanel.hidden;

  ownerNotificationsPanel.hidden =
    !isHidden;

  if (isHidden) {

    unreadOwnerNotifications = 0;

    renderOwnerNotifications();

    fetch(
      `${API_BASE_URL}/restaurants/owner/notifications/read`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    ).catch(console.error);

  }
}
 // <-- Add this closing brace

 async function saveDeliveryZone(event) {
  event.preventDefault();

  deliveryZoneMessage.textContent = "";
  deliveryZoneMessage.className =
    "form-message";

  const zoneId =
    editingDeliveryZoneId.value.trim();

  const isEditing =
    Boolean(zoneId);

  const name =
    deliveryZoneName.value.trim();

  const minimumOrderAmount =
    Number(
      deliveryZoneMinimumOrder.value || 0
    );

  const deliveryFee =
    Number(
      deliveryZoneFee.value || 0
    );

  const estimatedDeliveryMinutes =
    deliveryZoneMinutes.value
      ? Number.parseInt(
          deliveryZoneMinutes.value,
          10
        )
      : null;

  const description =
    deliveryZoneDescription.value.trim();

  if (!name) {
    deliveryZoneMessage.textContent =
      "Delivery zone name is required.";

    deliveryZoneMessage.className =
      "form-message error";

    return;
  }

  if (
    !Number.isFinite(
      minimumOrderAmount
    ) ||
    minimumOrderAmount < 0
  ) {
    deliveryZoneMessage.textContent =
      "Minimum order amount must be zero or greater.";

    deliveryZoneMessage.className =
      "form-message error";

    return;
  }

  if (
    !Number.isFinite(deliveryFee) ||
    deliveryFee < 0
  ) {
    deliveryZoneMessage.textContent =
      "Delivery fee must be zero or greater.";

    deliveryZoneMessage.className =
      "form-message error";

    return;
  }

  if (
    estimatedDeliveryMinutes !== null &&
    (
      !Number.isInteger(
        estimatedDeliveryMinutes
      ) ||
      estimatedDeliveryMinutes <= 0
    )
  ) {
    deliveryZoneMessage.textContent =
      "Delivery time must be a positive whole number.";

    deliveryZoneMessage.className =
      "form-message error";

    return;
  }

  const endpoint =
    isEditing
      ? `${API_BASE_URL}/restaurants/owner/delivery-zones/${encodeURIComponent(
          zoneId
        )}`
      : `${API_BASE_URL}/restaurants/owner/delivery-zones`;

  saveDeliveryZoneButton.disabled = true;

  saveDeliveryZoneButton.textContent =
    isEditing
      ? "Saving changes..."
      : "Creating zone...";

  try {
    const response = await fetch(
      endpoint,
      {
        method:
          isEditing
            ? "PATCH"
            : "POST",

        headers: {
          Authorization:
            `Bearer ${token}`,

          "Content-Type":
            "application/json",

          Accept:
            "application/json",
        },

        body: JSON.stringify({
          name,
          description,
          minimumOrderAmount,
          deliveryFee,
          estimatedDeliveryMinutes,
          isActive:
            deliveryZoneActive.checked,
          displayOrder: 0,
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

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.message ||
        "Unable to save the delivery zone."
      );
    }

    await loadOwnerDeliveryZones();

    closeDeliveryZoneForm();

    showMessage(
      data.message ||
      "Delivery zone saved successfully.",
      "success"
    );
  } catch (error) {
    console.error(
      "Save delivery zone error:",
      error
    );

    deliveryZoneMessage.textContent =
      error.message ||
      "Unable to save the delivery zone.";

    deliveryZoneMessage.className =
      "form-message error";
  } finally {
    saveDeliveryZoneButton.disabled =
      false;

    saveDeliveryZoneButton.textContent =
      isEditing
        ? "Save Changes"
        : "Save Delivery Zone";
  }
}

restaurantDashboardLink?.addEventListener(
  "click",
  (event) => {
    event.preventDefault();

    showSection(
      "overview"
    );

    restaurantAccountDropdown.hidden =
      true;

    restaurantAccountButton?.setAttribute(
      "aria-expanded",
      "false"
    );
  }
);

ownerNotificationsButton.addEventListener(
  "click",
  toggleOwnerNotifications
);

clearOwnerNotificationsButton.addEventListener(
  "click",
  async () => {
    clearOwnerNotificationsButton.disabled = true;
    clearOwnerNotificationsButton.textContent =
      "Clearing...";

    try {
      const response = await fetch(
        `${API_BASE_URL}/restaurants/owner/notifications`,
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

      const data =
        await response.json();

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        logout();
        return;
      }

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
          "Unable to clear notifications."
        );
      }

      ownerNotifications = [];
      unreadOwnerNotifications = 0;

      renderOwnerNotifications();
    } catch (error) {
      console.error(
        "Clear owner notifications error:",
        error
      );

      showMessage(
        error.message ||
        "Unable to clear notifications."
      );
    } finally {
      clearOwnerNotificationsButton.disabled =
        false;

      clearOwnerNotificationsButton.textContent =
        "Clear";
    }
  }
);

document.addEventListener(
  "click",
  (event) => {
    if (ownerNotificationsPanel.hidden) {
      return;
    }

    if (event.target.closest(".owner-notifications")) {
      return;
    }

    ownerNotificationsPanel.hidden = true;
  }
);

restaurantAccountButton?.addEventListener(
  "click",
  (event) => {
    event.stopPropagation();

    const isOpen =
      !restaurantAccountDropdown.hidden;

    restaurantAccountDropdown.hidden =
      isOpen;

    restaurantAccountButton.setAttribute(
      "aria-expanded",
      String(!isOpen)
    );
  }
);

document.addEventListener(
  "click",
  (event) => {
    if (
      restaurantAccountDropdown &&
      restaurantAccountButton &&
      !restaurantAccountButton.contains(
        event.target
      ) &&
      !restaurantAccountDropdown.contains(
        event.target
      )
    ) {
      restaurantAccountDropdown.hidden =
        true;

      restaurantAccountButton.setAttribute(
        "aria-expanded",
        "false"
      );
    }
  }
);

subscriptionPlansContainer?.addEventListener(
  "click",
  async (event) => {
    const button = event.target.closest(
      ".subscription-action-button"
    );

    if (!button) {
      return;
    }

    const planId =
      button.dataset.planId;

    if (!planId) {
      showMessage(
        "Unable to identify the selected subscription plan."
      );

      return;
    }

    button.disabled = true;

    const originalText =
      button.textContent;

    button.textContent =
      "Preparing payment...";

    try {
      const response = await fetch(
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

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
          "Unable to initialize subscription payment."
        );
      }

      if (!data.authorizationUrl) {
        throw new Error(
          "Payment authorization URL was not returned."
        );
      }

      window.location.href =
        data.authorizationUrl;

    } catch (error) {
      console.error(
        "Initialize subscription error:",
        error
      );

      showMessage(
        error.message ||
        "Unable to start subscription payment."
      );

      button.disabled = false;

      button.textContent =
        originalText;
    }
  }
);

function getInitials(name) {
  if (!name) {
    return "RO";
  }

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

async function loadCurrentSubscription() {
  if (!subscriptionStatusContainer) {
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

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      logout();
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

    subscriptionStatusContainer.innerHTML = `
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

async function loadSubscriptionPlans() {
  if (!subscriptionPlansContainer) {
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

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      logout();
      return;
    }

    if (!response.ok || !data.success) {
      throw new Error(
        data.message ||
        "Unable to load subscription plans."
      );
    }

    subscriptionPlans = (data.plans || []).filter(
  (plan) =>
    plan.business_type === "RESTAURANT"
);
    renderSubscriptionPlans();

  } catch (error) {
    console.error(
      "Load subscription plans error:",
      error
    );

    subscriptionPlans = [];

    subscriptionPlansContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          ⚠️
        </div>

        <h3>
          Unable to load plans
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
  if (!subscriptionStatusContainer) {
    return;
  }

  if (!currentSubscription) {
    subscriptionStatusContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          📋
        </div>

        <h3>
          No active subscription
        </h3>

        <p>
          Choose a subscription plan below to get started.
        </p>
      </div>
    `;

    return;
  }

  const status =
    String(
      currentSubscription.status || "PENDING"
    ).toUpperCase();

  subscriptionStatusContainer.innerHTML = `
    <div class="subscription-status-card">
      <div class="subscription-status-header">
        <div>
          <span class="section-eyebrow">
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

function renderSubscriptionPlans() {
  if (!subscriptionPlansContainer) {
    return;
  }

  if (subscriptionPlans.length === 0) {
    subscriptionPlansContainer.innerHTML = `
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

  subscriptionPlansContainer.innerHTML =
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
              class="primary-button subscription-action-button"
              data-plan-id="${escapeHtml(
                String(plan.id || "")
              )}"
            >
              ${currentSubscription ? "Renew" : "Subscribe"}
            </button>
          </article>
        `;
      })
      .join("");
}

function showMessage(message, type = "error") {
  dashboardMessage.textContent = message;
  dashboardMessage.className =
    `dashboard-message ${type}`;
}

function clearMessage() {
  dashboardMessage.textContent = "";
  dashboardMessage.className =
    "dashboard-message";
}

function openSidebar() {
  sidebar.classList.add("open");
  sidebarOverlay.classList.add("visible");
  document.body.style.overflow = "hidden";
}

function closeSidebar() {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("visible");
  document.body.style.overflow = "";
}

function showSection(sectionName, updateHash = true) {
  const validSection =
    sectionTitles[sectionName]
      ? sectionName
      : "overview";

  navLinks.forEach((link) => {
    link.classList.toggle(
      "active",
      link.dataset.section === validSection
    );
  });

  dashboardSections.forEach((section) => {
    section.classList.toggle(
      "active",
      section.dataset.sectionPanel ===
        validSection
    );
  });

  pageTitle.textContent =
    sectionTitles[validSection];

  if (updateHash) {
    history.replaceState(
      null,
      "",
      `#${validSection}`
    );
  }

  clearMessage();
  closeSidebar();
}

function logout() {
  localStorage.removeItem("coastConnectToken");
  localStorage.removeItem("coastConnectUser");

  window.location.replace("login.html");
}

function populateOwnerDetails() {
  const ownerName =
    currentUser.fullName ||
    currentUser.full_name ||
    "Restaurant Owner";

  const ownerEmail =
    currentUser.email ||
    "No email available";

  sidebarOwnerName.textContent = ownerName;
  sidebarOwnerEmail.textContent = ownerEmail;
  welcomeOwnerName.textContent = ownerName;
  ownerAvatar.textContent =
    getInitials(ownerName);

    const firstName =
  ownerName
    .split(" ")
    .filter(Boolean)[0] ||
  "Owner";

if (restaurantAccountName) {
  restaurantAccountName.textContent =
    firstName;
}

if (restaurantDropdownName) {
  restaurantDropdownName.textContent =
    ownerName;
}

if (restaurantDropdownEmail) {
  restaurantDropdownEmail.textContent =
    ownerEmail;
}

if (restaurantAccountAvatar) {
  restaurantAccountAvatar.textContent =
    firstName
      .charAt(0)
      .toUpperCase();
}
    populateOwnerAccountForm();
}

function populateOwnerAccountForm() {
  if (!currentUser) {
    return;
  }

  ownerAccountFullName.value =
    currentUser.fullName ||
    currentUser.full_name ||
    "";

  ownerAccountEmail.value =
    currentUser.email || "";

  ownerAccountPhone.value =
    currentUser.phone || "";
}

async function saveOwnerAccount(event) {
  event.preventDefault();

  ownerAccountMessage.textContent = "";
  ownerAccountMessage.className =
    "form-message";

  const fullName =
    ownerAccountFullName.value.trim();

  const phone =
    ownerAccountPhone.value.trim();

  if (!fullName) {
    ownerAccountMessage.textContent =
      "Full name is required.";

    ownerAccountMessage.className =
      "form-message error";

    return;
  }

  saveOwnerAccountButton.disabled = true;
  saveOwnerAccountButton.textContent =
    "Saving changes...";

  try {
    const response = await fetch(
      `${API_BASE_URL}/users/profile`,
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
          fullName,
          phone,
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

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.message ||
        "Unable to update the account."
      );
    }

    currentUser = data.user;

    localStorage.setItem(
      "coastConnectUser",
      JSON.stringify(currentUser)
    );

    populateOwnerDetails();

    ownerAccountMessage.textContent =
      data.message ||
      "Account updated successfully.";

    ownerAccountMessage.className =
      "form-message success";
  } catch (error) {
    console.error(
      "Save owner account error:",
      error
    );

    ownerAccountMessage.textContent =
      error.message ||
      "Unable to update the account.";

    ownerAccountMessage.className =
      "form-message error";
  } finally {
    saveOwnerAccountButton.disabled =
      false;

    saveOwnerAccountButton.textContent =
      "Save Changes";
  }
}

function normalizeTime(value) {
  if (!value) {
    return null;
  }

  return String(value).slice(0, 5);
}

function isRestaurantOpen(
  openingTime,
  closingTime
) {
  const opening = normalizeTime(openingTime);
  const closing = normalizeTime(closingTime);

  if (!opening || !closing) {
    return false;
  }

  const now = new Date();

  const currentMinutes =
    now.getHours() * 60 + now.getMinutes();

  const [openingHour, openingMinute] =
    opening.split(":").map(Number);

  const [closingHour, closingMinute] =
    closing.split(":").map(Number);

  const openingMinutes =
    openingHour * 60 + openingMinute;

  const closingMinutes =
    closingHour * 60 + closingMinute;

  if (openingMinutes <= closingMinutes) {
    return (
      currentMinutes >= openingMinutes &&
      currentMinutes <= closingMinutes
    );
  }

  return (
    currentMinutes >= openingMinutes ||
    currentMinutes <= closingMinutes
  );
}

function updateApprovalBadge(status) {
  const normalizedStatus =
    String(status || "PENDING").toUpperCase();

  approvalStatusBadge.className =
    "status-badge";

  if (normalizedStatus === "APPROVED") {
    approvalStatusBadge.textContent =
      "Approved";

    approvalStatusBadge.classList.add(
      "status-approved"
    );

    return;
  }

  if (normalizedStatus === "REJECTED") {
    approvalStatusBadge.textContent =
      "Changes required";

    approvalStatusBadge.classList.add(
      "status-rejected"
    );

    return;
  }

  approvalStatusBadge.textContent =
    "Pending approval";

  approvalStatusBadge.classList.add(
    "status-pending"
  );
}

function updateOpenStatus() {
  const isOpen = isRestaurantOpen(
    ownerRestaurant?.openingTime,
    ownerRestaurant?.closingTime
  );

  openStatusBadge.className =
    "status-badge";

  if (isOpen) {
    openStatusBadge.textContent = "Open now";

    openStatusBadge.classList.add(
      "status-open"
    );

    return;
  }

  openStatusBadge.textContent = "Closed";

  openStatusBadge.classList.add(
    "status-closed"
  );
}

function updateSetupProgress() {
  const hasProfile = Boolean(
    ownerRestaurant?.id &&
    ownerRestaurant?.name &&
    ownerRestaurant?.location?.county &&
    ownerRestaurant?.location?.town
  );

  const hasMenuItems =
    Number(menuItemsCount.textContent) > 0;

  const hasOpeningHours = Boolean(
    ownerRestaurant?.openingTime &&
    ownerRestaurant?.closingTime
  );

  const completedSteps = [
    hasProfile,
    hasMenuItems,
    hasOpeningHours,
  ].filter(Boolean).length;

  const progress = Math.round(
    (completedSteps / 3) * 100
  );

  setupProgressText.textContent =
    `${progress}%`;

  setupProgressBar.style.width =
    `${progress}%`;

  profileSetupCheck.classList.toggle(
    "completed",
    hasProfile
  );

  profileSetupCheck.textContent =
    hasProfile ? "✓" : "1";

  menuSetupCheck.classList.toggle(
    "completed",
    hasMenuItems
  );

  menuSetupCheck.textContent =
    hasMenuItems ? "✓" : "2";

  hoursSetupCheck.classList.toggle(
    "completed",
    hasOpeningHours
  );

  hoursSetupCheck.textContent =
    hasOpeningHours ? "✓" : "3";
}

function resetRestaurantOverview() {
  approvalStatusBadge.textContent =
    "No restaurant added";

  approvalStatusBadge.className =
    "status-badge status-pending";

  openStatusBadge.textContent = "Closed";

  openStatusBadge.className =
    "status-badge status-closed";

  menuItemsCount.textContent = "0";
  pendingOrdersCount.textContent = "0";
  pendingOrdersBadge.textContent = "0";
  totalOrdersCount.textContent = "0";
  averageRating.textContent = "0.0";

  viewRestaurantButton.disabled = true;

  updateSetupProgress();
}

function updateRestaurantOverview() {
  if (!ownerRestaurant) {
    resetRestaurantOverview();
    return;
  }

  updateApprovalBadge(
    ownerRestaurant.approvalStatus
  );

  updateOpenStatus();

  averageRating.textContent =
    Number(
      ownerRestaurant.averageRating || 0
    ).toFixed(1);

  pendingOrdersCount.textContent = "0";
  pendingOrdersBadge.textContent = "0";
  totalOrdersCount.textContent = "0";

  const canViewPublicPage =
    ownerRestaurant.approvalStatus ===
      "APPROVED" &&
    Boolean(ownerRestaurant.slug);

  viewRestaurantButton.disabled =
    !canViewPublicPage;

  updateSetupProgress();
}

function showRestaurantFormMessage(
  message,
  type = "error"
) {
  restaurantFormMessage.textContent = message;
  restaurantFormMessage.className =
    `form-message ${type}`;
}

function clearRestaurantFormMessage() {
  restaurantFormMessage.textContent = "";
  restaurantFormMessage.className =
    "form-message";
}

function setRestaurantFormLoading(isLoading) {
  saveRestaurantButton.disabled = isLoading;

  if (isLoading) {
    saveRestaurantButton.textContent =
      ownerRestaurant
        ? "Saving changes..."
        : "Creating restaurant...";
    return;
  }

  saveRestaurantButton.textContent =
    ownerRestaurant
      ? "Save restaurant changes"
      : "Create restaurant profile";
}

function populateRestaurantForm() {
  clearRestaurantFormMessage();

  if (!ownerRestaurant) {
    restaurantProfileForm.reset();

    saveRestaurantButton.textContent =
      "Create restaurant profile";

    return;
  }

  restaurantName.value =
    ownerRestaurant.name || "";

  restaurantDescription.value =
    ownerRestaurant.description || "";

  restaurantPhone.value =
    ownerRestaurant.phone || "";

  restaurantWhatsapp.value =
    ownerRestaurant.whatsapp || "";

  restaurantEmail.value =
    ownerRestaurant.email || "";

  restaurantPriceRange.value =
    ownerRestaurant.priceRange || "";

  restaurantCuisines.value =
    Array.isArray(ownerRestaurant.cuisines)
      ? ownerRestaurant.cuisines.join(", ")
      : "";

  restaurantCoverImage.value =
    ownerRestaurant.coverImageUrl || "";

  restaurantCounty.value =
    ownerRestaurant.location?.county || "";

  restaurantTown.value =
    ownerRestaurant.location?.town || "";

  restaurantArea.value =
    ownerRestaurant.location?.area || "";

  restaurantAddress.value =
    ownerRestaurant.address || "";

  restaurantLatitude.value =
    ownerRestaurant.latitude ?? "";

  restaurantLongitude.value =
    ownerRestaurant.longitude ?? "";

  restaurantIsHalal.checked =
    Boolean(ownerRestaurant.isHalal);

  restaurantOffersDelivery.checked =
    Boolean(ownerRestaurant.offersDelivery);

  saveRestaurantButton.textContent =
    "Save restaurant changes";
}

function getOptionalNumber(value) {
  const trimmedValue = String(value).trim();

  if (!trimmedValue) {
    return null;
  }

  const parsedValue = Number(trimmedValue);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : null;
}

function getRestaurantFormPayload() {
  return {
    name: restaurantName.value.trim(),

    description:
      restaurantDescription.value.trim(),

    phone: restaurantPhone.value.trim(),

    whatsapp:
      restaurantWhatsapp.value.trim(),

    email: restaurantEmail.value.trim(),

    priceRange:
      restaurantPriceRange.value,

    cuisines:
      restaurantCuisines.value
        .split(",")
        .map((cuisine) => cuisine.trim())
        .filter(Boolean),

    coverImageUrl:
      restaurantCoverImage.value.trim(),

    county: restaurantCounty.value.trim(),

    town: restaurantTown.value.trim(),

    area: restaurantArea.value.trim(),

    address:
      restaurantAddress.value.trim(),

    latitude: getOptionalNumber(
      restaurantLatitude.value
    ),

    longitude: getOptionalNumber(
      restaurantLongitude.value
    ),

    isHalal:
      restaurantIsHalal.checked,

    offersDelivery:
      restaurantOffersDelivery.checked,
  };
}

function validateRestaurantPayload(payload) {
  if (!payload.name) {
    return "Restaurant name is required.";
  }

  if (!payload.county) {
    return "County is required.";
  }

  if (!payload.town) {
    return "Town is required.";
  }

  if (
    restaurantLatitude.value.trim() &&
    payload.latitude === null
  ) {
    return "Enter a valid latitude.";
  }

  if (
    restaurantLongitude.value.trim() &&
    payload.longitude === null
  ) {
    return "Enter a valid longitude.";
  }

  if (
    payload.latitude !== null &&
    (
      payload.latitude < -90 ||
      payload.latitude > 90
    )
  ) {
    return "Latitude must be between -90 and 90.";
  }

  if (
    payload.longitude !== null &&
    (
      payload.longitude < -180 ||
      payload.longitude > 180
    )
  ) {
    return "Longitude must be between -180 and 180.";
  }

  return null;
}

async function saveRestaurantProfile(event) {
  event.preventDefault();

  clearRestaurantFormMessage();

  const payload = getRestaurantFormPayload();

  const validationError =
    validateRestaurantPayload(payload);

  if (validationError) {
    showRestaurantFormMessage(
      validationError
    );

    return;
  }

  setRestaurantFormLoading(true);

  try {
    const method =
      ownerRestaurant ? "PUT" : "POST";

    const response = await fetch(
      `${API_BASE_URL}/restaurants/owner/profile`,
      {
        method,

        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },

        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

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
        "Unable to save restaurant profile."
      );
    }

    ownerRestaurant =
      data.restaurant || null;

    populateRestaurantForm();
    updateRestaurantOverview();

    showRestaurantFormMessage(
      data.message ||
      "Restaurant profile saved successfully.",
      "success"
    );
  } catch (error) {
    console.error(
      "Save restaurant profile error:",
      error
    );

    showRestaurantFormMessage(
      error.message ||
      "Unable to connect to the server."
    );
  } finally {
    setRestaurantFormLoading(false);
  }
}

function showMenuFormMessage(
  message,
  type = "error"
) {
  menuFormMessage.textContent = message;
  menuFormMessage.className =
    `form-message ${type}`;
}

function clearMenuFormMessage() {
  menuFormMessage.textContent = "";
  menuFormMessage.className =
    "form-message";
}

function showGalleryFormMessage(
  message,
  type = "error"
) {
  galleryFormMessage.textContent = message;

  galleryFormMessage.className =
    `form-message ${type}`;
}

function clearGalleryFormMessage() {
  galleryFormMessage.textContent = "";

  galleryFormMessage.className =
    "form-message";
}

function setGalleryFormLoading(isLoading) {
  saveGalleryImageButton.disabled = isLoading;

  closeGalleryFormButton.disabled = isLoading;

  cancelGalleryFormButton.disabled = isLoading;

  if (isLoading) {
    saveGalleryImageButton.textContent =
      editingGalleryImageId.value
        ? "Saving changes..."
        : "Uploading image...";

    return;
  }

  saveGalleryImageButton.textContent =
    editingGalleryImageId.value
      ? "Save Changes"
      : "Save Gallery Image";
}

function resetGalleryImageForm() {
  galleryImageForm.reset();

  editingGalleryImageId.value = "";
  galleryImageUrl.value = "";
  galleryPublicId.value = "";

  galleryPreviewImage.src = "";
  galleryImagePreview.hidden = true;

  galleryDisplayOrder.value = "0";
  galleryIsCover.checked = false;

  galleryFormTitle.textContent =
    "Add gallery image";

  saveGalleryImageButton.textContent =
    "Save Gallery Image";

  clearGalleryFormMessage();
}

function openGalleryImageForm(galleryImage = null) {
  if (!ownerRestaurant?.id) {
    showMessage(
      "Create your restaurant profile before adding gallery images."
    );

    showSection("restaurant");
    return;
  }

  resetGalleryImageForm();

  if (galleryImage) {
    editingGalleryImageId.value =
      galleryImage.id || "";

    galleryImageUrl.value =
      galleryImage.imageUrl || "";

    galleryPublicId.value =
      galleryImage.publicId || "";

    galleryCaption.value =
      galleryImage.caption || "";

    galleryDisplayOrder.value =
      galleryImage.displayOrder ?? 0;

    galleryIsCover.checked =
      Boolean(galleryImage.isCover);

    if (galleryImage.imageUrl) {
      galleryPreviewImage.src =
        galleryImage.imageUrl;

      galleryImagePreview.hidden = false;
    }

    galleryFormTitle.textContent =
      "Edit gallery image";

    saveGalleryImageButton.textContent =
      "Save Changes";
  }

  galleryFormPanel.hidden = false;

  galleryFormPanel.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function closeGalleryImageForm() {
  resetGalleryImageForm();
  galleryFormPanel.hidden = true;
}

function getGalleryImagePayload() {
  return {
    imageUrl:
      galleryImageUrl.value.trim(),

    publicId:
      galleryPublicId.value.trim(),

    caption:
      galleryCaption.value.trim(),

    displayOrder:
      getOptionalMenuInteger(
        galleryDisplayOrder.value
      ) ?? 0,

    isCover:
      galleryIsCover.checked,
  };
}

function validateGalleryImagePayload(
  payload,
  isEditing
) {
  const selectedFile =
    galleryImageFile.files[0];

  if (
    !isEditing &&
    !selectedFile &&
    !payload.imageUrl
  ) {
    return "Choose a gallery image.";
  }

  if (payload.displayOrder < 0) {
    return "Display order cannot be less than zero.";
  }

  if (payload.caption.length > 200) {
    return "Caption must not exceed 200 characters.";
  }

  return null;
}

async function uploadSelectedGalleryImage() {
  const selectedFile =
    galleryImageFile.files[0];

  if (!selectedFile) {
    return {
      imageUrl: galleryImageUrl.value.trim(),
      publicId: galleryPublicId.value.trim(),
    };
  }

  const formData = new FormData();

  formData.append("image", selectedFile);

  const response = await fetch(
    `${API_BASE_URL}/uploads/menu-image`,
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${token}`,
      },

      body: formData,
    }
  );

  const data = await response.json();

  if (
    response.status === 401 ||
    response.status === 403
  ) {
    logout();
    return null;
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
      "Unable to upload the gallery image."
    );
  }

  const uploadedImageUrl =
    data.image?.url;

  const uploadedPublicId =
    data.image?.publicId;

  if (!uploadedImageUrl) {
    throw new Error(
      "The server did not return an image URL."
    );
  }

  galleryImageUrl.value =
    uploadedImageUrl;

  galleryPublicId.value =
    uploadedPublicId || "";

  return {
    imageUrl: uploadedImageUrl,
    publicId: uploadedPublicId || "",
  };
}

async function saveGalleryImage(event) {
  event.preventDefault();

  clearGalleryFormMessage();

  if (!ownerRestaurant?.id) {
    showGalleryFormMessage(
      "Create your restaurant profile before adding gallery images."
    );

    return;
  }

  const galleryImageId =
    editingGalleryImageId.value.trim();

  const isEditing =
    Boolean(galleryImageId);

  const payload =
    getGalleryImagePayload();

  const validationError =
    validateGalleryImagePayload(
      payload,
      isEditing
    );

  if (validationError) {
    showGalleryFormMessage(
      validationError
    );

    return;
  }

  setGalleryFormLoading(true);

  try {
    const uploadedImage =
      await uploadSelectedGalleryImage();

    if (uploadedImage === null) {
      return;
    }

    payload.imageUrl =
      uploadedImage.imageUrl;

    payload.publicId =
      uploadedImage.publicId;

    const endpoint = isEditing
      ? `${API_BASE_URL}/restaurants/owner/gallery/${encodeURIComponent(
          galleryImageId
        )}`
      : `${API_BASE_URL}/restaurants/owner/gallery`;

    const response = await fetch(
      endpoint,
      {
        method: isEditing
          ? "PUT"
          : "POST",

        headers: {
          Authorization:
            `Bearer ${token}`,

          "Content-Type":
            "application/json",

          Accept:
            "application/json",
        },

        body: JSON.stringify(payload),
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
        "Unable to save the gallery image."
      );
    }

    await loadOwnerGallery();

    closeGalleryImageForm();

    showMessage(
      data.message ||
      "Gallery image saved successfully.",
      "success"
    );
  } catch (error) {
    console.error(
      "Save gallery image error:",
      error
    );

    showGalleryFormMessage(
      error.message ||
      "Unable to save the gallery image."
    );
  } finally {
    setGalleryFormLoading(false);
  }
}

async function loadOwnerGallery() {
  if (!ownerRestaurant?.id) {
    ownerGalleryImages = [];
    renderGalleryImages();
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/restaurants/owner/gallery`,
      {
        method: "GET",

        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    const data = await response.json();

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
        "Unable to load gallery images."
      );
    }

   ownerGalleryImages = Array.isArray(
  data.images
)
  ? data.images
  : [];

    renderGalleryImages();
  } catch (error) {
    console.error(
      "Load gallery images error:",
      error
    );

    ownerGalleryImages = [];
    renderGalleryImages();

    showMessage(
      error.message ||
      "Unable to load gallery images."
    );
  }
}

function renderGalleryImages() {
  if (ownerGalleryImages.length === 0) {
    galleryImagesSummary.textContent =
      "Your restaurant gallery will appear here.";

    galleryImagesContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">▧</div>

        <h3>No gallery images yet</h3>

        <p>
          Add photos of your restaurant, food,
          seating area, or surroundings.
        </p>
      </div>
    `;

    return;
  }

  const coverImage =
    ownerGalleryImages.find(
      (image) => image.isCover
    );

  galleryImagesSummary.textContent =
    `${ownerGalleryImages.length} image${
      ownerGalleryImages.length === 1
        ? ""
        : "s"
    }${
      coverImage
        ? " · Cover image selected"
        : " · No cover image selected"
    }`;

  galleryImagesContainer.innerHTML =
    ownerGalleryImages
      .map((image) => {
        return `
          <article
            class="gallery-card"
            data-gallery-image-id="${escapeHtml(
              image.id
            )}"
          >
            <div class="gallery-card-image">
              <img
                src="${escapeHtml(
                  image.imageUrl
                )}"
                alt="${escapeHtml(
                  image.caption ||
                  "Restaurant gallery image"
                )}"
                loading="lazy"
              />

              ${
                image.isCover
                  ? `
                    <span class="gallery-cover-badge">
                      Cover
                    </span>
                  `
                  : ""
              }
            </div>

            <div class="gallery-card-content">
              <p class="gallery-card-caption">
                ${escapeHtml(
                  image.caption ||
                  "No caption"
                )}
              </p>

              <p class="gallery-card-order">
                Display order:
                ${Number(
                  image.displayOrder ?? 0
                )}
              </p>
            </div>

            <div class="gallery-card-actions">
              <button
                type="button"
                class="menu-action-button"
                data-gallery-action="edit"
                data-gallery-image-id="${escapeHtml(
                  image.id
                )}"
              >
                Edit
              </button>

              <button
                type="button"
                class="menu-action-button delete"
                data-gallery-action="delete"
                data-gallery-image-id="${escapeHtml(
                  image.id
                )}"
              >
                Delete
              </button>
            </div>
          </article>
        `;
      })
      .join("");
}

async function deleteGalleryImage(galleryImageId) {
  const galleryImage = ownerGalleryImages.find(
    (image) => image.id === galleryImageId
  );

  if (!galleryImage) {
    return;
  }

const confirmed =
  await showConfirm({
    title:
      "Delete gallery image?",
    message:
      "This image will be permanently removed from your restaurant gallery.",
    confirmText:
      "Delete image",
    cancelText:
      "Keep image",
    danger:
      true,
  });

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/restaurants/owner/gallery/${encodeURIComponent(
        galleryImageId
      )}`,
      {
        method: "DELETE",

        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    const data = await response.json();

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
        "Unable to delete the gallery image."
      );
    }

    ownerGalleryImages =
      ownerGalleryImages.filter(
        (image) =>
          image.id !== galleryImageId
      );

    renderGalleryImages();

    showMessage(
      data.message ||
      "Gallery image deleted successfully.",
      "success"
    );
  } catch (error) {
    console.error(
      "Delete gallery image error:",
      error
    );

    showMessage(
      error.message ||
      "Unable to delete the gallery image."
    );
  }
}

function setMenuFormLoading(isLoading) {
  saveMenuItemButton.disabled = isLoading;
  closeMenuFormButton.disabled = isLoading;
  cancelMenuFormButton.disabled = isLoading;

  if (isLoading) {
    saveMenuItemButton.textContent =
      editingMenuItemId.value
        ? "Saving changes..."
        : "Creating item...";
    return;
  }

  saveMenuItemButton.textContent =
    editingMenuItemId.value
      ? "Save changes"
      : "Save menu item";
}

function resetMenuItemForm() {
  menuItemForm.reset();

  menuItemImageUrl.value = "";
menuPreviewImage.src = "";
menuImagePreview.hidden = true;

  editingMenuItemId.value = "";
  menuItemDisplayOrder.value = "0";
  menuItemIsAvailable.checked = true;
  menuItemIsFeatured.checked = false;

  menuFormTitle.textContent = "Add menu item";
  saveMenuItemButton.textContent =
    "Save menu item";

  clearMenuFormMessage();
}

function openMenuItemForm(menuItem = null) {
  if (!ownerRestaurant) {
    showMessage(
      "Create your restaurant profile before adding menu items."
    );

    showSection("restaurant");
    return;
  }

  resetMenuItemForm();

  if (menuItem) {
    editingMenuItemId.value = menuItem.id;
    menuItemName.value = menuItem.name || "";
    menuItemCategory.value =
      menuItem.category || "";
    menuItemPrice.value =
      menuItem.price ?? "";
    menuItemPreparationMinutes.value =
      menuItem.preparationMinutes ?? "";
    menuItemDescription.value =
      menuItem.description || "";
    menuItemImageUrl.value =
      menuItem.imageUrl || "";
      if (menuItem.imageUrl) {
  menuPreviewImage.src = menuItem.imageUrl;
  menuImagePreview.hidden = false;
}
    menuItemDisplayOrder.value =
      menuItem.displayOrder ?? 0;
    menuItemIsAvailable.checked =
      Boolean(menuItem.isAvailable);
    menuItemIsFeatured.checked =
      Boolean(menuItem.isFeatured);

    menuFormTitle.textContent =
      "Edit menu item";

    saveMenuItemButton.textContent =
      "Save changes";
  }

  menuFormPanel.hidden = false;

  menuFormPanel.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function closeMenuItemForm() {
  resetMenuItemForm();
  menuFormPanel.hidden = true;
}

function formatMenuPrice(price) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(price || 0));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatStaffRole(role) {
  const roles = {
    MANAGER: "Manager",
    CASHIER: "Cashier",
    KITCHEN_STAFF: "Kitchen Staff",
  };

  return roles[role] || role || "Staff";
}


function renderRestaurantStaff() {
  staffCountBadge.textContent =
    String(restaurantStaff.length);

  if (restaurantStaff.length === 0) {
    staffSummary.textContent =
      "No staff members have been added yet.";

    staffContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👥</div>

        <h3>No staff members yet</h3>

        <p>
          Add your first manager, cashier, or kitchen staff member.
        </p>
      </div>
    `;

    return;
  }

  staffSummary.textContent =
    `${restaurantStaff.length} staff member${
      restaurantStaff.length === 1
        ? ""
        : "s"
    }`;

  staffContainer.innerHTML =
    restaurantStaff
      .map((staff) => {
        return `
          <article class="staff-card">
            <div class="staff-avatar">
              ${escapeHtml(
                String(
                  staff.fullName || "S"
                )
                  .charAt(0)
                  .toUpperCase()
              )}
            </div>

            <div class="staff-details">
              <strong>
                ${escapeHtml(
                  staff.fullName
                )}
              </strong>

              <span>
                ${escapeHtml(
                  formatStaffRole(
                    staff.role
                  )
                )}
              </span>

              <small>
                ${
                  staff.email
                    ? escapeHtml(
                        staff.email
                      )
                    : escapeHtml(
                        staff.phone ||
                        "No contact provided"
                      )
                }
              </small>
            </div>

            <div class="staff-status">
              <span class="status-badge ${
                staff.status === "ACTIVE"
                  ? "status-open"
                  : staff.status ===
                    "SUSPENDED"
                  ? "status-closed"
                  : "status-pending"
              }">
                ${escapeHtml(
                  staff.status
                )}
              </span>
            </div>
          </article>
        `;
      })
      .join("");
}

async function loadRestaurantStaff() {
  try {
    const response = await fetch(
      `${API_BASE_URL}/restaurants/owner/staff`,
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
        "Unable to load restaurant staff."
      );
    }

    restaurantStaff =
      Array.isArray(data.staff)
        ? data.staff
        : [];

    renderRestaurantStaff();
  } catch (error) {
    console.error(
      "Load restaurant staff error:",
      error
    );

    staffSummary.textContent =
      "Unable to load restaurant staff.";

    staffContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">!</div>

        <h3>Unable to load staff</h3>

        <p>
          ${escapeHtml(
            error.message ||
            "Please try again."
          )}
        </p>
      </div>
    `;
  }
}

function openStaffForm() {
  staffForm.reset();

  staffFormMessage.textContent = "";
  staffFormMessage.className = "form-message";

  staffFormPanel.hidden = false;

  staffFormPanel.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });

  staffFullName.focus();
}

function closeStaffForm() {
  staffForm.reset();

  staffFormMessage.textContent = "";
  staffFormMessage.className = "form-message";

  staffFormPanel.hidden = true;
}

async function saveRestaurantStaff(event) {
  event.preventDefault();

  staffFormMessage.textContent = "";
  staffFormMessage.className =
    "form-message";

  const fullName =
    staffFullName.value.trim();

  const role =
    staffRole.value.trim();

  const email =
    staffEmail.value.trim();

  const phone =
    staffPhone.value.trim();

  if (!fullName) {
    staffFormMessage.textContent =
      "Staff member name is required.";

    staffFormMessage.className =
      "form-message error";

    return;
  }

  if (!role) {
    staffFormMessage.textContent =
      "Please select a staff role.";

    staffFormMessage.className =
      "form-message error";

    return;
  }

  if (!email && !phone) {
    staffFormMessage.textContent =
      "Provide an email address or phone number.";

    staffFormMessage.className =
      "form-message error";

    return;
  }

  saveStaffButton.disabled = true;
  saveStaffButton.textContent =
    "Adding Staff...";

  try {
    const response = await fetch(
      `${API_BASE_URL}/restaurants/owner/staff`,
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
          fullName,
          role,
          email,
          phone,
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
        "Unable to add staff member."
      );
    }

    await loadRestaurantStaff();

    closeStaffForm();

    showMessage(
      data.message ||
      "Staff member added successfully.",
      "success"
    );
  } catch (error) {
    console.error(
      "Add restaurant staff error:",
      error
    );

    staffFormMessage.textContent =
      error.message ||
      "Unable to add staff member.";

    staffFormMessage.className =
      "form-message error";
  } finally {
    saveStaffButton.disabled = false;
    saveStaffButton.textContent =
      "Add Staff Member";
  }
}

function renderMenuItems() {
  menuItemsCount.textContent =
    String(ownerMenuItems.length);

  if (ownerMenuItems.length === 0) {
    menuItemsSummary.textContent =
      "Your restaurant menu will appear here.";

    menuItemsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">☰</div>

        <h3>No menu items yet</h3>

        <p>
          Add your first menu item to start building
          your restaurant menu.
        </p>
      </div>
    `;

    updateSetupProgress();
    return;
  }

  const availableCount =
    ownerMenuItems.filter(
      (item) => item.isAvailable
    ).length;

  menuItemsSummary.textContent =
    `${ownerMenuItems.length} item${
      ownerMenuItems.length === 1 ? "" : "s"
    } · ${availableCount} available`;

  menuItemsContainer.innerHTML =
    ownerMenuItems
      .map((item) => {
        const imageMarkup = item.imageUrl
          ? `
            <img
              src="${escapeHtml(item.imageUrl)}"
              alt="${escapeHtml(item.name)}"
              loading="lazy"
            />
          `
          : `
            <div class="menu-item-image-placeholder">
              🍽
            </div>
          `;

        const categoryBadge = item.category
          ? `
            <span class="menu-meta-badge">
              ${escapeHtml(item.category)}
            </span>
          `
          : "";

        const preparationBadge =
          item.preparationMinutes !== null &&
          item.preparationMinutes !== undefined
            ? `
              <span class="menu-meta-badge">
                ${Number(
                  item.preparationMinutes
                )} min
              </span>
            `
            : "";

        const featuredBadge = item.isFeatured
          ? `
            <span class="menu-meta-badge featured">
              Featured
            </span>
          `
          : "";

        return `
          <article
            class="menu-item-card"
            data-menu-item-id="${escapeHtml(
              item.id
            )}"
          >
            <div class="menu-item-image">
              ${imageMarkup}
            </div>

            <div class="menu-item-content">
              <div class="menu-item-topline">
                <h4>${escapeHtml(item.name)}</h4>

                <span class="menu-item-price">
                  ${formatMenuPrice(item.price)}
                </span>
              </div>

              ${
                item.description
                  ? `
                    <p class="menu-item-description">
                      ${escapeHtml(
                        item.description
                      )}
                    </p>
                  `
                  : ""
              }

              <div class="menu-item-meta">
                ${categoryBadge}
                ${preparationBadge}
                ${featuredBadge}

                <span
                  class="menu-meta-badge ${
                    item.isAvailable
                      ? "available"
                      : "unavailable"
                  }"
                >
                  ${
                    item.isAvailable
                      ? "Available"
                      : "Unavailable"
                  }
                </span>
              </div>
            </div>

            <div class="menu-item-actions">
              <button
                type="button"
                class="menu-action-button"
                data-menu-action="edit"
                data-menu-item-id="${escapeHtml(
                  item.id
                )}"
              >
                Edit
              </button>

              <button
                type="button"
                class="menu-action-button delete"
                data-menu-action="delete"
                data-menu-item-id="${escapeHtml(
                  item.id
                )}"
              >
                Delete
              </button>
            </div>
          </article>
        `;
      })
      .join("");

  updateSetupProgress();
}

async function savePromotion(event) {
  event.preventDefault();

  promotionFormMessage.textContent = "";
  promotionFormMessage.className =
    "form-message";

  const promotionId =
    editingPromotionId.value.trim();

  const isEditing =
    Boolean(promotionId);

  const payload = {
    name:
      promotionName.value.trim(),

    description:
      promotionDescription.value.trim(),

    promotionType:
      promotionType.value,

    discountValue:
      promotionType.value ===
      "FREE_DELIVERY"
        ? null
        : Number(
            promotionDiscountValue.value
          ),

    promoCode:
      promotionCode.value
        .trim()
        .toUpperCase(),

    minimumOrderAmount:
      Number(
        promotionMinimumOrder.value || 0
      ),

    maximumDiscountAmount:
      promotionMaximumDiscount.value
        ? Number(
            promotionMaximumDiscount.value
          )
        : null,

    totalUsageLimit:
      promotionTotalUsageLimit.value
        ? Number.parseInt(
            promotionTotalUsageLimit.value,
            10
          )
        : null,

    perCustomerUsageLimit:
      Number.parseInt(
        promotionPerCustomerLimit.value,
        10
      ) || 1,

    startsAt:
      new Date(
        promotionStartsAt.value
      ).toISOString(),

    endsAt:
      new Date(
        promotionEndsAt.value
      ).toISOString(),

    isActive:
      promotionIsActive.checked,
  };

  if (!payload.name) {
    promotionFormMessage.textContent =
      "Promotion name is required.";

    promotionFormMessage.className =
      "form-message error";

    return;
  }

  if (
    !promotionStartsAt.value ||
    !promotionEndsAt.value
  ) {
    promotionFormMessage.textContent =
      "Start and end dates are required.";

    promotionFormMessage.className =
      "form-message error";

    return;
  }

  if (
    payload.promotionType !==
      "FREE_DELIVERY" &&
    (
      !Number.isFinite(
        payload.discountValue
      ) ||
      payload.discountValue <= 0
    )
  ) {
    promotionFormMessage.textContent =
      "Discount value must be greater than zero.";

    promotionFormMessage.className =
      "form-message error";

    return;
  }

  const endpoint = isEditing
    ? `${API_BASE_URL}/restaurants/owner/promotions/${encodeURIComponent(
        promotionId
      )}`
    : `${API_BASE_URL}/restaurants/owner/promotions`;

  savePromotionButton.disabled = true;
  savePromotionButton.textContent =
    isEditing
      ? "Saving changes..."
      : "Creating promotion...";

  try {
    const response = await fetch(
      endpoint,
      {
        method:
          isEditing
            ? "PATCH"
            : "POST",

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

    const data =
      await response.json();

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      logout();
      return;
    }

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.message ||
        "Unable to save promotion."
      );
    }

    await loadOwnerPromotions();

    closePromotionForm();

    showMessage(
      data.message ||
      "Promotion saved successfully.",
      "success"
    );
  } catch (error) {
    console.error(
      "Save promotion error:",
      error
    );

    promotionFormMessage.textContent =
      error.message ||
      "Unable to save promotion.";

    promotionFormMessage.className =
      "form-message error";
  } finally {
    savePromotionButton.disabled =
      false;

    savePromotionButton.textContent =
      isEditing
        ? "Save Changes"
        : "Save Promotion";
  }
}

async function loadOwnerMenuItems() {
  if (!ownerRestaurant?.id) {
    ownerMenuItems = [];
    renderMenuItems();
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/restaurants/${encodeURIComponent(
        ownerRestaurant.id
      )}/menu`,
      {
        method: "GET",

        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    const data = await response.json();

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
        "Unable to load menu items."
      );
    }

    ownerMenuItems = Array.isArray(
      data.menuItems
    )
      ? data.menuItems
      : [];

    renderMenuItems();
  } catch (error) {
    console.error(
      "Load menu items error:",
      error
    );

    ownerMenuItems = [];
    renderMenuItems();

    showMessage(
      error.message ||
      "Unable to load menu items."
    );
  }
}

async function loadOwnerDeliveryZones() {

  try {

    const response = await fetch(
      `${API_BASE_URL}/restaurants/owner/delivery-zones`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    const data = await response.json();

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
        "Unable to load delivery zones."
      );
    }

    ownerDeliveryZones =
      data.deliveryZones || [];

    renderDeliveryZones();

  } catch (error) {

    console.error(
      "Load delivery zones error:",
      error
    );

    ownerDeliveryZones = [];

    renderDeliveryZones();

  }

}

function formatDeliveryZoneDate(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString(
    "en-KE",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
}

function renderDeliveryZones() {
  deliveryZonesSummary.textContent =
    `${ownerDeliveryZones.length} delivery zone${
      ownerDeliveryZones.length === 1
        ? ""
        : "s"
    }`;

  if (ownerDeliveryZones.length === 0) {
    ownerDeliveryZones.sort((a, b) => {
  if (a.displayOrder !== b.displayOrder) {
    return a.displayOrder - b.displayOrder;
  }

  return a.name.localeCompare(b.name);
});
    deliveryZonesContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🚚</div>

        <h3>No delivery zones yet</h3>

        <p>Create your first delivery zone.</p>
      </div>
    `;

    return;
  }

  deliveryZonesContainer.innerHTML =
    ownerDeliveryZones
      .map((zone) => {
        return `
          <article
            class="delivery-zone-card"
            data-delivery-zone-id="${escapeHtml(
              zone.id
            )}"
          >
            <div class="delivery-zone-card-top">
              <div class="delivery-zone-title-group">
                <div class="delivery-zone-pin">
                  📍
                </div>

                <div>
                  <h3>
                    ${escapeHtml(zone.name)}
                  </h3>

                  ${
                    zone.description
                      ? `
                        <p class="delivery-zone-description">
                          ${escapeHtml(
                            zone.description
                          )}
                        </p>
                      `
                      : ""
                  }
                </div>
              </div>

              <span class="delivery-zone-status ${
                zone.isActive
                  ? "active"
                  : "inactive"
              }">
                ${
                  zone.isActive
                    ? "Delivery Available"
                    : "Delivery Paused"
                }
              </span>
            </div>

            <div class="delivery-zone-info-list">
              <div class="delivery-zone-info-row">
                <span>
                  Minimum order
                </span>

                <strong>
                  ${formatMenuPrice(
                    zone.minimumOrderAmount
                  )}
                </strong>
              </div>

              <div class="delivery-zone-info-row">
                <span>
                  Delivery fee
                </span>

                <strong>
                  ${formatMenuPrice(
                    zone.deliveryFee
                  )}
                </strong>
              </div>

              <div class="delivery-zone-info-row">
                <span>
                  Estimated delivery time
                </span>

                <strong>
                  ${
                    zone.estimatedDeliveryMinutes
                      ? `${Number(
                          zone.estimatedDeliveryMinutes
                        )} mins`
                      : "Not set"
                  }
                </strong>
              </div>
            </div>

            <div class="delivery-zone-card-footer">
              <div class="delivery-zone-updated">
                <span>
                  Last updated
                </span>

                <strong>
                  ${formatDeliveryZoneDate(
                    zone.updatedAt
                  )}
                </strong>
              </div>

              <div class="delivery-zone-footer-actions">
                <button
                  type="button"
                  class="menu-action-button"
                  data-delivery-zone-action="edit"
                  data-delivery-zone-id="${escapeHtml(
                    zone.id
                  )}"
                >
                  Edit
                </button>

                <button
                  type="button"
                  class="menu-action-button delete"
                  data-delivery-zone-action="delete"
                  data-delivery-zone-id="${escapeHtml(
                    zone.id
                  )}"
                >
                  Delete
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
}

async function deleteDeliveryZone(
  deliveryZoneId,
  deleteButton
) {
  const deliveryZone =
    ownerDeliveryZones.find(
      (zone) =>
        zone.id === deliveryZoneId
    );

  if (!deliveryZone) {
    return;
  }

  const confirmed =
  await showConfirm({
    title:
      "Delete delivery zone?",
    message:
      `"${deliveryZone.name}" will be permanently removed from your restaurant delivery areas.`,
    confirmText:
      "Delete zone",
    cancelText:
      "Keep zone",
    danger:
      true,
  });

if (!confirmed) {
  return;
}

if (deleteButton) {
  deleteButton.disabled =
    true;

  deleteButton.textContent =
    "Deleting...";
}

  try {
    const response =
      await fetch(
        `${API_BASE_URL}/restaurants/owner/delivery-zones/${encodeURIComponent(
          deliveryZoneId
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

    const data =
      await response.json();

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      logout();
      return;
    }

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.message ||
        "Unable to delete the delivery zone."
      );
    }

    ownerDeliveryZones =
      ownerDeliveryZones.filter(
        (zone) =>
          zone.id !== deliveryZoneId
      );

    renderDeliveryZones();

    showMessage(
      data.message ||
      "Delivery zone deleted successfully.",
      "success"
    );
  } catch (error) {
    console.error(
      "Delete delivery zone error:",
      error
    );

    showMessage(
      error.message ||
      "Unable to delete the delivery zone."
    );
  }
}

function getOptionalMenuInteger(value) {
  const trimmedValue = String(value).trim();

  if (!trimmedValue) {
    return null;
  }

  const parsedValue =
    Number.parseInt(trimmedValue, 10);

  return Number.isInteger(parsedValue)
    ? parsedValue
    : null;
}

function getMenuItemPayload() {
  return {
    name: menuItemName.value.trim(),
    category: menuItemCategory.value,
    price: Number(menuItemPrice.value),

    preparationMinutes:
      getOptionalMenuInteger(
        menuItemPreparationMinutes.value
      ),

    description:
      menuItemDescription.value.trim(),

    imageUrl:
      menuItemImageUrl.value.trim(),

    displayOrder:
      getOptionalMenuInteger(
        menuItemDisplayOrder.value
      ) ?? 0,

    isAvailable:
      menuItemIsAvailable.checked,

    isFeatured:
      menuItemIsFeatured.checked,
  };
}

function validateMenuItemPayload(payload) {
  if (!payload.name) {
    return "Menu item name is required.";
  }

  if (
    !Number.isFinite(payload.price) ||
    payload.price < 0
  ) {
    return "Enter a valid menu item price.";
  }

  if (
    payload.preparationMinutes !== null &&
    payload.preparationMinutes < 0
  ) {
    return "Preparation time cannot be less than zero.";
  }

  if (payload.displayOrder < 0) {
    return "Display order cannot be less than zero.";
  }

  return null;
}

async function saveMenuItem(event) {
  event.preventDefault();

  clearMenuFormMessage();

  if (!ownerRestaurant?.id) {
    showMenuFormMessage(
      "Create your restaurant profile before adding menu items."
    );
    return;
  }

  const payload = getMenuItemPayload();

  const validationError =
    validateMenuItemPayload(payload);

  if (validationError) {
    showMenuFormMessage(validationError);
    return;
  }

  const menuItemId =
    editingMenuItemId.value.trim();

  const isEditing = Boolean(menuItemId);

  const endpoint = isEditing
    ? `${API_BASE_URL}/restaurants/${encodeURIComponent(
        ownerRestaurant.id
      )}/menu/${encodeURIComponent(menuItemId)}`
    : `${API_BASE_URL}/restaurants/${encodeURIComponent(
        ownerRestaurant.id
      )}/menu`;

  setMenuFormLoading(true);

  try {
    const uploadedImageUrl =
      await uploadSelectedMenuImage();

    if (uploadedImageUrl === null) {
      return;
    }

    payload.imageUrl =
      uploadedImageUrl || "";

    const response = await fetch(endpoint, {
      method: isEditing ? "PUT" : "POST",

      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },

      body: JSON.stringify(payload),
    });

    const data = await response.json();

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
        "Unable to save menu item."
      );
    }

    await loadOwnerMenuItems();

    closeMenuItemForm();

    showMessage(
      data.message ||
      "Menu item saved successfully.",
      "success"
    );
  } catch (error) {
    console.error(
      "Save menu item error:",
      error
    );

    showMenuFormMessage(
      error.message ||
      "Unable to save menu item."
    );
  } finally {
    setMenuFormLoading(false);
  }
}

async function uploadSelectedMenuImage() {
  const selectedFile =
    menuItemImage.files[0];

  if (!selectedFile) {
    return menuItemImageUrl.value.trim();
  }

  const formData = new FormData();

  formData.append("image", selectedFile);

  const response = await fetch(
    `${API_BASE_URL}/uploads/menu-image`,
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${token}`,
      },

      body: formData,
    }
  );

  const data = await response.json();

  if (
    response.status === 401 ||
    response.status === 403
  ) {
    logout();
    return null;
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
      "Unable to upload the menu image."
    );
  }

  const uploadedImageUrl =
    data.image?.url;

  if (!uploadedImageUrl) {
    throw new Error(
      "The server did not return an image URL."
    );
  }

  menuItemImageUrl.value =
    uploadedImageUrl;

  return uploadedImageUrl;
}

async function deleteMenuItem(menuItemId) {
  const menuItem = ownerMenuItems.find(
    (item) => item.id === menuItemId
  );

  if (!menuItem || !ownerRestaurant?.id) {
    return;
  }

 const confirmed =
  await showConfirm({
    title:
      "Delete menu item?",
    message:
      `"${menuItem.name}" will be permanently removed from the restaurant menu.`,
    confirmText:
      "Delete item",
    cancelText:
      "Keep item",
    danger:
      true,
  });

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/restaurants/${encodeURIComponent(
        ownerRestaurant.id
      )}/menu/${encodeURIComponent(menuItemId)}`,
      {
        method: "DELETE",

        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    const data = await response.json();

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
        "Unable to delete menu item."
      );
    }

    ownerMenuItems =
      ownerMenuItems.filter(
        (item) => item.id !== menuItemId
      );

    renderMenuItems();

    showMessage(
      data.message ||
      "Menu item deleted successfully.",
      "success"
    );
  } catch (error) {
    console.error(
      "Delete menu item error:",
      error
    );

    showMessage(
      error.message ||
      "Unable to delete menu item."
    );
  }
}

const openingDayInputs = {
  0: openSunday,
  1: openMonday,
  2: openTuesday,
  3: openWednesday,
  4: openThursday,
  5: openFriday,
  6: openSaturday,
};

function showOpeningHoursMessage(
  message,
  type = "error"
) {
  openingHoursMessage.textContent = message;
  openingHoursMessage.className =
    `form-message ${type}`;
}

function clearOpeningHoursMessage() {
  openingHoursMessage.textContent = "";
  openingHoursMessage.className =
    "form-message";
}

function setOpeningHoursLoading(isLoading) {
  saveOpeningHoursButton.disabled = isLoading;

  saveOpeningHoursButton.textContent =
    isLoading
      ? "Saving opening hours..."
      : "Save Opening Hours";
}

function populateOpeningHoursForm() {
  Object.values(openingDayInputs).forEach(
    (input) => {
      input.checked = false;
    }
  );

  openingTime.value = "";
  closingTime.value = "";

  if (
    !Array.isArray(ownerOpeningHours) ||
    ownerOpeningHours.length === 0
  ) {
    return;
  }

  const openSchedule =
    ownerOpeningHours.filter(
      (schedule) => schedule.isOpen
    );

  openSchedule.forEach((schedule) => {
    const dayInput =
      openingDayInputs[
        Number(schedule.dayOfWeek)
      ];

    if (dayInput) {
      dayInput.checked = true;
    }
  });

  const firstOpenDay = openSchedule[0];

  if (firstOpenDay) {
    openingTime.value =
      firstOpenDay.openingTime || "";

    closingTime.value =
      firstOpenDay.closingTime || "";
  }
}

async function loadOwnerOpeningHours() {
  if (!ownerRestaurant) {
    ownerOpeningHours = [];
    populateOpeningHoursForm();
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/restaurants/owner/opening-hours`,
      {
        method: "GET",

        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    const data = await response.json();

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
        "Unable to load opening hours."
      );
    }

    ownerOpeningHours =
      Array.isArray(data.openingHours)
        ? data.openingHours
        : [];

    populateOpeningHoursForm();
  } catch (error) {
    console.error(
      "Load opening hours error:",
      error
    );

    showOpeningHoursMessage(
      error.message ||
      "Unable to load opening hours."
    );
  }
}

function getOpeningHoursPayload() {
  const openDays = Object.entries(
    openingDayInputs
  )
    .filter(([, input]) => input.checked)
    .map(([day]) => Number(day));

  return {
    openingTime: openingTime.value,
    closingTime: closingTime.value,
    openDays,
  };
}

async function saveOpeningHours(event) {
  event.preventDefault();

  clearOpeningHoursMessage();

  if (!ownerRestaurant) {
    showOpeningHoursMessage(
      "Create your restaurant profile before setting opening hours."
    );

    return;
  }

  const payload = getOpeningHoursPayload();

  if (
    payload.openDays.length > 0 &&
    (
      !payload.openingTime ||
      !payload.closingTime
    )
  ) {
    showOpeningHoursMessage(
      "Choose both an opening and closing time."
    );

    return;
  }

  setOpeningHoursLoading(true);

  try {
    const response = await fetch(
      `${API_BASE_URL}/restaurants/owner/opening-hours`,
      {
        method: "PUT",

        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },

        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

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
        "Unable to save opening hours."
      );
    }

    ownerOpeningHours =
      Array.isArray(data.openingHours)
        ? data.openingHours
        : [];

    populateOpeningHoursForm();

    showOpeningHoursMessage(
      data.message ||
      "Opening hours saved successfully.",
      "success"
    );
  } catch (error) {
    console.error(
      "Save opening hours error:",
      error
    );

    showOpeningHoursMessage(
      error.message ||
      "Unable to save opening hours."
    );
  } finally {
    setOpeningHoursLoading(false);
  }
}

function showOrdersMessage(
  message,
  type = "error"
) {
  ordersMessage.textContent = message;

  ordersMessage.className =
    `form-message ${type}`;
}

function clearOrdersMessage() {
  ordersMessage.textContent = "";

  ordersMessage.className =
    "form-message";
}

function setOrdersLoading(isLoading) {
  refreshOrdersButton.disabled = isLoading;

  refreshOrdersButton.textContent =
    isLoading
      ? "Loading orders..."
      : "Refresh orders";
}

async function loadOwnerOrders(
  page = currentOrdersPage
) {
  clearOrdersMessage();

  currentOrdersPage = page;

  const queryParameters =
    new URLSearchParams({
      page: String(currentOrdersPage),
      limit: "20",
    });

  if (currentOrdersStatus) {
    queryParameters.set(
      "status",
      currentOrdersStatus
    );
  }

  setOrdersLoading(true);

  try {
    const response = await fetch(
      `${API_BASE_URL}/orders/owner?${queryParameters.toString()}`,
      {
        method: "GET",

        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    const data = await response.json();

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

    ownerOrders = Array.isArray(data.orders)
      ? data.orders
      : [];

      renderOwnerOrders();

    const pendingCount =
      Number(
        data.pendingOrdersCount || 0
      );

    pendingOrdersCount.textContent =
      String(pendingCount);

    pendingOrdersBadge.textContent =
      String(pendingCount);

    totalOrdersCount.textContent =
      String(
        Number(
          data.pagination?.totalItems ||
          ownerOrders.length
        )
      );

    console.log(
      "Restaurant orders loaded:",
      data
    );
  } catch (error) {
    console.error(
      "Load restaurant orders error:",
      error
    );

    ownerOrders = [];

    showOrdersMessage(
      error.message ||
      "Unable to connect to the server."
    );
  } finally {
    setOrdersLoading(false);
  }
}

async function loadOwnerNotifications() {
  try {
    const response = await fetch(
      `${API_BASE_URL}/restaurants/owner/notifications`,
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

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.message ||
        "Unable to load notifications."
      );
    }

    ownerNotifications =
      Array.isArray(
        data.notifications
      )
        ? data.notifications.map(
            (notification) => ({
              id:
                notification.id,

              icon:
                "🔔",

              title:
                notification.title,

              message:
                notification.message,

              time:
                new Date(
                  notification.createdAt
                ).toLocaleTimeString(
                  "en-KE",
                  {
                    hour:
                      "2-digit",

                    minute:
                      "2-digit",
                  }
                ),
            })
          )
        : [];

    unreadOwnerNotifications =
      Number(
        data.unreadCount || 0
      );

    renderOwnerNotifications();
  } catch (error) {
    console.error(
      "Load owner notifications error:",
      error
    );
  }
}

function renderRevenueTrendChart(items) {
  const revenueTrend =
    Array.isArray(items)
      ? items
      : [];

  const canvas =
    document.getElementById(
      "revenueTrendChart"
    );

  if (
    !canvas ||
    typeof Chart === "undefined"
  ) {
    return;
  }

  const labels =
    revenueTrend.map((item) => {
      const date =
        new Date(item.date);

      return date.toLocaleDateString(
        "en-KE",
        {
          weekday: "short",
          day: "numeric",
          month: "short",
          timeZone: "Africa/Nairobi",
        }
      );
    });

  const revenueValues =
    revenueTrend.map(
      (item) =>
        Number(item.revenue || 0)
    );

  const orderValues =
    revenueTrend.map(
      (item) =>
        Number(item.orders || 0)
    );

  if (revenueTrendChartInstance) {
    revenueTrendChartInstance.destroy();
  }

  const context =
    canvas.getContext("2d");

  const gradient =
    context.createLinearGradient(
      0,
      0,
      0,
      360
    );

  gradient.addColorStop(
    0,
    "rgba(20, 115, 255, 0.28)"
  );

  gradient.addColorStop(
    0.65,
    "rgba(20, 115, 255, 0.08)"
  );

  gradient.addColorStop(
    1,
    "rgba(20, 115, 255, 0)"
  );

  revenueTrendChartInstance =
    new Chart(context, {
      type: "line",

      data: {
        labels,

        datasets: [
          {
            label: "Revenue",
            data: revenueValues,

            borderColor:
              "#1473ff",

            backgroundColor:
              gradient,

            borderWidth: 3,

            pointRadius: 5,

            pointHoverRadius: 7,

            pointBackgroundColor:
              "#ffffff",

            pointBorderColor:
              "#1473ff",

            pointBorderWidth: 3,

            fill: true,

            tension: 0.4,
          },
        ],
      },

      options: {
        responsive: true,

        maintainAspectRatio: false,

        interaction: {
          mode: "index",
          intersect: false,
        },

        animation: {
          duration: 700,
          easing: "easeOutQuart",
        },

        plugins: {
          legend: {
            display: false,
          },

          tooltip: {
            displayColors: false,

            backgroundColor:
              "#0f172a",

            titleColor:
              "#ffffff",

            bodyColor:
              "#e2e8f0",

            padding: 14,

            cornerRadius: 10,

            callbacks: {
              title(context) {
                return context[0]?.label || "";
              },

              label(context) {
                const index =
                  context.dataIndex;

                const revenue =
                  revenueValues[index] || 0;

                const orders =
                  orderValues[index] || 0;

                const orderText =
                  `${orders} order${
                    orders === 1
                      ? ""
                      : "s"
                  }`;

                return [
                  `Revenue: ${formatMenuPrice(
                    revenue
                  )}`,
                  `Orders: ${orderText}`,
                ];
              },
            },
          },
        },

        scales: {
          x: {
            grid: {
              display: false,
            },

            border: {
              display: false,
            },

            ticks: {
              color: "#64748b",

              font: {
                size: 12,
                weight: "500",
              },
            },
          },

          y: {
            beginAtZero: true,

            border: {
              display: false,
            },

            grid: {
              color:
                "rgba(148, 163, 184, 0.18)",
            },

            ticks: {
              color: "#64748b",

              padding: 10,

              callback(value) {
                return `KSh ${Number(
                  value
                ).toLocaleString(
                  "en-KE"
                )}`;
              },
            },
          },
        },
      },
    });
}

async function loadRestaurantAnalytics() {
  try {
    const response = await fetch(
      `${API_BASE_URL}/restaurants/owner/analytics`,
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
        "Unable to load restaurant analytics."
      );
    }

    const analytics =
      data.analytics || {};

    analyticsTotalRevenue.textContent =
      formatMenuPrice(
        analytics.totalRevenue || 0
      );

    analyticsTotalOrders.textContent =
      String(
        analytics.totalOrders || 0
      );

    analyticsPaidOrders.textContent =
      String(
        analytics.paidOrders || 0
      );

    analyticsAverageOrder.textContent =
      formatMenuPrice(
        analytics.averageOrderValue || 0
      );

    analyticsCompletedOrders.textContent =
      String(
        analytics.completedOrders || 0
      );

    analyticsPendingOrders.textContent =
      String(
        analytics.pendingOrders || 0
      );

    analyticsCancelledOrders.textContent =
      String(
        analytics.cancelledOrders || 0
      );

      const today =
  analytics.today || {};

const thisWeek =
  analytics.thisWeek || {};

const thisMonth =
  analytics.thisMonth || {};

analyticsTodayRevenue.textContent =
  formatMenuPrice(
    today.revenue || 0
  );

analyticsTodayOrders.textContent =
  `${Number(
    today.orders || 0
  )} order${
    Number(today.orders || 0) === 1
      ? ""
      : "s"
  }`;

analyticsWeekRevenue.textContent =
  formatMenuPrice(
    thisWeek.revenue || 0
  );

analyticsWeekOrders.textContent =
  `${Number(
    thisWeek.orders || 0
  )} order${
    Number(thisWeek.orders || 0) === 1
      ? ""
      : "s"
  }`;

analyticsMonthRevenue.textContent =
  formatMenuPrice(
    thisMonth.revenue || 0
  );

analyticsMonthOrders.textContent =
  `${Number(
    thisMonth.orders || 0
  )} order${
    Number(thisMonth.orders || 0) === 1
      ? ""
      : "s"
  }`;

  renderBestSellingItems(
  analytics.bestSellingItems
);

renderRevenueTrendChart(
  analytics.revenueTrend
);
  } catch (error) {
    console.error(
      "Load restaurant analytics error:",
      error
    );

    showMessage(
      error.message ||
      "Unable to load restaurant analytics."
    );
  }
}

function renderBestSellingItems(items) {
  const bestSellingItems =
    Array.isArray(items)
      ? items
      : [];

  if (bestSellingItems.length === 0) {
    bestSellingItemsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🍽</div>

        <h3>No sales data yet</h3>

        <p>
          Paid menu-item sales will appear here.
        </p>
      </div>
    `;

    return;
  }

  bestSellingItemsContainer.innerHTML =
    bestSellingItems
      .map((item, index) => {
        return `
          <article class="best-selling-item">

            <div class="best-selling-rank">
              ${index + 1}
            </div>

            <div class="best-selling-details">
              <strong>
                ${escapeHtml(item.itemName)}
              </strong>

              <span>
                ${Number(
                  item.totalQuantity || 0
                )} sold
              </span>
            </div>

            <div class="best-selling-revenue">
              ${formatMenuPrice(
                item.totalRevenue || 0
              )}
            </div>

          </article>
        `;
      })
      .join("");
}

function renderOrderAvailability() {

  if (
    !orderAvailabilityTitle
  ) {
    return;
  }

  if (
    isRestaurantAcceptingOrders
  ) {

    orderAvailabilityTitle.textContent =
      "Accepting Orders";

    orderAvailabilityDescription.textContent =
      "Your restaurant is currently accepting new customer orders.";

    orderAvailabilityBadge.textContent =
      "Open";

    orderAvailabilityBadge.className =
      "status-badge status-open";

    toggleOrderAvailabilityButton.textContent =
      "Pause Orders";

    pauseOrdersForm.hidden = true;

  } else {

    orderAvailabilityTitle.textContent =
      "Orders Paused";

    orderAvailabilityDescription.textContent =
      currentPauseReason ||
      "Orders are temporarily unavailable.";

    orderAvailabilityBadge.textContent =
      "Paused";

    orderAvailabilityBadge.className =
      "status-badge status-closed";

    toggleOrderAvailabilityButton.textContent =
      "Resume Orders";
  }

}

function showRestaurantApprovalNotice() {
  if (!ownerRestaurant) {
    return;
  }

  const approvalStatus =
    String(
      ownerRestaurant.approvalStatus || "PENDING"
    ).toUpperCase();

  if (approvalStatus === "PENDING") {
    showMessage(
      "Your restaurant profile has been submitted successfully and is waiting for admin approval. Some restaurant features will become available after approval.",
      "info"
    );
  }

  if (approvalStatus === "REJECTED") {
    showMessage(
      "Your restaurant profile was not approved. Please review your restaurant details and update them before submitting again.",
      "error"
    );
  }

  if (approvalStatus === "APPROVED") {
    showMessage(
      "Your restaurant has been approved and is now available on Coast Connect.",
      "success"
    );
  }
}

async function loadOwnerRestaurant() {
  try {
    const response = await fetch(
      `${API_BASE_URL}/restaurants/owner/profile`,
      {
        method: "GET",

        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    const data = await response.json();

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      logout();
      return;
    }

    // Restaurant owner has not created a profile yet.
    if (response.status === 404) {
      ownerRestaurant = null;

      resetRestaurantOverview();

      populateRestaurantForm();

      showMessage(
        "Welcome! Please complete and save your restaurant profile to continue."
      );

      return;
    }

  if (response.status === 404) {
  ownerRestaurant = null;

  resetRestaurantOverview();

  showMessage(
    "Welcome! Please create your restaurant profile to start setting up your restaurant.",
    "info"
  );

  populateRestaurantForm();

  await Promise.allSettled([
    loadCurrentSubscription(),
    loadSubscriptionPlans(),
  ]);

  return;
}

if (!response.ok) {
  throw new Error(
    data.message ||
    "Unable to load restaurant profile."
  );
}

    ownerRestaurant =
      data.restaurant || null;

    showRestaurantApprovalNotice();

    isRestaurantAcceptingOrders =
      ownerRestaurant?.isAcceptingOrders !== false;

    currentPauseReason =
      ownerRestaurant?.temporaryClosedReason ||
      null;

    renderOrderAvailability();

    joinOwnerRestaurantRoom();

    populateRestaurantForm();
    updateRestaurantOverview();

    await Promise.allSettled([
      loadOwnerMenuItems(),
      loadOwnerGallery(),
      loadOwnerOpeningHours(),
      loadOwnerOrders(),
      loadOwnerReviews(),
      loadRestaurantAnalytics(),
      loadRestaurantStaff(),
      loadOwnerNotifications(),
      loadOwnerPromotions(),
      loadOwnerDeliveryZones(),
      loadCurrentSubscription(),
      loadSubscriptionPlans(),
    ]);

  } catch (error) {
    console.error(
      "Load owner restaurant error:",
      error
    );

    resetRestaurantOverview();

    showMessage(
      error.message ||
      "Unable to connect to the server."
    );
  }
}

setInterval(() => {
  if (ownerPromotions.length > 0) {
    renderOwnerPromotions();
  }
}, 30000);


function joinOwnerRestaurantRoom() {
  if (
    !socket.connected ||
    !ownerRestaurant?.id
  ) {
    return;
  }

  socket.emit(
    "join-restaurant-room",
    ownerRestaurant.id
  );

  console.log(
    "Joined restaurant room:",
    ownerRestaurant.id
  );
}

function getOrderActionButtons(order) {
  const status =
    String(
      order.status || ""
    ).toUpperCase();

  const orderType =
    String(
      order.orderType || ""
    ).toUpperCase();

  const orderId =
    escapeHtml(order.id);

  if (status === "PENDING") {
    return `
      <button
        type="button"
        data-order-action="ACCEPTED"
        data-order-id="${orderId}"
      >
        Accept Order
      </button>

      <button
        type="button"
        class="delete"
        data-order-action="REJECTED"
        data-order-id="${orderId}"
      >
        Reject Order
      </button>

      <button
        type="button"
        class="delete"
        data-order-action="CANCELLED"
        data-order-id="${orderId}"
      >
        Cancel Order
      </button>
    `;
  }

  if (status === "ACCEPTED") {
    return `
      <button
        type="button"
        data-order-action="PREPARING"
        data-order-id="${orderId}"
      >
        Start Preparing
      </button>

      <button
        type="button"
        class="delete"
        data-order-action="CANCELLED"
        data-order-id="${orderId}"
      >
        Cancel Order
      </button>
    `;
  }

  if (status === "PREPARING") {
    return `
      <button
        type="button"
        data-order-action="READY"
        data-order-id="${orderId}"
      >
        Mark as Ready
      </button>

      <button
        type="button"
        class="delete"
        data-order-action="CANCELLED"
        data-order-id="${orderId}"
      >
        Cancel Order
      </button>
    `;
  }

  if (status === "READY") {
    if (orderType === "DELIVERY") {
      return `
        <button
          type="button"
          data-order-action="OUT_FOR_DELIVERY"
          data-order-id="${orderId}"
        >
          Out for Delivery
        </button>

        <button
          type="button"
          class="delete"
          data-order-action="CANCELLED"
          data-order-id="${orderId}"
        >
          Cancel Order
        </button>
      `;
    }

    return `
      <button
        type="button"
        data-order-action="COMPLETED"
        data-order-id="${orderId}"
      >
        Complete Order
      </button>

      <button
        type="button"
        class="delete"
        data-order-action="CANCELLED"
        data-order-id="${orderId}"
      >
        Cancel Order
      </button>
    `;
  }

  if (
    status ===
    "OUT_FOR_DELIVERY"
  ) {
    return `
      <button
        type="button"
        data-order-action="COMPLETED"
        data-order-id="${orderId}"
      >
        Mark Delivered
      </button>

      <button
        type="button"
        class="delete"
        data-order-action="CANCELLED"
        data-order-id="${orderId}"
      >
        Cancel Order
      </button>
    `;
  }

  return "";
}

function getOrderStatusClass(status) {
  return String(status || "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-");
}

function formatOrderStatus(status) {
  const statusLabels = {
    AWAITING_PAYMENT:
      "Awaiting Payment",

    PENDING:
      "Pending",

    ACCEPTED:
      "Accepted",

    PREPARING:
      "Preparing",

    READY:
      "Ready",

    OUT_FOR_DELIVERY:
      "Out for Delivery",

    COMPLETED:
      "Completed",

    CANCELLED:
      "Cancelled",

    REJECTED:
      "Rejected",
  };

  const normalizedStatus =
    String(status || "")
      .trim()
      .toUpperCase();

  return (
    statusLabels[normalizedStatus] ||
    normalizedStatus
  );
}

function renderOwnerOrders() {

  if (ownerOrders.length === 0) {

    ordersSummary.textContent =
      "No orders found.";

    ordersContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">▤</div>

        <h3>No orders</h3>

        <p>
          New customer orders will appear here.
        </p>
      </div>
    `;

    ordersPendingCount.textContent = "0";
    ordersAcceptedCount.textContent = "0";
    ordersPreparingCount.textContent = "0";
    ordersReadyCount.textContent = "0";
    ordersCompletedCount.textContent = "0";

    return;
  }

  ordersSummary.textContent =
    `${ownerOrders.length} order${ownerOrders.length === 1 ? "" : "s"}`;

  ordersPendingCount.textContent =
    ownerOrders.filter(
      order => order.status === "PENDING"
    ).length;

  ordersAcceptedCount.textContent =
    ownerOrders.filter(
      order => order.status === "ACCEPTED"
    ).length;

  ordersPreparingCount.textContent =
    ownerOrders.filter(
      order => order.status === "PREPARING"
    ).length;

  ordersReadyCount.textContent =
    ownerOrders.filter(
      order => order.status === "READY"
    ).length;

  ordersCompletedCount.textContent =
    ownerOrders.filter(
      order => order.status === "COMPLETED"
    ).length;

  ordersContainer.innerHTML =
    ownerOrders.map(order => {

      const items =
        Array.isArray(order.items)
          ? order.items
          : [];

      return `

      <article class="order-card">

        <div class="order-header">

          <div>

            <div class="order-number">
              ${escapeHtml(order.orderNumber)}
            </div>

            <div class="order-customer">
              ${escapeHtml(order.customerName)}
            </div>

          </div>

        <span
  class="order-status status-${getOrderStatusClass(
    order.status
  )}"
>
  ${escapeHtml(
    formatOrderStatus(order.status)
  )}
</span>

        </div>

        <div class="order-items">

          ${items.map(item => `

            <div class="order-item">

              <div>

                ${escapeHtml(item.itemName)}

                ×

                ${item.quantity}

              </div>

              <strong>

                KSh ${Number(item.lineTotal).toLocaleString()}

              </strong>

            </div>

          `).join("")}

        </div>

        <div class="order-footer">

  <div class="order-total">
    Total:
    KSh ${Number(
      order.totalAmount || 0
    ).toLocaleString("en-KE")}
  </div>

  <div class="order-actions">
    ${getOrderActionButtons(order)}
  </div>

</div>

      </article>

      `;

    }).join("");

}

async function updateOwnerOrderStatus(
  orderId,
  newStatus,
  actionButton
) {
  const normalizedStatus =
    String(newStatus || "").toUpperCase();

  const confirmationMessages = {
    ACCEPTED:
      "Accept this customer order?",

    PREPARING:
      "Start preparing this order?",

    READY:
    "Mark this order as ready?",

  OUT_FOR_DELIVERY:
    "Mark this order as out for delivery?",

  COMPLETED:
    "Mark this order as completed?",

    REJECTED:
      "Reject this customer order?",

    CANCELLED:
      "Cancel this customer order?",
  };

  const confirmationMessage =
    confirmationMessages[normalizedStatus];

  if (!confirmationMessage) {
    showOrdersMessage(
      "Invalid order status action."
    );

    return;
  }

const confirmed =
  await showConfirm({
    title:
      "Confirm order update",
    message:
      confirmationMessage,
    confirmText:
      "Confirm",
    cancelText:
      "Cancel",
    danger:
      false,
  });

  if (!confirmed) {
    return;
  }

  clearOrdersMessage();

  const originalButtonText =
    actionButton.textContent;

  actionButton.disabled = true;
  actionButton.textContent =
    "Updating...";

  try {
    const response = await fetch(
      `${API_BASE_URL}/orders/owner/${encodeURIComponent(
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
          status: normalizedStatus,
        }),
      }
    );

    const data = await response.json();

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
        "Unable to update the order status."
      );
    }

  currentOrdersStatus = "";
ordersStatusFilter.value = "";

await loadOwnerOrders(1);

    showOrdersMessage(
      data.message ||
      `Order updated to ${normalizedStatus}.`,
      "success"
    );
  } catch (error) {
    console.error(
      "Update order status error:",
      error
    );

    showOrdersMessage(
      error.message ||
      "Unable to update the order status."
    );

    actionButton.disabled = false;
    actionButton.textContent =
      originalButtonText;
  }
}


async function loadOwnerReviews() {
  if (!ownerRestaurant?.id) {
    ownerReviews = [];
    renderOwnerReviews();
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/restaurants/owner/reviews`,
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
        "Unable to load customer reviews."
      );
    }

    reviewsAverageRating.textContent =
      Number(
        data.summary?.averageRating || 0
      ).toFixed(1);

    reviewsTotalCount.textContent =
      String(
        Number(
          data.summary?.totalReviews || 0
        )
      );

    ownerReviews =
      Array.isArray(data.reviews)
        ? data.reviews
        : [];

    renderOwnerReviews();
  } catch (error) {
    console.error(
      "Load owner reviews error:",
      error
    );

    ownerReviews = [];

    renderOwnerReviews();

    showMessage(
      error.message ||
      "Unable to load customer reviews."
    );
  }
}

function renderOwnerReviews() {
  if (ownerReviews.length === 0) {
    restaurantReviewsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">★</div>

        <h3>No reviews yet</h3>

        <p>
          Customer reviews will appear here after completed
          orders are rated.
        </p>
      </div>
    `;

    return;
  }

  restaurantReviewsContainer.innerHTML =
    ownerReviews
      .map((review) => {
        const stars =
          "★".repeat(review.rating) +
          "☆".repeat(
            Math.max(
              0,
              5 - review.rating
            )
          );

        const reviewDate =
          review.createdAt
            ? new Date(
                review.createdAt
              ).toLocaleDateString(
                "en-KE",
                {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }
              )
            : "Unknown date";

        return `
          <article class="owner-review-card">

            <div class="owner-review-header">
              <div>
                <strong>
                  ${escapeHtml(
                    review.customerName ||
                    "Customer"
                  )}
                </strong>

                <span>
                  ${escapeHtml(reviewDate)}
                </span>
              </div>

              <div class="owner-review-rating">
                ${escapeHtml(stars)}
              </div>
            </div>

            <p class="owner-review-comment">
              ${
                review.comment
                  ? escapeHtml(
                      review.comment
                    )
                  : "No written comment."
              }
            </p>

          </article>
        `;
      })
      .join("");
}

async function updateOrderAvailability(
  isAcceptingOrders,
  reason = null
) {
  try {
    toggleOrderAvailabilityButton.disabled =
      true;

    confirmPauseOrdersButton.disabled =
      true;

    const response = await fetch(
      `${API_BASE_URL}/restaurants/owner/order-availability`,
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

        body: JSON.stringify({
          isAcceptingOrders,
          reason,
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
        "Unable to update order availability."
      );
    }

    isRestaurantAcceptingOrders =
      data.orderAvailability
        .isAcceptingOrders;

    currentPauseReason =
      data.orderAvailability.reason ||
      null;

    renderOrderAvailability();

    pauseOrdersForm.hidden = true;
    pauseOrdersReason.value = "";
    customPauseOrdersReason.value = "";
    customPauseOrdersReason.hidden = true;

    showMessage(
      data.message,
      "success"
    );
  } catch (error) {
    console.error(
      "Update order availability error:",
      error
    );

    showMessage(
      error.message ||
      "Unable to update order availability.",
      "error"
    );
  } finally {
    toggleOrderAvailabilityButton.disabled =
      false;

    confirmPauseOrdersButton.disabled =
      false;
  }
}

async function loadOwnerNotifications() {
  try {
    const response = await fetch(
      `${API_BASE_URL}/restaurants/owner/notifications`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message ||
          "Unable to load notifications."
      );
    }

    ownerNotifications =
      data.notifications.map(
        (notification) => ({
          id: notification.id,
          icon: "🔔",
          title: notification.title,
          message: notification.message,
          time: new Date(
            notification.createdAt
          ).toLocaleTimeString(
            "en-KE",
            {
              hour: "2-digit",
              minute: "2-digit",
            }
          ),
        })
      );

    unreadOwnerNotifications =
      data.unreadCount;

    renderOwnerNotifications();

  } catch (error) {
    console.error(
      "Load notifications error:",
      error
    );
  }
}


async function saveChangedPassword(event) {
  event.preventDefault();

  changePasswordMessage.textContent = "";
  changePasswordMessage.className =
    "form-message";

  const currentPasswordValue =
    currentPassword.value;

  const newPasswordValue =
    newPassword.value;

  const confirmPasswordValue =
    confirmPassword.value;

  if (!currentPasswordValue) {
    changePasswordMessage.textContent =
      "Current password is required.";

    changePasswordMessage.className =
      "form-message error";

    return;
  }

  if (newPasswordValue.length < 8) {
    changePasswordMessage.textContent =
      "New password must be at least 8 characters.";

    changePasswordMessage.className =
      "form-message error";

    return;
  }

  if (
    newPasswordValue !==
    confirmPasswordValue
  ) {
    changePasswordMessage.textContent =
      "New passwords do not match.";

    changePasswordMessage.className =
      "form-message error";

    return;
  }

  changePasswordButton.disabled = true;
  changePasswordButton.textContent =
    "Changing password...";

  try {
    const response = await fetch(
      `${API_BASE_URL}/users/password`,
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
          currentPassword:
            currentPasswordValue,

          newPassword:
            newPasswordValue,
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

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.message ||
        "Unable to change the password."
      );
    }

    changePasswordForm.reset();

    changePasswordMessage.textContent =
      data.message ||
      "Password changed successfully.";

    changePasswordMessage.className =
      "form-message success";
  } catch (error) {
    console.error(
      "Change password error:",
      error
    );

    changePasswordMessage.textContent =
      error.message ||
      "Unable to change the password.";

    changePasswordMessage.className =
      "form-message error";
  } finally {
    changePasswordButton.disabled =
      false;

    changePasswordButton.textContent =
      "Change Password";
  }
}
function resetPromotionForm() {
  promotionForm.reset();

  editingPromotionId.value = "";
  promotionType.value = "PERCENTAGE";
  promotionMinimumOrder.value = "0";
  promotionPerCustomerLimit.value = "1";
  promotionIsActive.checked = true;

  promotionFormTitle.textContent =
    "Create promotion";

  savePromotionButton.textContent =
    "Save Promotion";

  promotionFormMessage.textContent = "";
  promotionFormMessage.className =
    "form-message";
}

function openPromotionForm(
  promotion = null
) {
  resetPromotionForm();

  if (promotion) {
    editingPromotionId.value =
      promotion.id;

    promotionName.value =
      promotion.name || "";

    promotionType.value =
      promotion.promotionType ||
      "PERCENTAGE";

    promotionCode.value =
      promotion.promoCode || "";

    promotionDiscountValue.value =
      promotion.discountValue ?? "";

    promotionMinimumOrder.value =
      promotion.minimumOrderAmount ?? 0;

    promotionMaximumDiscount.value =
      promotion.maximumDiscountAmount ?? "";

    promotionTotalUsageLimit.value =
      promotion.totalUsageLimit ?? "";

    promotionPerCustomerLimit.value =
      promotion.perCustomerUsageLimit ?? 1;

    promotionStartsAt.value =
      toDateTimeLocalValue(
        promotion.startsAt
      );

    promotionEndsAt.value =
      toDateTimeLocalValue(
        promotion.endsAt
      );

    promotionDescription.value =
      promotion.description || "";

    promotionIsActive.checked =
      Boolean(promotion.isActive);

    promotionFormTitle.textContent =
      "Edit promotion";

    savePromotionButton.textContent =
      "Save Changes";
  }

  promotionFormPanel.hidden = false;

  promotionFormPanel.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

async function deleteOwnerPromotion(
  promotion
) {
  const confirmed =
  await showConfirm({
    title:
      "Delete promotion?",
    message:
      `"${promotion.name}" will be permanently removed from your restaurant promotions.`,
    confirmText:
      "Delete promotion",
    cancelText:
      "Keep promotion",
    danger:
      true,
  });

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/restaurants/owner/promotions/${encodeURIComponent(
        promotion.id
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

    const data =
      await response.json();

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      logout();
      return;
    }

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.message ||
        "Unable to delete promotion."
      );
    }

    ownerPromotions =
      ownerPromotions.filter(
        (item) =>
          item.id !== promotion.id
      );

    renderOwnerPromotions();

    showMessage(
      data.message ||
      "Promotion deleted successfully.",
      "success"
    );
  } catch (error) {
    console.error(
      "Delete promotion error:",
      error
    );

    showMessage(
      error.message ||
      "Unable to delete promotion."
    );
  }
}

function closePromotionForm() {
  resetPromotionForm();
  promotionFormPanel.hidden = true;
}

function toDateTimeLocalValue(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "";
  }

  const timezoneOffset =
    date.getTimezoneOffset() * 60000;

  return new Date(
    date.getTime() - timezoneOffset
  )
    .toISOString()
    .slice(0, 16);
}


async function loadOwnerPromotions() {
  try {
    const response = await fetch(
      `${API_BASE_URL}/restaurants/owner/promotions`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    const data = await response.json();

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
        "Unable to load promotions."
      );
    }

    ownerPromotions = Array.isArray(
      data.promotions
    )
      ? data.promotions
      : [];

    renderOwnerPromotions();

  } catch (error) {
    console.error(
      "Load promotions error:",
      error
    );

    promotionsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">%</div>
        <h3>Unable to load promotions</h3>
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}

function getPromotionDisplayStatus(
  promotion
) {
  if (!promotion.isActive) {
    return {
      label: "Inactive",
      className: "inactive",
    };
  }

  const now = new Date();

  const startsAt =
    promotion.startsAt
      ? new Date(promotion.startsAt)
      : null;

  const endsAt =
    promotion.endsAt
      ? new Date(promotion.endsAt)
      : null;

  if (
    startsAt &&
    !Number.isNaN(startsAt.getTime()) &&
    now < startsAt
  ) {
    return {
      label: "Scheduled",
      className: "scheduled",
    };
  }

  if (
    endsAt &&
    !Number.isNaN(endsAt.getTime()) &&
    now > endsAt
  ) {
    return {
      label: "Expired",
      className: "expired",
    };
  }

  return {
    label: "Active",
    className: "active",
  };
}

function renderOwnerPromotions() {
  promotionsSummary.textContent =
    `${ownerPromotions.length} promotion${
      ownerPromotions.length === 1 ? "" : "s"
    }`;

  if (ownerPromotions.length === 0) {
    promotionsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">%</div>
        <h3>No promotions yet</h3>
        <p>Create your first promotion.</p>
      </div>
    `;

    return;
  }

  promotionsContainer.innerHTML =
    ownerPromotions
      .map((promotion) => {
        const displayStatus =
          getPromotionDisplayStatus(
            promotion
          );

        return `
          <article class="promotion-card">

            <div class="promotion-card-header">
              <div>
                <h3>
                  ${escapeHtml(
                    promotion.name
                  )}
                </h3>

                <p>
                  ${escapeHtml(
                    promotion.description || ""
                  )}
                </p>
              </div>

              <span class="promotion-status ${
                displayStatus.className
              }">
                ${displayStatus.label}
              </span>
            </div>

            <div class="promotion-meta">
              <div>
                <span>Type</span>

                <strong>
                  ${escapeHtml(
                    promotion.promotionType
                  )}
                </strong>
              </div>

              <div>
                <span>Code</span>

                <strong>
                  ${escapeHtml(
                    promotion.promoCode || "-"
                  )}
                </strong>
              </div>

              <div>
                <span>Discount</span>

                <strong>
                  ${
                    promotion.discountValue ??
                    "-"
                  }
                </strong>
              </div>
            </div>

            <div class="promotion-actions">
              <button
                type="button"
                class="menu-action-button"
                data-promotion-action="edit"
                data-promotion-id="${escapeHtml(
                  promotion.id
                )}"
              >
                Edit
              </button>

              <button
                type="button"
                class="menu-action-button delete"
                data-promotion-action="delete"
                data-promotion-id="${escapeHtml(
                  promotion.id
                )}"
              >
                Delete
              </button>
            </div>

          </article>
        `;
      })
      .join("");
}

function resetDeliveryZoneForm() {
  deliveryZoneForm.reset();

  editingDeliveryZoneId.value = "";
  deliveryZoneMinimumOrder.value = "0";
  deliveryZoneFee.value = "0";
  deliveryZoneActive.checked = true;

  deliveryZoneFormTitle.textContent =
    "Add Delivery Zone";

  saveDeliveryZoneButton.textContent =
    "Save Delivery Zone";

  deliveryZoneMessage.textContent = "";
  deliveryZoneMessage.className =
    "form-message";
}

function openDeliveryZoneForm(
  deliveryZone = null
) {
  resetDeliveryZoneForm();

  if (deliveryZone) {
    editingDeliveryZoneId.value =
      deliveryZone.id || "";

    deliveryZoneName.value =
      deliveryZone.name || "";

    deliveryZoneMinimumOrder.value =
      deliveryZone.minimumOrderAmount ?? 0;

    deliveryZoneFee.value =
      deliveryZone.deliveryFee ?? 0;

    deliveryZoneMinutes.value =
      deliveryZone.estimatedDeliveryMinutes ??
      "";

    deliveryZoneDescription.value =
      deliveryZone.description || "";

    deliveryZoneActive.checked =
      deliveryZone.isActive !== false;

    deliveryZoneFormTitle.textContent =
      "Edit Delivery Zone";

    saveDeliveryZoneButton.textContent =
      "Save Changes";
  }

  deliveryZoneFormPanel.hidden = false;

  deliveryZoneFormPanel.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });

  deliveryZoneName.focus();
}

function closeDeliveryZoneForm() {
  resetDeliveryZoneForm();
  deliveryZoneFormPanel.hidden = true;
}

deliveryZonesContainer.addEventListener(
  "click",
  (event) => {
    const actionButton =
      event.target.closest(
        "[data-delivery-zone-action]"
      );

    if (!actionButton) {
      return;
    }

    const action =
      actionButton.dataset
        .deliveryZoneAction;

    const deliveryZoneId =
      actionButton.dataset
        .deliveryZoneId;

    const deliveryZone =
      ownerDeliveryZones.find(
        (zone) =>
          zone.id === deliveryZoneId
      );

    if (!deliveryZone) {
      return;
    }

    if (action === "edit") {
      openDeliveryZoneForm(
        deliveryZone
      );

      return;
    }

    if (action === "delete") {
      deleteDeliveryZone(
      deliveryZoneId,
      actionButton
    );
    }
  }
);
toggleOrderAvailabilityButton.addEventListener(
  "click",
  async () => {
    if (
      isRestaurantAcceptingOrders
    ) {
      pauseOrdersForm.hidden = false;
      pauseOrdersReason.focus();
      return;
    }

    await updateOrderAvailability(
      true
    );
  }
);

pauseOrdersReason.addEventListener(
  "change",
  () => {
    const isOther =
      pauseOrdersReason.value ===
      "Other";

    customPauseOrdersReason.hidden =
      !isOther;

    if (isOther) {
      customPauseOrdersReason.focus();
    } else {
      customPauseOrdersReason.value = "";
    }
  }
);

cancelPauseOrdersButton.addEventListener(
  "click",
  () => {
    pauseOrdersForm.hidden = true;
    pauseOrdersReason.value = "";
    customPauseOrdersReason.value = "";
    customPauseOrdersReason.hidden = true;
  }
);

confirmPauseOrdersButton.addEventListener(
  "click",
  async () => {
    let reason =
      pauseOrdersReason.value.trim();

    if (reason === "Other") {
      reason =
        customPauseOrdersReason.value.trim();
    }

    if (!reason) {
      showMessage(
        "Please choose or enter a reason for pausing orders.",
        "error"
      );

      return;
    }

    await updateOrderAvailability(
      false,
      reason
    );
  }
);

navLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();

    showSection(link.dataset.section);
  });
});

document
  .querySelectorAll("[data-target-section]")
  .forEach((button) => {
    button.addEventListener("click", () => {
      showSection(
        button.dataset.targetSection
      );
    });
  });

openSidebarButton.addEventListener(
  "click",
  openSidebar
);

closeSidebarButton.addEventListener(
  "click",
  closeSidebar
);

sidebarOverlay.addEventListener(
  "click",
  closeSidebar
);

restaurantProfileForm.addEventListener(
  "submit",
  saveRestaurantProfile
);

openingHoursForm.addEventListener(
  "submit",
  saveOpeningHours
);

topbarLogoutButton.addEventListener(
  "click",
  logout
);

sidebarLogoutButton?.addEventListener(
  "click",
  logout
);

ownerAccountForm.addEventListener(
  "submit",
  saveOwnerAccount
);

viewRestaurantButton.addEventListener(
  "click",
  () => {
    if (
      !ownerRestaurant?.slug ||
      viewRestaurantButton.disabled
    ) {
      return;
    }

    window.open(
      `restaurant-details.html?restaurant=${encodeURIComponent(
        ownerRestaurant.slug
      )}`,
      "_blank",
      "noopener,noreferrer"
    );
  }
);

addMenuItemButton.addEventListener(
  "click",
  () => {
    openMenuItemForm();
  }
);

addStaffButton?.addEventListener(
  "click",
  openStaffForm
);

closeStaffFormButton?.addEventListener(
  "click",
  closeStaffForm
);

cancelStaffFormButton?.addEventListener(
  "click",
  closeStaffForm
);

addGalleryImageButton.addEventListener(
  "click",
  () => {
    openGalleryImageForm();
  }
);

promotionForm.addEventListener(
  "submit",
  savePromotion
);

closeGalleryFormButton.addEventListener(
  "click",
  closeGalleryImageForm
);

cancelGalleryFormButton.addEventListener(
  "click",
  closeGalleryImageForm
);

galleryImageForm.addEventListener(
  "submit",
  saveGalleryImage
);

addPromotionButton.addEventListener(
  "click",
  () => {
    openPromotionForm();
  }
);

closePromotionFormButton.addEventListener(
  "click",
  closePromotionForm
);

cancelPromotionFormButton.addEventListener(
  "click",
  closePromotionForm
);

closeMenuFormButton.addEventListener(
  "click",
  closeMenuItemForm
);

cancelMenuFormButton.addEventListener(
  "click",
  closeMenuItemForm
);

menuItemForm.addEventListener(
  "submit",
  saveMenuItem
);

staffForm?.addEventListener(
  "submit",
  saveRestaurantStaff
);

changePasswordForm.addEventListener(
  "submit",
  saveChangedPassword
);

addDeliveryZoneButton.addEventListener(
  "click",
  () => {
    openDeliveryZoneForm();
  }
);

closeDeliveryZoneFormButton.addEventListener(
  "click",
  closeDeliveryZoneForm
);

cancelDeliveryZoneButton.addEventListener(
  "click",
  closeDeliveryZoneForm
);

deliveryZoneForm.addEventListener(
  "submit",
  saveDeliveryZone
);
menuItemsContainer.addEventListener(
  "click",
  (event) => {
    const actionButton = event.target.closest(
      "[data-menu-action]"
    );

    if (!actionButton) {
      return;
    }

    const menuItemId =
      actionButton.dataset.menuItemId;

    const action =
      actionButton.dataset.menuAction;

    if (action === "edit") {
      const menuItem = ownerMenuItems.find(
        (item) => item.id === menuItemId
      );

      if (menuItem) {
        openMenuItemForm(menuItem);
      }

      return;
    }

    if (action === "delete") {
      deleteMenuItem(menuItemId);
    }
  }
);

galleryImagesContainer.addEventListener(
  "click",
  (event) => {
    const actionButton =
      event.target.closest(
        "[data-gallery-action]"
      );

    if (!actionButton) {
      return;
    }

    const galleryImageId =
      actionButton.dataset.galleryImageId;

    const action =
      actionButton.dataset.galleryAction;

    if (action === "edit") {
      const galleryImage =
        ownerGalleryImages.find(
          (image) =>
            image.id === galleryImageId
        );

      if (galleryImage) {
        openGalleryImageForm(
          galleryImage
        );
      }

      return;
    }

    if (action === "delete") {
      deleteGalleryImage(
        galleryImageId
      );
    }
  }
);

promotionsContainer.addEventListener(
  "click",
  async (event) => {
    const actionButton =
      event.target.closest(
        "[data-promotion-action]"
      );

    if (!actionButton) {
      return;
    }

    const promotionId =
      actionButton.dataset.promotionId;

    const action =
      actionButton.dataset.promotionAction;

    const promotion =
      ownerPromotions.find(
        (item) =>
          item.id === promotionId
      );

    if (!promotion) {
      showMessage(
        "Promotion could not be found."
      );

      return;
    }

    if (action === "edit") {
      openPromotionForm(
        promotion
      );

      return;
    }

    if (action === "delete") {
      await deleteOwnerPromotion(
        promotion
      );
    }
  }
);

ordersContainer.addEventListener(
  "click",
  (event) => {
    const actionButton =
      event.target.closest(
        "[data-order-action]"
      );

    if (!actionButton) {
      return;
    }

    const orderId =
      actionButton.dataset.orderId;

    const newStatus =
      actionButton.dataset.orderAction;

    if (!orderId || !newStatus) {
      showOrdersMessage(
        "Unable to identify this order."
      );

      return;
    }

    updateOwnerOrderStatus(
      orderId,
      newStatus,
      actionButton
    );
  }
);

menuItemImage.addEventListener(
  "change",
  () => {
    const selectedFile =
      menuItemImage.files[0];

    if (!selectedFile) {
      menuPreviewImage.src = "";
      menuImagePreview.hidden = true;
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      menuItemImage.value = "";

      showMenuFormMessage(
        "Choose a JPG, PNG, or WebP image."
      );

      return;
    }

    const maximumSize =
      5 * 1024 * 1024;

    if (selectedFile.size > maximumSize) {
      menuItemImage.value = "";

      showMenuFormMessage(
        "The image must not exceed 5 MB."
      );

      return;
    }

    clearMenuFormMessage();

    const previewUrl =
      URL.createObjectURL(selectedFile);

    menuPreviewImage.src = previewUrl;
    menuImagePreview.hidden = false;
  }
);

galleryImageFile.addEventListener(
  "change",
  () => {
    const selectedFile =
      galleryImageFile.files[0];

    if (!selectedFile) {
      galleryPreviewImage.src =
        galleryImageUrl.value.trim();

      galleryImagePreview.hidden =
        !galleryImageUrl.value.trim();

      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      galleryImageFile.value = "";

      showGalleryFormMessage(
        "Choose a JPG, PNG, or WebP image."
      );

      return;
    }

    const maximumSize =
      5 * 1024 * 1024;

    if (selectedFile.size > maximumSize) {
      galleryImageFile.value = "";

      showGalleryFormMessage(
        "The image must not exceed 5 MB."
      );

      return;
    }

    clearGalleryFormMessage();

    const previewUrl =
      URL.createObjectURL(selectedFile);

    galleryPreviewImage.src = previewUrl;
    galleryImagePreview.hidden = false;
  }
);

window.addEventListener(
  "hashchange",
  () => {
    const sectionName =
      window.location.hash.replace(
        "#",
        ""
      ) || "overview";

    showSection(sectionName, false);
  }
);

window.addEventListener("resize", () => {
  if (window.innerWidth > 820) {
    closeSidebar();
  }
});

populateOwnerDetails();
resetRestaurantOverview();

const initialSection =
  window.location.hash.replace("#", "") ||
  "overview";

showSection(initialSection, false);

async function handleSubscriptionPaymentReturn() {
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

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      logout();
      return;
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

    showMessage(
      "Payment successful. Your subscription is now active.",
      "success"
    );

    await Promise.allSettled([
      loadCurrentSubscription(),
      loadSubscriptionPlans(),
    ]);
  } catch (error) {
    console.error(
      "Verify subscription payment error:",
      error
    );

    showMessage(
      error.message ||
      "Unable to verify your payment.",
      "error"
    );
  }
}

handleSubscriptionPaymentReturn();

loadOwnerRestaurant();

socket.on(
  "connect",
  () => {
    console.log(
      "Restaurant dashboard socket connected:",
      socket.id
    );

    joinOwnerRestaurantRoom();
  }
);

socket.on(
  "restaurant-order-created",
  async (order) => {
    if (
      !order?.id ||
      String(order.restaurantId) !==
        String(ownerRestaurant?.id)
    ) {
      return;
    }

    console.log(
      "New restaurant order received:",
      order
    );

    addOwnerNotification({
      icon: "🧾",
      title: "New customer order",
      message:
        `${order.orderNumber || "A new order"} has been received.`,
    });

    currentOrdersStatus = "";
    currentOrdersPage = 1;

    if (ordersStatusFilter) {
      ordersStatusFilter.value = "";
    }

    await loadOwnerOrders(1);

    pendingOrdersBadge.classList.add(
      "has-new-order"
    );

    showMessage(
      `New order ${order.orderNumber} received.`,
      "success"
    );

    try {
      const audio = new Audio(
        "sounds/new-order.mp3"
      );

      await audio.play();
    } catch (error) {
      console.log(
        "New-order sound could not play:",
        error.message
      );
    }
  }
);

socket.on(
  "restaurant-order-updated",
  async (order) => {
    if (
      !order?.id ||
      String(order.restaurantId) !==
        String(ownerRestaurant?.id)
    ) {
      return;
    }

    const status =
      String(order.status || "")
        .toUpperCase();

    const notificationDetails = {
      ACCEPTED: {
        icon: "✅",
        title: "Order accepted",
        message:
          `${order.orderNumber} was accepted.`,
      },

      PREPARING: {
        icon: "👨‍🍳",
        title: "Order preparing",
        message:
          `${order.orderNumber} is being prepared.`,
      },

      READY: {
        icon: "🍽️",
        title: "Order ready",
        message:
          `${order.orderNumber} is ready.`,
      },

      COMPLETED: {
        icon: "✔️",
        title: "Order completed",
        message:
          `${order.orderNumber} was completed.`,
      },

      CANCELLED: {
        icon: "❌",
        title: "Order cancelled",
        message:
          `${order.orderNumber} was cancelled.`,
      },

      REJECTED: {
        icon: "⚠️",
        title: "Order rejected",
        message:
          `${order.orderNumber} was rejected.`,
      },
    };

    const details =
      notificationDetails[status];

    if (details) {
      addOwnerNotification(
        details
      );
    }

    await loadOwnerOrders(
      currentOrdersPage
    );
  }
);

socket.on(
  "disconnect",
  (reason) => {
    console.log(
      "Restaurant dashboard socket disconnected:",
      reason
    );
  }
);

socket.on(
  "connect_error",
  (error) => {
    console.error(
      "Restaurant dashboard socket error:",
      error.message
    );
  }
);

socket.on(
  "restaurant-order-created",
  async (order) => {
    console.log(
      "New paid order received:",
      order
    );

    socket.on(
  "restaurant-order-created",
  (order) => {
    addOwnerNotification({
      icon: "🧾",
      title: "New customer order",
      message:
        `${order.orderNumber || "A new order"} has been received.`,
    });

    loadOwnerOrders(
      currentOrdersPage
    );
  }
);

socket.on(
  "restaurant-order-updated",
  (order) => {
    const status =
      String(order.status || "")
        .toUpperCase();

    const notificationDetails = {
      ACCEPTED: {
        icon: "✅",
        title: "Order accepted",
        message:
          `${order.orderNumber || "An order"} was accepted by the kitchen.`,
      },

      PREPARING: {
        icon: "👨‍🍳",
        title: "Order preparing",
        message:
          `${order.orderNumber || "An order"} is now being prepared.`,
      },

      READY: {
        icon: "🍽️",
        title: "Order ready",
        message:
          `${order.orderNumber || "An order"} is ready.`,
      },

      COMPLETED: {
        icon: "✔️",
        title: "Order completed",
        message:
          `${order.orderNumber || "An order"} has been completed.`,
      },

      CANCELLED: {
        icon: "❌",
        title: "Order cancelled",
        message:
          `${order.orderNumber || "An order"} was cancelled.`,
      },

      REJECTED: {
        icon: "⚠️",
        title: "Order rejected",
        message:
          `${order.orderNumber || "An order"} was rejected.`,
      },
    };

    socket.on(
  "restaurant-notification-created",
  (notification) => {

    ownerNotifications.unshift({
      id: notification.id,
      icon: "🔔",
      title: notification.title,
      message: notification.message,
      time: new Date(
        notification.createdAt
      ).toLocaleTimeString(
        "en-KE",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      ),
    });

    unreadOwnerNotifications++;

    renderOwnerNotifications();

  }
);

    const details =
      notificationDetails[status];

    if (details) {
      addOwnerNotification(
        details
      );
    }

    loadOwnerOrders(
      currentOrdersPage
    );
  }
);

if (
  !order?.id ||
  String(order.restaurantId) !==
    String(ownerRestaurant?.id)
) {
  return;
}

    currentOrdersStatus = "";
    currentOrdersPage = 1;

    if (ordersStatusFilter) {
      ordersStatusFilter.value = "";
    }

    await loadOwnerOrders(1);

    pendingOrdersBadge.classList.add(
      "has-new-order"
    );

    showMessage(
      `New paid order ${order.orderNumber} received.`,
      "success"
    );

    if (
      document.visibilityState ===
      "visible"
    ) {
      showSection("orders");
    }

    try {
      const audio = new Audio(
        "sounds/new-order.mp3"
      );

      await audio.play();
    } catch (error) {
      console.log(
        "New-order sound could not play:",
        error.message
      );
    }
  }
);

   