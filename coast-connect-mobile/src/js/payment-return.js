"use strict";


const API_BASE_URL =
  "https://coastconnectkenya.onrender.com/api";


const paymentReturnTitle =
  document.getElementById(
    "paymentReturnTitle"
  );


const paymentReturnMessage =
  document.getElementById(
    "paymentReturnMessage"
  );


const paymentReturnLoader =
  document.getElementById(
    "paymentReturnLoader"
  );


const paymentReturnButton =
  document.getElementById(
    "paymentReturnButton"
  );


const paymentReturnIcon =
  document.getElementById(
    "paymentReturnIcon"
  );


document.addEventListener(
  "DOMContentLoaded",
  verifyReturnedCardPayment
);


paymentReturnButton.addEventListener(
  "click",
  verifyReturnedCardPayment
);


/*
|--------------------------------------------------------------------------
| Payment reference
|--------------------------------------------------------------------------
*/

function getPaymentReference() {

  const params =
    new URLSearchParams(
      window.location.search
    );


  /*
  |--------------------------------------------------------------------------
  | Paystack normally returns ?reference=...
  |--------------------------------------------------------------------------
  */

  const urlReference =
    String(
      params.get("reference") ||
      params.get("trxref") ||
      ""
    ).trim();


  if (urlReference) {
    return urlReference;
  }


  /*
  |--------------------------------------------------------------------------
  | Fallback to reference saved before redirect
  |--------------------------------------------------------------------------
  */

  return String(
    sessionStorage.getItem(
      "coastConnectCardPaymentReference"
    ) || ""
  ).trim();
}


/*
|--------------------------------------------------------------------------
| Verify card payment
|--------------------------------------------------------------------------
*/

async function verifyReturnedCardPayment(
  retryCount = 0
) {
  const reference =
    getPaymentReference();

  paymentReturnButton.style.display =
    "none";

  paymentReturnLoader.style.display =
    "block";

  paymentReturnIcon.textContent =
    "✓";

  paymentReturnTitle.textContent =
    retryCount > 0
      ? "Preparing your order"
      : "Verifying your payment";

  paymentReturnMessage.textContent =
    retryCount > 0
      ? "Your payment is confirmed. We are opening your order..."
      : "Please wait while Coast Connect confirms your payment securely.";

  if (!reference) {
    showPaymentError(
      "We could not find the payment reference. Please return to the restaurant and check your order."
    );

    return;
  }

  try {
    const response =
      await fetch(
        `${API_BASE_URL}/payments/card/verify/${encodeURIComponent(
          reference
        )}`,
        {
          method: "GET",

          headers: {
            Accept:
              "application/json",
          },

          cache: "no-store",
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
        "Unable to verify this payment."
      );
    }

    const paymentStatus =
      String(
        data.paymentStatus ||
        "PENDING"
      )
        .trim()
        .toUpperCase();

    /*
    |--------------------------------------------------------------------------
    | Paid
    |--------------------------------------------------------------------------
    */

    if (paymentStatus === "PAID") {
      const trackingToken =
        String(
          data.order?.trackingToken ||
          data.order?.tracking_token ||
          ""
        ).trim();

      if (trackingToken) {
        paymentReturnLoader.style.display =
          "none";

        paymentReturnIcon.textContent =
          "✓";

        paymentReturnTitle.textContent =
          "Payment successful";

        paymentReturnMessage.textContent =
          "Your payment has been confirmed. Opening your order...";

        clearSavedCardPayment();

        window.setTimeout(
          () => {
            window.location.replace(
              `order-tracking.html?token=${encodeURIComponent(
                trackingToken
              )}`
            );
          },
          700
        );

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Webhook/browser race
      |--------------------------------------------------------------------------
      |
      | Paystack may have confirmed payment before the order is fully available
      | to this browser request. Retry briefly instead of leaving the customer
      | on the success screen.
      |
      */

      if (retryCount < 4) {
        paymentReturnTitle.textContent =
          "Payment successful";

        paymentReturnMessage.textContent =
          "Payment confirmed. Preparing your order tracking...";

        window.setTimeout(
          () => {
            verifyReturnedCardPayment(
              retryCount + 1
            );
          },
          1200
        );

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Payment definitely succeeded but tracking is temporarily unavailable
      |--------------------------------------------------------------------------
      */

      showProcessedPayment(
        "Your payment has been confirmed and your order has been created. Please check again in a moment."
      );

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Not yet successful
    |--------------------------------------------------------------------------
    */

    paymentReturnLoader.style.display =
      "none";

    paymentReturnIcon.textContent =
      "…";

    paymentReturnTitle.textContent =
      "Payment not confirmed yet";

    paymentReturnMessage.textContent =
      `Current payment status: ${paymentStatus}. You can check again safely.`;

    paymentReturnButton.textContent =
      "Check Payment Again";

    paymentReturnButton.style.display =
      "block";
  } catch (error) {
    console.error(
      "Card payment verification error:",
      error
    );

    showPaymentError(
      error.message ||
      "We could not verify your payment."
    );
  }
}


/*
|--------------------------------------------------------------------------
| Processed payment
|--------------------------------------------------------------------------
*/

function showProcessedPayment(
  message
) {

  paymentReturnLoader.style.display =
    "none";


  paymentReturnIcon.textContent =
    "✓";


  paymentReturnTitle.textContent =
    "Payment successful";


  paymentReturnMessage.textContent =
    message;


  paymentReturnButton.textContent =
    "Check Payment Again";


  paymentReturnButton.style.display =
    "block";
}


/*
|--------------------------------------------------------------------------
| Error state
|--------------------------------------------------------------------------
*/

function showPaymentError(
  message
) {

  paymentReturnLoader.style.display =
    "none";


  paymentReturnIcon.textContent =
    "!";


  paymentReturnTitle.textContent =
    "Unable to confirm payment";


  paymentReturnMessage.textContent =
    message;


  paymentReturnButton.textContent =
    "Try Again";


  paymentReturnButton.style.display =
    "block";
}


/*
|--------------------------------------------------------------------------
| Cleanup
|--------------------------------------------------------------------------
*/

function clearSavedCardPayment() {

  sessionStorage.removeItem(
    "coastConnectCardPaymentReference"
  );


  sessionStorage.removeItem(
    "coastConnectCardCheckoutSessionToken"
  );
}