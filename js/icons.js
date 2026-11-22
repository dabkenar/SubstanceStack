// Line-art drink icons (32×32, stroke = currentColor), keyed by drink id.
(function (root) {
  const wrap = (body) =>
    `<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

  const teaCup =
    '<path d="M5 14h17v3.5a7 7 0 0 1-7 7h-3a7 7 0 0 1-7-7z"/>' +
    '<path d="M22 15.5h2a3 3 0 0 1 0 6h-2.6"/>' +
    '<path d="M4 27.5h20"/>';

  const can =
    '<rect x="10" y="4.5" width="12" height="23" rx="2.5"/>' +
    '<path d="M11.5 8h9"/>';

  const ICONS = {
    coffee: wrap(
      '<path d="M6 12h16v8.5a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6z"/>' +
      '<path d="M22 14h2.5a3 3 0 0 1 0 6H22"/>' +
      '<path d="M11 4.5c-1 1.5 1 2.5 0 4.5M15 4.5c-1 1.5 1 2.5 0 4.5M19 4.5c-1 1.5 1 2.5 0 4.5"/>'
    ),
    espresso: wrap(
      '<path d="M9 14h12v3.5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z"/>' +
      '<path d="M21 15.5h1.5a2.25 2.25 0 0 1 0 4.5h-1.8"/>' +
      '<path d="M6 26c1.2 1.2 2.8 1.8 4.5 1.8h9c1.7 0 3.3-.6 4.5-1.8"/>' +
      '<path d="M15 6.5c-1 1.5 1 2.5 0 4.5"/>'
    ),
    celsius: wrap(can + '<path d="M10 15h12M10 19h12"/>'),
    energy: wrap(can + '<path d="M17.5 11.5l-3.5 5.5h4.5l-3.5 5.5"/>'),
    "black-tea": wrap(teaCup + '<path d="M13 14V8.5"/><rect x="11" y="4" width="4" height="4.5" rx="1"/>'),
    "green-tea": wrap(teaCup + '<path d="M11 11c0-3.5 3.5-6 8-6 0 4.5-3.5 7-8 6z"/><path d="M11 11l4.5-3.5"/>'),
    // Chawan bowl with a bamboo whisk.
    matcha: wrap(
      '<path d="M4 16h24c0 6-5.4 10-12 10S4 22 4 16z"/>' +
      '<path d="M12 28h8"/>' +
      '<path d="M22.5 3.5L19.5 10"/>' +
      '<path d="M19.5 10l-4 5M19.5 10l-1.2 5.5M19.5 10l1.6 5.3"/>'
    ),
    "yerba-mate": wrap(
      '<path d="M9 13c-2.2 3-2.2 8 1 11.2 3 3 9 3 12 0 3.2-3.2 3.2-8.2 1-11.2z"/>' +
      '<path d="M18 13l5-9h3"/>' +
      '<path d="M12 17.5c1.2-.8 2.6-1 4-.6"/>'
    ),
    soda: wrap(
      '<path d="M9 9h14l-1.8 17.2a2 2 0 0 1-2 1.8h-6.4a2 2 0 0 1-2-1.8z"/>' +
      '<path d="M17 9l3-6h3"/>' +
      '<circle cx="14" cy="16" r="1"/><circle cx="17.5" cy="20" r="1"/><circle cx="14.5" cy="23.5" r=".8"/>'
    ),
    pill: wrap(
      '<g transform="rotate(-35 16 16)"><rect x="4" y="11.5" width="24" height="9" rx="4.5"/><path d="M16 11.5v9"/></g>'
    ),
    custom: wrap('<circle cx="16" cy="16" r="10.5"/><path d="M16 11v10M11 16h10"/>'),

    // Alcohol page
    beer: wrap(
      '<path d="M8 10h12v15a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 8 25z"/>' +
      '<path d="M20 13h2.5a2.5 2.5 0 0 1 2.5 2.5v4a2.5 2.5 0 0 1-2.5 2.5H20"/>' +
      '<path d="M7.5 10c-1.5-3 1.5-5.5 4-4.2C12.8 3.6 16.4 3.4 18 5.6c2.3-.8 4.3 1.6 2.5 4.4"/>' +
      '<path d="M12 15v8M16 15v8"/>'
    ),
    wine: wrap(
      '<path d="M10 4h12l.5 6.5a6.5 6.5 0 0 1-13 0z"/>' +
      '<path d="M9.7 9.5h12.6"/>' +
      '<path d="M16 17v10M11.5 27.5h9"/>'
    ),
    shot: wrap(
      '<path d="M8 8h16l-2.2 18.2a2 2 0 0 1-2 1.8h-7.6a2 2 0 0 1-2-1.8z"/>' +
      '<path d="M9.2 17.5h13.6"/>'
    ),
    cocktail: wrap(
      '<path d="M5 6h22L16 17z"/>' +
      '<path d="M16 17v10M11.5 27.5h9"/>' +
      '<circle cx="20.5" cy="9.5" r="2"/><path d="M22 8l3.5-4.5"/>'
    ),
    seltzer: wrap(can + '<circle cx="14.5" cy="15" r="1"/><circle cx="17.5" cy="19.5" r="1"/><circle cx="14.5" cy="23" r=".8"/>'),
  };

  root.DrinkIcons = { ICONS, get: (id) => ICONS[id] || ICONS.custom };
})(globalThis);
