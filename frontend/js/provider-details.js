"use strict";

const API_BASE_URL =
  "https://coastconnectkenya.onrender.com/api";

const params =
  new URLSearchParams(
    window.location.search
  );

const providerId =
  String(
    params.get("providerId") || ""
  ).trim();

const selectedServiceId =
  String(
    params.get("serviceId") || ""
  ).trim();

const providerDetailsMessage =
  document.getElementById(
    "providerDetailsMessage"
  );

const providerDetailsContent =
  document.getElementById(
    "providerDetailsContent"
  );

const providerServicesSection =
  document.getElementById(
    "providerServicesSection"
  );

const providerProfileAvatar =
  document.getElementById(
    "providerProfileAvatar"
  );

const providerVerificationBadge =
  document.getElementById(
    "providerVerificationBadge"
  );

const providerFullName =
  document.getElementById(
    "providerFullName"
  );

const providerServiceArea =
  document.getElementById(
    "providerServiceArea"
  );

const providerExperienceYears =
  document.getElementById(
    "providerExperienceYears"
  );

const providerAverageRating =
  document.getElementById(
    "providerAverageRating"
  );

const providerTotalReviews =
  document.getElementById(
    "providerTotalReviews"
  );

const providerAvailabilityStatus =
  document.getElementById(
    "providerAvailabilityStatus"
  );

const providerBio =
  document.getElementById(
    "providerBio"
  );

const providerEmail =
  document.getElementById(
    "providerEmail"
  );

const providerPhone =
  document.getElementById(
    "providerPhone"
  );

const providerServicesList =
  document.getElementById(
    "providerServicesList"
  );

document.addEventListener(
  "DOMContentLoaded",
  initializeProviderDetails
);

const providerReviewsSection =
  document.getElementById(
    "providerReviewsSection"
  );

const providerReviewsList =
  document.getElementById(
    "providerReviewsList"
  );

const reviewsAverageRating =
  document.getElementById(
    "reviewsAverageRating"
  );

const reviewsTotalCount =
  document.getElementById(
    "reviewsTotalCount"
  );

async function initializeProviderDetails() {
  console.log(
    "Provider details URL:",
    window.location.href
  );

  console.log(
    "Provider ID:",
    providerId
  );

  console.log(
    "Service ID:",
    selectedServiceId
  );

  if (!providerId) {
    showMessage(
      "No provider was selected. Returning to providers...",
      "error"
    );

    window.setTimeout(
      () => {
        window.location.replace(
          "providers.html"
        );
      },
      1000
    );

    return;
  }

  await loadProviderDetails();
}

function showMessage(
  message = "",
  type = ""
) {
  if (!providerDetailsMessage) {
    return;
  }

  providerDetailsMessage.textContent =
    message;

  providerDetailsMessage.className =
    type
      ? `details-message ${type}`
      : "details-message";
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
    FIXED:
      "Fixed price",

    HOURLY:
      "Per hour",

    DAILY:
      "Per day",

    PER_VISIT:
      "Per visit",

    PER_TRIP:
      "Per trip",
  };

  return (
    labels[pricingType] ||
    pricingType ||
    "Pricing"
  );
}

async function loadProviderDetails() {
  showMessage(
    "Loading provider details..."
  );

  try {
    const response =
      await fetch(
        `${API_BASE_URL}/providers/${encodeURIComponent(
          providerId
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
        "Unable to load provider details."
      );
    }

    renderProviderDetails(
      data.provider
    );

    showMessage();
  } catch (error) {
    console.error(
      "Load provider details error:",
      error
    );

    showMessage(
      error.message ||
        "Unable to load provider details.",
      "error"
    );
  }
}

function renderProviderDetails(
  provider
) {
  if (
    !provider ||
    !provider.id
  ) {
    showMessage(
      "Provider information is unavailable.",
      "error"
    );

    return;
  }

  if (
    provider.profilePhoto
  ) {
    providerProfileAvatar.innerHTML =
      `
        <img
          src="${escapeHtml(
            provider.profilePhoto
          )}"
          alt="${escapeHtml(
            provider.fullName ||
            "Provider"
          )}"
        >
      `;
  } else {
    providerProfileAvatar.textContent =
      String(
        provider.fullName ||
        "P"
      )
        .charAt(0)
        .toUpperCase();
  }

  const verificationStatus =
    String(
      provider.verificationStatus ||
      "PENDING"
    ).toUpperCase();

  providerVerificationBadge.textContent =
    verificationStatus ===
    "APPROVED"
      ? "Verified provider"
      : "Verification pending";

  providerVerificationBadge.className =
    verificationStatus ===
    "APPROVED"
      ? "verification-badge verified"
      : "verification-badge pending";

  providerFullName.textContent =
    provider.fullName ||
    "Provider";

  providerServiceArea.textContent =
    provider.serviceArea ||
    "Service area not specified";

  const experienceYears =
    Number(
      provider.experienceYears ||
      0
    );

  providerExperienceYears.textContent =
    `${experienceYears} ${
      experienceYears === 1
        ? "year"
        : "years"
    }`;

  providerAverageRating.textContent =
    Number(
      provider.averageRating ||
      0
    ).toFixed(1);

  providerTotalReviews.textContent =
    Number(
      provider.totalReviews ||
      0
    );

  const availabilityStatus =
    String(
      provider.availabilityStatus ||
      "OFFLINE"
    ).toUpperCase();

  providerAvailabilityStatus.textContent =
    availabilityStatus;

  providerAvailabilityStatus.className =
    `availability-badge status-${availabilityStatus.toLowerCase()}`;

  providerBio.textContent =
    provider.bio ||
    "No professional bio provided.";

  providerEmail.textContent =
    provider.email ||
    "Not available";

  providerPhone.textContent =
    provider.phone ||
    "Not available";

  renderServices(
    Array.isArray(
      provider.services
    )
      ? provider.services
      : [],
    provider
  );

  function renderProviderReviews(
  reviews,
  provider
) {
  reviewsAverageRating.textContent =
    Number(
      provider.averageRating || 0
    ).toFixed(1);

  reviewsTotalCount.textContent =
    Number(
      provider.totalReviews || 0
    );

  if (!reviews.length) {
    providerReviewsList.innerHTML =
      `
        <div class="reviews-empty-state">
          <h3>
            No reviews yet
          </h3>

          <p>
            Completed customer reviews will appear here.
          </p>
        </div>
      `;

    providerReviewsSection.hidden =
      false;

    return;
  }

  providerReviewsList.innerHTML =
    reviews
      .map(
        (review) => {
          const rating =
            Math.max(
              1,
              Math.min(
                5,
                Number(
                  review.rating || 0
                )
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
              : "";

          return `
            <article class="provider-review-card">

              <div class="review-card-header">

                <div>
                  <strong>
                    ${escapeHtml(
                      review.customerName ||
                      "Customer"
                    )}
                  </strong>

                  <span>
                    ${escapeHtml(
                      reviewDate
                    )}
                  </span>
                </div>

                <div class="review-stars">
                  ${"★".repeat(rating)}
                  ${"☆".repeat(5 - rating)}
                </div>

              </div>

              <p>
                ${escapeHtml(
                  review.comment ||
                  "Customer left a rating without a written comment."
                )}
              </p>

            </article>
          `;
        }
      )
      .join("");

  providerReviewsSection.hidden =
    false;
}

  providerDetailsContent.hidden =
    false;

  providerServicesSection.hidden =
    false;
}

function renderServices(
  services,
  provider
) {
  if (!services.length) {
    providerServicesList.innerHTML =
      `
        <div class="services-empty-state">
          <h3>
            No services available
          </h3>

          <p>
            This provider currently has no active services.
          </p>
        </div>
      `;

    return;
  }

  providerServicesList.innerHTML =
    services
      .map((service) => {
        const isSelected =
          service.id ===
          selectedServiceId;

        return `
          <article
            class="provider-service-card ${
              isSelected
                ? "selected-service"
                : ""
            }"
          >

            <div class="service-card-heading">

              <div>
                <span class="service-category">
                  ${escapeHtml(
                    service.categoryName ||
                    "Service"
                  )}
                </span>

                <h3>
                  ${escapeHtml(
                    service.title ||
                    "Service"
                  )}
                </h3>
              </div>

              ${
                isSelected
                  ? `
                    <span class="selected-badge">
                      Selected
                    </span>
                  `
                  : ""
              }

            </div>

            <p>
              ${escapeHtml(
                service.description ||
                "No service description provided."
              )}
            </p>

            <div class="service-price-row">

              <div>
                <strong>
                  ${formatMoney(
                    service.price
                  )}
                </strong>

                <span>
                  ${escapeHtml(
                    formatPricingType(
                      service.pricingType
                    )
                  )}
                </span>
              </div>

              <a
                href="booking.html?providerId=${encodeURIComponent(
                  provider.id
                )}&serviceId=${encodeURIComponent(
                  service.id
                )}"
                class="book-service-button"
              >
                Book Now
              </a>

            </div>

          </article>
        `;
      })
      .join("");

  if (selectedServiceId) {
    window.setTimeout(
      () => {
        document
          .querySelector(
            ".selected-service"
          )
          ?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
      },
      150
    );
  }
}