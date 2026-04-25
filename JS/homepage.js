

function createActionButton(label, variant = "primary") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `home-action-btn ui-interactive${
    variant === "secondary" ? " is-secondary" : ""
  }`;
  button.textContent = label;
  return button;
}

function createAdminPanel({ db, user }) {
  const adminOverlay = document.createElement("div");
  adminOverlay.className = "admin-modal";

  const adminPanel = document.createElement("div");
  adminPanel.className = "admin-panel";

  const title = document.createElement("div");
  title.className = "admin-panel__title";
  title.textContent = "Admin Panel - Firebase Realtime Database";

  const subtitle = document.createElement("div");
  subtitle.className = "admin-panel__subtitle";
  subtitle.textContent = `Signed in as ${user.uid}`;

  const message = document.createElement("div");
  message.className = "admin-panel__status";

  const pathLabel = document.createElement("label");
  pathLabel.className = "admin-panel__label";
  pathLabel.textContent =
    "Database path (example: accessRequests, users/uid123/approved):";

  const pathInput = document.createElement("input");
  pathInput.className = "admin-panel__input";
  pathInput.type = "text";
  pathInput.value = "accessRequests";

  const editor = document.createElement("textarea");
  editor.className = "admin-panel__editor";
  editor.placeholder = "JSON node value";

  const buttonRow = document.createElement("div");
  buttonRow.className = "admin-panel__actions";

  const requestsTitle = document.createElement("div");
  requestsTitle.className = "admin-panel__section-title";
  requestsTitle.textContent = "Verification Requests";

  const requestsWrap = document.createElement("div");
  requestsWrap.className = "admin-panel__requests";

  function setStatus(text, isError = false) {
    message.textContent = text;
    message.classList.toggle("is-error", isError);
  }

  function normalizePath() {
    return pathInput.value.trim().replace(/^\/+|\/+$/g, "");
  }

  function createPanelButton(label, variant = "default") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `admin-panel__button ui-interactive admin-panel__button--${variant}`;
    button.textContent = label;
    return button;
  }

  async function loadVerificationRequests() {
    requestsWrap.innerHTML = "";

    try {
      const snapshot = await db.ref("accessRequests").get();
      const requests = snapshot.val() || {};
      const userIds = Object.keys(requests);

      if (!userIds.length) {
        const emptyState = document.createElement("div");
        emptyState.className = "admin-panel__empty";
        emptyState.textContent = "No pending access requests.";
        requestsWrap.appendChild(emptyState);
        return;
      }

      for (const requestedUserId of userIds) {
        const request = requests[requestedUserId] || {};
        const item = document.createElement("div");
        item.className = "admin-request-item";

        const copy = document.createElement("div");
        copy.className = "admin-request-item__copy";
        copy.textContent = `${request.username || "Unknown"} (${requestedUserId})`;

        const actions = document.createElement("div");
        actions.className = "admin-request-item__actions";

        const approveButton = createPanelButton("Approve", "success");
        approveButton.onclick = async () => {
          try {
            await db.ref(`users/${requestedUserId}/approved`).set(true);
            await db.ref(`accessRequests/${requestedUserId}`).remove();
            setStatus(`Approved ${requestedUserId}`);
            await loadVerificationRequests();
          } catch (error) {
            setStatus(`Approve failed: ${error.message}`, true);
          }
        };

        const rejectButton = createPanelButton("Reject", "warning");
        rejectButton.onclick = async () => {
          try {
            await db.ref(`users/${requestedUserId}/approved`).set(false);
            await db.ref(`accessRequests/${requestedUserId}`).remove();
            setStatus(`Rejected ${requestedUserId}`);
            await loadVerificationRequests();
          } catch (error) {
            setStatus(`Reject failed: ${error.message}`, true);
          }
        };

        const deleteButton = createPanelButton("Delete Request", "danger");
        deleteButton.onclick = async () => {
          try {
            await db.ref(`accessRequests/${requestedUserId}`).remove();
            setStatus(`Deleted request for ${requestedUserId}`);
            await loadVerificationRequests();
          } catch (error) {
            setStatus(`Delete request failed: ${error.message}`, true);
          }
        };

        actions.appendChild(approveButton);
        actions.appendChild(rejectButton);
        actions.appendChild(deleteButton);
        item.appendChild(copy);
        item.appendChild(actions);
        requestsWrap.appendChild(item);
      }
    } catch (error) {
      setStatus(`Unable to load accessRequests: ${error.message}`, true);
    }
  }

  const loadButton = createPanelButton("Load Node", "info");
  loadButton.onclick = async () => {
    const path = normalizePath();
    if (!path) {
      setStatus("Enter a database path first.", true);
      return;
    }

    try {
      const snapshot = await db.ref(path).get();
      editor.value = JSON.stringify(snapshot.val(), null, 2);
      setStatus(`Loaded: /${path}`);
    } catch (error) {
      console.error("Admin load failed", error);
      setStatus(`Load failed for /${path}: ${error.message}`, true);
    }
  };

  const saveButton = createPanelButton("Save JSON", "success");
  saveButton.onclick = async () => {
    const path = normalizePath();
    if (!path) {
      setStatus("Enter a database path first.", true);
      return;
    }

    let payload;
    try {
      payload = editor.value.trim() ? JSON.parse(editor.value) : null;
    } catch (error) {
      setStatus(`Invalid JSON: ${error.message}`, true);
      return;
    }

    try {
      await db.ref(path).set(payload);
      setStatus(`Saved: /${path}`);
    } catch (error) {
      console.error("Admin save failed", error);
      setStatus(`Save failed for /${path}: ${error.message}`, true);
    }
  };

  const deleteNodeButton = createPanelButton("Delete Node", "danger");
  deleteNodeButton.onclick = async () => {
    const path = normalizePath();
    if (!path) {
      setStatus("Enter a database path first.", true);
      return;
    }

    if (!window.confirm(`Delete /${path}? This cannot be undone.`)) {
      return;
    }

    try {
      await db.ref(path).remove();
      editor.value = "";
      setStatus(`Deleted: /${path}`);
    } catch (error) {
      console.error("Admin delete failed", error);
      setStatus(`Delete failed for /${path}: ${error.message}`, true);
    }
  };

  const closeButton = createPanelButton("Close", "secondary");
  closeButton.onclick = () => adminOverlay.remove();

  const refreshRequestsButton = createPanelButton("Refresh Requests", "info");
  refreshRequestsButton.classList.add("admin-panel__refresh");
  refreshRequestsButton.onclick = loadVerificationRequests;

  buttonRow.appendChild(loadButton);
  buttonRow.appendChild(saveButton);
  buttonRow.appendChild(deleteNodeButton);
  buttonRow.appendChild(closeButton);

  adminPanel.appendChild(title);
  adminPanel.appendChild(subtitle);
  adminPanel.appendChild(message);
  adminPanel.appendChild(pathLabel);
  adminPanel.appendChild(pathInput);
  adminPanel.appendChild(editor);
  adminPanel.appendChild(buttonRow);
  adminPanel.appendChild(requestsTitle);
  adminPanel.appendChild(refreshRequestsButton);
  adminPanel.appendChild(requestsWrap);

  adminOverlay.appendChild(adminPanel);
  document.body.appendChild(adminOverlay);
  loadVerificationRequests();
  return adminOverlay;
}

export function showHomepage({
  state,
  db,
  ownerUid,
  themeOptions,
  saveUserThemePreference,
  showNotification,
  withWarpLoader,
}) {
  return new Promise((resolve) => {
    const cleanupCallbacks = [];
    const routeButtons = new Map();
    const routeViews = new Map();
    const canAccessAdminPanel = state.user?.uid === ownerUid;
    const currentUsername = state.username || state.user?.displayName || "Guest";
    let resolved = false;
    let approved = false;
    let hasPendingRequest = false;
    let adminOverlay = null;

    const icons = {
      home:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 4.2 3.8 11a1 1 0 1 0 1.3 1.5l.9-.8V19a1 1 0 0 0 1 1h4.5v-5h1v5H17a1 1 0 0 0 1-1v-7.3l.9.8a1 1 0 0 0 1.4-1.5L12 4.2Z"/></svg>',
      games:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.7 8h10.6a3.4 3.4 0 0 1 3.3 4.3l-1.4 5a3.4 3.4 0 0 1-5.4 1.8L12 17.7l-1.8 1.4a3.4 3.4 0 0 1-5.4-1.8l-1.4-5A3.4 3.4 0 0 1 6.7 8Zm-1 4.7 1.4 5c.2.7 1 1 1.6.5l2.3-1.7a1.7 1.7 0 0 1 2 0l2.3 1.7c.6.5 1.4.2 1.6-.5l1.4-5a1.7 1.7 0 0 0-1.6-2.2H6.7a1.7 1.7 0 0 0-1.6 2.2ZM9 12a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm6 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"/></svg>',
      settings:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m20.2 13.2 1.2-.7a1 1 0 0 0 .4-1.3l-1.2-2a1 1 0 0 0-1.2-.4l-1.3.5a7.5 7.5 0 0 0-1.2-.7l-.2-1.4a1 1 0 0 0-1-.9h-2.4a1 1 0 0 0-1 .9l-.2 1.4c-.4.2-.8.4-1.2.7l-1.3-.5a1 1 0 0 0-1.2.4l-1.2 2a1 1 0 0 0 .4 1.3l1.2.7v1.4l-1.2.7a1 1 0 0 0-.4 1.3l1.2 2a1 1 0 0 0 1.2.4l1.3-.5c.4.3.8.5 1.2.7l.2 1.4a1 1 0 0 0 1 .9h2.4a1 1 0 0 0 1-.9l.2-1.4c.4-.2.8-.4 1.2-.7l1.3.5a1 1 0 0 0 1.2-.4l1.2-2a1 1 0 0 0-.4-1.3l-1.2-.7v-1.4ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"/></svg>',
    };

    const homepage = document.createElement("div");
    homepage.id = "homepageOverlay";
    homepage.className = "home-overlay";
    document.body.appendChild(homepage);

    const header = document.createElement("header");
    header.className = "home-header";
    homepage.appendChild(header);

    const navShell = document.createElement("div");
    navShell.className = "home-nav-shell";
    header.appendChild(navShell);

    const brand = document.createElement("div");
    brand.className = "home-brand";
    brand.innerHTML =
      '<span class="home-brand-mark">EchoNet</span><span class="home-brand-subtitle">Control center</span>';
    navShell.appendChild(brand);

    const nav = document.createElement("nav");
    nav.className = "home-top-nav";
    nav.setAttribute("aria-label", "Main Navigation");
    navShell.appendChild(nav);

    const viewContainer = document.createElement("main");
    viewContainer.className = "home-view-container";
    homepage.appendChild(viewContainer);

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
          console.warn("Homepage cleanup failed:", error);
        }
      }
    }

    function removeHomepage() {
      runCleanup();
      if (homepage.parentNode) homepage.remove();
    }

    function closeHomepage(action) {
      removeHomepage();
      if (action) {
        resolveOnce(action);
      }
    }

    function createRouteView(config) {
      const view = document.createElement("section");
      view.className = "home-view";
      view.dataset.route = config.id;
      view.innerHTML = `
        <div class="home-view-heading">
          <span class="home-view-eyebrow">${config.kicker}</span>
          <h1 class="home-title">${config.title}</h1>
          <p class="home-subtitle">${config.description}</p>
        </div>
      `;

      routeViews.set(config.id, view);
      viewContainer.appendChild(view);
      return view;
    }

    function createNavButton(config) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "home-nav-btn ui-interactive";
      button.setAttribute("aria-label", config.label);
      button.title = `${config.label} · ${config.hint}`;
      button.innerHTML = `
        <span class="home-nav-surface" aria-hidden="true">
          <span class="home-nav-orbits">
            <span class="home-nav-orbit home-nav-orbit--outer"></span>
            <span class="home-nav-orbit home-nav-orbit--middle"></span>
            <span class="home-nav-orbit home-nav-orbit--inner"></span>
          </span>
          <span class="home-nav-core">
            <span class="home-nav-icon">${config.icon}</span>
          </span>
        </span>
        <span class="home-nav-copy">
          <span class="home-nav-label">${config.label}</span>
          <span class="home-nav-hint">${config.hint}</span>
        </span>
      `;
      button.onclick = () => setRoute(config.id);
      routeButtons.set(config.id, button);
      nav.appendChild(button);
      return button;
    }

    function triggerNavButtonAnimation(button) {
      window.clearTimeout(button._navAnimationTimer);
      button.classList.remove("is-animating");
      void button.offsetWidth;
      button.classList.add("is-animating");
      button._navAnimationTimer = window.setTimeout(() => {
        button.classList.remove("is-animating");
      }, 760);
    }

    function setRoute(routeId, { animate = true } = {}) {
      routeViews.forEach((view, id) => {
        view.classList.toggle("is-active", id === routeId);
      });

      routeButtons.forEach((button, id) => {
        const isCurrent = id === routeId;
        button.classList.toggle("is-active", isCurrent);
        button.setAttribute("aria-current", isCurrent ? "page" : "false");
        if (isCurrent && animate) {
          triggerNavButtonAnimation(button);
          return;
        }

        if (!isCurrent) {
          window.clearTimeout(button._navAnimationTimer);
          button.classList.remove("is-animating");
        }
      });
    }

    const routeConfigs = [
      {
        id: "home",
        label: "Home",
        hint: "Overview",
        kicker: "Workspace",
        title: `Welcome back, ${currentUsername}`,
        description:
          "Launch chat, review access, and manage your session from one clean control center.",
        icon: icons.home,
      },
      {
        id: "games",
        label: "Games",
        hint: "300 Games and more coming soon",
        kicker: "Games",
        title: "Games hub",
        description:
          "All of these games are ran locally. They are not possible to be blocked!",
        icon: icons.games,
      },
      {
        id: "settings",
        label: "Settings",
        hint: "Customize",
        kicker: "Preferences",
        title: "Settings",
        description:
          "Theme controls live here now, with room to expand into a fuller settings experience as the project grows.",
        icon: icons.settings,
      },
    ];

    routeConfigs.forEach((config) => {
      createRouteView(config);
      createNavButton(config);
    });

    const homeView = routeViews.get("home");
    const gamesView = routeViews.get("games");
    const settingsView = routeViews.get("settings");

    const homeHero = document.createElement("section");
    homeHero.className = "home-hero";
    homeView.appendChild(homeHero);

    const homeHeroCard = document.createElement("div");
    homeHeroCard.className = "home-card home-card-hero";
    homeHero.appendChild(homeHeroCard);

    const heroLabel = document.createElement("span");
    heroLabel.className = "home-chip";
    heroLabel.textContent = "Live session";
    homeHeroCard.appendChild(heroLabel);

    const heroTitle = document.createElement("h2");
    heroTitle.className = "home-card-title";
    heroTitle.textContent = "Global Chat.";
    homeHeroCard.appendChild(heroTitle);

    const heroText = document.createElement("p");
    heroText.className = "home-card-text";
    heroText.textContent =
      "Use the navigation rail on the left to move between pages.";
    homeHeroCard.appendChild(heroText);

    const launchWrap = document.createElement("div");
    launchWrap.className = "home-launch-row";
    homeHeroCard.appendChild(launchWrap);

    const launchButton = document.createElement("button");
    launchButton.type = "button";
    launchButton.className = "cyber-btn ui-interactive";
    launchButton.textContent = "Launch Chat";
    launchWrap.appendChild(launchButton);

    const tooltip = document.createElement("div");
    tooltip.className = "cyber-tooltip";
    launchWrap.appendChild(tooltip);

    const statusCard = document.createElement("div");
    statusCard.className = "home-card home-card-status";
    homeHero.appendChild(statusCard);

    const statusLabel = document.createElement("span");
    statusLabel.className = "home-chip is-secondary";
    statusLabel.textContent = "Access";
    statusCard.appendChild(statusLabel);

    const statusTitle = document.createElement("h3");
    statusTitle.className = "home-card-title";
    statusTitle.textContent = "Chat approval";
    statusCard.appendChild(statusTitle);

    const approvalBadge = document.createElement("div");
    approvalBadge.className = "home-status-badge";
    statusCard.appendChild(approvalBadge);

    const statusCopy = document.createElement("p");
    statusCopy.className = "home-card-text";
    statusCard.appendChild(statusCopy);

    const actionsSection = document.createElement("section");
    actionsSection.className = "home-section-grid";
    homeView.appendChild(actionsSection);

    const actionsCard = document.createElement("div");
    actionsCard.className = "home-card";
    actionsSection.appendChild(actionsCard);

    const actionsTitle = document.createElement("h2");
    actionsTitle.className = "home-card-title";
    actionsTitle.textContent = "Quick actions";
    actionsCard.appendChild(actionsTitle);

    const actionsText = document.createElement("p");
    actionsText.className = "home-card-text";
    actionsText.textContent =
      "Common actions grouped together for your convenience. More features will be added in the future.";
    actionsCard.appendChild(actionsText);

    const homeActions = document.createElement("div");
    homeActions.className = "home-actions-row";
    actionsCard.appendChild(homeActions);

    const reloginButton = createActionButton("Back to Login", "secondary");
    reloginButton.onclick = () => closeHomepage("relogin");
    homeActions.appendChild(reloginButton);

    if (canAccessAdminPanel) {
      const adminButton = createActionButton("Admin Panel");
      adminButton.onclick = () => {
        if (adminOverlay?.parentNode) {
          adminOverlay.remove();
        }

        adminOverlay = createAdminPanel({ db, user: state.user });
      };
      homeActions.appendChild(adminButton);
    }

    const roadmapCard = document.createElement("div");
    roadmapCard.className = "home-card";
    actionsSection.appendChild(roadmapCard);

    const roadmapTitle = document.createElement("h2");
    roadmapTitle.className = "home-card-title";
    roadmapTitle.textContent = "Scalable layout";
    roadmapCard.appendChild(roadmapTitle);

    const roadmapText = document.createElement("p");
    roadmapText.className = "home-card-text";
    roadmapText.textContent =
      "Navigation and page views now come from shared route definitions, so adding new sections can stay lightweight and predictable.";
    roadmapCard.appendChild(roadmapText);

    const routeList = document.createElement("div");
    routeList.className = "home-route-list";
    roadmapCard.appendChild(routeList);

    routeConfigs.forEach((config) => {
      const item = document.createElement("div");
      item.className = "home-route-item";
      item.innerHTML = `
        <span class="home-route-item-title">${config.label}</span>
        <span class="home-route-item-copy">${config.description}</span>
      `;
      routeList.appendChild(item);
    });

    function applyLaunchState() {
      tooltip.innerHTML = `
        <div class="corner-tl"></div>
        <div class="corner-tr"></div>
        <div class="corner-bl"></div>
        <div class="corner-br"></div>
        <strong>SYSTEM READY</strong><br>
        User Credentials Verified: Yes<br>
        User Approved For Chat: ${approved ? "Yes" : "No"}
      `;

      approvalBadge.textContent = approved ? "Approved" : "Pending approval";
      approvalBadge.classList.toggle("is-approved", approved);

      statusCopy.textContent = approved
        ? "Access is active. Launching chat will open immediately."
        : hasPendingRequest
          ? "Approval is pending. Launch will become available as soon as access is approved."
          : "Approval is still pending. Launching chat will send or reuse your access request.";

      launchButton.textContent = approved
        ? "Launch Chat"
        : hasPendingRequest
          ? "Approval Pending"
          : "Launch Chat";
      launchButton.disabled = !approved && hasPendingRequest;
    }

    const approvalRef = db.ref(`users/${state.user.uid}/approved`);
    const requestRef = db.ref(`accessRequests/${state.user.uid}`);

    const handleApprovalChange = (snapshot) => {
      approved = snapshot.val() === true;
      applyLaunchState();
    };

    const handleRequestChange = (snapshot) => {
      hasPendingRequest = snapshot.exists();
      applyLaunchState();
    };

    approvalRef.on("value", handleApprovalChange);
    requestRef.on("value", handleRequestChange);

    cleanupCallbacks.push(() => approvalRef.off("value", handleApprovalChange));
    cleanupCallbacks.push(() => requestRef.off("value", handleRequestChange));
    cleanupCallbacks.push(() => {
      if (adminOverlay?.parentNode) {
        adminOverlay.remove();
      }
    });
    cleanupCallbacks.push(() => {
      routeButtons.forEach((button) => {
        window.clearTimeout(button._navAnimationTimer);
      });
    });

    Promise.all([approvalRef.get(), requestRef.get()])
      .then(([approvalSnapshot, requestSnapshot]) => {
        approved = approvalSnapshot.val() === true;
        hasPendingRequest = requestSnapshot.exists();
        applyLaunchState();
      })
      .catch((error) => {
        console.warn("Unable to load access status:", error);
        applyLaunchState();
      });

    launchButton.onclick = async () => {
      await withWarpLoader(async () => {
        const userId = state.user.uid;
        const [userSnapshot, requestSnapshot] = await Promise.all([
          db.ref(`users/${userId}`).get(),
          db.ref(`accessRequests/${userId}`).get(),
        ]);

        const userData = userSnapshot.val() || {};
        approved = userData.approved === true;
        hasPendingRequest = requestSnapshot.exists();
        applyLaunchState();

        if (approved) {
          closeHomepage("launch");
          return;
        }

        if (hasPendingRequest) {
          showNotification("Approval request already sent.", "info", 2200);
          return;
        }

        await db.ref(`accessRequests/${userId}`).set({
          username: userData.username || currentUsername,
          timestamp: Date.now(),
        });

        hasPendingRequest = true;
        applyLaunchState();
        showNotification("Access request sent.", "info", 2200);
      }, 500);
    };

    // ── Games tab ──────────────────────────────────────────────────────
    const GAME_FILES = [
      "10minutestilldawn.html", "12minibattles.html", "1on1soccer.html", "1on1tennis.html", "1v1.lol.html", "2048.html", "2048cupcakes.html", "3Dflightsimulator.html", "8ballclassic.html", "agariolite.html", "ageofwar.html", "ageofwar2.html", "agesofconflict.html", "Alpha_1.2.6.html", "amongus.html", "angrybirds.html", "angrybirdsshowdown.html", "angrybirdsspace.html", "awesometanks.html", "awesometanks2.html", "backrooms.html", "baconmaydie.html", "badicecream.html", "badicecream2.html", "badicecream3.html", "badparenting.html", "badpiggies.html", "baldisbasics.html", "baseballbros.html", "basketballlegends.html", "basketballstars.html", "basketbros.html", "basketrandom.html", "Beta_1.3.html", "bitlife.html", "bitplanes.html", "blockysnakes.html", "bloonsTD.html", "bloonsTD2.html", "bloonsTD3.html", "bloonsTD4.html", "bloonsTD5.html", "bloxorz.html", "blumgiracers.html", "blumgirocket.html", "bobtherobber.html", "bobtherobber2.html", "bobtherobber5.html", "bouncymotors.html", "bowmasters.html", "boxingrandom.html", "breakingthebank.html", "bubbleshooter.html", "candycrush.html", "capybaraclicker.html", "cardrawing.html", "carkingarena.html", "chess.html", "choppyorc.html", "circloO.html", "circloO2.html", "clashofvikings.html", "cleanupio.html", "clusterrush.html", "cookieclicker.html", "crazycars.html", "crazycattle3D.html", "crazycrashlanding.html", "crazymotorcycle.html", "crossyroad.html", "cuttherope.html", "dadish.html", "dadish2.html", "dadish3.html", "deathchase.html", "deathrun3D.html", "demolitionderbycrashracing.html", "doodlejump.html", "drawclimber.html", "dreadheadparkour.html", "driftboss.html", "drivemad.html", "ducklife.html", "ducklife2.html", "ducklife3.html", "ducklife4.html", "ducklife5.html", "ducklingsio.html", "eagleride.html", "earntodie.html", "earntodie2.html", "eggycar.html", "elasticface.html", "escaperoad.html", "escaperoad2.html", "escapingtheprison.html", "evilglitch.html", "fancypantsadventure.html", "fancypantsadventure2.html", "fireboyandwatergirl.html", "fireboyandwatergirl2.html", "fireboyandwatergirl3.html", "fireboyandwatergirl4.html", "flappybird.html", "floodrunner2.html", "floodrunner3.html", "floodrunner4.html", "fnaf.html", "fnaf2.html", "fnaf3.html", "fnaf4.html", "footballbros.html", "footballlegends.html", "freerider3.html", "fruitninja.html", "funnybattle.html", "funnybattle2.html", "funnymadracing.html", "funnyshooter2.html", "geometrydash.html", "geometrydashlite.html", "geometryvibes.html", "getawayshootout.html", "getontop.html", "gladihoppers.html", "googlebaseball.html", "googledino.html", "granny.html", "granny2.html", "guesstheiranswer.html", "hanger2.html", "happywheels.html", "helixjump.html", "highwaytraffic.html", "hillclimbracinglite.html", "holeio.html", "houseofhazards.html", "hoverracerdrive.html", "idlebreakout.html", "Indev.html", "ironsnout.html", "jetpackjoyride.html", "johnnytrigger.html", "jumpingshell.html", "karatebros.html", "kartbros.html", "learntofly.html", "learntofly2.html", "learntofly3.html", "learntoflyidle.html", "leveldevil.html", "madalinstuntcars2.html", "MC_1.12.html", "MC_1.5.html", "MC_1.8.html", "melonplayground.html", "mergeroundracers.html", "minesweeper.html", "monkeymart.html", "monstertracks.html", "motox3m.html", "motox3m2.html", "motox3m3.html", "motox3mpoolparty.html", "motox3mspookyland.html", "motox3mwinter.html", "noobminer.html", "oppositeday.html", "ovo.html", "ovo2.html", "ovo3dimensions.html", "pacman.html", "papasbakeria.html", "papasburgeria.html", "papascheeseria.html", "papascupcakeria.html", "papasdonuteria.html", "papasfreezeria.html", "papashotdoggeria.html", "papaspancakeria.html", "papaspastaria.html", "papaspizzeria.html", "papasscooperia.html", "papassushiria.html", "papastacomia.html", "papaswingeria.html", "paperio2.html", "parkingfury.html", "parkingfury2.html", "parkingfury3.html", "picosschool.html", "pingpongchaos.html", "pixelspeedrun.html", "plantsvszombies.html", "plonky.html", "polytrack.html", "poorbunny.html", "pou.html", "ragdollarchers.html", "ragdollhit.html", "ragdollsoccer.html", "redball4vol1.html", "redball4vol2.html", "redball4vol3.html", "retrobowl.html", "retrobowlcollege.html", "retrohighway.html", "retropingpong.html", "riddleschool.html", "riddleschool2.html", "riddleschool3.html", "riddleschool4.html", "riddleschool5.html", "riddletransfer.html", "riddletransfer2.html", "rocketsoccerderby.html", "rooftopsnipers.html", "rooftopsnipers2.html", "run.html", "run2.html", "run3.html", "sandgame.html", "shortlife.html", "slope.html", "slope2player.html", "slope3.html", "slowroads.html", "sm63.html", "sm64.html", "snowballio.html", "snowrider.html", "snowroad.html", "soccerbros.html", "soccerrandom.html", "spacebarclicker.html", "spaceiskey.html", "spaceiskey2.html", "spacewaves.html", "speedstars.html", "sprunki.html", "stack.html", "stacktris.html", "stateio.html", "stickarchersbattle.html", "stickfighter.html", "stickmanhook.html", "stickmerge.html", "subwaysurfersbeijing.html", "subwaysurfershavana.html", "subwaysurferssanfrancisco.html", "superbikethechampion.html", "superhot.html", "superliquidsoccer.html", "superstarcar.html", "tabletennisworldtour.html", "tag.html", "taproad.html", "templeofboom.html", "templerun2.html", "territorialio.html", "theimpossiblequiz.html", "theimpossiblequiz2.html", "thereisnog.html", "theyarecoming.html", "thisistheonlylevel.html", "thisistheonlyleveltoo.html", "timeshooter2.html", "timeshooter3.html", "tinyfishing.html", "tombofthemask.html", "trapthecat.html", "triviacrack.html", "tubejumpers.html", "tunnelrush.html", "unicyclehero.html", "vex4.html", "vex5.html", "vex6.html", "vex7.html", "vex8.html", "vexx3m.html", "vexx3m2.html", "volleyrandom.html", "wartheknights.html", "webecomewhatwebehold.html", "wheeliebike.html", "wheely.html", "wheely2.html", "wheely3.html", "wheely4.html", "wheely5.html", "wheely6.html", "wheely7.html", "wheely8.html", "wordleunlimited.html", "worldshardestgame.html", "worldshardestgame2.html", "worldshardestgame3.html", "wrestlebros.html", "zombierush.html"
    ];


    /** Turn a filename like "motox3mspookyland.html" into "Moto X3M Spookyland" */
    function prettifyGameName(filename) {
      const CUSTOM_NAMES = {
        "1v1.lol.html": "1v1.LOL",
        "2048.html": "2048",
        "2048cupcakes.html": "2048 Cupcakes",
        "3Dflightsimulator.html": "3D Flight Simulator",
        "8ballclassic.html": "8 Ball Classic",
        "10minutestilldawn.html": "10 Minutes Till Dawn",
        "12minibattles.html": "12 Mini Battles",
        "1on1soccer.html": "1 on 1 Soccer",
        "1on1tennis.html": "1 on 1 Tennis",
        "Alpha_1.2.6.html": "Minecraft Alpha 1.2.6",
        "Beta_1.3.html": "Minecraft Beta 1.3",
        "Indev.html": "Minecraft Indev",
        "MC_1.12.html": "Minecraft 1.12",
        "MC_1.5.html": "Minecraft 1.5",
        "MC_1.8.html": "Minecraft 1.8",
        "sm63.html": "Super Mario 63",
        "sm64.html": "Super Mario 64",
        "fnaf.html": "Five Nights at Freddy's",
        "fnaf2.html": "Five Nights at Freddy's 2",
        "fnaf3.html": "Five Nights at Freddy's 3",
        "fnaf4.html": "Five Nights at Freddy's 4",
        "bloonsTD.html": "Bloons TD",
        "bloonsTD2.html": "Bloons TD 2",
        "bloonsTD3.html": "Bloons TD 3",
        "bloonsTD4.html": "Bloons TD 4",
        "bloonsTD5.html": "Bloons TD 5",
        "ovo.html": "OvO",
        "ovo2.html": "OvO 2",
        "ovo3dimensions.html": "OvO 3 Dimensions",
        "motox3m.html": "Moto X3M",
        "motox3m2.html": "Moto X3M 2",
        "motox3m3.html": "Moto X3M 3",
        "motox3mpoolparty.html": "Moto X3M Pool Party",
        "motox3mspookyland.html": "Moto X3M Spookyland",
        "motox3mwinter.html": "Moto X3M Winter",
        "vexx3m.html": "Vex X3M",
        "vexx3m2.html": "Vex X3M 2",
        "circloO.html": "CircloO",
        "circloO2.html": "CircloO 2",
        "holeio.html": "Hole.io",
        "paperio2.html": "Paper.io 2",
        "agariolite.html": "Agar.io Lite",
        "cleanupio.html": "Cleanup.io",
        "snowballio.html": "Snowball.io",
        "ducklingsio.html": "Ducklings.io",
        "stateio.html": "State.io",
        "territorialio.html": "Territorial.io",
        "crazycattle3D.html": "Crazy Cattle 3D",
        "deathrun3D.html": "Deathrun 3D",
        "thereisnog.html": "There Is No G",
        "googledino.html": "Google Dino",
        "googlebaseball.html": "Google Baseball",
      };

      if (CUSTOM_NAMES[filename]) return CUSTOM_NAMES[filename];

      let name = filename.replace(/\.html$/, "");
      // Split on transitions: lowercase→uppercase, letter→digit, digit→letter
      name = name.replace(/([a-z])([A-Z])/g, "$1 $2");
      name = name.replace(/([a-zA-Z])(\d)/g, "$1 $2");
      name = name.replace(/(\d)([a-zA-Z])/g, "$1 $2");
      // Capitalise first letter of each word
      name = name.replace(/\b\w/g, (c) => c.toUpperCase());
      return name;
    }

    const games = GAME_FILES.map((file) => ({
      file,
      title: prettifyGameName(file),
    })).sort((a, b) => a.title.localeCompare(b.title));

    // Search bar
    const gamesToolbar = document.createElement("div");
    gamesToolbar.className = "games-toolbar";

    const gamesCount = document.createElement("span");
    gamesCount.className = "games-count";
    gamesCount.textContent = `${games.length} games`;
    gamesToolbar.appendChild(gamesCount);

    const searchWrap = document.createElement("div");
    searchWrap.className = "games-search-wrap";

    const searchIcon = document.createElement("span");
    searchIcon.className = "games-search-icon";
    searchIcon.innerHTML =
      '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14Z"/></svg>';
    searchWrap.appendChild(searchIcon);

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.className = "games-search";
    searchInput.placeholder = "Search games…";
    searchInput.id = "gamesSearchInput";
    searchWrap.appendChild(searchInput);
    gamesToolbar.appendChild(searchWrap);

    gamesView.appendChild(gamesToolbar);

    // Game grid
    const gamesGrid = document.createElement("div");
    gamesGrid.className = "games-grid";
    gamesView.appendChild(gamesGrid);

    const noResults = document.createElement("div");
    noResults.className = "games-no-results";
    noResults.textContent = "No games match your search.";

    function renderGameCards(filter = "") {
      gamesGrid.innerHTML = "";
      const query = filter.toLowerCase().trim();
      const filtered = query
        ? games.filter((g) => g.title.toLowerCase().includes(query))
        : games;

      if (!filtered.length) {
        gamesGrid.appendChild(noResults);
        gamesCount.textContent = "0 games";
        return;
      }

      gamesCount.textContent =
        filtered.length === games.length
          ? `${games.length} games`
          : `${filtered.length} of ${games.length} games`;

      for (const game of filtered) {
        const card = document.createElement("div");
        card.className = "game-card";

        const title = document.createElement("span");
        title.className = "game-card-title";
        title.textContent = game.title;
        card.appendChild(title);

        const launchBtn = document.createElement("button");
        launchBtn.type = "button";
        launchBtn.className = "game-launch-btn ui-interactive";
        launchBtn.textContent = "Launch";
        launchBtn.onclick = () => openGameEmbed(game);
        card.appendChild(launchBtn);

        gamesGrid.appendChild(card);
      }
    }

    searchInput.addEventListener("input", () => renderGameCards(searchInput.value));
    renderGameCards();

    // Fullscreen game embed overlay
    function openGameEmbed(game) {
      const overlay = document.createElement("div");
      overlay.className = "game-embed-overlay";

      const toolbar = document.createElement("div");
      toolbar.className = "game-embed-toolbar";

      // Left section
      const leftSection = document.createElement("div");
      leftSection.className = "game-embed-toolbar-section";
      
      const backBtn = document.createElement("button");
      backBtn.type = "button";
      backBtn.className = "game-embed-btn ui-interactive";
      backBtn.innerHTML =
        '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M19 11H7.83l4.88-4.88a1 1 0 1 0-1.42-1.42l-6.59 6.59a1 1 0 0 0 0 1.42l6.59 6.59a1 1 0 0 0 1.42-1.42L7.83 13H19a1 1 0 0 0 0-2Z"/></svg>' +
        '<span>Back to Games</span>';
      backBtn.onclick = () => overlay.remove();
      leftSection.appendChild(backBtn);

      // Center section (Title)
      const centerSection = document.createElement("div");
      centerSection.className = "game-embed-toolbar-section is-center";
      const titleEl = document.createElement("span");
      titleEl.className = "game-embed-title";
      titleEl.textContent = game.title;
      centerSection.appendChild(titleEl);

      // Right section
      const rightSection = document.createElement("div");
      rightSection.className = "game-embed-toolbar-section";
      
      const fullscreenBtn = document.createElement("button");
      fullscreenBtn.type = "button";
      fullscreenBtn.className = "game-embed-btn is-icon-only ui-interactive";
      fullscreenBtn.title = "Toggle Fullscreen";
      fullscreenBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M7 14H5v5h5v-2H7v-3Zm-2-4h2V7h3V5H5v5Zm12 7h-3v2h5v-5h-2v3ZM14 5v2h3v3h2V5h-5Z"/></svg>';
      fullscreenBtn.onclick = () => {
        if (!document.fullscreenElement) {
          overlay.requestFullscreen().catch(err => {
            console.warn(`Error attempting to enable fullscreen: ${err.message}`);
          });
        } else {
          document.exitFullscreen();
        }
      };
      rightSection.appendChild(fullscreenBtn);

      toolbar.appendChild(leftSection);
      toolbar.appendChild(centerSection);
      toolbar.appendChild(rightSection);

      const loader = document.createElement("div");
      loader.className = "game-loader-overlay";
      loader.innerHTML = `
        <div class="game-loader-content">
          <div class="game-loader-spinner"></div>
          <div class="game-loader-text">Loading ${game.title}...</div>
        </div>
      `;

      const iframe = document.createElement("iframe");
      iframe.className = "game-embed-frame";
      iframe.setAttribute("allowfullscreen", "true");
      iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups");
      
      iframe.onload = () => {
        loader.classList.add("is-hidden");
        setTimeout(() => loader.remove(), 400);
      };

      overlay.appendChild(toolbar);
      overlay.appendChild(loader);
      overlay.appendChild(iframe);
      document.body.appendChild(overlay);

      // Start loading the game directly
      iframe.src = `Games/${game.file}`;

      // ESC to close
      const onKey = (e) => {
        if (e.key === "Escape") {
          // If we're in native fullscreen, let the browser handle exiting it first.
          if (document.fullscreenElement) return;
          
          overlay.remove();
          window.removeEventListener("keydown", onKey);
        }
      };
      window.addEventListener("keydown", onKey);
      cleanupCallbacks.push(() => {
        window.removeEventListener("keydown", onKey);
        if (overlay.parentNode) overlay.remove();
      });
    }

    const settingsPanel = document.createElement("div");
    settingsPanel.className = "home-card home-settings-panel";
    settingsView.appendChild(settingsPanel);

    const settingsTitle = document.createElement("h2");
    settingsTitle.className = "home-card-title";
    settingsTitle.textContent = "Theme";
    settingsPanel.appendChild(settingsTitle);

    const settingsHint = document.createElement("p");
    settingsHint.className = "home-card-text";
    settingsHint.textContent =
      "Theme controls are isolated here so future preferences can grow without crowding the homepage.";
    settingsPanel.appendChild(settingsHint);

    const themeLabel = document.createElement("label");
    themeLabel.className = "home-settings-label";
    themeLabel.setAttribute("for", "inlineThemeSelect");
    themeLabel.textContent = "Theme";
    settingsPanel.appendChild(themeLabel);

    const themeSelect = document.createElement("select");
    themeSelect.id = "inlineThemeSelect";
    themeSelect.className = "home-settings-select ui-interactive";
    themeOptions.forEach((theme) => {
      const option = document.createElement("option");
      option.value = theme.id;
      option.textContent = theme.label;
      themeSelect.appendChild(option);
    });
    themeSelect.value = state.userThemeId;
    themeSelect.onchange = async () => {
      const result = await saveUserThemePreference(themeSelect.value);
      if (result.persisted) {
        showNotification(`${result.selectedTheme.label} theme saved.`, "success", 2200);
        return;
      }

      showNotification(
        `${result.selectedTheme.label} theme applied, but profile sync failed.`,
        "warning",
        2600,
      );
    };
    settingsPanel.appendChild(themeSelect);

    setRoute("home", { animate: false });
  });
}
