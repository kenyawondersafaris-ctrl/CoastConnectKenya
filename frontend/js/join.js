"use strict";

const restaurantOwnerButton =
  document.getElementById(
    "becomeRestaurantOwnerButton"
  );

const providerButton =
  document.getElementById(
    "becomeProviderButton"
  );

restaurantOwnerButton?.addEventListener(
  "click",
  () => {
    window.location.href =
  "register.html?role=restaurant-owner";
  }
);

providerButton?.addEventListener(
  "click",
  () => {
    window.location.href =
      "register.html?role=provider";
  }
);