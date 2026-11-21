// Caffeine pharmacokinetic model.
//
// One-compartment model, first-order absorption from the gut, first-order
// elimination (the Bateman function) — the standard model for oral caffeine.
// Key facts it rests on (full citations in RESEARCH.md):
//   * Oral bioavailability ~100%            (Blanchard & Sawers 1983)
//   * Liquid caffeine peaks ~40 min after drinking; coffee and cola peak at the
//     same time (42 vs 39 min); capsules peak later (~67 min) (Liguori et al. 1997)
//   * Elimination half-life ~5 h in healthy adults, range ~1.5–9.5 h; shorter in
//     smokers, roughly doubled by oral contraceptives, up to ~15 h late in
//     pregnancy (Nehlig 2018; Institute of Medicine 2001)
//
// Drinking time is modelled as a constant-rate input to the gut over the
// drinking duration, which is integrated exactly (no time-stepping error).
(function (root) {
  const HOUR_MS = 3600 * 1000;

  // Absorption rate constants (1/h), fitted so time-to-peak matches Liguori 1997
  // at a 5 h half-life: ka 5.5 -> Tmax ~41 min; ka 2.9 -> Tmax ~66 min.
  const KA = { beverage: 5.5, capsule: 2.9 };

  // Liters of distribution volume per kg body weight (caffeine Vd ~0.6–0.7 L/kg).
  const VD_L_PER_KG = 0.7;

  const HALF_LIFE_PRESETS = [
    { id: "typical", label: "Typical adult", hours: 5 },
    { id: "fast", label: "Smoker / fast metabolizer", hours: 3 },
    { id: "slow", label: "Slow metabolizer", hours: 8 },
    { id: "oc", label: "On oral contraceptives", hours: 10 },
    { id: "pregnant", label: "Pregnant (3rd trimester)", hours: 15 },
  ];

  function eliminationRate(halfLifeH) {
    const h = Math.min(24, Math.max(1.5, Number(halfLifeH) || 5));
    return Math.LN2 / h;
  }

  function kaFor(absorption) {
    return KA[absorption] || KA.beverage;
  }

  // Body amount (mg) dt hours after an instantaneous oral dose of 1 mg.
  function bolusUnit(dt, ka, k) {
    if (dt <= 0) return 0;
    return (ka / (ka - k)) * (Math.exp(-k * dt) - Math.exp(-ka * dt));
  }

  // Integral of bolusUnit(u) du for u in [a, b], a >= 0.
  function bolusUnitIntegral(a, b, ka, k) {
    if (b <= a) return 0;
    const c = ka / (ka - k);
    return c * ((Math.exp(-k * a) - Math.exp(-k * b)) / k - (Math.exp(-ka * a) - Math.exp(-ka * b)) / ka);
  }

  // Caffeine (mg) in the body at time tMs contributed by one entry.
  // entry: { mg, time (ms), durationMin, absorption }
  function entryAmountAt(entry, tMs, k) {
    const dt = (tMs - entry.time) / HOUR_MS;
    if (dt <= 0) return 0;
    const ka = kaFor(entry.absorption);
    const T = Math.max(0, Number(entry.durationMin) || 0) / 60;
    if (T < 1 / 120) return entry.mg * bolusUnit(dt, ka, k); // under 30 s: treat as one gulp
    // Dose spread evenly over [0, T]: average the bolus response over start times.
    const a = dt - Math.min(dt, T);
    return (entry.mg / T) * bolusUnitIntegral(a, dt, ka, k);
  }

  function amountAt(entries, tMs, halfLifeH) {
    const k = eliminationRate(halfLifeH);
    let sum = 0;
    for (const e of entries) sum += entryAmountAt(e, tMs, k);
    return sum;
  }

  // Evenly spaced samples [{t, mg}] from startMs to endMs inclusive.
  function series(entries, startMs, endMs, stepMin, halfLifeH) {
    const step = stepMin * 60 * 1000;
    const out = [];
    for (let t = startMs; t <= endMs + 1; t += step) out.push({ t, mg: amountAt(entries, t, halfLifeH) });
    return out;
  }

  function lastIntakeEnd(entries) {
    let end = -Infinity;
    for (const e of entries) end = Math.max(end, e.time + (Number(e.durationMin) || 0) * 60000);
    return end;
  }

  // First moment at/after fromMs after which caffeine stays at or below
  // thresholdMg. Returns { time, alreadyBelow } or null if it never gets there
  // within the search horizon.
  function sleepReadyTime(entries, fromMs, thresholdMg, halfLifeH) {
    const stepMs = 60 * 1000;
    // After the last intake has finished and peaked, the curve only falls,
    // so searching 6 half-lives past that point is enough.
    const tail = 6 * Math.min(24, Math.max(1.5, halfLifeH)) * HOUR_MS + 3 * HOUR_MS;
    const horizon = Math.max(fromMs, lastIntakeEnd(entries)) + tail;
    let lastAbove = null;
    for (let t = fromMs; t <= horizon; t += stepMs) {
      if (amountAt(entries, t, halfLifeH) > thresholdMg) lastAbove = t;
    }
    if (lastAbove === null) return { time: fromMs, alreadyBelow: true };
    if (lastAbove + stepMs > horizon) return null;
    // Refine the crossing between lastAbove and lastAbove + step.
    let lo = lastAbove, hi = lastAbove + stepMs;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      if (amountAt(entries, mid, halfLifeH) > thresholdMg) lo = mid; else hi = mid;
    }
    return { time: hi, alreadyBelow: false };
  }

  // Highest caffeine level over [startMs, endMs], sampled every stepMin minutes.
  function maxOver(entries, startMs, endMs, halfLifeH, stepMin) {
    const step = (stepMin || 10) * 60000;
    let m = 0;
    for (let t = startMs; t <= endMs; t += step) m = Math.max(m, amountAt(entries, t, halfLifeH));
    return m;
  }

  // Latest time (between fromMs and bedMs, 5-minute resolution) you could start
  // `drink` ({mg, durationMin, absorption}) and still be at or below the
  // threshold from bedtime through the next 8 hours. null = not possible.
  function lastCallTime(entries, drink, bedMs, thresholdMg, halfLifeH, fromMs) {
    const stepMs = 5 * 60000;
    const start = Math.ceil(fromMs / stepMs) * stepMs;
    const nightEnd = bedMs + 8 * HOUR_MS;
    let best = null;
    for (let t = start; t <= bedMs; t += stepMs) {
      const trial = entries.concat([{ ...drink, time: t }]);
      if (maxOver(trial, bedMs, nightEnd, halfLifeH, 10) <= thresholdMg) best = t;
      else break; // starting later only leaves more caffeine at night
    }
    return best;
  }

  // Estimated plasma concentration (mg/L) for a body amount, given weight in kg.
  function concentration(mg, weightKg) {
    if (!weightKg || weightKg <= 0) return null;
    return mg / (VD_L_PER_KG * weightKg);
  }

  const api = {
    HOUR_MS, KA, VD_L_PER_KG, HALF_LIFE_PRESETS,
    eliminationRate, kaFor, entryAmountAt, amountAt, series,
    sleepReadyTime, lastCallTime, maxOver, concentration, lastIntakeEnd,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.CaffeineModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
