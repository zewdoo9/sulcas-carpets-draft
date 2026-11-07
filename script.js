/* ============================================================
   Estimate form settings (Web3Forms)
   ============================================================ */

// Public access key from the Web3Forms account. Their docs say this value is
// safe in client-side code. The account that created the key chooses the inbox.
// Do not put a recipient address in this file.
const WEB3FORMS_ACCESS_KEY = "478cfc0f-cbb5-4e06-924c-c156ea3610cc";
const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";

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
  // Binds the shared Web3Forms flow to each estimate form (currently only #estimateForm in #contact).
  const forms = document.querySelectorAll("form.js-estimate-form");
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

  /* Estimate form: Web3Forms AJAX. Inbox is the account that owns the access key. */
  const SUCCESS_MSG = "Thanks! We received your request and will contact you soon.";
  const ERROR_MSG = "Something went wrong — please call (916) 686-1704.";

  if (toast) forms.forEach(bindEstimateForm);

  function bindEstimateForm(form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const submitLabel = submitBtn ? submitBtn.textContent : "";
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let sending = false;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (sending) return;

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

      // Honeypots: a filled text field or a checked botcheck means a bot.
      // Answer like a success and send nothing. Real visitors never see these.
      const bot = form.elements.botcheck;
      if (val("_honey") || (bot && bot.checked)) {
        showToast(SUCCESS_MSG, false);
        form.reset();
        return;
      }

      const email = val("email");
      const payload = {
        access_key: WEB3FORMS_ACCESS_KEY,
        name: val("name"),
        email: email,
        phone: val("phone"),
        service: val("project"),
        message: val("message"),
        subject: "New estimate request — Sulca's Carpets website",
        from_name: "Sulca's Carpets website",
        replyto: email
      };

      sending = true;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending…";
      }

      fetch(WEB3FORMS_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            // Web3Forms uses a boolean. The string "true" is not acceptance.
            const ok = res.ok && data && data.success === true;
            if (!ok) {
              const nested = data && data.body && data.body.message;
              throw new Error((data && data.message) || nested || "Request failed");
            }
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
          sending = false;
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

// Showroom 360° tour: load Google Maps iframe only on click
(function () {
  const btn = document.getElementById("tourStart");
  const wrap = document.getElementById("tourWrap");
  if (!btn || !wrap) return;
  let loaded = false;
  function loadTour() {
    if (loaded) return;
    loaded = true;
    const iframe = document.createElement("iframe");
    iframe.src = "https://www.google.com/maps/embed?pb=!4v1770358368334!6m8!1m7!1sCAoSHENJQUJJaERPX0RaTGplYlNnTE9kS3RaVmZpQjg.!2m2!1d38.402998903034!2d-121.3538966241981!3f1.737208092960234!4f-11.479919715486488!5f0.4000000000000002";
    iframe.title = "360° tour of Sulca's Carpets showroom";
    iframe.setAttribute("allowfullscreen", "");
    iframe.setAttribute("loading", "lazy");
    iframe.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
    iframe.width = "100%";
    wrap.innerHTML = "";
    wrap.appendChild(iframe);
    wrap.classList.add("is-loaded");
  }
  // Whole poster area (including the button) starts the tour
  wrap.addEventListener("click", loadTour);
})();

// Showroom photos: on phones show first 6, button reveals the rest (no-JS shows all)
(function () {
  const strip = document.getElementById("showroomStrip");
  const more = document.getElementById("showroomMore");
  if (!strip || !more) return;
  const total = strip.querySelectorAll(".showroom-photo").length;
  if (total <= 6) return;
  strip.classList.add("is-collapsed");
  more.hidden = false;
  more.addEventListener("click", function () {
    const open = more.getAttribute("aria-expanded") === "true";
    strip.classList.toggle("is-collapsed", open);
    more.setAttribute("aria-expanded", String(!open));
    more.textContent = open ? "See all " + total + " photos" : "Show fewer photos";
  });
})();

// Showroom nav jump: land on the headline so the tour cover photo is fully in view
(function () {
  const sec = document.getElementById("showroom");
  if (!sec) return;
  const target = sec.querySelector("h2") || sec;
  function go(smooth) {
    const header = document.querySelector(".site-header");
    const h = header ? header.getBoundingClientRect().height : 76;
    const y = target.getBoundingClientRect().top + window.scrollY - h - 12;
    window.scrollTo({ top: y, behavior: smooth ? "smooth" : "auto" });
  }
  document.querySelectorAll('a[href="#showroom"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      history.pushState(null, "", "#showroom");
      go(true);
    });
  });
  if (location.hash === "#showroom") {
    window.addEventListener("load", function () { go(false); });
  }
})();

// Showroom lightbox: same-page zoomed view with prev/next, swipe, Escape/backdrop close
(function () {
  const links = Array.prototype.slice.call(document.querySelectorAll("#showroomStrip .showroom-photo"));
  if (!links.length) return;
  const items = links.map(function (a) { const im = a.querySelector("img"); return { src: a.getAttribute("href"), alt: im ? im.alt : "" }; });
  const lb = document.createElement("div");
  lb.className = "lb"; lb.hidden = true;
  lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true"); lb.setAttribute("aria-label", "Showroom photo viewer");
  lb.innerHTML = '<figure class="lb-figure"><img class="lb-img" alt="" /><figcaption class="lb-cap"><span class="lb-count"></span><span class="lb-text"></span></figcaption></figure>' +
    '<button type="button" class="lb-btn lb-prev" aria-label="Previous photo">&#8249;</button>' +
    '<button type="button" class="lb-btn lb-next" aria-label="Next photo">&#8250;</button>' +
    '<button type="button" class="lb-btn lb-close" aria-label="Close photo viewer">&times;</button>';
  document.body.appendChild(lb);
  const img = lb.querySelector(".lb-img"), count = lb.querySelector(".lb-count"), text = lb.querySelector(".lb-text");
  const btnPrev = lb.querySelector(".lb-prev"), btnNext = lb.querySelector(".lb-next"), btnClose = lb.querySelector(".lb-close");
  let idx = 0, lastFocus = null;
  function show(i) {
    idx = (i + items.length) % items.length;
    img.src = items[idx].src; img.alt = items[idx].alt;
    count.textContent = (idx + 1) + " / " + items.length; text.textContent = items[idx].alt;
    [idx - 1, idx + 1].forEach(function (j) { new Image().src = items[(j + items.length) % items.length].src; });
  }
  function open(i) {
    lastFocus = document.activeElement; show(i);
    lb.hidden = false; document.body.classList.add("lb-lock");
    requestAnimationFrame(function () { lb.classList.add("is-open"); });
    btnClose.focus();
  }
  function close() {
    lb.classList.remove("is-open"); lb.hidden = true; document.body.classList.remove("lb-lock");
    img.removeAttribute("src"); if (lastFocus) lastFocus.focus();
  }
  links.forEach(function (a, i) {
    a.removeAttribute("target");
    a.setAttribute("aria-label", "View larger: " + items[i].alt);
    a.addEventListener("click", function (e) { if (e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); open(i); });
  });
  btnPrev.addEventListener("click", function () { show(idx - 1); });
  btnNext.addEventListener("click", function () { show(idx + 1); });
  btnClose.addEventListener("click", close);
  lb.addEventListener("click", function (e) { if (e.target === lb || e.target.classList.contains("lb-figure")) close(); });
  document.addEventListener("keydown", function (e) {
    if (lb.hidden) return;
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "ArrowLeft") show(idx - 1);
    else if (e.key === "ArrowRight") show(idx + 1);
    else if (e.key === "Tab") {
      const f = [btnPrev, btnNext, btnClose], k = f.indexOf(document.activeElement);
      e.preventDefault(); f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });
  let sx = 0, sy = 0, tracking = false;
  lb.addEventListener("touchstart", function (e) { if (e.touches.length !== 1) { tracking = false; return; } tracking = true; sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  lb.addEventListener("touchend", function (e) {
    if (!tracking) return; tracking = false;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) show(idx + (dx < 0 ? 1 : -1));
  }, { passive: true });
})();
