"use strict";

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const destinationSearchForm =
      document.getElementById(
        "destinationSearchForm"
      );

    const destinationSearchInput =
      document.getElementById(
        "destinationSearchInput"
      );

    const destinationCards =
      Array.from(
        document.querySelectorAll(
          ".destination-explore-card"
        )
      );

    const destinationCount =
      document.getElementById(
        "destinationCount"
      );

    const destinationsEmptyState =
      document.getElementById(
        "destinationsEmptyState"
      );

    function filterDestinations() {

      const searchValue =
        String(
          destinationSearchInput?.value ||
          ""
        )
          .trim()
          .toLowerCase();

      let visibleCount =
        0;

      destinationCards.forEach(
        (card) => {

          const destinationName =
            String(
              card.dataset
                .destinationName ||
              ""
            )
              .trim()
              .toLowerCase();

          const matches =
            !searchValue ||
            destinationName.includes(
              searchValue
            );

          card.hidden =
            !matches;

          if (matches) {
            visibleCount += 1;
          }

        }
      );

      if (destinationCount) {
        destinationCount.textContent =
          String(
            visibleCount
          );
      }

      if (
        destinationsEmptyState
      ) {
        destinationsEmptyState.hidden =
          visibleCount !== 0;
      }

    }

    destinationSearchForm
      ?.addEventListener(
        "submit",
        (event) => {

          event.preventDefault();

          filterDestinations();

        }
      );

    destinationSearchInput
      ?.addEventListener(
        "input",
        filterDestinations
      );

  }
);