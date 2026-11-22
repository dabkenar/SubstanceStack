(function () {
  const { DRINKS } = window.AlcoholDrinks;
  const Model = window.AlcoholModel;
  const Chart = window.CaffeineChart;
  const Shell = window.AppShell;
  const A = window.Analytics;
  const { fmtTime, fmtDayTime, fmtDuration, toLocalInput, phoneQuery } = Shell;
  const STORAGE_KEY = "substancestack.alcohol.v1";
  const HOUR = Model.HOUR_MS;
  const PLACEHOLDER_LB = 160;
  // A BAC this small rounds to 0.00% and is treated as fully cleared.
  const CLEARED = 0.004;

  const DEFAULT_SETTINGS = {
    sex: "unspecified", weightLb: null, elimination: "average",
    limit: 0.08, bedtime: "23:00", sleepTarget: 0,
  };

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
    // Even a heavy night is fully cleared within 2 days.
    const cutoff = Date.now() - 48 * HOUR;
    state.entries = state.entries.filter((e) => e.time >= cutoff);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  // ---------- helpers ----------
  const $ = (id) => document.getElementById(id);
  const esc = Chart.escapeHtml;
  const fmtBac = (v, digits = 3) => `${(Math.max(0, v)).toFixed(digits)}%`;
  const fmtStd = (n) => (n < 9.95 ? n.toFixed(1) : String(Math.round(n)));
  const plural = (n, word) => `${word}${Math.abs(n - 1) < 0.05 ? "" : "s"}`;
  const upcomingBedtime = (now) => Shell.upcomingBedtime(state.settings.bedtime, now);
  const sleepLevel = () => Math.max(state.settings.sleepTarget, CLEARED);
  const limitLabel = () => state.settings.limit.toFixed(2);

  function params() {
    const s = state.settings;
    const lb = Number(s.weightLb) > 0 ? Number(s.weightLb) : PLACEHOLDER_LB;
    const elim = Model.ELIMINATION_PRESETS.find((p) => p.id === s.elimination) || Model.ELIMINATION_PRESETS[1];
    return { r: Model.WIDMARK_R[s.sex] || Model.WIDMARK_R.unspecified, weightKg: lb * 0.453592, beta: elim.rate };
  }

  // Coarse range for analytics
  function stdRange(n) {
    return n < 1 ? "<1" : n < 2 ? "1-2" : n < 3 ? "2-3" : n < 5 ? "3-5" : "5+";
  }

  // ---------- drink picker ----------
  function buildDrinkGrid() {
    const grid = $("drink-grid");
    for (const d of DRINKS) {
      const s0 = d.sizes[0];
      const std = Model.standardDrinks(Model.gramsFor(s0.oz, s0.abv));
      const b = document.createElement("button");
      b.type = "button";
      b.className = "drink-btn";
      b.dataset.id = d.id;
      b.setAttribute("aria-pressed", "false");
      b.innerHTML =
        `<span class="drink-icon">${window.DrinkIcons.get(d.id)}</span>` +
        `<span class="drink-name">${esc(d.name)}</span>` +
        `<span class="drink-mg">${d.id === "custom" ? "any drink" : `${fmtStd(std)} std ${plural(std, "drink")}+`}</span>`;
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
      o.textContent = id === "custom" ? s.label : `${s.label} · ${s.abv}%`;
      sel.appendChild(o);
    });
    applySize(selectedDrink.sizes[0]);
    $("f-time").value = toLocalInput(Date.now());
    $("drink-form").hidden = false;
    updateForm();
    if (phoneQuery.matches) $("drink-form").scrollIntoView({ behavior: "smooth", block: "start" });
    A.track("alcohol-drink-selected", { drink: id });
  }

  function applySize(size) {
    $("f-oz").value = size.oz;
    $("f-abv").value = size.abv;
    $("f-dur").value = size.durationMin ?? selectedDrink.durationMin;
  }

  function formDrink() {
    if (!selectedDrink) return null;
    const oz = Number($("f-oz").value);
    const abv = Number($("f-abv").value);
    const dur = Number($("f-dur").value);
    if (!(oz > 0) || !(abv > 0 && abv <= 95) || !(dur >= 0)) return null;
    return { oz, abv, grams: Model.gramsFor(oz, abv), durationMin: dur, food: $("f-food").checked };
  }

  function updateForm() {
    const d = formDrink();
    $("f-summary").textContent = d
      ? `= ${fmtStd(Model.standardDrinks(d.grams))} standard ${plural(Model.standardDrinks(d.grams), "drink")} (${Math.round(d.grams)} g of alcohol)`
      : "";
    updateLastCall();
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
      name: selectedDrink.id === "custom" ? "Custom drink" : `${selectedDrink.name} (${size.label})`,
      time, ...d,
    });
    save();
    const nowMs = Date.now();
    A.track("alcohol-drink-added", {
      drink: selectedDrink.id,
      size: size.label,
      std_range: stdRange(Model.standardDrinks(d.grams)),
      edited: d.oz !== size.oz || d.abv !== size.abv ? "yes" : "no",
      with_food: d.food ? "yes" : "no",
      timing: time > nowMs + 5 * 60000 ? "planned" : time < nowMs - 15 * 60000 ? "backdated" : "now",
      day_part: A.dayPart(time),
    });
    $("f-time").value = toLocalInput(Date.now());
    renderAll();
    Shell.afterAdd(selectedDrink.id === "custom" ? "Drink" : selectedDrink.name);
  }

  // "If you start this now" and "latest start" messages for the selected drink.
  function updateLastCall() {
    const out = $("last-call");
    const d = formDrink();
    if (!d) { out.textContent = ""; return; }
    const now = Date.now();
    const p = params();
    const s = state.settings;
    const all = state.entries.concat([{ ...d, time: now }]);
    const sim = Model.simulate(all, p, now, now + 36 * HOUR, 2);
    const drive = Model.timeBelow(sim, now, s.limit - 1e-9);
    const clear = Model.timeBelow(sim, now, sleepLevel());
    const lines = [];
    const fmtWhen = (r) => (r ? (r.alreadyBelow ? "right away" : `about ${fmtDayTime(r.time, now)}`) : "not within 36 h");
    lines.push(`If you start it now: under ${limitLabel()}% ${fmtWhen(drive)}, fully cleared ${fmtWhen(clear)}.`);

    const bed = upcomingBedtime(now);
    if (bed != null && bed > now) {
      const t = Model.lastCallTime(state.entries, d, p, bed, sleepLevel(), now);
      const target = s.sleepTarget > 0 ? `${s.sleepTarget.toFixed(2)}%` : "0.00%";
      lines.push(t == null
        ? `<span class="status-icon warn" aria-hidden="true">!</span> Too late for this one to clear to ${target} by bedtime (${fmtTime(bed)}).`
        : `<span class="status-icon ok" aria-hidden="true">✓</span> Latest start to be at ${target} by bedtime (${fmtTime(bed)}): <strong>${fmtDayTime(t, now)}</strong>.`);
    }
    out.innerHTML = lines.join("<br>");
  }

  // ---------- log ----------
  function renderLog(now) {
    const list = $("log");
    list.innerHTML = "";
    const recent = state.entries.filter((e) => e.time >= now - 48 * HOUR).sort((a, b) => b.time - a.time);
    $("log-empty").hidden = recent.length > 0;
    $("clear-log").hidden = recent.length === 0;
    for (const e of recent) {
      const std = Model.standardDrinks(e.grams);
      const li = document.createElement("li");
      li.innerHTML =
        `<div><div class="log-name">${esc(e.name)}</div>` +
        `<div class="log-meta">${fmtDayTime(e.time, now)} · ${e.oz} oz at ${e.abv}%${e.durationMin ? ` · over ${e.durationMin} min` : ""}${e.food ? " · with food" : ""}${e.time > now ? " · planned" : ""}</div></div>` +
        `<div class="log-right"><span class="log-mg">${fmtStd(std)} std</span>` +
        `<button type="button" class="btn-icon" aria-label="Remove ${esc(e.name)}">✕</button></div>`;
      li.querySelector("button").addEventListener("click", () => {
        state.entries = state.entries.filter((x) => x.id !== e.id);
        save();
        A.track("alcohol-drink-removed", { drink: e.drinkId });
        renderAll();
      });
      list.appendChild(li);
    }
  }

  // ---------- settings ----------
  function buildSettings() {
    const s = state.settings;
    const elim = $("s-elim");
    for (const p of Model.ELIMINATION_PRESETS) {
      const o = document.createElement("option");
      o.value = p.id;
      o.textContent = `${p.label} (${p.rate.toFixed(3)}%/h)`;
      elim.appendChild(o);
    }
    const fill = () => {
      $("s-sex").value = s.sex;
      $("s-weight").value = s.weightLb || "";
      elim.value = s.elimination;
      $("s-limit").value = String(s.limit);
      $("s-bed").value = s.bedtime;
      $("s-sleep").value = String(s.sleepTarget);
      $("setup-sex").value = s.sex;
      $("setup-weight").value = s.weightLb || "";
      $("setup-card").hidden = Number(s.weightLb) > 0;
    };
    fill();

    const changed = (setting, extra) => {
      save(); fill(); renderAll();
      A.track("alcohol-setting-changed", { setting, ...extra });
    };
    $("s-sex").addEventListener("change", () => { s.sex = $("s-sex").value; changed("sex"); });
    $("s-weight").addEventListener("change", () => {
      const v = Number($("s-weight").value);
      s.weightLb = v >= 60 && v <= 600 ? v : null;
      changed("weight");
    });
    elim.addEventListener("change", () => { s.elimination = elim.value; changed("clearance", { preset: elim.value }); });
    $("s-limit").addEventListener("change", () => { s.limit = Number($("s-limit").value); changed("driving-limit", { preset: $("s-limit").value }); });
    $("s-bed").addEventListener("change", () => { if ($("s-bed").value) { s.bedtime = $("s-bed").value; changed("bedtime"); } });
    $("s-sleep").addEventListener("change", () => { s.sleepTarget = Number($("s-sleep").value); changed("sleep-target", { preset: $("s-sleep").value }); });

    $("setup-save").addEventListener("click", () => {
      const v = Number($("setup-weight").value);
      if (!(v >= 60 && v <= 600)) { $("setup-weight").focus(); return; }
      s.sex = $("setup-sex").value;
      s.weightLb = v;
      changed("setup");
    });
  }

  // ---------- main render ----------
  function renderAll() {
    const now = Date.now();
    const s = state.settings;
    const entries = state.entries;
    const p = params();
    const bed = upcomingBedtime(now);

    // Simulate far enough ahead to find when everything clears.
    const relevant = entries.filter((e) => e.time >= now - 24 * HOUR);
    const earliest = relevant.length ? Math.min(...relevant.map((e) => e.time)) - 30 * 60000 : now - 6 * HOUR;
    const start = Math.max(now - 24 * HOUR, Math.min(now - 6 * HOUR, earliest));
    const sim = Model.simulate(entries, p, start, now + 36 * HOUR, 1);
    const nowBac = sim.valueAt(now);
    const drive = Model.timeBelow(sim, now, s.limit - 1e-9);
    const clear = Model.timeBelow(sim, now, sleepLevel());
    const std24 = Model.standardDrinks(
      entries.filter((e) => e.time >= now - 24 * HOUR && e.time <= now).reduce((a, e) => a + e.grams, 0));

    // Stat: now
    $("stat-now").textContent = fmtBac(nowBac);
    const in20 = sim.valueAt(now + 20 * 60000);
    const trend = in20 > nowBac + 0.0005 ? "rising" : in20 < nowBac - 0.0005 ? "falling" : "steady";
    const placeholder = Number(s.weightLb) > 0 ? "" : " · placeholder weight";
    $("stat-now-sub").textContent = nowBac < CLEARED ? `Nothing active${placeholder}` : `${trend}${placeholder}`;

    // Stat: driving limit
    $("stat-drive-label").textContent = `Under ${limitLabel()}% driving limit`;
    setTimeStat("stat-drive", drive, now, `Not a sign it's safe to drive`);

    // Stat: sleep
    const sleepTarget = s.sleepTarget > 0 ? `${s.sleepTarget.toFixed(2)}%` : "0.00%";
    $("stat-sleep-label").textContent = s.sleepTarget > 0 ? `Under ${sleepTarget} for sleep` : "Fully cleared for sleep";
    setTimeStat("stat-sleep", clear, now, `At ${sleepTarget}`);
    if (bed != null && bed > now && clear && !clear.alreadyBelow) {
      const ok = clear.time <= bed;
      $("stat-sleep-sub").innerHTML = ok
        ? `<span class="status-icon ok" aria-hidden="true">✓</span> Before bedtime (${fmtTime(bed)})`
        : `<span class="status-icon warn" aria-hidden="true">!</span> ${fmtDuration(clear.time - bed)} after bedtime`;
    }

    // Stat: standard drinks
    $("stat-total").textContent = fmtStd(std24);
    const binge = s.sex === "male" ? 5 : 4;
    $("stat-total-sub").innerHTML = std24 >= binge
      ? `<span class="status-icon warn" aria-hidden="true">!</span> At or above binge level (${binge}+)`
      : `Binge level: ${binge}+ in ~2 h`;

    // Chart window
    let end = now + 10 * HOUR;
    if (clear && !clear.alreadyBelow) end = Math.max(end, clear.time + 1.5 * HOUR);
    if (bed != null) end = Math.max(end, bed + 2 * HOUR);
    end = Math.min(end, now + 36 * HOUR);
    const step = Math.max(2, Math.round((end - start) / HOUR / 6));
    const samples = [];
    for (let t = start; t <= end; t += step * 60000) samples.push({ t, v: sim.valueAt(t) });

    const points = [];
    if (drive && !drive.alreadyBelow && s.limit > 0) {
      points.push({ time: drive.time, value: s.limit, label: `Under ${limitLabel()} · ${fmtTime(drive.time)}`, cls: "drive-dot", labelCls: "drive-label", labelRight: true });
    }
    if (clear && !clear.alreadyBelow) {
      points.push({ time: clear.time, value: s.sleepTarget, label: `✓ ${s.sleepTarget > 0 ? sleepTarget : "Cleared"} · ${fmtTime(clear.time)}`, cls: "ready-dot", labelCls: "ready-label", labelRight: true });
    }
    const refLines = [{ value: s.limit, label: `Driving limit · ${limitLabel()}%` }];
    if (s.sleepTarget > 0) refLines.push({ value: s.sleepTarget, label: `Sleep target · ${sleepTarget}` });

    Chart.render({
      container: $("chart"), tooltip: $("tooltip"), samples, start, end, now, bed,
      intakes: entries, valueAt: sim.valueAt,
      unit: "BAC %", ariaLabel: "Estimated blood alcohol concentration over time, in percent",
      minYMax: Math.max(s.limit * 1.25, 0.06),
      fmtAxis: (v) => (Math.round(v * 1000) % 10 ? v.toFixed(3) : v.toFixed(2)), // 0.025 stays 0.025
      fmtValue: (v) => `${fmtBac(v)} BAC`,
      tooltipSubs: (v) => [v >= s.limit ? `Over the ${limitLabel()}% limit` : v >= CLEARED ? `Under ${limitLabel()}%, still impaired` : "Cleared"],
      fmtIntake: (it) => `${fmtStd(Model.standardDrinks(it.grams))} std`,
      refLines, points,
    });

    renderTable(samples, now);
    renderLog(now);
    updateLastCall();

  }

  function setTimeStat(id, r, now, belowText) {
    if (!r) {
      $(id).textContent = "—";
      $(`${id}-sub`).textContent = "Not within 36 hours";
    } else if (r.alreadyBelow) {
      $(id).textContent = "Now";
      $(`${id}-sub`).textContent = belowText;
    } else {
      const day = fmtDayTime(r.time, now).replace(fmtTime(r.time), "").trim();
      $(id).textContent = fmtTime(r.time);
      $(`${id}-sub`).textContent = `${day ? day + " · " : ""}in ${fmtDuration(r.time - now)}`;
    }
  }

  function renderTable(samples, now) {
    const rows = [];
    let lastSlot = null;
    for (const sm of samples) {
      const slot = Math.floor(sm.t / (HOUR / 2)); // every 30 min
      if (slot !== lastSlot) { rows.push(sm); lastSlot = slot; }
    }
    $("table").innerHTML =
      `<table><thead><tr><th scope="col">Time</th><th scope="col">Estimated BAC</th></tr></thead><tbody>` +
      rows.map((sm) => `<tr><td>${fmtDayTime(sm.t, now)}${sm.t > now ? " (projected)" : ""}</td><td>${fmtBac(sm.v)}</td></tr>`).join("") +
      `</tbody></table>`;
  }

  // ---------- wire up ----------
  buildDrinkGrid();
  buildSettings();
  $("drink-form").addEventListener("submit", addDrink);
  $("f-now").addEventListener("click", () => { $("f-time").value = toLocalInput(Date.now()); });
  $("f-size").addEventListener("change", () => {
    applySize(selectedDrink.sizes[Number($("f-size").value)]);
    updateForm();
  });
  for (const id of ["f-oz", "f-abv", "f-dur"]) $(id).addEventListener("input", updateForm);
  $("f-food").addEventListener("change", updateForm);
  $("clear-log").addEventListener("click", () => {
    if (confirm("Remove all logged drinks?")) { state.entries = []; save(); renderAll(); }
  });

  Shell.init({ render: renderAll });
  renderAll();

  // ---------- anonymous analytics: per-visit properties + opening state ----------
  (function reportVisit() {
    const now = Date.now();
    const s = state.settings;
    const recent = state.entries.filter((e) => e.time >= now - 48 * HOUR);
    // Nothing derived from BAC is sent, only whether any drinks are logged.
    A.track("alcohol-opened", {
      status: recent.length ? "has-drinks" : "no-drinks",
      log_size: A.countRange(recent.length),
      weight_set: Number(s.weightLb) > 0 ? "yes" : "no",
      layout: phoneQuery.matches ? "phone" : "desktop",
      day_part: A.dayPart(now),
    });
  })();
})();
