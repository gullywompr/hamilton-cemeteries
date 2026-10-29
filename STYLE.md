# Visual language

Extracted from the two finished infographic films (`hamilton_infographic.mp4`,
`hamilton_epidemics.mp4`). This is the owner's decision and is **not** open for
reinterpretation — the app should look like it belongs to the same project.

Everything below is a token, a rule or a measured value. **Layout, component
structure, framework and architecture are still yours.** This file says what
things look like, not how to build them.

---

## Palette

Dark surface only. The films have no light mode and the app does not need one
unless the owner asks.

### Base

| token | value | contrast on surface | use |
|---|---|---|---|
| `SURF`  | `#1a1a19` | — | page background. Near-black, slightly warm. Never pure `#000` |
| `INK`   | `#f0efec` | 15.15:1 | headings, primary values, the number that matters |
| `INK2`  | `#dad9cf` | 12.28:1 | body text, labels |
| `INK3`  | `#a3a29b` |  6.80:1 | source lines, axis ticks, `n=` annotations |
| `MUTE`  | `#55544f` |  2.30:1 | **non-data fills only** — deliberately recessive bars, "other" categories |
| `GRID`  | `#2b2b29` |  1.23:1 | gridlines, hairlines. Never text |

`MUTE` and `GRID` are below text contrast thresholds on purpose. Never put a
label in either.

### Series

Three primaries, used in this order. All three clear AA at normal text size
except `S2`, which is AA for large text and graphical objects.

| token | value | contrast | role in the films |
|---|---|---|---|
| `S1` | `#3987e5` | 4.79:1 | first series; in the epidemics film, adult-killing disease |
| `S2` | `#d95926` | 4.48:1 | accent and emphasis; kicker rules; child-killing disease |
| `S3` | `#199e70` | 5.11:1 | third series; "after" states, resolution |

Extended set, for categorical work needing more than three. Do not invent
colours outside this list.

| value | contrast | used for |
|---|---|---|
| `#e8a33d` | 8.08:1 | amber — fourth category |
| `#9ecbf5` | 10.21:1 | pale blue — a lighter relative of `S1` |
| `#b5845f` |  5.33:1 | tan |
| `#7b7a74` |  3.4:1  | grey, categorical "other / not recorded" |
| `#6f6f6b` |  2.9:1  | darker grey, fills only |
| `#e66767` |  5.6:1  | red. Reserved — used once, for Massive Resistance |

`#9ecbf5` exists because an earlier draft used `#7db8f0`, which sat too close
to `S1` to separate in a legend. If a category set needs two blues, use `S1`
and `#9ecbf5`, never an intermediate.

### Narration

Foot-of-scene prose is deliberately **not** the same ink as chart labels, so
narration reads as a separate layer from data.

| token | value | contrast | use |
|---|---|---|---|
| `NARR`  | `#ecdfc2` | 13.19:1 | the narration line that carries the point |
| `NARR2` | `#cdc2a6` |  9.84:1 | supporting narration beneath it |

Warm parchment, chosen to sit outside every data hue so it can never be
mistaken for a series.

---

## Type

```
SERIF = "DejaVu Serif", Georgia, serif
SANS  = "DejaVu Sans", Helvetica, Arial, sans-serif
```

Serif is used **only** for scene titles and big numbers. Everything else is
sans. The films were rendered headless, which is why DejaVu leads — on the web,
Georgia and a system sans stack are the right substitutes.

| role | size | font | weight | colour |
|---|---|---|---|---|
| kicker | 14 | sans | bold, UPPERCASE | `S2` |
| title | 44–46 | serif | bold | `INK` |
| big number | 120–150 | serif | bold | `INK` |
| lede | 21 | sans | regular | `INK2` |
| narration, primary | 21–25 | sans | regular + **bold run** | `NARR` |
| narration, supporting | 20 | sans | regular + **bold run** | `NARR2` |
| chart label | 15–17 | sans | regular | `INK2` |
| value label on a bar | 15–16 | sans | bold | series colour or `INK` |
| axis tick, `n=` | 13–14 | sans | regular | `INK3` |
| source line | 14 | sans | regular, 85% alpha | `INK3` |

### The kicker

A 34 × 2 px `S2` rule, 18 px above the baseline, then bold uppercase 14 px in
`S2`. It appears above every scene title. It is the single most recognisable
element of the films — keep it.

### Bold carries meaning

In narration, **bold marks the load-bearing phrase**, not emphasis for its own
sake. One phrase per line, the one a reader should leave with: *"**It was in
the water.**"*, *"**Sixty-four in August alone.**"*, *"**one in twenty-five.**"*

Bold runs are wider than the regular text they replace. The films measure the
assembled line and shrink it a point or two rather than let it overflow. Do the
equivalent — never clip.

---

## Layout

The films are a fixed 1280 × 720 canvas. The app is not, so treat these as
proportions and habits rather than pixel law.

- **Left margin 64 px.** Titles, kickers, narration and source lines all align
  to it. Nothing in the films is centred.
- **Source line at the foot**, prefixed `SOURCE  ` (two spaces), `INK3`, 85%
  alpha. Every scene has one. See *Rules* below — this is not decoration.
- **Callout block**: a 3 px vertical rule in `S2` (or `S3` when the content has
  resolved) at the left margin, with text indented 18 px from it.
- **Generous empty space.** No scene fills its frame. The charts sit in the
  upper two-thirds and narration occupies the lower band, with a clear gap.
- Charts are left-aligned to a label gutter, bars grow rightward, value labels
  sit just outside the bar end.

---

## Motion

Only if the app animates. Static is fine; the films move because they are films.

```
ease-out cubic:  1 - (1 - t)^3
fade in:         0.6–0.8 s
fade out:        0.5–0.8 s
stagger:         0.15–0.30 s between items in a series
```

Things appear by fading up and growing from their origin — bars from the axis,
lines drawn left to right, dots scaled in place. Nothing slides in from
offscreen. Nothing bounces.

Reveal order is meaningful: the chart draws, then the narration lands under it,
then the supporting line. In the films each narration line holds 7–16 seconds
before the scene changes, after the owner noted that an earlier cut moved too
fast to read.

---

## Rules that are not stylistic

These come from the films and from `CLAUDE.md`. They happen to be visual, but
they exist for honesty reasons and are not negotiable.

**Every view cites its source.** The films carry a `SOURCE` line naming the
file on every single scene. The app should be able to answer "where did this
come from" for anything it displays.

**Show `n`.** Where a percentage rests on a small denominator, the count is
printed beneath it — the cemetery chart prints `n=29` under the 1850s column
precisely because 52% of 29 is a weaker claim than 4% of 209. Never show a
proportion without making its base available.

**Recessive grey means "not data".** `MUTE` is how the films say a bar is
present but is not the subject — non-infectious causes, unmatched records. It
is never a series colour.

**Colour never carries meaning alone.** Every encoded distinction in the films
is also carried by position, label or text. Assume a viewer cannot distinguish
`S1` from `S3`.

**Absence is drawn, not omitted.** A zero is shown as a zero. A gap in the
record is shown as a gap with a note, never as a smooth interpolation.

---

## Tone

The films are grave without being lurid. Specific numbers, plain sentences,
no exclamation, no decorative flourish, no illustration of people. The material
includes slavery, a burning raid, epidemics that took four children from one
household, and a colour line that held for fifty years — the restraint is what
lets the data carry it.

Match that. Where a fact is sad, state it plainly and let it be sad.

---

## Reference implementations

`reference/film_timeline.html` and `reference/film_epidemics.html` are
single-file canvas renderers, roughly 300–450 lines each, with every token
above declared at the top. They are the ground truth for anything ambiguous
here. The palette descends from a validated dark-mode dataviz instance —
`#3987e5` / `#d95926` / `#199e70` on `#1a1a19`.
