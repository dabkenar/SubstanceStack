// Drink catalog. Caffeine values are typical published figures — brands and
// home brewing vary, so every amount is editable in the UI.
// Sources: USDA FoodData Central (coffee, tea, espresso), CSPI Caffeine Chart
// (sodas, energy drinks), manufacturer labels (Celsius, Guayakí, Red Bull, Monster).
//
// `absorption` picks the absorption rate constant in model.js:
//   "beverage" – liquid caffeine (coffee, tea, soda, energy drinks)
//   "capsule"  – tablets/capsules, which peak later (Liguori et al. 1997)
// `durationMin` is the default time it takes to finish the drink. Sipping
// spreads the dose out, which delays and flattens the peak. A size can
// override it with its own `durationMin` (e.g. a mate gourd sipped for an hour).
(function (root) {
  const DRINKS = [
    {
      id: "coffee", name: "Coffee", absorption: "beverage", durationMin: 20,
      sizes: [
        { label: "8 oz brewed", mg: 95 },
        { label: "12 oz brewed", mg: 142 },
        { label: "16 oz brewed", mg: 190 },
        { label: "20 oz brewed", mg: 237 },
        { label: "16 oz cold brew", mg: 200 },
      ],
    },
    {
      id: "espresso", name: "Espresso", absorption: "beverage", durationMin: 3,
      sizes: [
        { label: "Single shot (1 oz)", mg: 63 },
        { label: "Double shot (2 oz)", mg: 126 },
      ],
    },
    {
      id: "celsius", name: "Celsius", absorption: "beverage", durationMin: 25,
      sizes: [
        { label: "12 oz can", mg: 200 },
        { label: "16 oz Essentials", mg: 270 },
      ],
    },
    {
      id: "black-tea", name: "Black tea", absorption: "beverage", durationMin: 20,
      sizes: [
        { label: "8 oz cup", mg: 47 },
        { label: "12 oz", mg: 70 },
        { label: "16 oz", mg: 94 },
      ],
    },
    {
      id: "green-tea", name: "Green tea", absorption: "beverage", durationMin: 20,
      sizes: [
        { label: "8 oz cup", mg: 28 },
        { label: "12 oz", mg: 42 },
        { label: "16 oz", mg: 56 },
      ],
    },
    {
      // Whole powdered leaf is drunk, so it's far stronger than steeped green tea:
      // 18.9–44.4 mg caffeine per gram of powder (Kochman et al., Molecules 2021 review).
      id: "matcha", name: "Matcha", absorption: "beverage", durationMin: 15,
      sizes: [
        { label: "Usucha (1 tsp, ~2 g)", mg: 70, durationMin: 10 },
        { label: "Koicha (thick, ~4 g)", mg: 140, durationMin: 10 },
        { label: "12 oz matcha latte", mg: 60 },
        { label: "16 oz matcha latte", mg: 80 },
      ],
    },
    {
      id: "yerba-mate", name: "Yerba mate", absorption: "beverage", durationMin: 25,
      sizes: [
        { label: "8 oz brewed", mg: 80 },
        { label: "15.5 oz can (Guayakí)", mg: 150 },
        // Full traditional session, ~15 refills: 243–273 mg measured (Beverages, 2026)
        { label: "Full gourd (~15 refills)", mg: 260, durationMin: 60 },
      ],
    },
    {
      id: "soda", name: "Soda", absorption: "beverage", durationMin: 20,
      sizes: [
        { label: "Coca-Cola 12 oz", mg: 34 },
        { label: "Coca-Cola 20 oz", mg: 57 },
        { label: "Coke Zero 12 oz", mg: 34 },
        { label: "Diet Coke 12 oz", mg: 46 },
        { label: "Pepsi 12 oz", mg: 38 },
        { label: "Dr Pepper 12 oz", mg: 41 },
        { label: "Mountain Dew 12 oz", mg: 54 },
      ],
    },
    {
      id: "energy", name: "Other energy drink", absorption: "beverage", durationMin: 20,
      sizes: [
        { label: "Red Bull 8.4 oz", mg: 80 },
        { label: "Red Bull 12 oz", mg: 114 },
        { label: "Monster 16 oz", mg: 160 },
      ],
    },
    {
      id: "pill", name: "Caffeine pill", absorption: "capsule", durationMin: 0,
      sizes: [
        { label: "100 mg", mg: 100 },
        { label: "200 mg", mg: 200 },
      ],
    },
    {
      id: "custom", name: "Custom", absorption: "beverage", durationMin: 15,
      sizes: [{ label: "Custom amount", mg: 100 }],
    },
  ];

  const api = { DRINKS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.Drinks = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
