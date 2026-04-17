import { FIREBASE_CONFIG } from "./config.js";

const markdownStyles = [
  {
    id: "hljs-css",
    href: "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css",
  },
  {
    id: "katex-css",
    href: "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css",
  },
];

const markdownScripts = [
  {
    src: "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js",
    readyCheck: () => Boolean(window.hljs),
  },
  {
    src: "https://cdn.jsdelivr.net/npm/markdown-it@14.1.0/dist/markdown-it.min.js",
    readyCheck: () => Boolean(window.markdownit),
  },
  {
    src: "https://cdn.jsdelivr.net/npm/markdown-it-task-lists@2.1.1/dist/markdown-it-task-lists.min.js",
    readyCheck: () => Boolean(window.markdownitTaskLists),
  },
  {
    src: "https://cdn.jsdelivr.net/npm/markdown-it-footnote@3.0.3/dist/markdown-it-footnote.min.js",
    readyCheck: () => Boolean(window.markdownitFootnote),
  },
  {
    src: "https://cdn.jsdelivr.net/npm/markdown-it-deflist@2.1.0/dist/markdown-it-deflist.min.js",
    readyCheck: () => Boolean(window.markdownitDeflist),
  },
  {
    src: "https://cdn.jsdelivr.net/npm/markdown-it-emoji@3.0.0/dist/markdown-it-emoji.min.js",
    readyCheck: () => Boolean(window.markdownitEmoji),
  },
  {
    src: "https://cdn.jsdelivr.net/npm/markdown-it-katex@2.0.3/index.min.js",
    readyCheck: () => Boolean(window.markdownitKatex),
  },
  {
    src: "https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js",
    readyCheck: () => Boolean(window.DOMPurify),
  },
];

const firebaseScripts = [
  {
    src: "https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js",
    readyCheck: () => Boolean(window.firebase?.initializeApp),
  },
  {
    src: "https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js",
    readyCheck: () => Boolean(window.firebase?.database),
  },
  {
    src: "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js",
    readyCheck: () => Boolean(window.firebase?.auth),
  },
];

let markdownToolsPromise;
let firebaseCompatPromise;

function addStylesheet(id, href) {
  if (document.getElementById(id)) return;

  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

function loadScript(src, readyCheck) {
  return new Promise((resolve) => {
    if (readyCheck()) {
      resolve();
      return;
    }

    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => resolve(), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

export function ensureMarkdownTools() {
  if (!markdownToolsPromise) {
    markdownToolsPromise = Promise.all([
      ...markdownStyles.map(({ id, href }) => addStylesheet(id, href)),
      ...markdownScripts.map(({ src, readyCheck }) => loadScript(src, readyCheck)),
    ]);
  }

  return markdownToolsPromise;
}

export function ensureFirebaseCompat() {
  if (!firebaseCompatPromise) {
    firebaseCompatPromise = firebaseScripts.reduce(
      (chain, { src, readyCheck }) => chain.then(() => loadScript(src, readyCheck)),
      Promise.resolve(),
    );
  }

  return firebaseCompatPromise;
}

export function initializeFirebaseServices() {
  if (!window.firebase.apps.length) {
    window.firebase.initializeApp(FIREBASE_CONFIG);
  }

  return {
    firebase: window.firebase,
    db: window.firebase.database(),
    auth: window.firebase.auth(),
  };
}

export function configureRealtimeTransport() {
  const urlParams = new URLSearchParams(window.location.search);
  const transportOverride = (urlParams.get("transport") || "").toLowerCase();
  const forceLongPolling =
    transportOverride === "longpoll" || transportOverride === "long-polling";

  if (forceLongPolling && window.firebase.database?.INTERNAL?.forceLongPolling) {
    window.firebase.database.INTERNAL.forceLongPolling();
  }
}
