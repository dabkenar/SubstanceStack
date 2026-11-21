// Privacy-friendly, cookie-free usage stats via Umami Cloud.
// Only coarse, anonymous data is sent: event names, drink TYPES, and values
// rounded into ranges (e.g. "100-199 mg", "afternoon"). Exact times, amounts,
// bedtime, weight and the drink log itself never leave the device.
(function (root) {
  const UMAMI_WEBSITE_ID = "e1441ea1-9075-4954-ba99-955d306bd451"; // from cloud.umami.is
  const PRODUCTION_HOST = "substancestack.netlify.app"; // don't count local testing

  // Calls made before the Umami script finishes loading wait here.
  const queue = [];
  let ready = false;

  function flush() {
    if (!root.umami) return;
    ready = true;
    while (queue.length) send(queue.shift());
  }

  function send([method, ...args]) {
    try {
      if (root.umami && typeof root.umami[method] === "function") root.umami[method](...args);
    } catch (_) { /* analytics must never break the app */ }
  }

  function call(method, ...args) {
    if (ready) send([method, ...args]);
    else if (queue.length < 50) queue.push([method, ...args]);
  }

  if (UMAMI_WEBSITE_ID && location.hostname === PRODUCTION_HOST) {
    const s = document.createElement("script");
    s.defer = true;
    s.src = "https://cloud.umami.is/script.js";
    s.dataset.websiteId = UMAMI_WEBSITE_ID;
    s.dataset.domains = PRODUCTION_HOST;
    s.dataset.doNotTrack = "true"; // honor the browser's Do Not Track setting
    s.addEventListener("load", flush);
    document.head.appendChild(s);
  }

  // ----- bucketing helpers: turn exact values into coarse ranges -----
  function mgRange(mg) {
    return mg < 50 ? "<50 mg" : mg < 100 ? "50-99 mg" : mg < 200 ? "100-199 mg" : "200+ mg";
  }
  function durationRange(min) {
    return min <= 0 ? "instant" : min <= 10 ? "1-10 min" : min <= 30 ? "11-30 min" : min <= 60 ? "31-60 min" : "60+ min";
  }
  function dayPart(ms) {
    const h = new Date(ms).getHours();
    return h >= 5 && h < 12 ? "morning" : h >= 12 && h < 17 ? "afternoon" : h >= 17 && h < 21 ? "evening" : "night";
  }
  function countRange(n) {
    return n === 0 ? "0" : n <= 2 ? "1-2" : n <= 5 ? "3-5" : "6+";
  }

  root.Analytics = {
    track: (event, data) => call("track", event, data),
    identify: (data) => call("identify", data), // per-visit properties
    mgRange, durationRange, dayPart, countRange,
  };
})(globalThis);
