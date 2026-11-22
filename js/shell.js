// Shared page shell for every tracker page: time helpers, the phone layout
// (bottom tabs, slide-up "add" sheet, toast) and the install-the-app banner.
(function (root) {
  const HOUR = 3600 * 1000;
  const $ = (id) => document.getElementById(id);

  // ---------- time helpers ----------
  function fmtTime(ms) {
    return new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function fmtDayTime(ms, now) {
    const d = new Date(ms), n = new Date(now);
    const sameDay = d.toDateString() === n.toDateString();
    const tomorrow = new Date(n); tomorrow.setDate(n.getDate() + 1);
    const yesterday = new Date(n); yesterday.setDate(n.getDate() - 1);
    const prefix = sameDay ? "" : d.toDateString() === tomorrow.toDateString() ? "Tomorrow " :
      d.toDateString() === yesterday.toDateString() ? "Yesterday " : d.toLocaleDateString([], { weekday: "short" }) + " ";
    return prefix + fmtTime(ms);
  }

  function fmtDuration(ms) {
    const mins = Math.round(ms / 60000);
    const h = Math.floor(mins / 60), m = mins % 60;
    return h ? `${h} h ${m} min` : `${m} min`;
  }

  function toLocalInput(ms) {
    const d = new Date(ms);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // The bedtime you're heading toward: the earliest of yesterday/today/tomorrow
  // at the chosen clock time that isn't more than 6 h in the past.
  function upcomingBedtime(bedtime, now) {
    const [h, m] = (bedtime || "23:00").split(":").map(Number);
    for (const offset of [-1, 0, 1]) {
      const d = new Date(now);
      d.setDate(d.getDate() + offset);
      d.setHours(h, m, 0, 0);
      if (d.getTime() >= now - 6 * HOUR) return d.getTime();
    }
    return null;
  }

  // ---------- phone layout: tabs, add-drink sheet, toast ----------
  const phoneQuery = window.matchMedia("(max-width: 640px)");
  let onTodayShown = () => {};

  function setTab(tab) {
    if (document.body.dataset.active === tab) return;
    document.body.dataset.active = tab;
    for (const b of document.querySelectorAll(".tab")) {
      if (b.dataset.go === tab) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    }
    window.scrollTo(0, 0);
    if (tab === "today") onTodayShown(); // the chart sizes itself to its now-visible container
    window.Analytics.track("tab-viewed", { tab });
  }

  function openSheet() {
    $("add-card").classList.add("open");
    $("sheet-backdrop").hidden = false;
    document.body.classList.add("sheet-open");
    window.Analytics.track("sheet-opened");
    setTimeout(() => (document.querySelector(".drink-btn[aria-pressed='true']") || document.querySelector(".drink-btn")).focus({ preventScroll: true }), 300);
  }

  function closeSheet() {
    $("add-card").classList.remove("open");
    $("sheet-backdrop").hidden = true;
    document.body.classList.remove("sheet-open");
  }

  let toastTimer;
  function showToast(text) {
    const t = $("toast");
    t.textContent = `✓ ${text}`;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
  }

  // ---------- installable app ----------
  const INSTALL_DISMISSED_KEY = "substancestack.installDismissed";
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  function initInstall() {
    let deferredPrompt = null;
    if ("serviceWorker" in navigator && location.protocol === "https:") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    function showInstallBanner(how) {
      if (isStandalone || localStorage.getItem(INSTALL_DISMISSED_KEY) === "1") return;
      if (how) $("install-how").textContent = how;
      $("install-banner").hidden = false;
    }
    window.addEventListener("beforeinstallprompt", (e) => { // Android / Chrome
      e.preventDefault();
      deferredPrompt = e;
      $("install-btn").hidden = false;
      showInstallBanner();
    });
    if (isIOS && !isStandalone) showInstallBanner("Tap the Share button, then “Add to Home Screen”.");
    $("install-btn").addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      window.Analytics.track("install-prompt", { outcome });
      deferredPrompt = null;
      $("install-banner").hidden = true;
    });
    $("install-dismiss").addEventListener("click", () => {
      localStorage.setItem(INSTALL_DISMISSED_KEY, "1");
      $("install-banner").hidden = true;
      window.Analytics.track("install-banner-dismissed");
    });
    window.addEventListener("appinstalled", () => {
      $("install-banner").hidden = true;
      window.Analytics.track("app-installed");
    });
  }

  // opts: { render } — called when the Today tab is shown or the layout changes.
  function init(opts) {
    onTodayShown = opts.render;
    document.body.dataset.active = "today";
    for (const b of document.querySelectorAll(".tab")) b.addEventListener("click", () => setTab(b.dataset.go));
    $("tab-add").addEventListener("click", openSheet);
    $("sheet-close").addEventListener("click", closeSheet);
    $("sheet-backdrop").addEventListener("click", closeSheet);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });
    phoneQuery.addEventListener("change", () => { closeSheet(); opts.render(); });
    let resizeTimer;
    window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(opts.render, 120); });
    setInterval(opts.render, 60 * 1000); // keep "now" current
    initInstall();

    // First chart interaction per visit (the chart redraws, so listen on its container)
    let chartHoverSent = false;
    $("chart").addEventListener("pointermove", () => {
      if (chartHoverSent) return;
      chartHoverSent = true;
      window.Analytics.track("chart-hovered");
    });
    document.querySelector(".table-view").addEventListener("toggle", (e) => {
      if (e.target.open) window.Analytics.track("table-view-opened");
    });
  }

  // After adding a drink on a phone: close the sheet and go back to the chart.
  function afterAdd(name) {
    if (phoneQuery.matches) {
      closeSheet();
      setTab("today");
    }
    showToast(`${name} added`);
  }

  root.AppShell = {
    HOUR, fmtTime, fmtDayTime, fmtDuration, toLocalInput, upcomingBedtime,
    phoneQuery, isStandalone, setTab, openSheet, closeSheet, showToast, afterAdd, init,
  };
})(globalThis);
