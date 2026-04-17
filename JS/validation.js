import {
  MAX_MESSAGE_LENGTH,
  MAX_USERNAME_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "./config.js";

export function sanitizeInput(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function isValidUsername(name) {
  return (
    typeof name === "string" &&
    /^[a-zA-Z0-9_]+$/.test(name) &&
    name.length > 0 &&
    name.length <= MAX_USERNAME_LENGTH
  );
}

export function isValidPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= MIN_PASSWORD_LENGTH &&
    password.length <= 128
  );
}

export function usernameToEmail(username) {
  return `${username.toLowerCase()}@chat.local`;
}

export function isValidMessageText(text) {
  return (
    typeof text === "string" &&
    text.length > 0 &&
    text.length <= MAX_MESSAGE_LENGTH
  );
}

export function isValidTimestamp(timestamp) {
  return Number.isFinite(timestamp) && timestamp > 0;
}
