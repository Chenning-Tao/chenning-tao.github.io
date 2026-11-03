(() => {
  "use strict";

  const storageKey = "chenning-tao-language";
  const root = document.documentElement;
  let language = "en";

  // Default to English, not the browser locale. Storage is optional.
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (saved === "en" || saved === "zh") language = saved;
  } catch (_) {
    // Private/restricted browsers can still switch language for the current page.
  }

  // Only the retired /zh/ bookmark uses a query parameter to reach this same page.
  const url = new URL(window.location.href);
  const requested = url.searchParams.get("lang");
  if (requested === "en" || requested === "zh") {
    language = requested;
    try {
      window.localStorage.setItem(storageKey, language);
    } catch (_) {
      // Continue in the requested language even if persistence is blocked.
    }
    url.searchParams.delete("lang");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }

  function applyLanguage() {
    root.dataset.siteLanguage = language;
    root.lang = language === "zh" ? "zh-CN" : "en";

    document.querySelectorAll("[data-set-language]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.setLanguage === language));
    });
    document.querySelectorAll("[data-language-attribute]").forEach((element) => {
      element.setAttribute(element.dataset.languageAttribute, element.dataset[language === "zh" ? "languageZh" : "languageEn"]);
    });
  }

  // This script runs in the head so CSS can select the right text before paint.
  applyLanguage();

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".language-switch").forEach((control) => {
      control.hidden = false;
      control.addEventListener("click", (event) => {
        const button = event.target.closest("[data-set-language]");
        if (!button) return;
        language = button.dataset.setLanguage;
        try {
          window.localStorage.setItem(storageKey, language);
        } catch (_) {
          // The UI still works without persistence.
        }
        applyLanguage();
      });
    });
    applyLanguage();
  });

  // Keep restored pages and other open tabs consistent with the latest choice.
  function restoreLanguage() {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved === "en" || saved === "zh") language = saved;
    } catch (_) {
      // Retain the current in-memory choice.
    }
    applyLanguage();
  }
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) restoreLanguage();
  });
  window.addEventListener("storage", (event) => {
    if (event.key === storageKey) restoreLanguage();
  });
})();
