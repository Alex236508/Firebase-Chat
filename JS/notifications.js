const notificationTypes = {
  success: {
    popupClass: "success-popup",
    iconClass: "success-icon",
    messageClass: "success-message",
    iconSVG: '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>',
  },
  info: {
    popupClass: "info-popup",
    iconClass: "info-icon",
    messageClass: "info-message",
    iconSVG:
      '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 15h-2v-6h2zm0-8h-2V7h2z"/></svg>',
  },
  warning: {
    popupClass: "alert-popup",
    iconClass: "alert-icon",
    messageClass: "alert-message",
    iconSVG:
      '<svg viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 14h-2v-2h2zm0-4h-2v-4h2z"/></svg>',
  },
  error: {
    popupClass: "error-popup",
    iconClass: "error-icon",
    messageClass: "error-message",
    iconSVG:
      '<svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  },
};

let notificationsInstalled = false;

function ensureNotificationRoot() {
  const existing = document.getElementById("chat-notification-root");
  if (existing) return existing;

  const root = document.createElement("div");
  root.id = "chat-notification-root";
  document.body.appendChild(root);
  return root;
}

export function showNotification(message, type = "info", durationMs = 4000) {
  const notificationRoot = ensureNotificationRoot();
  notificationRoot.style.zIndex = "2147483647";

  const normalizedType = String(type || "info").toLowerCase();
  const {
    popupClass,
    iconClass,
    messageClass,
    iconSVG,
  } = notificationTypes[normalizedType] || notificationTypes.info;

  const notice = document.createElement("div");
  notice.className = `popup ${popupClass}`;

  const iconContainer = document.createElement("div");
  iconContainer.className = `popup-icon ${iconClass}`;
  iconContainer.innerHTML = iconSVG;

  const messageContainer = document.createElement("div");
  messageContainer.className = messageClass;
  messageContainer.textContent = String(message);

  const closeContainer = document.createElement("div");
  closeContainer.className = "close-icon";
  closeContainer.innerHTML =
    '<svg class="close-svg" viewBox="0 0 24 24"><path class="close-path" d="M6 6L18 18M6 18L18 6"/></svg>';
  closeContainer.addEventListener("click", () => notice.remove());

  notice.appendChild(iconContainer);
  notice.appendChild(messageContainer);
  notice.appendChild(closeContainer);
  notificationRoot.appendChild(notice);

  requestAnimationFrame(() => {
    notice.classList.add("show");
  });

  window.setTimeout(() => {
    notice.classList.remove("show");
    window.setTimeout(() => notice.remove(), 400);
  }, durationMs);
}

export function installConsoleNotifications() {
  if (notificationsInstalled) return;
  notificationsInstalled = true;

  const originalConsoleWarn = console.warn.bind(console);
  const originalConsoleError = console.error.bind(console);

  console.warn = (...args) => {
    showNotification(args.join(" "), "warning");
    originalConsoleWarn(...args);
  };

  console.error = (...args) => {
    showNotification(args.join(" "), "error");
    originalConsoleError(...args);
  };
}
