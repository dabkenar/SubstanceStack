# SubstanceStack

Two trackers that chart a substance in your body over time:

- **Caffeine** (`index.html`, "morning coffee" day theme): how much caffeine is
  in your body and when you'll be low enough to sleep.
- **Alcohol** (`alcohol.html`, night theme): your estimated blood alcohol (BAC),
  when you'll be under the driving limit, and when you'll be fully cleared for
  sleep. It's an estimate only and must never be used to decide whether to drive.

Caffeine page:

- Log drinks (coffee, espresso, Celsius, black/green tea, yerba mate, soda,
  energy drinks, pills, or a custom amount), including how long you took to drink them
- See current caffeine, the projected curve, your level at bedtime, and when
  you'll drop below a sleep threshold
- "Last call": the latest time you can have a given drink and still sleep on time
- Personal half-life presets (smoker, oral contraceptives, pregnancy, etc.)
- Phone layout with bottom tabs and a slide-up "Add drink" sheet; installable
  to the home screen as an app (web app manifest + offline service worker)
- Anonymous, cookie-free usage stats via Umami (see the privacy note on the page)

Alcohol page:

- Log beer, wine, shots, cocktails, seltzer/cider or a custom drink by volume and
  ABV, with whether you ate; see standard drinks, BAC now, and when you'll be
  under your chosen driving limit (0.08/0.05/0.04/0.02%) and fully cleared
- Uses your sex and weight (Widmark body-water factor) and a clearance-rate preset

The caffeine model is a one-compartment pharmacokinetic model and the alcohol
model is the Widmark model with first-order absorption, both with parameters
taken from published research. See [RESEARCH.md](RESEARCH.md) for details.

## Running it

It's a static site with no build step and no dependencies. Open `index.html` in a
browser, or serve the folder:

```
python -m http.server 8000
```

then visit http://localhost:8000. Drinks and settings are saved in your
browser's localStorage.
