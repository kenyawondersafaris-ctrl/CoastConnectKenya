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

async function verifyReturnedCardPayment() {

  const reference =
    getPaymentReference();


  paymentReturnButton.style.display =
    "none";


  paymentReturnLoader.style.display =
    "block";


  paymentReturnIcon.textContent =
    "✓";


  paymentReturnTitle.textContent =
    "Verifying your payment";


  paymentReturnMessage.textContent =
    "Please wait while Coast Connect confirms your payment securely.";


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


    /*
    |--------------------------------------------------------------------------
    | Paid
    |--------------------------------------------------------------------------
    */

    if (
      String(
        data.paymentStatus || ""
      ).toUpperCase() === "PAID"
    ) {

      paymentReturnLoader.style.display =
        "none";


      paymentReturnTitle.textContent =
        "Payment successful";


      paymentReturnMessage.textContent =
        "Your payment has been confirmed. Opening your order...";


      const trackingToken =
        String(
          data.order?.trackingToken ||
          ""
        ).trim();


      /*
      |--------------------------------------------------------------------------
      | New conversion
      |--------------------------------------------------------------------------
      */

      if (trackingToken) {

        clearSavedCardPayment();

        setTimeout(
          () => {

            window.location.href =
              `order-tracking.html?token=${encodeURIComponent(
                trackingToken
              )}`;

          },
          900
        );

        return;
      }


      /*
      |--------------------------------------------------------------------------
      | Webhook may already have converted the order.
      |
      | In that case verification can return orderId without the full order.
      |--------------------------------------------------------------------------
      */

      const orderId =
        String(
          data.orderId || ""
        ).trim();


      if (orderId) {

        /*
        |--------------------------------------------------------------------------
        | Do NOT create another order.
        |--------------------------------------------------------------------------
        |
        | The payment is already safely processed.
        | We simply cannot redirect until we have its tracking token.
        |
        */

        showProcessedPayment(
          "Your payment has been confirmed and your order has already been created."
        );

        return;
      }


      showProcessedPayment(
        "Your payment was successful. Your order is being prepared."
      );

      return;
    }


    /*
    |--------------------------------------------------------------------------
    | Not yet successful
    |--------------------------------------------------------------------------
    */

    const paymentStatus =
      String(
        data.paymentStatus ||
        "PENDING"
      ).toUpperCase();


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