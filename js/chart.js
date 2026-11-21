// Hand-built SVG chart: one series (caffeine in body, mg) over time, with
// a sleep-threshold reference line, "now" and "bedtime" markers, intake
// markers, and a crosshair + tooltip on hover.
(function (root) {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const M = { top: 28, right: 20, bottom: 54, left: 52 };

  function el(name, attrs, parent) {
    const node = document.createElementNS(SVG_NS, name);
    for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, v);
    if (parent) parent.appendChild(node);
    return node;
  }

  function niceStep(range, targetTicks) {
    const raw = range / targetTicks;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  }

  function fmtHour(ms) {
    return new Date(ms).toLocaleTimeString([], { hour: "numeric" });
  }

  function fmtTime(ms) {
    return new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  // opts: { container, tooltip, samples:[{t,mg}], start, end, now, bed,
  //         threshold, sleepReady, intakes:[{time,name,mg}], weightKg, model }
  function render(opts) {
    const { container, tooltip, samples, start, end, now, bed, threshold, sleepReady, intakes } = opts;
    container.innerHTML = "";
    const width = Math.max(320, container.clientWidth);
    const height = width < 560 ? 280 : 360;
    const iw = width - M.left - M.right;
    const ih = height - M.top - M.bottom;

    const peak = samples.reduce((m, s) => Math.max(m, s.mg), 0);
    const yStep = niceStep(Math.max(peak, threshold * 2, 50) * 1.12, 5);
    const yMax = Math.ceil((Math.max(peak, threshold * 2, 50) * 1.12) / yStep) * yStep;

    const x = (t) => M.left + ((t - start) / (end - start)) * iw;
    const y = (mg) => M.top + ih - (mg / yMax) * ih;

    const svg = el("svg", {
      viewBox: `0 0 ${width} ${height}`, width, height, class: "chart-svg",
      role: "img", "aria-label": "Caffeine in your body over time, in milligrams",
    }, container);

    // Grid + y axis labels
    const grid = el("g", { class: "grid" }, svg);
    for (let v = 0; v <= yMax + 1e-9; v += yStep) {
      el("line", { x1: M.left, x2: M.left + iw, y1: y(v), y2: y(v) }, grid);
      const label = el("text", { x: M.left - 8, y: y(v), class: "axis-label", "text-anchor": "end", "dominant-baseline": "middle" }, svg);
      label.textContent = Math.round(v);
    }
    const yTitle = el("text", { x: M.left - 8, y: M.top - 12, class: "axis-label", "text-anchor": "end" }, svg);
    yTitle.textContent = "mg";

    // X axis: hourly ticks with spacing that fits the width
    const spanH = (end - start) / 3.6e6;
    const pxPerHour = iw / spanH;
    const hourStep = [1, 2, 3, 4, 6, 12].find((s) => s * pxPerHour >= 56) || 12;
    const first = new Date(start);
    first.setMinutes(0, 0, 0);
    let tick = first.getTime() + 3.6e6;
    for (; tick <= end; tick += 3.6e6) {
      const d = new Date(tick);
      if (d.getHours() % hourStep !== 0) continue;
      const tx = x(tick);
      el("line", { x1: tx, x2: tx, y1: M.top + ih, y2: M.top + ih + 5, class: "tick" }, svg);
      const t = el("text", { x: tx, y: M.top + ih + 20, class: "axis-label", "text-anchor": "middle" }, svg);
      t.textContent = d.getHours() === 0 ? d.toLocaleDateString([], { weekday: "short" }) : fmtHour(tick);
    }
    el("line", { x1: M.left, x2: M.left + iw, y1: M.top + ih, y2: M.top + ih, class: "baseline" }, svg);

    // Future region tint: everything after "now" is a projection
    if (now > start && now < end) {
      el("rect", { x: x(now), y: M.top, width: M.left + iw - x(now), height: ih, class: "future" }, svg);
    }

    // Area + line
    const pts = samples.map((s) => `${x(s.t).toFixed(1)},${y(s.mg).toFixed(1)}`);
    el("path", { d: `M${x(samples[0].t)},${y(0)} L${pts.join(" L")} L${x(samples[samples.length - 1].t)},${y(0)} Z`, class: "area" }, svg);
    el("path", { d: `M${pts.join(" L")}`, class: "line" }, svg);

    // Sleep threshold reference line
    el("line", { x1: M.left, x2: M.left + iw, y1: y(threshold), y2: y(threshold), class: "threshold" }, svg);
    const thrLabel = el("text", { x: M.left + 6, y: y(threshold) - 6, class: "ref-label" }, svg);
    thrLabel.textContent = `Sleep threshold · ${threshold} mg`;

    // Vertical markers
    function vmarker(t, cls, text, anchorRight) {
      if (t < start || t > end) return;
      el("line", { x1: x(t), x2: x(t), y1: M.top, y2: M.top + ih, class: cls }, svg);
      const lbl = el("text", { x: x(t) + (anchorRight ? -4 : 4), y: M.top - 8, class: "ref-label", "text-anchor": anchorRight ? "end" : "start" }, svg);
      lbl.textContent = text;
    }
    // When the two markers are close, push their labels apart: the earlier one
    // reads leftward from its line, the later one rightward.
    const closeMarkers = bed != null && Math.abs(x(bed) - x(now)) < 130;
    vmarker(now, "now-line", "Now", closeMarkers ? now <= bed : false);
    if (bed != null) vmarker(bed, "bed-line", `Bedtime ${fmtTime(bed)}`, closeMarkers ? bed < now : x(bed) > M.left + iw - 110);

    // Sleep-ready point
    if (sleepReady && !sleepReady.alreadyBelow && sleepReady.time >= start && sleepReady.time <= end) {
      const sx = x(sleepReady.time), sy = y(threshold);
      el("circle", { cx: sx, cy: sy, r: 6, class: "ready-dot" }, svg);
      const lbl = el("text", { x: sx, y: sy + 20, class: "ready-label", "text-anchor": sx > M.left + iw - 80 ? "end" : "middle" }, svg);
      lbl.textContent = `✓ ${fmtTime(sleepReady.time)}`;
    }

    // Intake markers sit on the curve at the moment each drink was started
    const intakeG = el("g", { class: "intakes" }, svg);
    for (const it of intakes) {
      if (it.time < start || it.time > end) continue;
      const level = opts.model.amountAt(opts.entries, it.time, opts.halfLife);
      el("circle", { cx: x(it.time), cy: y(level), r: 5, class: "intake-dot" }, intakeG);
    }

    // Crosshair + tooltip
    const cross = el("line", { y1: M.top, y2: M.top + ih, class: "crosshair", visibility: "hidden" }, svg);
    const dot = el("circle", { r: 5, class: "hover-dot", visibility: "hidden" }, svg);
    const hit = el("rect", { x: M.left, y: M.top - 10, width: iw, height: ih + 40, class: "hit" }, svg);

    function hide() {
      cross.setAttribute("visibility", "hidden");
      dot.setAttribute("visibility", "hidden");
      tooltip.hidden = true;
    }

    function show(clientX) {
      const rect = svg.getBoundingClientRect();
      const px = ((clientX - rect.left) / rect.width) * width;
      const t = start + ((Math.min(Math.max(px, M.left), M.left + iw) - M.left) / iw) * (end - start);
      const mg = opts.model.amountAt(opts.entries, t, opts.halfLife);
      const cx = x(t), cy = y(mg);
      cross.setAttribute("x1", cx); cross.setAttribute("x2", cx);
      cross.setAttribute("visibility", "visible");
      dot.setAttribute("cx", cx); dot.setAttribute("cy", cy);
      dot.setAttribute("visibility", "visible");

      const near = intakes.filter((it) => Math.abs(x(it.time) - cx) < 8);
      const conc = opts.model.concentration(mg, opts.weightKg);
      tooltip.innerHTML =
        `<div class="tt-time">${fmtTime(t)}${t > now ? " · projected" : ""}</div>` +
        `<div class="tt-value"><span class="key-line"></span>${Math.round(mg)} mg</div>` +
        (conc != null ? `<div class="tt-sub">≈ ${conc.toFixed(1)} mg/L in blood</div>` : "") +
        near.map((it) => `<div class="tt-sub">● ${escapeHtml(it.name)} · ${Math.round(it.mg)} mg</div>`).join("");
      tooltip.hidden = false;
      const scale = rect.width / width;
      const tw = tooltip.offsetWidth;
      let left = cx * scale + 14;
      if (left + tw > rect.width) left = cx * scale - tw - 14;
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${Math.max(0, cy * scale - 30)}px`;
    }

    hit.addEventListener("pointermove", (e) => show(e.clientX));
    hit.addEventListener("pointerdown", (e) => show(e.clientX));
    hit.addEventListener("pointerleave", hide);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  root.CaffeineChart = { render, escapeHtml, fmtTime };
})(globalThis);
