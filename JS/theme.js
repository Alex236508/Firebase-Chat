export function createThemeManager(themeOptions) {
  const defaultThemeId = themeOptions[0].id;
  let activeThemeId = defaultThemeId;

  function getThemeOptionById(themeId) {
    return themeOptions.find((theme) => theme.id === themeId) || themeOptions[0];
  }

  function applyThemeValues(themeValues) {
    Object.entries(themeValues).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
  }

  function applyThemeById(themeId) {
    const selectedTheme = getThemeOptionById(themeId);
    activeThemeId = selectedTheme.id;
    applyThemeValues(selectedTheme.values);
    return selectedTheme;
  }

  applyThemeById(defaultThemeId);

  return {
    themeOptions,
    getActiveThemeId: () => activeThemeId,
    getDefaultThemeId: () => defaultThemeId,
    getThemeOptionById,
    applyThemeById,
  };
}

export async function loadUserThemePreference({ db, state, themeManager }) {
  if (!state.user?.uid) {
    state.userThemeId = themeManager.getDefaultThemeId();
    themeManager.applyThemeById(state.userThemeId);
    return state.userThemeId;
  }

  try {
    const themeSnap = await db.ref(`users/${state.user.uid}/theme`).get();
    const nextThemeId = themeSnap.exists()
      ? String(themeSnap.val())
      : themeManager.getDefaultThemeId();

    state.userThemeId = themeManager.getThemeOptionById(nextThemeId).id;
  } catch (error) {
    console.warn("Unable to load user theme preference:", error);
    state.userThemeId = themeManager.getDefaultThemeId();
  }

  themeManager.applyThemeById(state.userThemeId);
  return state.userThemeId;
}

export async function saveUserThemePreference(
  { db, state, themeManager },
  themeId,
) {
  const selectedTheme = themeManager.applyThemeById(themeId);
  state.userThemeId = selectedTheme.id;

  if (!state.user?.uid) {
    return {
      selectedTheme,
      persisted: false,
    };
  }

  try {
    await db.ref(`users/${state.user.uid}/theme`).set(selectedTheme.id);
  } catch (error) {
    console.error("Unable to save theme preference:", error);
    return {
      selectedTheme,
      persisted: false,
    };
  }

  return {
    selectedTheme,
    persisted: true,
  };
}
