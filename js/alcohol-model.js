// Blood alcohol (BAC) model. See RESEARCH.md for the evidence behind each number.
//
// Widmark model with first-order absorption:
//   - Each drink is absorbed at a steady rate over the time it takes to drink it,
//     and from the gut into the blood at a first-order rate (ka).
//   - Alcohol spreads through body water: BAC (g/dL) = grams / (r × weight in g) × 100,
//     where r is the Widmark factor (0.68 men, 0.55 women).
//   - The liver removes alcohol at a roughly constant rate (zero-order), about
//     0.015 g/dL per hour on average (range ~0.010–0.025).
// Zero-order elimination means doses don't simply add up, so BAC is simulated
// minute by minute instead of with a closed-form curve.
(function (root) {
  const HOUR_MS = 3600 * 1000;
  const ML_PER_OZ = 29.5735;
  const ETHANOL_G_PER_ML = 0.789;
  const GRAMS_PER_STANDARD_DRINK = 14; // US standard drink (NIAAA)

  // Widmark r. "Not specified" uses the female value, which gives the higher
  // (more cautious) BAC estimate.
  const WIDMARK_R = { male: 0.68, female: 0.55, unspecified: 0.55 };

  // Absorption rate constants. On an empty stomach BAC peaks about 30–60 min
  // after a single drink. Food mainly lowers the peak (it doesn't delay it much),
  // so a meal gets a slower rate plus a modest 15% reduction in the amount that
  // reaches the blood. Studies show bigger drops after food, so this stays cautious.
  const ABSORPTION = {
    empty: { ka: 6.0, f: 1.0 },
    food: { ka: 3.0, f: 0.85 },
  };

  const ELIMINATION_PRESETS = [
    { id: "slow", label: "Slower", rate: 0.010 },
    { id: "average", label: "Average", rate: 0.015 },
    { id: "fast", label: "Faster (regular heavy drinkers)", rate: 0.020 },
  ];

  const gramsFor = (oz, abvPct) => oz * ML_PER_OZ * (abvPct / 100) * ETHANOL_G_PER_ML;
  const standardDrinks = (grams) => grams / GRAMS_PER_STANDARD_DRINK;

  // Grams of a drink that have reached the blood by time tMs (before elimination).
  function absorbedGrams(entry, tMs) {
    const { ka, f } = ABSORPTION[entry.food ? "food" : "empty"];
    const t = (tMs - entry.time) / HOUR_MS;
    if (t <= 0) return 0;
    const dose = entry.grams * f;
    const T = (entry.durationMin || 0) / 60;
    if (T < 1 / 120) return dose * (1 - Math.exp(-ka * t)); // drunk at once
    // Zero-order intake over T hours, first-order absorption from the gut
    const u = Math.min(t, T);
    return (dose / T) * (u - (Math.exp(-ka * (t - u)) - Math.exp(-ka * t)) / ka);
  }

  // p: { r, weightKg, beta } → BAC sampled every stepMin minutes from start to end.
  // Returns { start, stepMs, v: number[] } and a valueAt(t) helper.
  function simulate(entries, p, start, end, stepMin = 1) {
    const stepMs = stepMin * 60000;
    const gramsToBac = 100 / (p.r * p.weightKg * 1000);
    const betaPerStep = p.beta * (stepMin / 60);
    // Start from before the first drink that could still matter, at BAC 0.
    const relevant = entries.filter((e) => e.time < end);
    const first = relevant.length ? Math.min(...relevant.map((e) => e.time)) : start;
    let t = Math.min(start, first);
    t = start - Math.ceil((start - t) / stepMs) * stepMs; // keep the grid aligned to start
    let bac = 0;
    let prevAbs = relevant.reduce((a, e) => a + absorbedGrams(e, t), 0);
    const v = [];
    for (; t <= end + 1e-6; t += stepMs) {
      if (t > start - stepMs / 2) v.push(bac);
      const next = t + stepMs;
      const abs = relevant.reduce((a, e) => a + absorbedGrams(e, next), 0);
      bac = Math.max(0, bac + (abs - prevAbs) * gramsToBac - betaPerStep);
      prevAbs = abs;
    }
    return {
      start, stepMs, v,
      valueAt(tMs) {
        const i = (tMs - start) / stepMs;
        if (i <= 0) return v[0] || 0;
        if (i >= v.length - 1) return v[v.length - 1] || 0;
        const lo = Math.floor(i);
        return v[lo] + (v[lo + 1] - v[lo]) * (i - lo);
      },
    };
  }

  // When BAC falls to `level` or below for good, scanning a simulation from fromMs.
  // Returns { time, alreadyBelow } or null if it's still above at the end.
  function timeBelow(sim, fromMs, level) {
    const i0 = Math.max(0, Math.ceil((fromMs - sim.start) / sim.stepMs));
    let lastAbove = -1;
    for (let i = i0; i < sim.v.length; i++) if (sim.v[i] > level) lastAbove = i;
    if (lastAbove === -1) return { time: fromMs, alreadyBelow: true };
    if (lastAbove === sim.v.length - 1) return null;
    // Interpolate the crossing inside the step
    const a = sim.v[lastAbove], b = sim.v[lastAbove + 1];
    const frac = a === b ? 1 : (a - level) / (a - b);
    return { time: sim.start + (lastAbove + frac) * sim.stepMs, alreadyBelow: false };
  }

  // The latest start time for `drink` ({grams, durationMin, food}) that keeps BAC
  // at or below `level` from targetMs onward. Null if even now is too late.
  function lastCallTime(entries, drink, p, targetMs, level, fromMs) {
    const ok = (start) => {
      const all = entries.concat([{ ...drink, time: start }]);
      const sim = simulate(all, p, targetMs, targetMs + 4 * HOUR_MS, 2);
      return sim.v.every((x) => x <= level);
    };
    if (targetMs <= fromMs || !ok(fromMs)) return null;
    // Later start → more alcohol left at the target, so bisect on the start time.
    let lo = fromMs, hi = targetMs;
    if (ok(hi)) return hi;
    for (let k = 0; k < 16 && hi - lo > 60000; k++) {
      const mid = (lo + hi) / 2;
      if (ok(mid)) lo = mid; else hi = mid;
    }
    return lo;
  }

  const api = {
    HOUR_MS, GRAMS_PER_STANDARD_DRINK, WIDMARK_R, ABSORPTION, ELIMINATION_PRESETS,
    gramsFor, standardDrinks, absorbedGrams, simulate, timeBelow, lastCallTime,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.AlcoholModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
