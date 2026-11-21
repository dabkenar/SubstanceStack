# Research behind the caffeine model

SubstanceStack estimates the caffeine in your body with a **one-compartment
pharmacokinetic model**. Absorption from the gut and elimination are both
first-order (the Bateman function). Each drink goes into the gut at a steady
rate over the time it takes to finish, and all doses add together.

```
amount(t) = Σ dose · ka/(ka − ke) · (e^(−ke·Δt) − e^(−ka·Δt))     (averaged over the drinking period)
ke = ln 2 / half-life
```

## Parameters and where they come from

| Parameter | Value used | Evidence |
|---|---|---|
| Bioavailability | 100% | Oral caffeine is essentially completely absorbed (Blanchard & Sawers, 1983). |
| Absorption, drinks | ka = 5.5 /h (peak ≈ 41 min) | In Liguori et al. (1997), saliva caffeine peaked at 42 ± 5 min after coffee and 39 ± 5 min after cola, with no difference in peak level. The drink type did **not** change absorption, so every beverage (coffee, tea, mate, soda, energy drinks) uses the same rate. |
| Absorption, pills | ka = 2.9 /h (peak ≈ 66 min) | Capsules peaked later, at 67 ± 7 min (Liguori et al., 1997). |
| Half-life | 5 h default, adjustable 1.5–24 h | The average is about 4–5 h in healthy adults, with a wide range between people (about 1.5–9.5 h). Smoking speeds clearance, oral contraceptives roughly double the half-life, and late pregnancy lengthens it to about 15 h (Nehlig, 2018; Institute of Medicine, 2001). |
| Distribution volume | 0.7 L/kg | Used only to turn milligrams into an approximate blood concentration (mg/L). |
| Sleep threshold | 30 mg default | See below. |

### Choosing a sleep threshold

There is no single validated "safe" caffeine level for sleep. The default is
taken from **Gardiner et al. (2023)**, a meta-analysis of 24 studies. It
recommends drinking a coffee (107 mg) at least **8.8 h** before bed, and a
standard pre-workout (217.5 mg) at least **13.2 h** before bed, to avoid losing
total sleep time. Plugging those cutoffs into this model with a 5 h half-life
leaves **≈32 mg and ≈35 mg** in the body at bedtime. The two different doses
land on almost the same amount, which suggests that amount is a reasonable
target. This app rounds down to 30 mg, and you can change it in settings.

For context, **Drake et al. (2013)** found that 400 mg taken 0, 3 *or even 6*
hours before bed significantly disrupted sleep. At 6 h, total sleep dropped by
more than an hour.

### Caffeine content

Values are typical figures from USDA FoodData Central (coffee, espresso, tea),
the CSPI Caffeine Chart (sodas, energy drinks) and manufacturer labels
(Celsius 200 mg / 12 oz, Celsius Essentials 270 mg / 16 oz, Guayakí canned
yerba mate 150 mg / 15.5 oz). Home-brewed coffee and tea vary by a factor of 2
or more, so every amount can be edited.

### Known limitations

- Food slows how fast the stomach empties, which can delay the peak. The model doesn't adjust for this.
- Half-life varies far more between people than any other factor. If you know you're sensitive to caffeine, choose the slow-metabolizer setting.
- Tolerance changes how strongly you feel caffeine, but not how fast you clear it. This model only tracks the amount in your body.
- Not medical advice.

## References

- Blanchard J, Sawers SJ. The absolute bioavailability of caffeine in man. *Eur J Clin Pharmacol*. 1983;24(1):93–98.
- Drake C, Roehrs T, Shambroom J, Roth T. Caffeine effects on sleep taken 0, 3, or 6 hours before going to bed. *J Clin Sleep Med*. 2013;9(11):1195–1200.
- Gardiner C, Weakley J, Burke LM, et al. The effect of caffeine on subsequent sleep: a systematic review and meta-analysis. *Sleep Med Rev*. 2023;69:101764.
- Institute of Medicine. *Caffeine for the Sustainment of Mental Task Performance*. National Academies Press; 2001. (Ch. 2, Pharmacology of caffeine.)
- Liguori A, Hughes JR, Grass JA. Absorption and subjective effects of caffeine from coffee, cola and capsules. *Pharmacol Biochem Behav*. 1997;58(3):721–726.
- Nehlig A. Interindividual differences in caffeine metabolism and factors driving caffeine consumption. *Pharmacol Rev*. 2018;70(2):384–411.
- U.S. FDA. Spilling the beans: how much caffeine is too much? (400 mg/day for healthy adults.)
