// Privacy-friendly, cookie-free usage stats via Umami Cloud.
// Only counts page views and a few anonymous events (e.g. which drink TYPE was
// added). Drink times, amounts, the log and settings values never leave the device.
(function (root) {
  const UMAMI_WEBSITE_ID = "e1441ea1-9075-4954-ba99-955d306bd451"; // from cloud.umami.is
  const PRODUCTION_HOST = "substancestack.netlify.app"; // don't count local testing

  if (UMAMI_WEBSITE_ID && location.hostname === PRODUCTION_HOST) {
    const s = document.createElement("script");
    s.defer = true;
    s.src = "https://cloud.umami.is/script.js";
    s.dataset.websiteId = UMAMI_WEBSITE_ID;
    s.dataset.domains = PRODUCTION_HOST;
    s.dataset.doNotTrack = "true"; // honor the browser's Do Not Track setting
    document.head.appendChild(s);
  }

  // Safe no-op until the Umami script has loaded (or if it's blocked).
  function track(event, data) {
    try {
      if (root.umami && typeof root.umami.track === "function") root.umami.track(event, data);
    } catch (_) { /* analytics must never break the app */ }
  }

  root.Analytics = { track };
})(globalThis);
