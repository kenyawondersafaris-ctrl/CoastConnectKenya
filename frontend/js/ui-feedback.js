"use strict";

(function () {
  function ensureFeedbackStyles() {
    if (
      document.getElementById(
        "coastConnectFeedbackStyles"
      )
    ) {
      return;
    }

    const style =
      document.createElement(
        "style"
      );

    style.id =
      "coastConnectFeedbackStyles";

    style.textContent = `
      .cc-toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: grid;
        gap: 12px;
        width: min(380px, calc(100vw - 32px));
        pointer-events: none;
      }

      .cc-toast {
        display: grid;
        grid-template-columns: 40px 1fr auto;
        gap: 12px;
        align-items: start;
        border: 1px solid rgba(220, 231, 229, 0.95);
        border-radius: 16px;
        padding: 14px;
        background: #ffffff;
        box-shadow:
          0 18px 50px
          rgba(16, 42, 46, 0.14);
        pointer-events: auto;
        animation:
          ccToastIn 0.22s ease;
      }

      .cc-toast-icon {
        display: flex;
        width: 40px;
        height: 40px;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 800;
      }

      .cc-toast.success
      .cc-toast-icon {
        background: #e8f7f3;
        color: #0f766e;
      }

      .cc-toast.error
      .cc-toast-icon {
        background: #fef2f2;
        color: #b91c1c;
      }

      .cc-toast.warning
      .cc-toast-icon {
        background: #fff7e6;
        color: #b45309;
      }

      .cc-toast.info
      .cc-toast-icon {
        background: #eef6ff;
        color: #2563eb;
      }

      .cc-toast-title {
        margin: 0 0 3px;
        color: #102a2e;
        font-size: 0.92rem;
        font-weight: 800;
      }

      .cc-toast-message {
        margin: 0;
        color: #627376;
        font-size: 0.84rem;
        line-height: 1.5;
      }

      .cc-toast-close {
        border: 0;
        padding: 2px;
        background: transparent;
        color: #7b8b8d;
        font-size: 1rem;
        cursor: pointer;
      }

      .cc-confirm-backdrop {
        position: fixed;
        inset: 0;
        z-index: 11000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background:
          rgba(8, 47, 44, 0.48);
        backdrop-filter:
          blur(4px);
      }

      .cc-confirm-card {
        width: min(440px, 100%);
        border-radius: 22px;
        padding: 24px;
        background: #ffffff;
        box-shadow:
          0 24px 70px
          rgba(8, 47, 44, 0.24);
        animation:
          ccConfirmIn 0.18s ease;
      }

      .cc-confirm-icon {
        display: flex;
        width: 48px;
        height: 48px;
        align-items: center;
        justify-content: center;
        margin-bottom: 18px;
        border-radius: 14px;
        background: #eef7f6;
        color: #0f766e;
        font-size: 1.2rem;
        font-weight: 800;
      }

      .cc-confirm-card.danger
      .cc-confirm-icon {
        background: #fef2f2;
        color: #b91c1c;
      }

      .cc-confirm-title {
        margin: 0 0 8px;
        color: #102a2e;
        font-size: 1.18rem;
        font-weight: 850;
      }

      .cc-confirm-message {
        margin: 0;
        color: #627376;
        font-size: 0.9rem;
        line-height: 1.6;
      }

      .cc-confirm-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 24px;
      }

      .cc-confirm-button {
        min-height: 44px;
        border-radius: 12px;
        padding: 0 18px;
        font: inherit;
        font-weight: 800;
        cursor: pointer;
      }

      .cc-confirm-cancel {
        border: 1px solid #dce7e5;
        background: #ffffff;
        color: #30484b;
      }

      .cc-confirm-accept {
        border: 1px solid #0f766e;
        background: #0f766e;
        color: #ffffff;
      }

      .cc-confirm-card.danger
      .cc-confirm-accept {
        border-color: #b91c1c;
        background: #b91c1c;
      }

      @keyframes ccToastIn {
        from {
          opacity: 0;
          transform:
            translateY(-8px);
        }

        to {
          opacity: 1;
          transform:
            translateY(0);
        }
      }

      @keyframes ccConfirmIn {
        from {
          opacity: 0;
          transform:
            scale(0.97);
        }

        to {
          opacity: 1;
          transform:
            scale(1);
        }
      }

      @media (max-width: 620px) {
        .cc-toast-container {
          top: 14px;
          right: 16px;
          left: 16px;
          width: auto;
        }

        .cc-confirm-card {
          padding: 20px;
          border-radius: 18px;
        }

        .cc-confirm-actions {
          flex-direction: column-reverse;
        }

        .cc-confirm-button {
          width: 100%;
        }
      }
    `;

    document.head.appendChild(
      style
    );
  }

  function getToastContainer() {
    ensureFeedbackStyles();

    let container =
      document.querySelector(
        ".cc-toast-container"
      );

    if (!container) {
      container =
        document.createElement(
          "div"
        );

      container.className =
        "cc-toast-container";

      document.body.appendChild(
        container
      );
    }

    return container;
  }

  function showToast({
    type = "info",
    title = "",
    message = "",
    duration = 4000,
  } = {}) {
    const container =
      getToastContainer();

    const toast =
      document.createElement(
        "div"
      );

    toast.className =
      `cc-toast ${type}`;

    const icons = {
      success: "✓",
      error: "!",
      warning: "!",
      info: "i",
    };

    toast.innerHTML = `
      <div class="cc-toast-icon">
        ${icons[type] || "i"}
      </div>

      <div>
        ${
          title
            ? `<p class="cc-toast-title">${escapeFeedbackHtml(
                title
              )}</p>`
            : ""
        }

        <p class="cc-toast-message">
          ${escapeFeedbackHtml(
            message
          )}
        </p>
      </div>

      <button
        type="button"
        class="cc-toast-close"
        aria-label="Close notification"
      >
        ×
      </button>
    `;

    container.appendChild(
      toast
    );

    const removeToast =
      () => {
        toast.remove();
      };

    toast
      .querySelector(
        ".cc-toast-close"
      )
      ?.addEventListener(
        "click",
        removeToast
      );

    if (duration > 0) {
      window.setTimeout(
        removeToast,
        duration
      );
    }
  }

  function showConfirm({
    title =
      "Are you sure?",
    message = "",
    confirmText =
      "Continue",
    cancelText =
      "Cancel",
    danger =
      false,
  } = {}) {
    ensureFeedbackStyles();

    return new Promise(
      (resolve) => {
        const backdrop =
          document.createElement(
            "div"
          );

        backdrop.className =
          "cc-confirm-backdrop";

        backdrop.innerHTML = `
          <div
            class="cc-confirm-card ${
              danger
                ? "danger"
                : ""
            }"
            role="dialog"
            aria-modal="true"
          >
            <div class="cc-confirm-icon">
              ${
                danger
                  ? "!"
                  : "?"
              }
            </div>

            <h3 class="cc-confirm-title">
              ${escapeFeedbackHtml(
                title
              )}
            </h3>

            <p class="cc-confirm-message">
              ${escapeFeedbackHtml(
                message
              )}
            </p>

            <div class="cc-confirm-actions">
              <button
                type="button"
                class="
                  cc-confirm-button
                  cc-confirm-cancel
                "
              >
                ${escapeFeedbackHtml(
                  cancelText
                )}
              </button>

              <button
                type="button"
                class="
                  cc-confirm-button
                  cc-confirm-accept
                "
              >
                ${escapeFeedbackHtml(
                  confirmText
                )}
              </button>
            </div>
          </div>
        `;

        document.body.appendChild(
          backdrop
        );

        const finish =
          (value) => {
            backdrop.remove();

            resolve(value);
          };

        backdrop
          .querySelector(
            ".cc-confirm-cancel"
          )
          ?.addEventListener(
            "click",
            () =>
              finish(false)
          );

        backdrop
          .querySelector(
            ".cc-confirm-accept"
          )
          ?.addEventListener(
            "click",
            () =>
              finish(true)
          );

        backdrop.addEventListener(
          "click",
          (event) => {
            if (
              event.target ===
              backdrop
            ) {
              finish(false);
            }
          }
        );

        const handleKeydown =
          (event) => {
            if (
              event.key ===
              "Escape"
            ) {
              document.removeEventListener(
                "keydown",
                handleKeydown
              );

              finish(false);
            }
          };

        document.addEventListener(
          "keydown",
          handleKeydown
        );
      }
    );
  }

  function escapeFeedbackHtml(
    value
  ) {
    return String(value ?? "")
      .replaceAll(
        "&",
        "&amp;"
      )
      .replaceAll(
        "<",
        "&lt;"
      )
      .replaceAll(
        ">",
        "&gt;"
      )
      .replaceAll(
        '"',
        "&quot;"
      )
      .replaceAll(
        "'",
        "&#039;"
      );
  }

  window.showToast =
    showToast;

  window.showConfirm =
    showConfirm;
})();