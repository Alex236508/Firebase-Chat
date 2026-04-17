import { MIN_PASSWORD_LENGTH } from "./config.js";
import {
  isValidPassword,
  isValidUsername,
  usernameToEmail,
} from "./validation.js";

export async function createAccount(
  { auth, db, state, themeManager, profanityFilter, showNotification },
  username,
  password,
) {
  if (!isValidUsername(username)) {
    showNotification(
      "Username must be 1-24 chars and only contain letters, numbers, or _.",
    );
    return null;
  }

  const matchedUsername = profanityFilter.detect(username);
  if (matchedUsername) {
    showNotification(
      "Username contains inappropriate language. Choose another username.",
    );
    return null;
  }

  if (!isValidPassword(password)) {
    showNotification(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
    return null;
  }

  try {
    const credential = await auth.createUserWithEmailAndPassword(
      usernameToEmail(username),
      password,
    );
    state.user = credential.user;
    await state.user.updateProfile({
      displayName: username,
    });
  } catch (error) {
    console.error("Account creation auth step failed:", error);
    if (error?.code === "auth/email-already-in-use") {
      showNotification("That username already exists. Please choose another one.");
    } else {
      showNotification("Account creation failed. Please try again.");
    }
    return null;
  }

  try {
    await db.ref(`users/${state.user.uid}`).set({
      username,
      usernameKey: username.toLowerCase(),
      createdAt: Date.now(),
      ownerUid: state.user.uid,
      approved: false,
      theme: themeManager.getDefaultThemeId(),
    });
  } catch (error) {
    console.error("Account creation failed:", error);
    showNotification(
      "Account creation failed. Firebase rules may still block user objects under /users.",
    );
    return null;
  }

  state.username = username;
  state.userThemeId = themeManager.getDefaultThemeId();
  themeManager.applyThemeById(state.userThemeId);
  return username;
}

export async function loginAccount(
  { auth, state, showNotification },
  username,
  password,
) {
  if (!isValidUsername(username)) {
    showNotification("Invalid username format.");
    return null;
  }

  try {
    const credential = await auth.signInWithEmailAndPassword(
      usernameToEmail(username),
      password,
    );
    state.user = credential.user;
  } catch (error) {
    console.error("Login failed:", error);
    showNotification("Wrong username or password.");
    return null;
  }

  state.username = state.user.displayName || username;
  return state.username;
}

export async function getAuthenticatedUsername({
  createAccountAction,
  loginAccountAction,
  showAuthDialog,
  withWarpLoader,
}) {
  while (true) {
    const credentials = await showAuthDialog();
    if (!credentials) {
      return null;
    }

    if (credentials.mode === "create") {
      const createdUser = await withWarpLoader(
        () => createAccountAction(credentials.username, credentials.password),
        450,
      );
      if (createdUser) return createdUser;
      continue;
    }

    if (credentials.mode === "login") {
      const loggedInUser = await withWarpLoader(
        () => loginAccountAction(credentials.username, credentials.password),
        450,
      );
      if (loggedInUser) return loggedInUser;
    }
  }
}
