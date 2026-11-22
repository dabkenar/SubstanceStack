# Research behind the models

## Caffeine

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
yerba mate 150 mg / 15.5 oz). A full traditional mate gourd session (about 15
refills) is set to 260 mg, the midpoint of the 243–273 mg measured across a
15-serving session in a 2026 study in *Beverages* (MDPI). It defaults to
60 minutes of drinking. Matcha is stronger than steeped green tea because the
whole powdered leaf is drunk: commercial matchas measured 18.9–44.4 mg caffeine
per gram (Kochman et al., *Molecules*, 2021). A 2 g usucha is set to 70 mg and a
4 g koicha to 140 mg. Café matcha lattes are set to about 5 mg per oz (80 mg for
16 oz). Home-brewed coffee and tea vary by a factor of 2
or more, so every amount can be edited.

### Known limitations

- Food slows how fast the stomach empties, which can delay the peak. The model doesn't adjust for this.
- Half-life varies far more between people than any other factor. If you know you're sensitive to caffeine, choose the slow-metabolizer setting.
- Tolerance changes how strongly you feel caffeine, but not how fast you clear it. This model only tracks the amount in your body.
- Not medical advice.

## Alcohol

The alcohol page estimates blood alcohol concentration (BAC) with the **Widmark
model**, the standard forensic method, plus first-order absorption from the gut.
Each drink enters the gut at a steady rate over the time it takes to finish it.

```
grams       = volume (mL) × ABV × 0.789 g/mL          (14 g = 1 US standard drink)
BAC (g/dL)  = absorbed grams / (r × body weight in g) × 100 − β × time
```

Elimination is zero-order (a constant amount per hour), so doses don't simply add
together. BAC is therefore simulated minute by minute and never drops below 0.

| Parameter | Value | Evidence |
|---|---|---|
| Widmark factor r | 0.68 men, 0.55 women; "prefer not to say" uses 0.55 | Widmark's classic values for body water. The lower value gives a higher, more cautious BAC. |
| Elimination β | 0.015 %/h average; presets 0.010 / 0.015 / 0.020 | Hundreds of controlled studies give a mean of 0.015 g/dL/h, and most people fall between 0.010 and 0.025. Chronic heavy drinkers can reach 0.02–0.036 (Jones, 2010). |
| Absorption, empty stomach | ka = 6.0/h, 100% absorbed | BAC typically peaks 30–60 min after a drink on an empty stomach. |
| Absorption, with a meal | ka = 3.0/h, 85% absorbed | Food lowers the peak substantially. Peaks after a meal were about half the fasting value in controlled studies, and the area under the curve dropped by 45–60% (Jones & Jönsson, 1994). The model credits food with much less than that, to stay cautious. |

### Driving limit

0.08% is the per se limit in most of the US. Utah, most of Europe and Australia use
0.05%, US commercial drivers 0.04%, and many states apply about 0.02% to drivers
under 21. Impairment starts well below 0.08%. NHTSA describes a loss of judgment
and of the ability to track moving objects at 0.02%, and reduced coordination and
emergency response at 0.05%. The page says plainly that the estimate must never
be used to decide whether to drive.

### Sleep target

The default target is 0.00% (fully cleared) by bedtime. Alcohol helps you fall
asleep faster but fragments the second half of the night, and at moderate to high
doses it suppresses REM sleep (Ebrahim et al., 2013). In a within-person study of
4,098 adults, HRV-based overnight recovery fell by 9.3, 24.0 and 39.2 percentage
points after low (≤0.25 g/kg), moderate and high intake (Pietilä et al., 2018).
Even low amounts had a measurable effect. A 0.02% option is offered for people
who want a looser target.

### Drink sizes

Pours use common US values: 12 oz beer at 5%, 5 oz wine at 12%, and 1.5 oz of
80-proof spirits are each one standard drink (NIAAA). Cocktails list the whole
drink's volume with an effective ABV (for example, a margarita is about 1.7
standard drinks). Every value can be edited.

### Alcohol model limitations

- Real BAC varies by ±20% or more between people with the same weight. Body
  composition, genetics, medications, carbonation and drinking speed all matter.
- Near zero, the liver slows down (Michaelis–Menten kinetics), so the last few
  thousandths of a percent can take a little longer than the model shows.
- It estimates and cannot measure. It is not a breathalyzer and is not legal or
  medical advice.

## References

- Blanchard J, Sawers SJ. The absolute bioavailability of caffeine in man. *Eur J Clin Pharmacol*. 1983;24(1):93–98.
- Drake C, Roehrs T, Shambroom J, Roth T. Caffeine effects on sleep taken 0, 3, or 6 hours before going to bed. *J Clin Sleep Med*. 2013;9(11):1195–1200.
- Gardiner C, Weakley J, Burke LM, et al. The effect of caffeine on subsequent sleep: a systematic review and meta-analysis. *Sleep Med Rev*. 2023;69:101764.
- Institute of Medicine. *Caffeine for the Sustainment of Mental Task Performance*. National Academies Press; 2001. (Ch. 2, Pharmacology of caffeine.)
- Kochman J, Jakubczyk K, Antoniewicz J, Mruk H, Janda K. Health benefits and chemical composition of matcha green tea: a review. *Molecules*. 2021;26(1):85.
- Liguori A, Hughes JR, Grass JA. Absorption and subjective effects of caffeine from coffee, cola and capsules. *Pharmacol Biochem Behav*. 1997;58(3):721–726.
- Nehlig A. Interindividual differences in caffeine metabolism and factors driving caffeine consumption. *Pharmacol Rev*. 2018;70(2):384–411.
- U.S. FDA. Spilling the beans: how much caffeine is too much? (400 mg/day for healthy adults.)
- Ebrahim IO, Shapiro CM, Williams AJ, Fenwick PB. Alcohol and sleep I: effects on normal sleep. *Alcohol Clin Exp Res*. 2013;37(4):539–549.
- Jones AW. Evidence-based survey of the elimination rates of ethanol from blood with applications in forensic casework. *Forensic Sci Int*. 2010;200(1–3):1–20.
- Jones AW, Jönsson KÅ. Food-induced lowering of blood-ethanol profiles and increased rate of elimination immediately after a meal. *J Forensic Sci*. 1994;39(4):1084–1093.
- NHTSA. The ABCs of BAC: a guide to understanding blood alcohol concentration and alcohol impairment.
- NIAAA. What is a standard drink? (14 g of pure alcohol.)
- Pietilä J, Helander E, Korhonen I, et al. Acute effect of alcohol intake on cardiovascular autonomic regulation during the first hours of sleep in a large real-world sample of Finnish employees: observational study. *JMIR Ment Health*. 2018;5(1):e23.
- Widmark EMP. *Die theoretischen Grundlagen und die praktische Verwendbarkeit der gerichtlich-medizinischen Alkoholbestimmung*. Berlin: Urban & Schwarzenberg; 1932.
