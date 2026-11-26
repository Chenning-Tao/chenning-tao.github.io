// Homepage behaviour for _layouts/sticker.liquid: copy email, filter publications, WeChat QR popup.
// Language switching is handled by assets/js/language.js.
(() => {
  "use strict";

  /* ---------- copy email ---------- */
  function flash(button, state) {
    button.dataset.state = state;
    clearTimeout(button._resetTimer);
    button._resetTimer = setTimeout(() => {
      delete button.dataset.state;
    }, 1800);
  }

  function legacyCopy(text) {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.top = "0";
      area.style.left = "0";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      area.setSelectionRange(0, text.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      return ok;
    } catch (_) {
      return false;
    }
  }

  function selectNode(id) {
    const element = id && document.getElementById(id);
    if (!element || !window.getSelection) return;
    try {
      const range = document.createRange();
      range.selectNodeContents(element);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (_) {
      // Leave the address visible for manual copying.
    }
  }

  document.querySelectorAll(".copy-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const text = button.dataset.copy;
      const fallback = () => {
        if (legacyCopy(text)) {
          flash(button, "copied");
        } else {
          selectNode(button.dataset.select);
          flash(button, "fail");
        }
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => flash(button, "copied"), fallback);
      } else {
        fallback();
      }
    });
  });

  /* ---------- publication filter ---------- */
  const list = document.getElementById("pub-list");
  const input = document.getElementById("pub-filter");
  if (list && input) {
    const count = document.getElementById("pub-count");
    const empty = document.getElementById("pub-empty");
    const chips = Array.from(document.querySelectorAll("#pub-chips .chip"));
    const pubs = Array.from(list.querySelectorAll(".pub"));
    let selectedOnly = false;

    pubs.forEach((pub) => {
      pub._text = pub.textContent.toLowerCase().replace(/\s+/g, " ");
    });
    list.classList.add("filtered");

    const apply = () => {
      const tokens = input.value.toLowerCase().replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
      let shown = 0;
      pubs.forEach((pub) => {
        const ok = (!selectedOnly || pub.dataset.selected === "1") && tokens.every((token) => pub._text.includes(token));
        const holder = pub.closest("li") || pub;
        holder.hidden = !ok;
        pub.classList.toggle("first", ok && shown === 0);
        if (ok) shown += 1;
      });
      if (count) count.textContent = `${shown} / ${pubs.length}`;
      if (empty) empty.hidden = shown !== 0;
      chips.forEach((chip) => chip.setAttribute("aria-pressed", String(selectedOnly)));
    };

    input.addEventListener("input", apply);
    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        selectedOnly = !selectedOnly;
        apply();
      });
    });
    apply();
  }

  /* ---------- WeChat QR popup ---------- */
  const modal = document.getElementById("wechat");
  if (modal) {
    let opener = null;
    const closeButton = modal.querySelector("[data-wx-close]");
    // Everything outside the popup is made inert while it is open, so keyboard
    // and screen-reader users cannot reach the page behind the overlay.
    const background = () => Array.from(document.body.children).filter((el) => el !== modal);
    const setBackgroundInert = (on) => {
      background().forEach((el) => {
        if (on) {
          el.setAttribute("inert", "");
          el.setAttribute("aria-hidden", "true");
        } else {
          el.removeAttribute("inert");
          el.removeAttribute("aria-hidden");
        }
      });
    };
    const close = () => {
      if (modal.hidden) return;
      modal.hidden = true;
      setBackgroundInert(false);
      if (opener && opener.focus) opener.focus();
    };
    document.querySelectorAll("[data-wx]").forEach((button) => {
      button.addEventListener("click", (event) => {
        // Without JavaScript the link simply opens the QR image.
        event.preventDefault();
        opener = event.currentTarget;
        modal.hidden = false;
        setBackgroundInert(true);
        if (closeButton) closeButton.focus();
      });
    });
    modal.addEventListener("click", (event) => {
      if (event.target === modal || event.target.closest("[data-wx-close]")) close();
    });
    document.addEventListener("keydown", (event) => {
      if (modal.hidden) return;
      if (event.key === "Escape") {
        close();
      } else if (event.key === "Tab" && closeButton) {
        // The close button is the only control in the popup, so Tab stays on it.
        event.preventDefault();
        closeButton.focus();
      }
    });
  }
})();
