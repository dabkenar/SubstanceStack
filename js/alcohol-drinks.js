// Alcoholic drink catalog: each size is a volume (oz) and strength (% ABV).
// Grams of alcohol = oz × 29.57 mL × ABV × 0.789 g/mL; 14 g is one US standard
// drink (NIAAA). Cocktails list the whole drink's volume with its effective ABV.
// Every value is editable in the UI, so people can match their actual pour.
(function (root) {
  const DRINKS = [
    {
      id: "beer", name: "Beer", durationMin: 30,
      sizes: [
        { label: "Regular 12 oz", oz: 12, abv: 5 },
        { label: "Pint 16 oz", oz: 16, abv: 5 },
        { label: "Light beer 12 oz", oz: 12, abv: 4.2 },
        { label: "IPA 12 oz", oz: 12, abv: 7 },
        { label: "IPA pint 16 oz", oz: 16, abv: 7 },
      ],
    },
    {
      id: "wine", name: "Wine", durationMin: 30,
      sizes: [
        { label: "Standard pour 5 oz", oz: 5, abv: 12 },
        { label: "Restaurant pour 6 oz", oz: 6, abv: 13.5 },
        { label: "Large pour 9 oz", oz: 9, abv: 13.5 },
        { label: "Bottle 25 oz", oz: 25.4, abv: 13, durationMin: 120 },
      ],
    },
    {
      id: "shot", name: "Shot", durationMin: 1,
      sizes: [
        { label: "Shot 1.5 oz (80 proof)", oz: 1.5, abv: 40 },
        { label: "Double 3 oz (80 proof)", oz: 3, abv: 40 },
      ],
    },
    {
      id: "cocktail", name: "Cocktail", durationMin: 30,
      sizes: [
        { label: "Mixed drink, 1.5 oz liquor", oz: 8, abv: 7.5 },
        { label: "Margarita", oz: 6, abv: 17 },
        { label: "Martini", oz: 3, abv: 30 },
        { label: "Long Island iced tea", oz: 10, abv: 15 },
      ],
    },
    {
      id: "seltzer", name: "Seltzer / cider", durationMin: 25,
      sizes: [
        { label: "Hard seltzer 12 oz", oz: 12, abv: 5 },
        { label: "Strong seltzer 12 oz", oz: 12, abv: 8 },
        { label: "Hard cider 12 oz", oz: 12, abv: 5.5 },
      ],
    },
    {
      id: "custom", name: "Custom", durationMin: 20,
      sizes: [{ label: "Custom drink", oz: 12, abv: 5 }],
    },
  ];

  root.AlcoholDrinks = { DRINKS };
})(globalThis);
