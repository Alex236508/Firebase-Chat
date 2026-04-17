import { CLOUDINARY_CONFIG, MAX_MESSAGE_LENGTH } from "./config.js";
import { renderMarkdown } from "./markdown.js";
import {
  isValidMessageText,
  isValidTimestamp,
  isValidUsername,
  sanitizeInput,
} from "./validation.js";

function tintColor(hex, amount = 0.8) {
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);

  const tintedRed = Math.round(red + (255 - red) * amount);
  const tintedGreen = Math.round(green + (255 - green) * amount);
  const tintedBlue = Math.round(blue + (255 - blue) * amount);

  return `rgb(${tintedRed}, ${tintedGreen}, ${tintedBlue})`;
}

const baseColors = [
  "#00ffff",
  "#ffff00",
  "#ff00ff",
  "#ff4500",
  "#1e90ff",
  "#FF0000",
  "#ff1493",
  "#7fff00",
  "#FF5F1F",
  "#7FFFD4",
  "#8B0000",
];

const userColors = baseColors.map((color) => tintColor(color, 0.8));

function createUserColorGetter(currentUsername) {
  return (username) => {
    if (username.toLowerCase() === currentUsername.toLowerCase()) {
      return "#fdfdfd";
    }

    let hash = 0;
    for (let index = 0; index < username.length; index += 1) {
      hash = username.charCodeAt(index) + ((hash << 5) - hash);
    }

    return userColors[Math.abs(hash) % userColors.length];
  };
}

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_CONFIG.uploadPreset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  return response.json();
}

function makeResizable(element, handle) {
  handle.addEventListener("mousedown", (event) => {
    event.preventDefault();

    const startWidth = element.offsetWidth;
    const startHeight = element.offsetHeight;
    const startX = event.clientX;
    const startY = event.clientY;

    function handleMove(nextEvent) {
      element.style.width = `${startWidth + (nextEvent.clientX - startX)}px`;
      element.style.height = `${startHeight + (nextEvent.clientY - startY)}px`;
    }

    function handleUp() {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    }

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  });
}

function makeDraggable(element, ignoredElements = []) {
  element.addEventListener("mousedown", (event) => {
    if (ignoredElements.some((ignored) => ignored.contains(event.target))) {
      return;
    }

    const offsetX = event.clientX - element.getBoundingClientRect().left;
    const offsetY = event.clientY - element.getBoundingClientRect().top;

    function handleMove(nextEvent) {
      let nextX = nextEvent.clientX - offsetX;
      let nextY = nextEvent.clientY - offsetY;

      nextX = Math.max(0, Math.min(window.innerWidth - element.offsetWidth, nextX));
      nextY = Math.max(0, Math.min(window.innerHeight - element.offsetHeight, nextY));

      element.style.left = `${nextX}px`;
      element.style.top = `${nextY}px`;
      element.style.right = "auto";
      element.style.bottom = "auto";
    }

    function handleUp() {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    }

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  });
}

export function showChatWindow({
  state,
  db,
  isAdmin,
  showNotification,
  profanityFilter,
  withWarpLoader,
}) {
  return new Promise((resolve) => {
    const currentUsername = state.username || state.user?.displayName || "Guest";
    const getUserColor = createUserColorGetter(currentUsername);
    const cleanupCallbacks = [];
    let resolved = false;

    const existingChat = document.getElementById("globalChatContainer");
    if (existingChat) existingChat.remove();

    const chat = document.createElement("div");
    chat.id = "globalChatContainer";
    chat.className = "chat-window";
    document.body.appendChild(chat);

    const messagesDiv = document.createElement("div");
    messagesDiv.className = "chat-window__messages";
    chat.appendChild(messagesDiv);

    const composer = document.createElement("div");
    composer.className = "chat-window__composer";
    chat.appendChild(composer);

    const input = document.createElement("textarea");
    input.className = "chat-window__input";
    input.maxLength = MAX_MESSAGE_LENGTH;
    input.placeholder = "Type a message...";
    input.rows = 1;
    composer.appendChild(input);

    const uploadButton = document.createElement("button");
    uploadButton.type = "button";
    uploadButton.className = "chat-window__upload";
    uploadButton.setAttribute("aria-label", "Upload media");
    uploadButton.textContent = "\u{1F4C1}";
    composer.appendChild(uploadButton);

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "chat-window__close";
    closeButton.setAttribute("aria-label", "Close chat");
    closeButton.textContent = "\u2716";
    chat.appendChild(closeButton);

    const resizeHandle = document.createElement("div");
    resizeHandle.className = "chat-window__resize-handle";
    chat.appendChild(resizeHandle);

    function resolveOnce(action) {
      if (resolved) return;
      resolved = true;
      resolve(action);
    }

    function runCleanup() {
      while (cleanupCallbacks.length) {
        const callback = cleanupCallbacks.pop();
        try {
          callback();
        } catch (error) {
          console.warn("Chat cleanup failed:", error);
        }
      }
    }

    function resizeComposer() {
      input.style.height = "auto";
      const maxHeight = parseFloat(window.getComputedStyle(input).maxHeight || "0");
      const nextHeight = Math.min(input.scrollHeight, maxHeight);
      input.style.height = `${nextHeight}px`;
      input.style.overflowY = input.scrollHeight > maxHeight ? "auto" : "hidden";
    }

    function sortMessagesByTimestamp() {
      const nodes = Array.from(messagesDiv.children);
      nodes
        .sort(
          (left, right) =>
            Number(left.dataset.timestamp || 0) - Number(right.dataset.timestamp || 0),
        )
        .forEach((node) => messagesDiv.appendChild(node));
    }

    function scrollToLatestMessage() {
      requestAnimationFrame(() => {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      });
    }
    
     function isValidMediaPayload(data) {
      return (
        data &&
        typeof data === "object" &&
        isValidUsername(data.username) &&
        isValidTimestamp(data.timestamp) &&
        typeof data.fileType === "string" &&
        data.fileType.length > 0 &&
        typeof data.fileUrl === "string" &&
        data.fileUrl.trim().length > 0
      );
    }

    function createAdminActionsMenu({ collection, messageId, data, isMedia }) {
      const wrapper = document.createElement("div");
      wrapper.className = "admin-actions";

      const trigger = document.createElement("span");
      trigger.className = "admin-actions__trigger";
      trigger.title = "Delete or edit";
      trigger.textContent = "\u2726";

      const menu = document.createElement("div");
      menu.className = "admin-actions__menu";

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "admin-actions__button";
      editButton.textContent = "edit";
      editButton.onclick = async () => {
        try {
          if (isMedia) {
            const nextUrl = window.prompt("Edit media URL", data.fileUrl || "");
            if (!nextUrl || nextUrl === data.fileUrl) return;
            await db.ref(`${collection}/${messageId}`).update({
              fileUrl: sanitizeInput(nextUrl),
            });
            return;
          }

          const nextText = window.prompt("Edit message", data.text || "");
          if (!nextText || nextText === data.text) return;

          const cleanText = sanitizeInput(nextText);
          if (!isValidMessageText(cleanText)) {
            showNotification(`Message must be 1-${MAX_MESSAGE_LENGTH} characters.`);
            return;
          }

          const matched = profanityFilter.detect(cleanText);
          if (matched) {
            showNotification("Edited message contains inappropriate language.");
            return;
          }

          await db.ref(`${collection}/${messageId}`).update({
            text: cleanText,
          });
        } catch (error) {
          console.error("Edit failed:", error);
          showNotification(
            "Edit failed. Check your Firebase write rules for admin edits.",
          );
        }
      };

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "admin-actions__button admin-actions__button--danger";
      deleteButton.textContent = "delete";
      deleteButton.onclick = async () => {
        if (!window.confirm("Delete this message?")) return;

        try {
          await db.ref(`${collection}/${messageId}`).remove();
        } catch (error) {
          console.error("Delete failed:", error);
          showNotification(
            "Delete failed. Check your Firebase write rules for admin deletes.",
          );
        }
      };

      menu.appendChild(editButton);
      menu.appendChild(deleteButton);
      wrapper.appendChild(trigger);
      wrapper.appendChild(menu);
      return wrapper;
    }

    function addAdminActions(container, config) {
      if (!isAdmin || !config.messageId) return;
      container.appendChild(createAdminActionsMenu(config));
    }

    function appendMediaMessage(data, messageId) {
       if (!isValidMediaPayload(data)) {
        return;
      }

      const message = document.createElement("div");
      message.className = "chat-message chat-message--media";
      message.dataset.timestamp = String(data.timestamp || 0);

      const time = document.createElement("span");
      time.className = "chat-message__time";
      time.textContent = new Date(data.timestamp).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
      message.appendChild(time);

      const username = document.createElement("span");
      username.className = "chat-message__user";
      username.style.color = getUserColor(data.username);
      username.textContent = `${data.username}: `;
      message.appendChild(username);

      let mediaElement;
      if (data.fileType.startsWith("image/")) {
        mediaElement = document.createElement("img");
      } else if (data.fileType.startsWith("video/")) {
        mediaElement = document.createElement("video");
        mediaElement.controls = true;
      } else if (data.fileType.startsWith("audio/")) {
        mediaElement = document.createElement("audio");
        mediaElement.controls = true;
      } else {
        mediaElement = document.createElement("a");
        mediaElement.href = data.fileUrl;
        mediaElement.target = "_blank";
        mediaElement.rel = "noopener noreferrer";
        mediaElement.textContent = "Download file";
        mediaElement.className = "chat-media__file-link";
      }

      mediaElement.classList.add("chat-media__element");
      if ("src" in mediaElement) {
        mediaElement.src = data.fileUrl;
      }

      message.appendChild(mediaElement);
      addAdminActions(message, {
        collection: "media",
        messageId,
        data,
        isMedia: true,
      });

      messagesDiv.appendChild(message);
      sortMessagesByTimestamp();
      scrollToLatestMessage();
    }

    function appendTextMessage(data) {
      if (
        !isValidUsername(data.username) ||
        !isValidMessageText(data.text) ||
        !isValidTimestamp(data.timestamp)
      ) {
        return;
      }

      const message = document.createElement("div");
      message.className = "chat-message";
      message.dataset.timestamp = String(data.timestamp || 0);

      const header = document.createElement("div");
      header.className = "chat-message__header";

      const time = document.createElement("span");
      time.className = "chat-message__time";
      time.textContent = new Date(data.timestamp).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });

      const username = document.createElement("span");
      username.className = "chat-message__user";
      username.style.color = getUserColor(data.username);
      username.textContent = `${data.username}:`;

      header.appendChild(time);
      header.appendChild(username);
      message.appendChild(header);

      const body = document.createElement("div");
      body.className = "chat-message__body";
      body.style.color = getUserColor(data.username);

      try {
        body.appendChild(renderMarkdown(data.text));
      } catch (error) {
        console.error("renderMarkdown failed; using plain text fallback", error);
        body.textContent = String(data.text ?? "");
      }

      message.appendChild(body);
      addAdminActions(message, {
        collection: "messages",
        messageId: data.id,
        data,
        isMedia: false,
      });

      messagesDiv.appendChild(message);
      sortMessagesByTimestamp();
      scrollToLatestMessage();
    }

    async function sendMessage() {
      if (!input.value.trim()) return;

      const message = sanitizeInput(input.value);
      if (!isValidMessageText(message)) {
        showNotification(`Message must be 1-${MAX_MESSAGE_LENGTH} characters.`);
        input.value = "";
        resizeComposer();
        return;
      }

      const matched = profanityFilter.detect(message);
      if (matched) {
        showNotification(
          "Your message contains inappropriate language and cannot be sent.",
        );
        input.value = "";
        resizeComposer();
        return;
      }

      await db.ref("messages").push({
        uid: state.user.uid,
        username: currentUsername,
        text: message,
        timestamp: Date.now(),
      });

      input.value = "";
      resizeComposer();
    }

    uploadButton.onclick = () => {
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*,video/*,audio/*,.gif";

      fileInput.onchange = async () => {
        const file = fileInput.files?.[0];
        if (!file) return;

        if (file.size > CLOUDINARY_CONFIG.maxFileSizeBytes) {
          showNotification("File too large! Maximum size is 50MB.");
          return;
        }

        if (!CLOUDINARY_CONFIG.allowedTypes.includes(file.type)) {
          showNotification("Unsupported file type.");
          return;
        }

        try {
          const result = await uploadToCloudinary(file);
          await db.ref("media").push({
            uid: state.user.uid,
            username: currentUsername,
            fileUrl: result.secure_url,
            fileType: file.type,
            timestamp: Date.now(),
          });
        } catch (error) {
          console.error("Upload failed:", error);
          showNotification("Upload failed. Check console.");
        }
      };

      fileInput.click();
    };

    closeButton.onclick = async () => {
      runCleanup();
      await withWarpLoader(async () => {
        chat.remove();
      }, 500);
      resolveOnce("close");
    };

    const mediaRef = db.ref("media").limitToLast(50);
    const messagesRef = db.ref("messages").limitToLast(50);
    const mediaDomMap = new Map();
    const messageDomMap = new Map();

    const handleMediaAdded = (snapshot) => {
      const data = snapshot.val();
      if (!data || typeof data !== "object") return;
      appendMediaMessage(data, snapshot.key);
      mediaDomMap.set(snapshot.key, messagesDiv.lastElementChild);
    };

    const handleMediaChanged = (snapshot) => {
      const existingMessage = mediaDomMap.get(snapshot.key);
      if (existingMessage) existingMessage.remove();
      const data = snapshot.val();
      if (!data || typeof data !== "object") return;
      appendMediaMessage(data, snapshot.key);
      mediaDomMap.set(snapshot.key, messagesDiv.lastElementChild);
    };

    const handleMediaRemoved = (snapshot) => {
      const existingMessage = mediaDomMap.get(snapshot.key);
      if (existingMessage) existingMessage.remove();
      mediaDomMap.delete(snapshot.key);
    };

    const handleMessageAdded = (snapshot) => {
      const data = snapshot.val();
      if (!data || typeof data !== "object") return;
      appendTextMessage({
        ...data,
        id: snapshot.key,
      });
      messageDomMap.set(snapshot.key, messagesDiv.lastElementChild);
    };

    const handleMessageChanged = (snapshot) => {
      const existingMessage = messageDomMap.get(snapshot.key);
      if (existingMessage) existingMessage.remove();
      const data = snapshot.val();
      if (!data || typeof data !== "object") return;
      appendTextMessage({
        ...data,
        id: snapshot.key,
      });
      messageDomMap.set(snapshot.key, messagesDiv.lastElementChild);
    };

    const handleMessageRemoved = (snapshot) => {
      const existingMessage = messageDomMap.get(snapshot.key);
      if (existingMessage) existingMessage.remove();
      messageDomMap.delete(snapshot.key);
    };

    mediaRef.on("child_added", handleMediaAdded);
    mediaRef.on("child_changed", handleMediaChanged);
    mediaRef.on("child_removed", handleMediaRemoved);
    messagesRef.on("child_added", handleMessageAdded);
    messagesRef.on("child_changed", handleMessageChanged);
    messagesRef.on("child_removed", handleMessageRemoved);

    cleanupCallbacks.push(() => mediaRef.off("child_added", handleMediaAdded));
    cleanupCallbacks.push(() => mediaRef.off("child_changed", handleMediaChanged));
    cleanupCallbacks.push(() => mediaRef.off("child_removed", handleMediaRemoved));
    cleanupCallbacks.push(() => messagesRef.off("child_added", handleMessageAdded));
    cleanupCallbacks.push(() => messagesRef.off("child_changed", handleMessageChanged));
    cleanupCallbacks.push(() => messagesRef.off("child_removed", handleMessageRemoved));
    cleanupCallbacks.push(() => chat.remove());

    makeResizable(chat, resizeHandle);
    makeDraggable(chat, [resizeHandle]);
    resizeComposer();

    input.addEventListener("input", resizeComposer);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage().catch((error) => {
          console.error("Message send failed:", error);
        });
      }
    });
  });
}
