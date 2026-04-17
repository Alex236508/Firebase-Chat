import { MAX_USERNAME_LENGTH } from "./config.js";
import { sanitizeInput } from "./validation.js";

function initWarpLoaderAnimation(overlay) {
  const canvas = overlay.querySelector("#warp-loader-canvas");
  if (!canvas || canvas.dataset.warpLoaderInit) return () => {};

  const context = canvas.getContext("2d");
  if (!context) return () => {};

  canvas.dataset.warpLoaderInit = "true";

  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const particles = [];
  const particleCount = 40;
  const maxRadius = 70;

  for (let index = 0; index < particleCount; index += 1) {
    particles.push({
      angle: Math.random() * Math.PI * 2,
      radius: Math.random() * maxRadius * 0.6 + maxRadius * 0.3,
      speed:
        (Math.random() * 0.02 + 0.01) * (Math.random() < 0.5 ? -1 : 1),
      size: Math.random() * 3 + 1,
    });
  }

  function drawGlowCircle(x, y, radius, color) {
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "transparent");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  let scanAngle = 0;
  let frameId = 0;

  const animate = () => {
    if (!document.body.contains(overlay)) return;

    context.clearRect(0, 0, width, height);
    drawGlowCircle(centerX, centerY, 12, "#00e5ff");

    particles.forEach((particle) => {
      const x = centerX + Math.cos(particle.angle) * particle.radius;
      const y = centerY + Math.sin(particle.angle) * particle.radius;
      drawGlowCircle(x, y, particle.size, "#00e5ff");
      particle.angle += particle.speed;
    });

    scanAngle += 0.02;
    context.save();
    context.translate(centerX, centerY);
    context.rotate(scanAngle);
    const scanGradient = context.createLinearGradient(
      -maxRadius,
      -1,
      maxRadius,
      1,
    );
    scanGradient.addColorStop(0, "transparent");
    scanGradient.addColorStop(0.5, "rgba(0,255,255,0.3)");
    scanGradient.addColorStop(1, "transparent");
    context.fillStyle = scanGradient;
    context.fillRect(-maxRadius, -2, maxRadius * 2, 4);
    context.restore();

    context.globalAlpha = 0.85 + Math.random() * 0.15;
    frameId = requestAnimationFrame(animate);
  };

  animate();

  return () => {
    if (frameId) cancelAnimationFrame(frameId);
  };
}

export function showWarpLoader() {
  const existing = document.getElementById("warp-loader-overlay");
  if (existing) {
    existing.style.opacity = "1";
    const cleanupAnimation = initWarpLoaderAnimation(existing);

    return () => {
      existing.style.transition = "opacity 0.5s ease";
      existing.style.opacity = "0";
      window.setTimeout(() => existing.remove(), 300);
      cleanupAnimation();
    };
  }

  const overlay = document.createElement("div");
  overlay.id = "warp-loader-overlay";
  overlay.innerHTML = `
    <canvas id="warp-loader-canvas" width="200" height="200"></canvas>
    <div id="loader-text">
      > Loading<span class="dots">.</span>
    </div>
  `;

  document.body.appendChild(overlay);
  const cleanupAnimation = initWarpLoaderAnimation(overlay);

  return () => {
    overlay.style.transition = "opacity 0.5s ease";
    overlay.style.opacity = "0";
    window.setTimeout(() => overlay.remove(), 300);
    cleanupAnimation();
  };
}

export async function withWarpLoader(action, minimumMs = 3000) {
  const hideLoader = showWarpLoader();
  const startTime = Date.now();

  try {
    return await action();
  } finally {
    const elapsed = Date.now() - startTime;
    if (elapsed < minimumMs) {
      await new Promise((resolve) => {
        window.setTimeout(resolve, minimumMs - elapsed);
      });
    }
    hideLoader();
  }
}

export function showAuthDialog() {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "auth-overlay";

    const wrapper = document.createElement("div");
    wrapper.className = "glitch-form-wrapper";
    wrapper.innerHTML = `
      <div class="glitch-card">
        <div class="card-header">
          <div class="card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 1l3.09 6.26L22 8.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 13.14l-5-4.87 6.91-1.01L12 1z"></path>
            </svg>
            AUTHENTICATION
          </div>
          <div class="card-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
        <div class="card-body">
          <div class="form-group">
            <input id="authUsername" type="text" placeholder=" " maxlength="${MAX_USERNAME_LENGTH}" autocomplete="username">
            <label class="form-label" data-text="Username">Username</label>
          </div>
          <div class="form-group">
            <input id="authPassword" type="password" placeholder=" " autocomplete="current-password">
            <label class="form-label" data-text="Password">Password</label>
          </div>
          <button class="submit-btn" id="primaryBtn" data-text="Verify Access">
            <span class="btn-text">Verify Access</span>
          </button>
          <button class="submit-btn" id="toggleBtn" data-text="Create Account">
            <span class="btn-text">Create Account</span>
          </button>
          <button class="submit-btn" id="cancelBtn" data-text="Cancel">
            <span class="btn-text">Cancel</span>
          </button>
        </div>
      </div>
    `;

    overlay.appendChild(wrapper);
    document.body.appendChild(overlay);

    const usernameInput = wrapper.querySelector("#authUsername");
    const passwordInput = wrapper.querySelector("#authPassword");
    const primaryButton = wrapper.querySelector("#primaryBtn");
    const toggleButton = wrapper.querySelector("#toggleBtn");
    const cancelButton = wrapper.querySelector("#cancelBtn");

    let mode = "login";

    function render() {
      if (mode === "login") {
        primaryButton.dataset.text = "Verify Access";
        primaryButton.querySelector(".btn-text").textContent = "Verify Access";
        toggleButton.dataset.text = "Create Account";
        toggleButton.querySelector(".btn-text").textContent = "Create Account";
        passwordInput.autocomplete = "current-password";
        return;
      }

      primaryButton.dataset.text = "Create Account";
      primaryButton.querySelector(".btn-text").textContent = "Create Account";
      toggleButton.dataset.text = "Back to Login";
      toggleButton.querySelector(".btn-text").textContent = "Back to Login";
      passwordInput.autocomplete = "new-password";
    }

    function cleanup(value) {
      overlay.remove();
      resolve(value);
    }

    primaryButton.onclick = () => {
      cleanup({
        mode,
        username: sanitizeInput(usernameInput.value),
        password: passwordInput.value,
      });
    };

    toggleButton.onclick = () => {
      mode = mode === "login" ? "create" : "login";
      render();
    };

    cancelButton.onclick = () => cleanup(null);

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        cleanup(null);
      }
    });

    wrapper.addEventListener("keydown", (event) => {
      if (event.key === "Enter") primaryButton.click();
      if (event.key === "Escape") cleanup(null);
    });

    render();
    usernameInput.focus();
  });
}
