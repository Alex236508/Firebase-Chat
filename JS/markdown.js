let markdownRenderer;

function decodeHtml(value) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

function createRenderer() {
  const renderer = window.markdownit({
    html: true,
    linkify: true,
    breaks: true,
    typographer: false,
    highlight(code, language) {
      const safeCode = String(code || "");
      const escapedCode = safeCode
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      if (!window.hljs) {
        return `<pre><code>${escapedCode}</code></pre>`;
      }

      try {
        if (language && window.hljs.getLanguage(language)) {
          return `<pre><code class="hljs language-${language}">${
            window.hljs.highlight(safeCode, {
              language,
              ignoreIllegals: true,
            }).value
          }</code></pre>`;
        }

        return `<pre><code class="hljs">${
          window.hljs.highlightAuto(safeCode).value
        }</code></pre>`;
      } catch {
        return `<pre><code>${escapedCode}</code></pre>`;
      }
    },
  });

  renderer.enable("table");

  if (typeof window.markdownitTaskLists === "function") {
    renderer.use(window.markdownitTaskLists, {
      enabled: true,
      label: true,
    });
  }

  if (typeof window.markdownitFootnote === "function") {
    renderer.use(window.markdownitFootnote);
  }

  if (typeof window.markdownitDeflist === "function") {
    renderer.use(window.markdownitDeflist);
  }

  if (window.markdownitEmoji?.full) {
    renderer.use(window.markdownitEmoji.full);
  } else if (typeof window.markdownitEmoji === "function") {
    renderer.use(window.markdownitEmoji);
  }

  if (typeof window.markdownitKatex === "function") {
    renderer.use(window.markdownitKatex);
  }

  return renderer;
}

function addCopyButtons(container) {
  const codeBlocks = container.querySelectorAll("pre > code");

  codeBlocks.forEach((codeBlock) => {
    const pre = codeBlock.parentElement;
    if (!pre || pre.querySelector(".copy-btn")) return;

    const button = document.createElement("button");
    button.className = "copy-btn";
    button.type = "button";
    button.title = "Copy code";
    button.innerHTML = `
      <svg viewBox="0 0 16 16" fill="#eff8fd" aria-hidden="true">
        <path d="M0 1.75A.75.75 0 0 1 .75 1h9.5a.75.75 0 0 1 .75.75V3h-1V2H1.5v11h7v1h-7a.75.75 0 0 1-.75-.75V1.75z"/>
        <path d="M3 4h10v10H3V4zm1 1v8h8V5H4z"/>
      </svg>
    `;

    button.addEventListener("click", async () => {
      const textToCopy = codeBlock.textContent;
      let copied = false;

      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(textToCopy);
          copied = true;
        } catch (error) {
          console.warn("Clipboard API failed, falling back", error);
        }
      }

      if (!copied) {
        const textarea = document.createElement("textarea");
        textarea.value = textToCopy;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();

        try {
          copied = document.execCommand("copy");
        } catch (error) {
          console.error("Fallback copy failed", error);
        }

        document.body.removeChild(textarea);
      }

      if (!copied) {
        console.error("Unable to copy code");
        return;
      }

      const originalMarkup = button.innerHTML;
      button.classList.add("copied");
      button.innerHTML = `
        <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M13.78 3.22a.75.75 0 0 0-1.06 0L6 9.94 3.28 7.22a.75.75 0 0 0-1.06 1.06l3 3a.75.75 0 0 0 1.06 0l7-7a.75.75 0 0 0 0-1.06z"/>
        </svg>
      `;

      window.setTimeout(() => {
        button.classList.remove("copied");
        button.innerHTML = originalMarkup;
      }, 1500);
    });

    pre.appendChild(button);
  });
}

export function renderMarkdown(rawText) {
  if (!markdownRenderer) {
    markdownRenderer = createRenderer();
  }

  const container = document.createElement("div");
  container.className = "chat-markdown";

  let source = decodeHtml(String(rawText || ""));
  source = source.includes("\\n") ? source.replace(/\\n/g, "\n") : source;

  let rendered = markdownRenderer.render(source);
  if (window.DOMPurify?.sanitize) {
    rendered = window.DOMPurify.sanitize(rendered, {
      USE_PROFILES: { html: true },
      ADD_TAGS: [
        "details",
        "summary",
        "table",
        "thead",
        "tbody",
        "tr",
        "th",
        "td",
      ],
      ADD_ATTR: ["open", "style", "class"],
    });
  }

  container.innerHTML = rendered;

  container.querySelectorAll("a").forEach((link) => {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });

  container
    .querySelectorAll('input[type="checkbox"]')
    .forEach((checkbox) => {
      checkbox.disabled = true;
    });

  addCopyButtons(container);
  return container;
}
