"use strict";

const socket =
  io("https://coastconnectkenya.onrender.com");

const API_BASE_URL =
  window.API_BASE_URL ||
  "https://coastconnectkenya.onrender.com/api";

const paymentStatus =
  document.getElementById(
    "restaurantPaymentStatus"
  );

const paymentInstructionsContainer =
  document.getElementById(
    "restaurantPaymentInstructions"
  );

const paymentMethodElement =
  document.getElementById(
    "restaurantPaymentMethod"
  );

const businessNumberElement =
  document.getElementById(
    "restaurantPaymentBusinessNumber"
  );

  const businessRow =
  document.getElementById(
    "restaurantPaymentBusinessRow"
  );

  const phoneRow =
  document.getElementById(
    "restaurantPaymentPhoneRow"
  );

const phoneNumberElement =
  document.getElementById(
    "restaurantPaymentPhoneNumber"
  );

const accountRow =
  document.getElementById(
    "restaurantPaymentAccountRow"
  );

const accountNumberElement =
  document.getElementById(
    "restaurantPaymentAccountNumber"
  );

const instructionsTextRow =
  document.getElementById(
    "restaurantPaymentInstructionsTextRow"
  );

const instructionsTextElement =
  document.getElementById(
    "restaurantPaymentInstructionsText"
  );

const confirmPaymentButton =
  document.getElementById(
    "confirmRestaurantPaymentButton"
  );


function getSessionToken() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  return (
    params.get("session") ||
    sessionStorage.getItem(
      "coastConnectManualPaymentSession"
    ) ||
    ""
  ).trim();
}


function joinCheckoutRoom() {
  const sessionToken =
    getSessionToken();

  if (!sessionToken) {
    return;
  }

  socket.emit(
    "join-checkout-room",
    sessionToken
  );
}


socket.on(
  "checkout-payment-completed",
  (data) => {
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
  "connect",
  () => {
    joinCheckoutRoom();
  }
);


joinCheckoutRoom();



function showPaymentError(message) {
  paymentStatus.textContent =
    message;

  paymentStatus.className =
    "form-message error";

  paymentInstructionsContainer.hidden =
    true;
}


function showPaymentInstructions(
  paymentInstructions
) {
  paymentMethodElement.textContent =
    paymentInstructions.paymentMethod ||
    "M-Pesa";

if (
  paymentInstructions.paymentMethod !== "PHONE" &&
  paymentInstructions.businessNumber
) {
  businessNumberElement.textContent =
    paymentInstructions.businessNumber;

  businessRow.hidden =
    false;
} else {
  businessRow.hidden =
    true;
}

    if (
  paymentInstructions.phoneNumber
) {
  phoneNumberElement.textContent =
    paymentInstructions.phoneNumber;

  phoneRow.hidden =
    false;
} else {
  phoneRow.hidden =
    true;
}

 if (
  paymentInstructions.paymentMethod !==
    "PHONE" &&
  paymentInstructions.accountNumber
) {
  accountNumberElement.textContent =
    paymentInstructions.accountNumber;

  accountRow.hidden =
    false;
} else {
  accountRow.hidden =
    true;
}

  if (
    paymentInstructions.instructions
  ) {
    instructionsTextElement.textContent =
      paymentInstructions.instructions;

    instructionsTextRow.hidden =
      false;
  } else {
    instructionsTextRow.hidden =
      true;
  }

  paymentStatus.textContent =
    "";

  paymentStatus.className =
    "form-message";

  paymentInstructionsContainer.hidden =
    false;
}


async function loadPaymentInstructions() {
  const sessionToken =
    getSessionToken();

  if (!sessionToken) {
    showPaymentError(
      "Your payment session could not be found. Please return to the restaurant and start again."
    );

    return;
  }

  try {
    const response =
      await fetch(
        `${API_BASE_URL}/restaurants/payment-instructions?sessionToken=${encodeURIComponent(
          sessionToken
        )}`,
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
        "Unable to load payment instructions."
      );
    }

    if (
      !data.paymentInstructions
    ) {
      throw new Error(
        "This restaurant has not configured manual payment instructions."
      );
    }

    showPaymentInstructions(
      data.paymentInstructions
    );

  } catch (error) {
    console.error(
      "Load manual payment instructions error:",
      error
    );

    showPaymentError(
      error.message ||
      "Unable to load payment instructions."
    );
  }
}


loadPaymentInstructions();


confirmPaymentButton.addEventListener(
  "click",
  async () => {
    const sessionToken =
      getSessionToken();

    if (!sessionToken) {
      showPaymentError(
        "Your payment session could not be found."
      );

      return;
    }

    const originalText =
      confirmPaymentButton.textContent;

    confirmPaymentButton.disabled =
      true;

    confirmPaymentButton.textContent =
      "Confirming Payment...";

    try {
      const response =
        await fetch(
          `${API_BASE_URL}/restaurants/manual-payment/confirm`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body:
              JSON.stringify({
                sessionToken,
              }),
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
          "Unable to confirm your payment."
        );
      }

      paymentStatus.textContent =
        data.message ||
        "Payment confirmation submitted. The restaurant will verify your payment shortly.";

      paymentStatus.className =
        "form-message success";

      confirmPaymentButton.textContent =
        "Payment Confirmation Sent";

    } catch (error) {
      console.error(
        "Confirm manual payment error:",
        error
      );

      paymentStatus.textContent =
        error.message ||
        "Unable to confirm your payment.";

      paymentStatus.className =
        "form-message error";

      confirmPaymentButton.disabled =
        false;

      confirmPaymentButton.textContent =
        originalText;
    }
  }
);
