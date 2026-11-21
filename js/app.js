(function () {
  const { DRINKS } = window.Drinks;
  const Model = window.CaffeineModel;
  const Chart = window.CaffeineChart;
  const STORAGE_KEY = "substancestack.v1";
  const HOUR = Model.HOUR_MS;
  const DAILY_LIMIT_MG = 400;

  const DEFAULT_SETTINGS = { preset: "typical", halfLife: 5, bedtime: "23:00", threshold: 30, weightLb: null };

  // ---------- state ----------
  let state = load();
  let selectedDrink = null;

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (raw && Array.isArray(raw.entries)) {
        return { entries: raw.entries, settings: { ...DEFAULT_SETTINGS, ...raw.settings } };
      }
    } catch (_) { /* fall through to defaults */ }
    return { entries: [], settings: { ...DEFAULT_SETTINGS } };
  }

  function save() {
    // Drop entries older than 4 days: at even a 15 h half-life they're negligible.
    const cutoff = Date.now() - 96 * HOUR;
    state.entries = state.entries.filter((e) => e.time >= cutoff);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  // ---------- helpers ----------
  const $ = (id) => document.getElementById(id);
  const fmtTime = Chart.fmtTime;

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
  function upcomingBedtime(now) {
    const [h, m] = (state.settings.bedtime || "23:00").split(":").map(Number);
    for (const offset of [-1, 0, 1]) {
      const d = new Date(now);
      d.setDate(d.getDate() + offset);
      d.setHours(h, m, 0, 0);
      if (d.getTime() >= now - 6 * HOUR) return d.getTime();
    }
    return null;
  }

  function weightKg() {
    const lb = Number(state.settings.weightLb);
    return lb > 0 ? lb * 0.453592 : null;
  }

  // ---------- drink picker ----------
  function buildDrinkGrid() {
    const grid = $("drink-grid");
    for (const d of DRINKS) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "drink-btn";
      b.dataset.id = d.id;
      b.setAttribute("aria-pressed", "false");
      b.innerHTML =
        `<span class="drink-icon">${window.DrinkIcons.get(d.id)}</span>` +
        `<span class="drink-name">${Chart.escapeHtml(d.name)}</span><span class="drink-mg">${d.sizes[0].mg} mg+</span>`;
      if (d.id === "custom") b.querySelector(".drink-mg").textContent = "any amount";
      b.addEventListener("click", () => selectDrink(d.id));
      grid.appendChild(b);
    }
  }

  function selectDrink(id) {
    selectedDrink = DRINKS.find((d) => d.id === id);
    for (const b of document.querySelectorAll(".drink-btn")) b.setAttribute("aria-pressed", String(b.dataset.id === id));
    const sel = $("f-size");
    sel.innerHTML = "";
    selectedDrink.sizes.forEach((s, i) => {
      const o = document.createElement("option");
      o.value = i;
      o.textContent = id === "custom" ? s.label : `${s.label} · ${s.mg} mg`;
      sel.appendChild(o);
    });
    $("f-mg").value = selectedDrink.sizes[0].mg;
    $("f-dur").value = selectedDrink.durationMin;
    $("f-time").value = toLocalInput(Date.now());
    $("drink-form").hidden = false;
    updateLastCall();
  }

  function formDrink() {
    if (!selectedDrink) return null;
    const mg = Number($("f-mg").value);
    const dur = Number($("f-dur").value);
    if (!(mg > 0) || !(dur >= 0)) return null;
    return { mg, durationMin: dur, absorption: selectedDrink.absorption };
  }

  function addDrink(ev) {
    ev.preventDefault();
    const d = formDrink();
    const time = new Date($("f-time").value).getTime();
    if (!d || !Number.isFinite(time)) return;
    const size = selectedDrink.sizes[Number($("f-size").value)];
    state.entries.push({
      id: (crypto.randomUUID && crypto.randomUUID()) || String(Date.now() + Math.random()),
      drinkId: selectedDrink.id,
      name: selectedDrink.id === "custom" ? "Custom" : `${selectedDrink.name} (${size.label})`,
      time, ...d,
    });
    save();
    window.Analytics.track("drink-added", { drink: selectedDrink.id, size: size.label });
    $("f-time").value = toLocalInput(Date.now());
    renderAll();
  }

  function updateLastCall() {
    const out = $("last-call");
    const d = formDrink();
    if (!d || !selectedDrink) { out.textContent = ""; return; }
    const now = Date.now();
    const bed = upcomingBedtime(now);
    const s = state.settings;
    if (bed == null || bed <= now) { out.textContent = ""; return; }
    const t = Model.lastCallTime(state.entries, d, bed, s.threshold, s.halfLife, now);
    const mg = Math.round(d.mg);
    // "an 80 mg…", "an 11 mg…", "an 18 mg…" (numbers said with a leading vowel sound)
    const article = /^8/.test(String(mg)) || mg === 11 || mg === 18 ? "an" : "a";
    const what = `${article} ${mg} mg ${selectedDrink.id === "custom" ? "drink" : selectedDrink.name.toLowerCase()}`;
    if (t == null) {
      out.innerHTML = `<span class="status-icon warn" aria-hidden="true">!</span> Having ${Chart.escapeHtml(what)} now would keep you above ${s.threshold} mg at bedtime (${fmtTime(bed)}).`;
    } else {
      out.innerHTML = `<span class="status-icon ok" aria-hidden="true">✓</span> Latest you can start ${Chart.escapeHtml(what)} and still be under ${s.threshold} mg by bedtime (${fmtTime(bed)}): <strong>${fmtDayTime(t, now)}</strong>.`;
    }
  }

  // ---------- log ----------
  function renderLog(now) {
    const list = $("log");
    list.innerHTML = "";
    const recent = state.entries.filter((e) => e.time >= now - 48 * HOUR).sort((a, b) => b.time - a.time);
    $("log-empty").hidden = recent.length > 0;
    $("clear-log").hidden = recent.length === 0;
    for (const e of recent) {
      const li = document.createElement("li");
      li.innerHTML =
        `<div><div class="log-name">${Chart.escapeHtml(e.name)}</div>` +
        `<div class="log-meta">${fmtDayTime(e.time, now)}${e.durationMin ? ` · over ${e.durationMin} min` : ""}${e.time > now ? " · planned" : ""}</div></div>` +
        `<div class="log-right"><span class="log-mg">${Math.round(e.mg)} mg</span>` +
        `<button type="button" class="btn-icon" aria-label="Remove ${Chart.escapeHtml(e.name)}">✕</button></div>`;
      li.querySelector("button").addEventListener("click", () => {
        state.entries = state.entries.filter((x) => x.id !== e.id);
        save();
        window.Analytics.track("drink-removed", { drink: e.drinkId });
        renderAll();
      });
      list.appendChild(li);
    }
  }

  // ---------- settings ----------
  function buildSettings() {
    const sel = $("s-preset");
    for (const p of Model.HALF_LIFE_PRESETS) {
      const o = document.createElement("option");
      o.value = p.id;
      o.textContent = `${p.label} (~${p.hours} h)`;
      sel.appendChild(o);
    }
    const custom = document.createElement("option");
    custom.value = "custom";
    custom.textContent = "Custom";
    sel.appendChild(custom);

    const s = state.settings;
    sel.value = s.preset;
    $("s-half").value = s.halfLife;
    $("s-bed").value = s.bedtime;
    $("s-thr").value = s.threshold;
    $("s-weight").value = s.weightLb || "";

    sel.addEventListener("change", () => {
      const p = Model.HALF_LIFE_PRESETS.find((x) => x.id === sel.value);
      s.preset = sel.value;
      if (p) { s.halfLife = p.hours; $("s-half").value = p.hours; }
      save(); renderAll();
      window.Analytics.track("setting-changed", { setting: "half-life-preset", preset: sel.value });
    });
    $("s-half").addEventListener("change", () => {
      const v = Number($("s-half").value);
      if (v >= 1.5 && v <= 24) {
        s.halfLife = v;
        const match = Model.HALF_LIFE_PRESETS.find((x) => x.hours === v);
        s.preset = match ? match.id : "custom";
        sel.value = s.preset;
        save(); renderAll();
      } else $("s-half").value = s.halfLife;
    });
    $("s-bed").addEventListener("change", () => {
      if ($("s-bed").value) { s.bedtime = $("s-bed").value; save(); renderAll(); }
    });
    $("s-thr").addEventListener("change", () => {
      const v = Number($("s-thr").value);
      if (v >= 5 && v <= 300) { s.threshold = v; save(); renderAll(); } else $("s-thr").value = s.threshold;
    });
    $("s-weight").addEventListener("change", () => {
      const v = Number($("s-weight").value);
      s.weightLb = v > 0 ? v : null;
      save(); renderAll();
    });
  }

  // ---------- main render ----------
  function renderAll() {
    const now = Date.now();
    const s = state.settings;
    const entries = state.entries;
    const bed = upcomingBedtime(now);

    const nowMg = Model.amountAt(entries, now, s.halfLife);
    const ready = Model.sleepReadyTime(entries, now, s.threshold, s.halfLife);
    const bedMg = bed != null ? Model.amountAt(entries, bed, s.halfLife) : 0;
    const total24 = entries.filter((e) => e.time >= now - 24 * HOUR && e.time <= now).reduce((a, e) => a + e.mg, 0);

    // Stat tiles
    $("stat-now").textContent = `${Math.round(nowMg)} mg`;
    const conc = Model.concentration(nowMg, weightKg());
    const in30 = Model.amountAt(entries, now + 30 * 60000, s.halfLife);
    const trend = in30 > nowMg + 1 ? "rising" : in30 < nowMg - 1 ? "falling" : "steady";
    $("stat-now-sub").textContent = nowMg < 1 ? "Nothing active" : `${trend}${conc != null ? ` · ≈ ${conc.toFixed(1)} mg/L` : ""}`;

    if (!ready) {
      $("stat-ready").textContent = "—";
      $("stat-ready-sub").textContent = "Not within the next few days";
    } else if (ready.alreadyBelow) {
      $("stat-ready").textContent = "Now";
      $("stat-ready-sub").textContent = `Under ${s.threshold} mg`;
    } else {
      const day = fmtDayTime(ready.time, now).replace(fmtTime(ready.time), "").trim();
      $("stat-ready").textContent = fmtTime(ready.time);
      $("stat-ready-sub").textContent = `${day ? day + " · " : ""}in ${fmtDuration(ready.time - now)}`;
    }

    if (bed != null) {
      $("stat-bed-label").textContent = bed < now ? `At bedtime (${fmtTime(bed)}, passed)` : `At bedtime (${fmtTime(bed)})`;
      $("stat-bed").textContent = `${Math.round(bedMg)} mg`;
      const ok = bedMg <= s.threshold;
      $("stat-bed-sub").innerHTML = ok
        ? `<span class="status-icon ok" aria-hidden="true">✓</span> Under the ${s.threshold} mg threshold`
        : `<span class="status-icon warn" aria-hidden="true">!</span> ${Math.round(bedMg - s.threshold)} mg over the threshold`;
    }

    $("stat-total").textContent = `${Math.round(total24)} mg`;
    $("stat-total-sub").innerHTML = total24 > DAILY_LIMIT_MG
      ? `<span class="status-icon warn" aria-hidden="true">!</span> Over the 400 mg/day FDA guideline`
      : `of the 400 mg/day FDA guideline`;

    // Chart window: recent history through the sleep-ready point / bedtime
    const relevant = entries.filter((e) => e.time >= now - 24 * HOUR);
    const earliest = relevant.length ? Math.min(...relevant.map((e) => e.time)) - 30 * 60000 : now - 6 * HOUR;
    const start = Math.max(now - 24 * HOUR, Math.min(now - 6 * HOUR, earliest));
    let end = now + 12 * HOUR;
    if (ready && !ready.alreadyBelow) end = Math.max(end, ready.time + 2 * HOUR);
    if (bed != null) end = Math.max(end, bed + 2 * HOUR);
    end = Math.min(end, now + 36 * HOUR);
    const step = Math.max(2, Math.round((end - start) / HOUR / 6)); // sample spacing in minutes (2–6)
    const samples = Model.series(entries, start, end, step, s.halfLife);

    Chart.render({
      container: $("chart"), tooltip: $("tooltip"), samples, start, end, now, bed,
      threshold: s.threshold, sleepReady: ready,
      intakes: entries, entries, halfLife: s.halfLife, weightKg: weightKg(), model: Model,
    });

    renderTable(samples, now);
    renderLog(now);
    updateLastCall();
  }

  function renderTable(samples, now) {
    const hourly = [];
    let lastHour = null;
    for (const sm of samples) {
      const h = Math.floor(sm.t / HOUR);
      if (h !== lastHour) { hourly.push(sm); lastHour = h; }
    }
    $("table").innerHTML =
      `<table><thead><tr><th scope="col">Time</th><th scope="col">Caffeine (mg)</th></tr></thead><tbody>` +
      hourly.map((sm) => `<tr><td>${fmtDayTime(sm.t, now)}${sm.t > now ? " (projected)" : ""}</td><td>${Math.round(sm.mg)}</td></tr>`).join("") +
      `</tbody></table>`;
  }

  // ---------- wire up ----------
  buildDrinkGrid();
  buildSettings();
  $("drink-form").addEventListener("submit", addDrink);
  $("f-now").addEventListener("click", () => { $("f-time").value = toLocalInput(Date.now()); });
  $("f-size").addEventListener("change", () => {
    const size = selectedDrink.sizes[Number($("f-size").value)];
    $("f-mg").value = size.mg;
    $("f-dur").value = size.durationMin ?? selectedDrink.durationMin;
    updateLastCall();
  });
  // Which other settings people bother to change (the name only, never the value)
  for (const [id, setting] of [["s-half", "half-life-custom"], ["s-bed", "bedtime"], ["s-thr", "threshold"], ["s-weight", "weight"]]) {
    $(id).addEventListener("change", () => window.Analytics.track("setting-changed", { setting }));
  }
  document.querySelector(".table-view").addEventListener("toggle", (e) => {
    if (e.target.open) window.Analytics.track("table-view-opened");
  });
  $("f-mg").addEventListener("input", updateLastCall);
  $("f-dur").addEventListener("input", updateLastCall);
  $("clear-log").addEventListener("click", () => {
    if (confirm("Remove all logged drinks?")) { state.entries = []; save(); renderAll(); }
  });

  let resizeTimer;
  window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(renderAll, 120); });
  setInterval(renderAll, 60 * 1000); // keep "now" current
  renderAll();
})();
