/* ============================================================
   Estimate form settings (FormSubmit)
   ============================================================ */

// Recipient: an email address OR the random-string alias FormSubmit gives you after
// activation (e.g. "a1b2c3d4e5f6..."). Paste the alias here once you have it.
// Switch to Cain's email/alias at handoff (that needs one new activation).
const FORM_RECIPIENT = "zewdoo9@gmail.com";

// The one page URL FormSubmit sees for every submission, whatever host the page is opened on
// (pages.dev, a deploy-hash preview, github.io). FormSubmit treats each recipient + page URL as a
// separate "form" needing its own activation, so keeping this fixed means one activation covers all hosts.
// Change to "https://sulcascarpets.com/" when the domain is connected (expect one re-activation).
const FORM_SITE_URL = "https://sulcas-carpets.pages.dev/";

/* Deploy-hash preview hosts (e.g. 68deee40.sulcas-carpets.pages.dev) -> main Pages host */
(function () {
  var h = window.location.hostname;
  if (/^[0-9a-f]{6,}\.sulcas-carpets\.pages\.dev$/i.test(h)) {
    window.location.replace("https://sulcas-carpets.pages.dev" + window.location.pathname + window.location.search + window.location.hash);
  }
})();

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

  /* Estimate form: sends via FormSubmit AJAX to FORM_RECIPIENT */
  const SUCCESS_MSG = "Thanks! We received your request and will contact you soon.";
  const ERROR_MSG = "Something went wrong — please call (916) 686-1704.";

  if (form && toast) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const submitLabel = submitBtn ? submitBtn.textContent : "";
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const required = form.querySelectorAll("[required]");
      let valid = true;

      required.forEach(function (field) {
        field.classList.remove("is-invalid");
        const v = field.value.trim();
        if (!v || (field.type === "email" && !emailRe.test(v))) {
          field.classList.add("is-invalid");
          valid = false;
        }
      });

      if (!valid) {
        const firstBad = form.querySelector(".is-invalid");
        if (firstBad) firstBad.focus();
        return;
      }

      const val = function (n) {
        const el = form.elements[n];
        return el ? String(el.value || "").trim() : "";
      };

      // Honeypot: bots fill hidden fields, real visitors never see it. Pretend success, send nothing.
      if (val("_honey")) {
        showToast(SUCCESS_MSG, false);
        form.reset();
        return;
      }

      const payload = {
        name: val("name"),
        phone: val("phone"),
        email: val("email"), // FormSubmit uses this as the reply-to address
        project: val("project"),
        message: val("message"),
        _subject: "New estimate request — Sulca's Carpets website",
        _template: "table",
        _captcha: "false",
        _url: FORM_SITE_URL // fixed form identity for FormSubmit (instead of whatever Referer the host sends)
      };

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending…";
      }

      fetch("https://formsubmit.co/ajax/" + encodeURIComponent(FORM_RECIPIENT), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        referrerPolicy: "strict-origin-when-cross-origin", // never blank, never includes ?query strings
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            const ok = res.ok && (data.success === true || data.success === "true");
            if (!ok) throw new Error((data && data.message) || "Request failed");
            return data;
          });
        })
        .then(function () {
          showToast(SUCCESS_MSG, false);
          form.reset();
        })
        .catch(function () {
          showToast(ERROR_MSG, true);
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = submitLabel;
          }
        });
    });
  }

  function showToast(message, isError) {
    clearTimeout(toastTimer);
    if (message) toast.textContent = message;
    toast.classList.toggle("is-error", !!isError);
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
