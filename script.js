(function () {
  "use strict";

  const navToggle = document.getElementById("navToggle");
  const mobileNav = document.getElementById("mobileNav");
  const form = document.getElementById("estimateForm");
  const toast = document.getElementById("toast");
  let toastTimer;

  /* Mobile nav */
  if (navToggle && mobileNav) {
    navToggle.addEventListener("click", function () {
      const open = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!open));
      navToggle.setAttribute("aria-label", open ? "Open menu" : "Close menu");
      if (open) {
        mobileNav.hidden = true;
      } else {
        mobileNav.hidden = false;
      }
    });

    mobileNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mobileNav.hidden = true;
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.setAttribute("aria-label", "Open menu");
      });
    });
  }

  /* Demo estimate form */
  if (form && toast) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const required = form.querySelectorAll("[required]");
      let valid = true;

      required.forEach(function (field) {
        field.classList.remove("is-invalid");
        if (!field.value.trim()) {
          field.classList.add("is-invalid");
          valid = false;
        }
      });

      if (!valid) {
        const firstBad = form.querySelector(".is-invalid");
        if (firstBad) firstBad.focus();
        return;
      }

      showToast();
      form.reset();
    });
  }

  function showToast() {
    clearTimeout(toastTimer);
    toast.hidden = false;
    // force reflow so transition runs
    void toast.offsetWidth;
    toast.classList.add("is-visible");

    toastTimer = setTimeout(function () {
      toast.classList.remove("is-visible");
      setTimeout(function () {
        toast.hidden = true;
      }, 400);
    }, 5200);
  }

  /* Sticky header shadow on scroll */
  const header = document.querySelector(".site-header");
  if (header) {
    const onScroll = function () {
      if (window.scrollY > 8) {
        header.style.boxShadow = "0 4px 20px rgba(31,42,36,0.06)";
      } else {
        header.style.boxShadow = "none";
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }
})();

// Re-process Instagram embeds after load
window.addEventListener("load", () => {
  if (window.instgrm && window.instgrm.Embeds) {
    window.instgrm.Embeds.process();
  }
});
