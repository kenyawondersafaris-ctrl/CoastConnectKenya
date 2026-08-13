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

let cart = [];

let currentRestaurant = null;
let currentRestaurantFavoriteId =
  null;

const restaurantFavoriteButton =
  document.getElementById(
    "restaurantFavoriteButton"
  );
let appliedPromotion = null;
let currentDiscountAmount = 0;

let restaurantDeliveryZones = [];

let selectedDeliveryZone = null;

let deliveryFee = 0;

const restaurantDetailsStatus = document.getElementById(
  "restaurantDetailsStatus"
);

const restaurantDetailsContent = document.getElementById(
  "restaurantDetailsContent"
);

const restaurantInformationSection = document.getElementById(
  "restaurantInformationSection"
);

const restaurantDetailsError = document.getElementById(
  "restaurantDetailsError"
);

const restaurantErrorMessage = document.getElementById(
  "restaurantErrorMessage"
);

const restaurantCoverImage = document.getElementById(
  "restaurantCoverImage"
);

const restaurantImagePlaceholder = document.getElementById(
  "restaurantImagePlaceholder"
);

const restaurantVerifiedBadge = document.getElementById(
  "restaurantVerifiedBadge"
);

const restaurantOpenBadge = document.getElementById(
  "restaurantOpenBadge"
);

const restaurantLocationLabel = document.getElementById(
  "restaurantLocationLabel"
);

const restaurantName = document.getElementById("restaurantName");

const restaurantRating = document.getElementById(
  "restaurantRating"
);

const restaurantReviewCount = document.getElementById(
  "restaurantReviewCount"
);

const restaurantPriceRange = document.getElementById(
  "restaurantPriceRange"
);

const restaurantDescription = document.getElementById(
  "restaurantDescription"
);

const restaurantCuisineList = document.getElementById(
  "restaurantCuisineList"
);

const restaurantAddress = document.getElementById(
  "restaurantAddress"
);

const restaurantHours = document.getElementById(
  "restaurantHours"
);

const restaurantPhone = document.getElementById(
  "restaurantPhone"
);

const restaurantPhoneUnavailable = document.getElementById(
  "restaurantPhoneUnavailable"
);

const restaurantWhatsapp = document.getElementById(
  "restaurantWhatsapp"
);

const restaurantWhatsappUnavailable = document.getElementById(
  "restaurantWhatsappUnavailable"
);

const restaurantEmail = document.getElementById(
  "restaurantEmail"
);

const restaurantEmailUnavailable = document.getElementById(
  "restaurantEmailUnavailable"
);

const restaurantHalal = document.getElementById(
  "restaurantHalal"
);

const restaurantDelivery = document.getElementById(
  "restaurantDelivery"
);

const restaurantLocationCard = document.getElementById(
  "restaurantLocationCard"
);

const restaurantCoordinates = document.getElementById(
  "restaurantCoordinates"
);

const restaurantMapLink = document.getElementById(
  "restaurantMapLink"
);

const menuStatus = document.getElementById("menuStatus");

const menuCategories = document.getElementById(
  "menuCategories"
);

const menuEmptyState = document.getElementById(
  "menuEmptyState"
);

const menuItemCount = document.getElementById(
  "menuItemCount"
);

const reviewsStatus = document.getElementById(
  "reviewsStatus"
);

const reviewsList = document.getElementById(
  "reviewsList"
);

const reviewsEmptyState = document.getElementById(
  "reviewsEmptyState"
);

const cartItemCount = document.getElementById(
  "cartItemCount"
);

const cartEmptyState = document.getElementById(
  "cartEmptyState"
);

const cartItems = document.getElementById(
  "cartItems"
);

const cartSummary = document.getElementById(
  "cartSummary"
);

const cartTotal = document.getElementById(
  "cartTotal"
);

const checkoutButton = document.getElementById(
  "checkoutButton"
);

const checkoutPanel = document.getElementById(
  "checkoutPanel"
);

const closeCheckoutButton = document.getElementById(
  "closeCheckoutButton"
);

const checkoutForm = document.getElementById(
  "checkoutForm"
);

const checkoutOrderType = document.getElementById(
  "checkoutOrderType"
);

const checkoutTableNumberGroup =
  document.getElementById(
    "checkoutTableNumberGroup"
  );

const checkoutGuestCountGroup =
  document.getElementById(
    "checkoutGuestCountGroup"
  );

const checkoutDeliveryAddressGroup =
  document.getElementById(
    "checkoutDeliveryAddressGroup"
  );

  const checkoutPromoCode =
  document.getElementById(
    "checkoutPromoCode"
  );

const applyPromoCodeButton =
  document.getElementById(
    "applyPromoCodeButton"
  );

const checkoutPromoMessage =
  document.getElementById(
    "checkoutPromoMessage"
  );

const checkoutPromotionSummary =
  document.getElementById(
    "checkoutPromotionSummary"
  );

const promotionSubtotal =
  document.getElementById(
    "promotionSubtotal"
  );

const promotionDiscount =
  document.getElementById(
    "promotionDiscount"
  );

const promotionTotal =
  document.getElementById(
    "promotionTotal"
  );

document.addEventListener("DOMContentLoaded", () => {
  loadRestaurantDetails();
});

const checkoutDeliveryAddress =
  document.getElementById(
    "checkoutDeliveryAddress"
  );

const checkoutDeliverySummary =
  document.getElementById(
    "checkoutDeliverySummary"
  );

const checkoutDeliveryZoneName =
  document.getElementById(
    "checkoutDeliveryZoneName"
  );

const checkoutDeliveryFee =
  document.getElementById(
    "checkoutDeliveryFee"
  );

const checkoutDeliveryTime =
  document.getElementById(
    "checkoutDeliveryTime"
  );

  const checkoutFinalSubtotal =
  document.getElementById(
    "checkoutFinalSubtotal"
  );

const checkoutFinalDiscountRow =
  document.getElementById(
    "checkoutFinalDiscountRow"
  );

const checkoutFinalDiscount =
  document.getElementById(
    "checkoutFinalDiscount"
  );

const checkoutFinalDeliveryRow =
  document.getElementById(
    "checkoutFinalDeliveryRow"
  );

const checkoutFinalDeliveryFee =
  document.getElementById(
    "checkoutFinalDeliveryFee"
  );

const checkoutFinalTotal =
  document.getElementById(
    "checkoutFinalTotal"
  );

  const checkoutPaymentMethods =
  document.querySelectorAll(
    'input[name="checkoutPaymentMethod"]'
  );

const placeOrderButton =
  document.getElementById(
    "placeOrderButton"
  );

  const checkoutEmailGroup =
  document.getElementById(
    "checkoutEmailGroup"
  );

const checkoutCustomerEmail =
  document.getElementById(
    "checkoutCustomerEmail"
  );

function updatePaymentMethodButton() {
  const selectedMethod =
    document.querySelector(
      'input[name="checkoutPaymentMethod"]:checked'
    )?.value || "MPESA";

  const cardSelected =
    selectedMethod === "CARD";

  checkoutEmailGroup.hidden =
    !cardSelected;

  checkoutCustomerEmail.required =
    cardSelected;

  if (cardSelected) {
    placeOrderButton.textContent =
      "Pay with Card";
  } else {
    checkoutCustomerEmail.value = "";

    placeOrderButton.textContent =
      "Pay with M-Pesa";
  }
}
checkoutPaymentMethods.forEach(
  (paymentMethodInput) => {
    paymentMethodInput.addEventListener(
      "change",
      updatePaymentMethodButton
    );
  }
);

updatePaymentMethodButton();

async function loadRestaurantDetails() {
  const restaurantIdentifier = getRestaurantIdentifier();

  if (!restaurantIdentifier) {
    showRestaurantError(
      "No restaurant was selected. Return to the restaurants page and choose a restaurant."
    );

    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/restaurants/${encodeURIComponent(
        restaurantIdentifier
      )}`
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Restaurant details could not be loaded."
      );
    }

    const restaurant = result.restaurant;
    await loadRestaurantDeliveryZones(
  restaurant.id
);

    if (!restaurant) {
      throw new Error("Restaurant information was not found.");
    }

    displayRestaurantDetails(
  restaurant
);

displayMenu(
  result.menuItems ||
  restaurant.menuItems ||
  []
);

displayReviews(
  result.reviews ||
  restaurant.reviews ||
  []
);

await loadRestaurantFavoriteStatus();
  } catch (error) {
    console.error("Restaurant details error:", error);

    showRestaurantError(
      error.message || "Restaurant details could not be loaded."
    );
  }
}

async function loadRestaurantFavoriteStatus() {
  currentRestaurantFavoriteId = null;

  if (!restaurantFavoriteButton) {
    return;
  }

  restaurantFavoriteButton.textContent =
    "♡ Save";

  restaurantFavoriteButton.classList.remove(
    "saved"
  );

  if (
    !token ||
    !currentRestaurant?.id
  ) {
    return;
  }

  try {
    const response =
      await fetch(
        `${API_BASE_URL}/favorites`,
        {
          method: "GET",

          headers: {
            Accept:
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },
        }
      );

    const result =
      await response.json();

      console.log(
  "RESTAURANT FAVORITES RESULT:",
  result
);

console.log(
  "CURRENT RESTAURANT ID:",
  currentRestaurant?.id
);

    if (
      !response.ok ||
      !result.success
    ) {
      throw new Error(
        result.message ||
        "Unable to load favorites."
      );
    }

    const favorites =
      Array.isArray(result.favorites)
        ? result.favorites
        : [];

    const existingFavorite =
      favorites.find(
        (favorite) => {
          const restaurantId =
            favorite.restaurantId ||
            favorite.restaurant_id ||
            favorite.restaurant?.id;

          return (
            String(restaurantId) ===
            String(currentRestaurant.id)
          );
        }
      );

    if (!existingFavorite) {
      return;
    }

    currentRestaurantFavoriteId =
      existingFavorite.id ||
      existingFavorite.favoriteId ||
      existingFavorite.favorite_id ||
      null;

    restaurantFavoriteButton.textContent =
      "♥ Saved";

    restaurantFavoriteButton.classList.add(
      "saved"
    );
  } catch (error) {
    console.error(
      "Load restaurant favorite status:",
      error
    );
  }
}

async function loadRestaurantDeliveryZones(
  restaurantId
) {

  try {

    const response =
      await fetch(
        `${API_BASE_URL}/restaurants/${restaurantId}/delivery-zones`
      );

    const result =
      await response.json();

    if (
      response.ok &&
      result.success
    ) {

      restaurantDeliveryZones =
        result.deliveryZones || [];

    }

  } catch (error) {

    console.error(
      "Load delivery zones:",
      error
    );

    restaurantDeliveryZones = [];

  }

}

function getRestaurantIdentifier() {
  const queryParameters =
    new URLSearchParams(
      window.location.search
    );

  return (
    queryParameters.get("restaurant") ||
    queryParameters.get("slug") ||
    queryParameters.get("id") ||
    ""
  ).trim();
}

function displayRestaurantDetails(restaurant) {
  currentRestaurant = restaurant;
  restaurantDetailsStatus.hidden = true;
  restaurantDetailsContent.hidden = false;
  restaurantInformationSection.hidden = false;
  restaurantDetailsError.hidden = true;

  const name = restaurant.name || "Restaurant";

  document.title = `${name} | Coast Connect Kenya`;
  restaurantName.textContent = name;

  const locationName =
    restaurant.locationName ||
    restaurant.location_name ||
    restaurant.city ||
    restaurant.county ||
    "Coastal Kenya";

  restaurantLocationLabel.textContent = locationName;

  const rating = Number(
    restaurant.averageRating ??
      restaurant.average_rating ??
      restaurant.rating ??
      0
  );

  const reviewCount = Number(
    restaurant.totalReviews ??
      restaurant.total_reviews ??
      restaurant.reviewCount ??
      0
  );

  restaurantRating.textContent = `★ ${rating.toFixed(1)}`;

  restaurantReviewCount.textContent =
    reviewCount === 1 ? "1 review" : `${reviewCount} reviews`;

  restaurantPriceRange.textContent = formatPriceRange(
    restaurant.priceRange || restaurant.price_range
  );

  restaurantDescription.textContent =
    restaurant.description ||
    "Discover this restaurant, its menu and services on Coast Connect Kenya.";

  displayRestaurantImage(restaurant, name);
  displayRestaurantBadges(restaurant);
  displayCuisines(restaurant.cuisines);
  displayContactInformation(restaurant);
  displayRestaurantServices(restaurant);
  displayRestaurantLocation(restaurant);
}

function displayRestaurantImage(
  restaurant,
  restaurantNameText
) {
  const imageUrl =
    restaurant.coverImageUrl ||
    restaurant.cover_image_url ||
    restaurant.imageUrl ||
    restaurant.image_url ||
    "";

  if (!imageUrl) {
    if (restaurantCoverImage) {
      restaurantCoverImage.hidden = true;
    }

    if (restaurantImagePlaceholder) {
      restaurantImagePlaceholder.hidden = true;
    }

    return;
  }

  if (restaurantCoverImage) {
    restaurantCoverImage.src =
      imageUrl;

    restaurantCoverImage.alt =
      `${restaurantNameText} restaurant`;

    restaurantCoverImage.hidden =
      false;

    restaurantCoverImage.onerror =
      () => {
        restaurantCoverImage.hidden =
          true;

        if (
          restaurantImagePlaceholder
        ) {
          restaurantImagePlaceholder.hidden =
            true;
        }
      };
  }

  if (
    restaurantImagePlaceholder
  ) {
    restaurantImagePlaceholder.hidden =
      true;
  }
}

function displayRestaurantBadges(restaurant) {
  const isVerified = Boolean(
    restaurant.isVerified ?? restaurant.is_verified
  );

  restaurantVerifiedBadge.hidden = !isVerified;

  const isOpen = Boolean(
    restaurant.isOpenNow ?? restaurant.is_open_now
  );

  restaurantOpenBadge.textContent = isOpen
    ? "Open now"
    : "Closed";

  restaurantOpenBadge.classList.remove("open", "closed");

  restaurantOpenBadge.classList.add(
    isOpen ? "open" : "closed"
  );
}

function displayCuisines(cuisines) {
  restaurantCuisineList.innerHTML = "";

  const cuisineList = normalizeArray(cuisines);

  if (cuisineList.length === 0) {
    return;
  }

  cuisineList.forEach((cuisine) => {
    const cuisineChip = document.createElement("span");

    cuisineChip.className = "restaurant-cuisine-chip";
    cuisineChip.textContent = cuisine;

    restaurantCuisineList.appendChild(cuisineChip);
  });
}

function displayContactInformation(restaurant) {
  const address =
    restaurant.address ||
    restaurant.locationAddress ||
    restaurant.location_address ||
    "Not provided";

  restaurantAddress.textContent = address;

  restaurantHours.textContent = formatOpeningHours(
    restaurant.openingHours || restaurant.opening_hours
  );

  const phone =
    restaurant.phone ||
    restaurant.phoneNumber ||
    restaurant.phone_number ||
    "";

  if (phone) {
    restaurantPhone.textContent = phone;
    restaurantPhone.href = `tel:${sanitizePhoneNumber(phone)}`;
    restaurantPhone.hidden = false;
    restaurantPhoneUnavailable.hidden = true;
  } else {
    restaurantPhone.hidden = true;
    restaurantPhoneUnavailable.hidden = false;
  }

  const whatsapp =
    restaurant.whatsapp ||
    restaurant.whatsappNumber ||
    restaurant.whatsapp_number ||
    "";

  if (whatsapp) {
    restaurantWhatsapp.href =
      `https://wa.me/${sanitizePhoneNumber(whatsapp)}`;

    restaurantWhatsapp.hidden = false;
    restaurantWhatsappUnavailable.hidden = true;
  } else {
    restaurantWhatsapp.hidden = true;
    restaurantWhatsappUnavailable.hidden = false;
  }

  const email = restaurant.email || "";

  if (email) {
    restaurantEmail.textContent = email;
    restaurantEmail.href = `mailto:${email}`;
    restaurantEmail.hidden = false;
    restaurantEmailUnavailable.hidden = true;
  } else {
    restaurantEmail.hidden = true;
    restaurantEmailUnavailable.hidden = false;
  }
}

function displayRestaurantServices(restaurant) {
  const isHalal = Boolean(
    restaurant.isHalal ?? restaurant.is_halal
  );

  const offersDelivery = Boolean(
    restaurant.offersDelivery ??
      restaurant.offers_delivery ??
      restaurant.hasDelivery ??
      restaurant.has_delivery
  );

  restaurantHalal.textContent = isHalal ? "Yes" : "No";

  restaurantDelivery.textContent = offersDelivery
    ? "Yes"
    : "No";
}

function displayRestaurantLocation(restaurant) {
  const latitude = Number(
    restaurant.latitude ?? restaurant.lat
  );

  const longitude = Number(
    restaurant.longitude ??
      restaurant.lng ??
      restaurant.lon
  );

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    restaurantLocationCard.hidden = true;
    return;
  }

  restaurantLocationCard.hidden = false;

  restaurantCoordinates.textContent =
    `Latitude: ${latitude.toFixed(6)}, ` +
    `Longitude: ${longitude.toFixed(6)}`;

  restaurantMapLink.href =
    `https://www.google.com/maps/search/?api=1&query=` +
    `${latitude},${longitude}`;
}

function displayMenu(menuItems) {
  menuStatus.hidden = true;
  menuCategories.innerHTML = "";

  const availableMenuItems = Array.isArray(menuItems)
    ? menuItems.filter((item) => {
        return item.isAvailable !== false &&
          item.is_available !== false;
      })
    : [];

  menuItemCount.textContent =
    availableMenuItems.length === 1
      ? "1 item"
      : `${availableMenuItems.length} items`;

  if (availableMenuItems.length === 0) {
    menuEmptyState.hidden = false;
    return;
  }

  menuEmptyState.hidden = true;

  const groupedMenuItems = groupMenuItemsByCategory(
    availableMenuItems
  );

  Object.entries(groupedMenuItems).forEach(
    ([categoryName, items]) => {
      const categoryGroup = document.createElement("section");

      categoryGroup.className = "menu-category-group";

      const categoryHeading = document.createElement("h3");

      categoryHeading.textContent = categoryName;

      const menuItemsGrid = document.createElement("div");

      menuItemsGrid.className = "menu-items-grid";

      items.forEach((item) => {
        menuItemsGrid.appendChild(createMenuItemCard(item));
      });

      categoryGroup.appendChild(categoryHeading);
      categoryGroup.appendChild(menuItemsGrid);

      menuCategories.appendChild(categoryGroup);
    }
  );
}

function groupMenuItemsByCategory(menuItems) {
  return menuItems.reduce((groups, item) => {
    const category =
      item.categoryName ||
      item.category_name ||
      item.category ||
      "Other items";

    if (!groups[category]) {
      groups[category] = [];
    }

    groups[category].push(item);

    return groups;
  }, {});
}

function createMenuItemCard(item) {
  const menuItemCard =
    document.createElement("article");

  menuItemCard.className =
    "menu-item-card";

  const imageUrl =
    item.imageUrl ||
    item.image_url ||
    "";

  if (imageUrl) {
    const imageWrapper =
      document.createElement("div");

    imageWrapper.className =
      "menu-item-image-wrapper";

    const foodImage =
      document.createElement("img");

    foodImage.className =
      "menu-item-image";

    foodImage.src =
      imageUrl;

    foodImage.alt =
      item.name ||
      "Menu item";

    foodImage.loading =
      "lazy";

    foodImage.onerror =
      () => {
        imageWrapper.remove();
      };

    imageWrapper.appendChild(
      foodImage
    );

    menuItemCard.appendChild(
      imageWrapper
    );
  }

  const heading =
    document.createElement("div");

  heading.className =
    "menu-item-heading";

  const itemName =
    document.createElement("h4");

  itemName.textContent =
    item.name ||
    "Menu item";

  const itemPrice =
    document.createElement("span");

  itemPrice.className =
    "menu-item-price";

  itemPrice.textContent =
    formatCurrency(
      item.price
    );

  heading.appendChild(
    itemName
  );

  heading.appendChild(
    itemPrice
  );

  menuItemCard.appendChild(
    heading
  );

  if (
    item.description
  ) {
    const itemDescription =
      document.createElement("p");

    itemDescription.className =
      "menu-item-description";

    itemDescription.textContent =
      item.description;

    menuItemCard.appendChild(
      itemDescription
    );
  }

  const orderActions =
    document.createElement("div");

  orderActions.className =
    "menu-item-order-actions";

  const addButton =
    document.createElement("button");

  addButton.type =
    "button";

  addButton.className =
    "menu-item-add-button";

  addButton.textContent =
    "Add to Cart";

  addButton.addEventListener(
    "click",
    () => {
      addItemToCart(
        item
      );
    }
  );

  orderActions.appendChild(
    addButton
  );

  menuItemCard.appendChild(
    orderActions
  );

  return menuItemCard;
}

function addItemToCart(item) {
  const itemId =
    item.id ||
    item.menuItemId ||
    item.menu_item_id;

  if (!itemId) {
    console.error("Menu item ID is missing:", item);
    return;
  }

  const existingCartItem = cart.find((cartItem) => {
    return cartItem.id === itemId;
  });

  if (existingCartItem) {
    existingCartItem.quantity += 1;
  } else {
    cart.push({
      id: itemId,
      name: item.name || "Menu item",
      price: Number(item.price) || 0,
      quantity: 1,
    });
  }

  renderCart();

  console.log("Current cart:", cart);
}

function increaseCartItemQuantity(itemId) {
  const cartItem = cart.find((item) => {
   return String(item.id) === String(itemId);
  });

  if (!cartItem) {
    return;
  }

  cartItem.quantity += 1;

  renderCart();
}

function decreaseCartItemQuantity(itemId) {
  const cartItem = cart.find((item) => {
   return String(item.id) === String(itemId);
  });

  if (!cartItem) {
    return;
  }

  if (cartItem.quantity > 1) {
    cartItem.quantity -= 1;
  } else {
    removeItemFromCart(itemId);
    return;
  }

  renderCart();
}

function removeItemFromCart(itemId) {
  cart = cart.filter((item) => {
    return String(item.id) !== String(itemId);
  });

  renderCart();
}

function renderCart() {
  const totalQuantity = cart.reduce((total, item) => {
    return total + item.quantity;
  }, 0);

  const totalAmount = cart.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);

  cartItemCount.textContent = totalQuantity;

if (cart.length === 0) {
  cartItems.innerHTML = "";

  cartEmptyState.hidden = false;
  cartItems.hidden = true;
  cartSummary.hidden = true;

  cartTotal.textContent = formatCurrency(0);
  checkoutButton.disabled = true;

  return;
}

  cartEmptyState.hidden = true;
  cartItems.hidden = false;
  cartSummary.hidden = false;
  checkoutButton.disabled = false;

  cartItems.innerHTML = "";

  cart.forEach((item) => {
    const cartItem = document.createElement("article");
    cartItem.className = "restaurant-cart-item";

    const heading = document.createElement("div");
    heading.className = "restaurant-cart-item-heading";

    const itemName = document.createElement("p");
    itemName.className = "restaurant-cart-item-name";
    itemName.textContent = item.name;

    const itemPrice = document.createElement("span");
    itemPrice.className = "restaurant-cart-item-price";
    itemPrice.textContent = formatCurrency(
      item.price * item.quantity
    );

    heading.appendChild(itemName);
    heading.appendChild(itemPrice);

   const controls = document.createElement("div");
controls.className = "restaurant-cart-item-controls";

const quantityControls = document.createElement("div");
quantityControls.className = "cart-quantity-controls";

const decreaseButton = document.createElement("button");
decreaseButton.type = "button";
decreaseButton.className = "cart-quantity-button";
decreaseButton.textContent = "−";
decreaseButton.setAttribute(
  "aria-label",
  `Decrease quantity of ${item.name}`
);

decreaseButton.addEventListener("click", () => {
  decreaseCartItemQuantity(item.id);
});

const quantityText = document.createElement("span");
quantityText.className = "cart-item-quantity";
quantityText.textContent = item.quantity;

const increaseButton = document.createElement("button");
increaseButton.type = "button";
increaseButton.className = "cart-quantity-button";
increaseButton.textContent = "+";
increaseButton.setAttribute(
  "aria-label",
  `Increase quantity of ${item.name}`
);

increaseButton.addEventListener("click", () => {
  increaseCartItemQuantity(item.id);
});

quantityControls.appendChild(decreaseButton);
quantityControls.appendChild(quantityText);
quantityControls.appendChild(increaseButton);

const removeButton = document.createElement("button");
removeButton.type = "button";
removeButton.className = "cart-remove-button";
removeButton.textContent = "Remove";

removeButton.addEventListener("click", () => {
  removeItemFromCart(item.id);
});

controls.appendChild(quantityControls);
controls.appendChild(removeButton);

    cartItem.appendChild(heading);
    cartItem.appendChild(controls);

    cartItems.appendChild(cartItem);
  });

  cartTotal.textContent = formatCurrency(totalAmount);

  updateCheckoutFinalSummary();
}

async function applyPromotionCode() {

  if (!currentRestaurant) {
    return;
  }

  const promoCode =
    checkoutPromoCode.value.trim();

  if (!promoCode) {

    checkoutPromoMessage.textContent =
      "Please enter a promo code.";

    checkoutPromoMessage.className =
      "form-message error";

    checkoutPromotionSummary.hidden =
      true;

    appliedPromotion = null;

    return;
  }

  const subtotal =
    cart.reduce(
      (total, item) => {
        return total +
          (item.price * item.quantity);
      },
      0
    );

    applyPromoCodeButton.disabled = true;
applyPromoCodeButton.textContent = "Applying...";

checkoutPromoMessage.textContent =
  "Checking promo code...";

checkoutPromoMessage.className =
  "form-message";

  try {

    const response =
  await fetch(
    `${API_BASE_URL}/restaurants/promotions/validate`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
          restaurantId:
            currentRestaurant.id,

          promoCode,

          subtotal,
        })
        }
      );

    const result =
      await response.json();

      console.log(
  "PROMOTION VALIDATION RESULT:",
  result
);

    if (
      !response.ok ||
      !result.success
    ) {
      throw new Error(
        result.message
      );
    }

    appliedPromotion =
      result.promotion;
      currentDiscountAmount =
  Number(
    result.pricing.discountAmount || 0
  );

    checkoutPromoMessage.textContent =
      result.message;

    checkoutPromoMessage.className =
      "form-message success";

    promotionSubtotal.textContent =
      formatCurrency(
        result.pricing.originalSubtotal
      );

    promotionDiscount.textContent =
      "- " +
      formatCurrency(
        result.pricing.discountAmount
      );

    promotionTotal.textContent =
      formatCurrency(
        result.pricing.finalSubtotal
      );

    checkoutPromotionSummary.hidden =
      false;

      updateCheckoutFinalSummary();

  } catch (error) {

    appliedPromotion = null;
    currentDiscountAmount = 0;

    checkoutPromotionSummary.hidden =
      true;
      updateCheckoutFinalSummary();

    checkoutPromoMessage.textContent =
      error.message;

    checkoutPromoMessage.className =
      "form-message error";
  }

  finally {
  applyPromoCodeButton.disabled = false;
  applyPromoCodeButton.textContent = "Apply";
}

}


function openCheckoutPanel() {
  checkoutPanel.hidden = false;

  checkoutButton.hidden = true;

  document
    .getElementById("checkoutCustomerName")
    .focus();
}

function closeCheckoutPanel() {
  checkoutPanel.hidden = true;

  checkoutButton.hidden = false;

  checkoutForm.reset();

  selectedDeliveryZone = null;
  deliveryFee = 0;
  appliedPromotion = null;
  currentDiscountAmount = 0;

  checkoutPromotionSummary.hidden = true;
  checkoutDeliverySummary.hidden = true;

  checkoutPromoMessage.textContent = "";
  checkoutPromoMessage.className =
    "form-message";

  updateCheckoutFields();
  updateCheckoutFinalSummary();
}

function updateCheckoutFields() {
  const orderType =
    checkoutOrderType.value;

  checkoutTableNumberGroup.hidden =
    orderType !== "DINE_IN";

  checkoutGuestCountGroup.hidden =
    orderType !== "DINE_IN";

  checkoutDeliveryAddressGroup.hidden =
    orderType !== "DELIVERY";
    updateSelectedDeliveryZone();
    updateCheckoutFinalSummary();
}


function updateSelectedDeliveryZone() {
  const orderType =
    checkoutOrderType.value;

if (orderType !== "DELIVERY") {
  selectedDeliveryZone = null;
  deliveryFee = 0;
  checkoutDeliverySummary.hidden = true;

  updateCheckoutFinalSummary();

  return;
}
  const normalizedAddress =
    checkoutDeliveryAddress.value
      .trim()
      .toLowerCase();

if (!normalizedAddress) {
  selectedDeliveryZone = null;
  deliveryFee = 0;

  checkoutDeliverySummary.hidden = true;

  updateCheckoutFinalSummary();

  return;
}
  selectedDeliveryZone =
    restaurantDeliveryZones.find((zone) => {
      const normalizedZoneName =
        String(zone.name || "")
          .trim()
          .toLowerCase();

      return (
        normalizedZoneName &&
        normalizedAddress.includes(
          normalizedZoneName
        )
      );
    }) || null;

  if (!selectedDeliveryZone) {
  deliveryFee = 0;

  checkoutDeliveryZoneName.textContent =
    "Outside delivery zones";

  checkoutDeliveryFee.textContent =
    "-";

  checkoutDeliveryTime.textContent =
    "-";

  checkoutDeliverySummary.hidden = false;

  updateCheckoutFinalSummary();

  return;
}
  deliveryFee =
    Number(
      selectedDeliveryZone.deliveryFee || 0
    );

  checkoutDeliveryZoneName.textContent =
    selectedDeliveryZone.name;

  checkoutDeliveryFee.textContent =
    formatCurrency(deliveryFee);

  checkoutDeliveryTime.textContent =
    selectedDeliveryZone
      .estimatedDeliveryMinutes
      ? `${selectedDeliveryZone.estimatedDeliveryMinutes} mins`
      : "Not set";

  checkoutDeliverySummary.hidden = false;

  updateCheckoutFinalSummary();
}


function updateCheckoutFinalSummary() {
  const subtotal =
    cart.reduce(
      (total, item) =>
        total +
        item.price * item.quantity,
      0
    );

 const discountAmount =
  currentDiscountAmount;
  const activeDeliveryFee =
    checkoutOrderType.value ===
      "DELIVERY" &&
    selectedDeliveryZone
      ? deliveryFee
      : 0;

  const total =
    Math.max(
      0,
      subtotal -
        discountAmount +
        activeDeliveryFee
    );

  checkoutFinalSubtotal.textContent =
    formatCurrency(subtotal);

  checkoutFinalDiscountRow.hidden =
    discountAmount <= 0;

  checkoutFinalDiscount.textContent =
    `- ${formatCurrency(
      discountAmount
    )}`;

  checkoutFinalDeliveryRow.hidden =
    activeDeliveryFee <= 0;

  checkoutFinalDeliveryFee.textContent =
    formatCurrency(
      activeDeliveryFee
    );

  checkoutFinalTotal.textContent =
    formatCurrency(total);
}

function displayReviews(reviews) {
  reviewsStatus.hidden = true;
  reviewsList.innerHTML = "";

  const reviewItems = Array.isArray(reviews) ? reviews : [];

  if (reviewItems.length === 0) {
    reviewsEmptyState.hidden = false;
    return;
  }

  reviewsEmptyState.hidden = true;

  reviewItems.forEach((review) => {
    reviewsList.appendChild(createReviewCard(review));
  });
}

function createReviewCard(review) {
  const reviewCard = document.createElement("article");

  reviewCard.className = "review-card";

  const reviewHeader = document.createElement("div");

  reviewHeader.className = "review-card-header";

  const authorInformation = document.createElement("div");

  const reviewAuthor = document.createElement("p");

  reviewAuthor.className = "review-author";

  reviewAuthor.textContent =
    review.customerName ||
    review.customer_name ||
    review.userName ||
    review.user_name ||
    "Coast Connect customer";

  const reviewDate = document.createElement("p");

  reviewDate.className = "review-date";

  reviewDate.textContent = formatDate(
    review.createdAt || review.created_at
  );

  authorInformation.appendChild(reviewAuthor);
  authorInformation.appendChild(reviewDate);

  const reviewRating = document.createElement("span");

  reviewRating.className = "review-rating";

  const rating = Number(review.rating || 0);

  reviewRating.textContent = `★ ${rating.toFixed(1)}`;

  reviewHeader.appendChild(authorInformation);
  reviewHeader.appendChild(reviewRating);

  reviewCard.appendChild(reviewHeader);

  if (review.comment) {
    const reviewComment = document.createElement("p");

    reviewComment.className = "review-comment";
    reviewComment.textContent = review.comment;

    reviewCard.appendChild(reviewComment);
  }

  return reviewCard;
}

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .replace(/[{}[\]"]/g, "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function formatPriceRange(priceRange) {
  const normalizedPriceRange = String(
    priceRange || ""
  ).toUpperCase();

  const priceRangeLabels = {
    BUDGET: "Budget friendly",
    MODERATE: "Moderate pricing",
    PREMIUM: "Premium dining",
    LUXURY: "Luxury dining",
    $: "Budget friendly",
    $$: "Moderate pricing",
    $$$: "Premium dining",
    $$$$: "Luxury dining",
  };

  return (
    priceRangeLabels[normalizedPriceRange] ||
    priceRange ||
    "Pricing available"
  );
}

function formatOpeningHours(openingHours) {
  if (!openingHours) {
    return "Not provided";
  }

  if (typeof openingHours === "string") {
    return openingHours;
  }

  if (typeof openingHours === "object") {
    return Object.entries(openingHours)
      .map(([day, hours]) => `${capitalize(day)}: ${hours}`)
      .join(" | ");
  }

  return "Not provided";
}

function formatCurrency(amount) {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return "Price unavailable";
  }

  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(numericAmount);
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "Date unavailable";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function sanitizePhoneNumber(phoneNumber) {
  return String(phoneNumber).replace(/\D/g, "");
}

function capitalize(value) {
  const text = String(value);

  return text.charAt(0).toUpperCase() + text.slice(1);
}

async function startCheckoutPayment(
  orderPayload,
  checkoutMessage,
  placeOrderButton
) {
  try {
    /*
    |--------------------------------------------------------------------------
    | STEP 1
    | Create checkout session
    |--------------------------------------------------------------------------
    */

    const checkoutResponse =
      await fetch(
        `${API_BASE_URL}/checkout-sessions`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Accept:
              "application/json",

            ...(token
              ? {
                  Authorization:
                    `Bearer ${token}`,
                }
              : {}),
          },

          body: JSON.stringify(
            orderPayload
          ),
        }
      );

    const checkoutData =
      await checkoutResponse.json();

    if (
      !checkoutResponse.ok ||
      !checkoutData.success
    ) {
      throw new Error(
        checkoutData.message ||
        "Unable to start checkout."
      );
    }

    const sessionToken =
      checkoutData.checkoutSession
        .sessionToken;

    window.currentCheckoutSessionToken =
      sessionToken;

    socket.emit(
      "join-checkout-room",
      sessionToken
    );


    /*
    |--------------------------------------------------------------------------
    | STEP 2
    | Read selected payment method
    |--------------------------------------------------------------------------
    */

    const selectedPaymentMethod =
      document.querySelector(
        'input[name="checkoutPaymentMethod"]:checked'
      )?.value || "MPESA";


    /*
    |--------------------------------------------------------------------------
    | M-PESA
    |--------------------------------------------------------------------------
    */

    if (
      selectedPaymentMethod ===
      "MPESA"
    ) {
      const paymentResponse =
        await fetch(
          `${API_BASE_URL}/payments/mpesa/payment-attempt`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body: JSON.stringify({
              sessionToken,

              phoneNumber:
                orderPayload.customerPhone,
            }),
          }
        );

      const paymentData =
        await paymentResponse.json();

      if (
        !paymentResponse.ok ||
        !paymentData.success
      ) {
        throw new Error(
          paymentData.message ||
          "Unable to initiate M-Pesa payment."
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Development mode
      |--------------------------------------------------------------------------
      */

      if (
        paymentData.stkPushReady ===
        false
      ) {
        checkoutMessage.textContent =
          "Payment session created successfully. Real M-Pesa payment will activate after deployment.";

        checkoutMessage.className =
          "form-message success";

        placeOrderButton.disabled =
          false;

        placeOrderButton.textContent =
          "Awaiting Deployment";

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Production M-Pesa
      |--------------------------------------------------------------------------
      */

      checkoutMessage.textContent =
        paymentData.message ||
        "Check your phone and enter your M-Pesa PIN.";

      checkoutMessage.className =
        "form-message success";

      placeOrderButton.disabled =
        true;

      placeOrderButton.textContent =
        "Waiting for Payment...";

      return;
    }


    /*
    |--------------------------------------------------------------------------
    | CARD
    |--------------------------------------------------------------------------
    */

    if (
      selectedPaymentMethod ===
      "CARD"
    ) {
      const email =
        checkoutCustomerEmail.value
          .trim()
          .toLowerCase();

      if (!email) {
        throw new Error(
          "Email address is required for card payment."
        );
      }

      checkoutMessage.textContent =
        "Preparing secure card checkout...";

      checkoutMessage.className =
        "form-message";

      placeOrderButton.disabled =
        true;

      placeOrderButton.textContent =
        "Opening Secure Checkout...";

      const cardResponse =
        await fetch(
          `${API_BASE_URL}/payments/card/payment-attempt`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body: JSON.stringify({
              sessionToken,
              email,
            }),
          }
        );

      const cardData =
        await cardResponse.json();

      if (
        !cardResponse.ok ||
        !cardData.success
      ) {
        throw new Error(
          cardData.message ||
          "Unable to initialize card payment."
        );
      }

      const authorizationUrl =
        cardData.checkout
          ?.authorizationUrl;

      const paymentReference =
        cardData.checkout
          ?.reference ||
        cardData.payment
          ?.paymentReference ||
        "";

      if (
        !authorizationUrl
      ) {
        throw new Error(
          "Card checkout URL was not returned."
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Save card payment state
      |--------------------------------------------------------------------------
      */

      sessionStorage.setItem(
        "coastConnectCardPaymentReference",
        paymentReference
      );

      sessionStorage.setItem(
        "coastConnectCardCheckoutSessionToken",
        sessionToken
      );

      checkoutMessage.textContent =
        "Redirecting to secure card payment...";

      checkoutMessage.className =
        "form-message success";

      /*
      |--------------------------------------------------------------------------
      | Redirect customer to Paystack
      |--------------------------------------------------------------------------
      */

      window.location.href =
        authorizationUrl;

      return;
    }


    /*
    |--------------------------------------------------------------------------
    | Unknown payment method
    |--------------------------------------------------------------------------
    */

    throw new Error(
      "Please select a valid payment method."
    );

  } catch (error) {
    console.error(
      "Checkout payment error:",
      error
    );

    checkoutMessage.textContent =
      error.message;

    checkoutMessage.className =
      "form-message error";

    placeOrderButton.disabled =
      false;

    updatePaymentMethodButton();
  }
}
async function handleCheckoutSubmit(event) {
  event.preventDefault();

  const customerName =
    document
      .getElementById("checkoutCustomerName")
      .value
      .trim();

  const customerPhone =
    document
      .getElementById("checkoutCustomerPhone")
      .value
      .trim();

  const orderType =
    checkoutOrderType.value;

  const tableNumber =
    document
      .getElementById("checkoutTableNumber")
      .value
      .trim();

  const guestCount =
    document
      .getElementById("checkoutGuestCount")
      .value
      .trim();

  const deliveryAddress =
    document
      .getElementById("checkoutDeliveryAddress")
      .value
      .trim();

  const customerNotes =
    document
      .getElementById("checkoutCustomerNotes")
      .value
      .trim();

  if (!customerName) {
    alert("Please enter your name.");
    return;
  }

  if (!customerPhone) {
    alert("Please enter your phone number.");
    return;
  }

  if (!orderType) {
    alert("Please choose an order type.");
    return;
  }

  if (
    orderType === "DINE_IN" &&
    !tableNumber
  ) {
    alert("Please enter your table number.");
    return;
  }

  if (
    orderType === "DINE_IN" &&
    !guestCount
  ) {
    alert("Please enter the number of guests.");
    return;
  }

  if (
    orderType === "DELIVERY" &&
    !deliveryAddress
  ) {
    alert("Please enter your delivery address.");
    return;
  }

  if (
  orderType === "DELIVERY" &&
  !selectedDeliveryZone
) {
  alert(
    "Sorry, we don't currently deliver to this location."
  );

  return;
}

const orderPayload = {
  restaurantId:
    currentRestaurant.id,

  customerName,

  customerPhone,

  orderType,

  deliveryAddress:
    orderType === "DELIVERY"
      ? deliveryAddress
      : null,

  tableNumber:
    orderType === "DINE_IN"
      ? tableNumber
      : null,

  guestCount:
    orderType === "DINE_IN"
      ? Number(guestCount)
      : null,

  customerNotes,

  promoCode:
  appliedPromotion
    ? appliedPromotion.promoCode
    : null,

  items: cart.map((item) => ({
    menuItemId: item.id,
    quantity: item.quantity,
  })),
};

const checkoutMessage =
  document.getElementById(
    "checkoutMessage"
  );

checkoutMessage.textContent = "";
checkoutMessage.className =
  "form-message";

placeOrderButton.disabled = true;
placeOrderButton.textContent =
  "Starting Payment...";

await startCheckoutPayment(
  orderPayload,
  checkoutMessage,
  placeOrderButton
);
}


function showRestaurantError(message) {
  restaurantDetailsStatus.hidden = true;
  restaurantDetailsContent.hidden = true;
  restaurantInformationSection.hidden = true;
  restaurantDetailsError.hidden = false;

  restaurantErrorMessage.textContent = message;
}

socket.on(
  "checkout-payment-completed",
  (data) => {

    console.log(
      "Payment completed:",
      data
    );

    socket.on(
  "join-checkout-room",
  (sessionToken) => {
    socket.join(
      `checkout:${sessionToken}`
    );

    console.log(
      `Socket ${socket.id} joined checkout:${sessionToken}`
    );
  }
);

    if (
      !data ||
      !data.order ||
      !data.order.trackingToken
    ) {
      return;
    }

    window.location.href =
      `order-tracking.html?token=${encodeURIComponent(
        data.order.trackingToken
      )}`;
  }
);

socket.on(
  "checkout-payment-failed",
  (data) => {

    console.log(
      "Payment failed:",
      data
    );

    const checkoutMessage =
      document.getElementById(
        "checkoutMessage"
      );

    const placeOrderButton =
      document.getElementById(
        "placeOrderButton"
      );

   
    checkoutMessage.textContent =
      data.message ||
      "Payment was not completed.";

    checkoutMessage.className =
      "form-message error";

    placeOrderButton.disabled =
      false;

    placeOrderButton.textContent =
      "Pay with M-Pesa";
  }
);


checkoutButton.addEventListener(
  "click",
  openCheckoutPanel
);

closeCheckoutButton.addEventListener(
  "click",
  closeCheckoutPanel
);

checkoutOrderType.addEventListener(
  "change",
  updateCheckoutFields
);

applyPromoCodeButton.addEventListener(
  "click",
  applyPromotionCode
);

checkoutForm.addEventListener(
  "submit",
  handleCheckoutSubmit
);

checkoutDeliveryAddress.addEventListener(
  "input",
  updateSelectedDeliveryZone
);