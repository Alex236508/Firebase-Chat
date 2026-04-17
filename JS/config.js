export const MAX_USERNAME_LENGTH = 24;
export const MAX_MESSAGE_LENGTH = 50000000;
export const MIN_PASSWORD_LENGTH = 6;
export const OWNER_UID = "KigbwoUGu1Ogz2MRnh2Mh442kx22";

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDlmPq4bMKdOFHMdfevEa3ctd4-3WQ4u7k",
  authDomain: "hacker-gui-global-chat.firebaseapp.com",
  databaseURL:"https://hacker-gui-global-chat-default-rtdb.firebaseio.com",
  projectId: "hacker-gui-global-chat",
  storageBucket: "hacker-gui-global-chat.firebasestorage.app",
  messagingSenderId: "410978781234",
  appId: "1:410978781234:web:ee08f15ee9be48970c542b",
  measurementId: "G-SB0B1FLF29",
};

export const CLOUDINARY_CONFIG = {
  cloudName: "dmxq5bvyq",
  uploadPreset: "files_preset",
  maxFileSizeBytes: 50 * 1024 * 1024,
  allowedTypes: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "video/mp4",
    "video/webm",
    "audio/mp3",
    "audio/mpeg",
  ],
};

const defaultTheme = {
  "--bg-overlay": "rgba(0,0,0,0.7)",
  "--bg-primary": "#111",
  "--bg-secondary": "#000",
  "--bg-button": "#0f0",
  "--bg-cancel": "#222",
  "--text-primary": "#0f0",
  "--text-highlight": "#7aff7a",
  "--text-button": "#000",
  "--border-color": "#0f0",
  "--shadow-soft": "0 6px 20px rgba(0,0,0,0.6)",
  "--radius": "8px",
  "--cyber-primary": "#00f3ff",
  "--cyber-secondary": "#00e7ff",
  "--cyber-glow": "rgba(0,243,255,0.5)",
  "--cyber-glow-strong": "rgba(0,243,255,0.8)",
  "--cyber-tooltip-bg": "rgba(15,15,35,0.95)",
  "--cyber-grid": "rgba(0,231,255,0.1)",
  "--cyber-border": "rgba(0,231,255,0.5)",
  "--cyber-shadow": "rgba(0,231,255,0.2)",
};

const darkTheme = {
  "--bg-overlay": "rgba(2,6,12,0.78)",
  "--bg-primary": "#0b1220",
  "--bg-secondary": "#04070d",
  "--bg-button": "#6ee7ff",
  "--bg-cancel": "#162033",
  "--text-primary": "#d7f6ff",
  "--text-highlight": "#8cecff",
  "--text-button": "#04111a",
  "--border-color": "#4dd8ff",
  "--shadow-soft": "0 10px 26px rgba(0,0,0,0.55)",
  "--radius": "8px",
  "--cyber-primary": "#6ee7ff",
  "--cyber-secondary": "#8cecff",
  "--cyber-glow": "rgba(110,231,255,0.45)",
  "--cyber-glow-strong": "rgba(110,231,255,0.72)",
  "--cyber-tooltip-bg": "rgba(8,17,30,0.96)",
  "--cyber-grid": "rgba(110,231,255,0.08)",
  "--cyber-border": "rgba(110,231,255,0.35)",
  "--cyber-shadow": "rgba(110,231,255,0.16)",
};

const lightTheme = {
  "--bg-overlay": "rgba(225,236,226,0.82)",
  "--bg-primary": "#f5fbf4",
  "--bg-secondary": "#dfeadf",
  "--bg-button": "#1b6f3d",
  "--bg-cancel": "#d1ddd1",
  "--text-primary": "#173f27",
  "--text-highlight": "#245938",
  "--text-button": "#f4fff6",
  "--border-color": "#3f8f5b",
  "--shadow-soft": "0 10px 24px rgba(24,46,32,0.18)",
  "--radius": "8px",
  "--cyber-primary": "#2f8f59",
  "--cyber-secondary": "#3f8f5b",
  "--cyber-glow": "rgba(47,143,89,0.22)",
  "--cyber-glow-strong": "rgba(47,143,89,0.38)",
  "--cyber-tooltip-bg": "rgba(244,252,245,0.98)",
  "--cyber-grid": "rgba(47,143,89,0.08)",
  "--cyber-border": "rgba(47,143,89,0.28)",
  "--cyber-shadow": "rgba(47,143,89,0.12)",
};

export const THEME_OPTIONS = [
  {
    id: "default",
    label: "Default",
    values: defaultTheme,
  },
  {
    id: "dark",
    label: "Dark",
    values: darkTheme,
  },
  {
    id: "light",
    label: "Light",
    values: lightTheme,
  },
];
