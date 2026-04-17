import { createAccount, getAuthenticatedUsername, loginAccount } from "./auth.js";
import {
  configureRealtimeTransport,
  ensureFirebaseCompat,
  ensureMarkdownTools,
  initializeFirebaseServices,
} from "./bootstrap.js";
import { OWNER_UID, THEME_OPTIONS } from "./config.js";
import { showChatWindow } from "./chat-window.js";
import { showHomepage } from "./homepage.js";
import {
  installConsoleNotifications,
  showNotification,
} from "./notifications.js";
import { createProfanityFilter } from "./profanity-filter.js";
import {
  createThemeManager,
  loadUserThemePreference,
  saveUserThemePreference,
} from "./theme.js";
import { showAuthDialog, withWarpLoader } from "./ui.js";

function installGlobalErrorLogger({ db, state }) {
  const debugLogState = {
    sentCount: 0,
    fingerprints: new Map(),
  };

  const debugLogMaxPerSession = 20;
  const debugLogDedupeMs = 60_000;

  function trimText(value, maxLength = 1200) {
    if (value == null) return "";
    const text = String(value);
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  }

  function getErrorFingerprint(type, message, stack) {
    return `${type}::${trimText(message, 280)}::${trimText(stack, 400)}`;
  }

  function shouldSendDebugLog(fingerprint) {
    if (debugLogState.sentCount >= debugLogMaxPerSession) return false;

    const now = Date.now();
    const previous = debugLogState.fingerprints.get(fingerprint);
    if (previous && now - previous < debugLogDedupeMs) return false;

    debugLogState.fingerprints.set(fingerprint, now);
    debugLogState.sentCount += 1;
    return true;
  }

  function logCriticalClientError(type, error, extras = {}) {
    const message =
      trimText(
        error && typeof error === "object" && "message" in error
          ? error.message
          : error,
        600,
      ) || "Unknown error";

    const stack =
      error && typeof error === "object" && "stack" in error
        ? trimText(error.stack, 3000)
        : "";

    const fingerprint = getErrorFingerprint(type, message, stack);
    if (!shouldSendDebugLog(fingerprint)) return;

    const debugPayload = {
      type,
      message,
      stack,
      fingerprint,
      path: window.location.pathname || "/",
      href: window.location.href || "",
      userAgent: trimText(navigator.userAgent, 300),
      uid: state.user?.uid || null,
      createdAt: window.firebase.database.ServerValue.TIMESTAMP,
      extras,
    };

    db.ref("debugLogs").push(debugPayload).catch(() => {
      // Intentionally ignored to avoid recursive failures in error handling.
    });
  }

  window.addEventListener("error", (event) => {
    logCriticalClientError("window_error", event.error || event.message, {
      source: event.filename || null,
      line: event.lineno || null,
      column: event.colno || null,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    logCriticalClientError("unhandled_rejection", reason, {
      reasonType: reason?.constructor?.name || typeof reason,
    });
  });
}

async function refreshAdminStatus(db, state) {
  if (!state.user) {
    state.isAdmin = false;
    return;
  }

  try {
    const adminSnapshot = await db.ref(`admins/${state.user.uid}`).get();
    state.isAdmin = adminSnapshot.exists();
  } catch (error) {
    console.warn("Unable to verify admin status:", error);
    state.isAdmin = false;
  }
}

async function startChatApp() {
  await ensureMarkdownTools();
  await ensureFirebaseCompat();
  configureRealtimeTransport();

  const themeManager = createThemeManager(THEME_OPTIONS);
  const { db, auth } = initializeFirebaseServices();
  const state = {
    user: auth.currentUser,
    username: auth.currentUser?.displayName || null,
    isAdmin: false,
    userThemeId: themeManager.getActiveThemeId(),
  };

  installConsoleNotifications();
  installGlobalErrorLogger({ db, state });

  const profanityFilter = createProfanityFilter(db);

  const loadThemePreference = () =>
    loadUserThemePreference({ db, state, themeManager });
  const saveThemePreference = (themeId) =>
    saveUserThemePreference({ db, state, themeManager }, themeId);

  const createAccountAction = (username, password) =>
    createAccount(
      {
        auth,
        db,
        state,
        themeManager,
        profanityFilter,
        showNotification,
      },
      username,
      password,
    );

  const loginAccountAction = (username, password) =>
    loginAccount(
      {
        auth,
        state,
        showNotification,
      },
      username,
      password,
    );

  while (true) {
    if (!state.username) {
      state.username = await getAuthenticatedUsername({
        createAccountAction,
        loginAccountAction,
        showAuthDialog,
        withWarpLoader,
      });
    }

    if (!state.username) {
      return;
    }

    await loadThemePreference();

    const homepageAction = await showHomepage({
      state,
      db,
      ownerUid: OWNER_UID,
      themeOptions: themeManager.themeOptions,
      saveUserThemePreference: saveThemePreference,
      showNotification,
      withWarpLoader,
    });

    if (homepageAction === "relogin") {
      state.username = null;
      continue;
    }

    if (homepageAction !== "launch") {
      return;
    }

    await refreshAdminStatus(db, state);

    const chatAction = await showChatWindow({
      state,
      db,
      isAdmin: state.isAdmin,
      showNotification,
      profanityFilter,
      withWarpLoader,
    });

    if (chatAction === "close") {
      continue;
    }

    return;
  }
}

if (!window.chatActive) {
  window.chatActive = true;

  startChatApp()
    .catch((error) => {
      console.error("Unable to initialize chat:", error);
    })
    .finally(() => {
      window.chatActive = false;
    });
}
