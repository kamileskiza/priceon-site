/* PriceOn landing — attribution, Telegram deep links, events, UI. No dependencies. */
(function () {
  "use strict";

  /* ---------------- Config (edit here, never invent URLs) ---------------- */
  var PO = {
    bot: "priceonapp_bot",          // official bot (verified)
    linkMode: "startapp",           // "startapp" = opens the Mini App directly, "start" = opens bot chat
    termsUrl: null,                 // [TERMS_URL]
    privacyUrl: null,               // [PRIVACY_URL]
    communityUrl: null,             // [OFFICIAL_COMMUNITY_URL] e.g. "https://t.me/priceoncommunity" — until set, community buttons open the bot
    whatsappUrl: null,              // [WHATSAPP_URL] e.g. "https://wa.me/90XXXXXXXXXX" — until set, WhatsApp buttons show a "coming soon" note
    xUrl: null                      // [OFFICIAL_X_URL]
  };
  window.PO_CONFIG = PO;

  var lang = (document.documentElement.lang || "en").slice(0, 2);
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------------- Attribution: capture UTMs + click ids ---------------- */
  var qs = new URLSearchParams(location.search);
  var KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid", "ttclid"];
  var hit = {};
  KEYS.forEach(function (k) { var v = qs.get(k); if (v) hit[k] = v.slice(0, 200); });
  var now = new Date().toISOString();
  var vid = store.get("po_vid") || Math.random().toString(36).slice(2, 8);
  store.set("po_vid", vid);
  if (Object.keys(hit).length) {
    hit.ts = now; hit.landing = location.pathname;
    if (!store.get("po_attr_first")) store.set("po_attr_first", hit);
    store.set("po_attr_last", hit);
  }
  var attr = store.get("po_attr_last") || {};

  /* ---------------- Telegram deep link with campaign payload ----------------
     Telegram start/startapp param: max 64 chars, [A-Za-z0-9_-].
     Format: s-<source>_c-<campaign>_a-<content>_p-<placement>_l-<lang>_v-<visit>
     The bot / Mini App must read it (start_param in initData, or /start payload)
     and store it on the user so activation can be joined back to the ad. */
  function clean(v, n) { return String(v || "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, n); }
  function payload(place) {
    var p = [];
    p.push("s-" + (clean(attr.utm_source, 8) || "direct"));
    if (attr.utm_campaign) p.push("c-" + clean(attr.utm_campaign, 18));
    if (attr.utm_content) p.push("a-" + clean(attr.utm_content, 12));
    p.push("p-" + clean(place, 6));
    p.push("l-" + lang);
    p.push("v-" + vid);
    return p.join("_").slice(0, 64);
  }
  function tgUrl(place) {
    return "https://t.me/" + PO.bot + "?" + PO.linkMode + "=" + encodeURIComponent(payload(place));
  }

  /* ---------------- Events ---------------- */
  window.dataLayer = window.dataLayer || [];
  function track(name, params) {
    var p = Object.assign({
      lang: lang, vid: vid,
      utm_source: attr.utm_source || "(direct)", utm_medium: attr.utm_medium || "",
      utm_campaign: attr.utm_campaign || "", utm_content: attr.utm_content || "", utm_term: attr.utm_term || ""
    }, params || {});
    window.dataLayer.push(Object.assign({ event: name }, p));
    // Hooks only fire if the correct PriceOn tags are installed (see TRACKING.md).
    if (typeof window.gtag === "function") window.gtag("event", name, p);
    if (typeof window.fbq === "function" && name === "telegram_click") window.fbq("trackCustom", "TelegramClick", { placement: p.placement, lang: lang });
  }
  track("page_view", { path: location.pathname });

  document.querySelectorAll("[data-tg]").forEach(function (a) {
    var place = a.getAttribute("data-tg");
    a.href = tgUrl(place);
    a.rel = "noopener";
    a.addEventListener("click", function () {
      var ev = a.getAttribute("data-ev");
      if (ev) track(ev, { placement: place });
      track("telegram_click", { placement: place, link_mode: PO.linkMode });
    });
  });

  /* Footer links: show only when a real URL is configured */
  [["terms", PO.termsUrl], ["privacy", PO.privacyUrl], ["community", PO.communityUrl], ["x", PO.xUrl]].forEach(function (x) {
    var el = document.querySelector('[data-link="' + x[0] + '"]');
    if (!el) return;
    if (x[1]) { el.href = x[1]; el.hidden = false; } else { el.hidden = true; }
  });

  /* Community + WhatsApp buttons */
  document.querySelectorAll("[data-comm]").forEach(function (a) {
    var place = a.getAttribute("data-comm");
    a.href = PO.communityUrl || tgUrl("comm");
    a.rel = "noopener";
    a.addEventListener("click", function () { track("community_click", { placement: place, configured: !!PO.communityUrl }); });
  });
  var toast = document.querySelector(".wa-toast"), tt = null;
  document.querySelectorAll("[data-wa]").forEach(function (a) {
    var place = a.getAttribute("data-wa");
    if (PO.whatsappUrl) { a.href = PO.whatsappUrl; a.target = "_blank"; }
    a.addEventListener("click", function (e) {
      track("whatsapp_click", { placement: place, configured: !!PO.whatsappUrl });
      if (!PO.whatsappUrl) {
        e.preventDefault();
        if (toast) { toast.hidden = false; clearTimeout(tt); tt = setTimeout(function () { toast.hidden = true; }, 4000); }
      }
    });
  });

  /* Language menu — remembers the choice (Netlify nf_lang cookie overrides browser-language routing) */
  var sel = document.querySelector(".lang-select");
  if (sel) sel.addEventListener("change", function () {
    var o = sel.options[sel.selectedIndex];
    var code = (o.getAttribute("data-code") || "en").split("-")[0];
    document.cookie = "nf_lang=" + code + ";path=/;max-age=31536000;samesite=lax";
    track("language_change", { to: code });
    location.href = o.value + location.search;
  });

  /* FAQ opens */
  document.querySelectorAll(".faq details").forEach(function (d) {
    d.addEventListener("toggle", function () { if (d.open) track("faq_open", { question: d.getAttribute("data-q") || "" }); });
  });

  /* Section views (once) + reveal */
  var seen = {};
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        var v = e.target.getAttribute("data-view");
        if (v && !seen[v]) { seen[v] = 1; track(v); }
      });
    }, { threshold: 0.3 });
    document.querySelectorAll(".rv,[data-view]").forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll(".rv").forEach(function (el) { el.classList.add("in"); });
  }

  /* How it works — step viewer (auto-advances until the user taps) */
  var steps = [].slice.call(document.querySelectorAll(".step"));
  var shot = document.getElementById("step-shot");
  if (steps.length && shot) {
    var i = 0, timer = null, auto = true;
    steps.forEach(function (s) { var im = new Image(); im.src = s.getAttribute("data-img"); });
    function show(n, user) {
      i = n;
      steps.forEach(function (s, k) { s.setAttribute("aria-selected", k === n ? "true" : "false"); });
      shot.style.opacity = 0;
      setTimeout(function () {
        shot.src = steps[n].getAttribute("data-img");
        shot.alt = steps[n].getAttribute("data-alt");
        shot.style.opacity = 1;
      }, 180);
      if (user) { auto = false; clearInterval(timer); track("step_view", { step: n + 1 }); }
    }
    steps.forEach(function (s, k) { s.addEventListener("click", function () { show(k, true); }); });
    timer = setInterval(function () { if (auto) show((i + 1) % steps.length); }, 5000);
  }

  /* Sticky mobile CTA: visible after hero CTA scrolls away, hidden at final CTA */
  var sticky = document.querySelector(".sticky");
  var heroCta = document.querySelector("[data-tg='hero']");
  var finalCta = document.querySelector(".final");
  if (sticky && heroCta && "IntersectionObserver" in window) {
    var heroOut = false, finalIn = false;
    function upd() { sticky.classList.toggle("on", heroOut && !finalIn); }
    new IntersectionObserver(function (e) { heroOut = !e[0].isIntersecting && e[0].boundingClientRect.top < 0; upd(); }).observe(heroCta);
    if (finalCta) new IntersectionObserver(function (e) { finalIn = e[0].isIntersecting; upd(); }).observe(finalCta);
  }
})();
