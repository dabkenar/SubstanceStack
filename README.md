# SubstanceStack

A caffeine tracker that charts how much caffeine is in your body over time and
predicts when you'll be low enough to sleep.

- Log drinks (coffee, espresso, Celsius, black/green tea, yerba mate, soda,
  energy drinks, pills, or a custom amount), including how long you took to drink them
- See current caffeine, the projected curve, your level at bedtime, and when
  you'll drop below a sleep threshold
- "Last call": the latest time you can have a given drink and still sleep on time
- Personal half-life presets (smoker, oral contraceptives, pregnancy, etc.)
- Phone layout with bottom tabs and a slide-up "Add drink" sheet; installable
  to the home screen as an app (web app manifest + offline service worker)
- Anonymous, cookie-free usage stats via Umami (see the privacy note on the page)

The model is a one-compartment pharmacokinetic model with parameters taken
from published research. See [RESEARCH.md](RESEARCH.md) for details.

## Running it

It's a static site with no build step and no dependencies. Open `index.html` in a
browser, or serve the folder:

```
python -m http.server 8000
```

then visit http://localhost:8000. Drinks and settings are saved in your
browser's localStorage.
