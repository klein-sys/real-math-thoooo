# Simple derivatives in Derivative Quest

**PAUSED DRAFT.** This describes the earlier experiment, not the active Emberbrook gameplay prototype. The group has not selected a course topic. The Forge and formula screens are unavailable during play, and combat uses separate temporary rules. Keep these examples for discussion; they are not final submission evidence.

## Forge: find the best build

Split 10 points between Strength x and Focus (10 − x).

1. Damage: D(x) = 6x(10 − x) = 60x − 6x², for 0 ≤ x ≤ 10.
2. Differentiate: D′(x) = 60 − 12x.
3. Set the slope to zero: 60 − 12x = 0, so x = 5.
4. D″(x) = −12 < 0, so the curve bends downward. Both endpoints give zero damage; D(5) = 150 is the global maximum.
5. At x = 3, damage is 126 and the slope is +24: add Strength. At x = 7, damage is also 126 and the slope is −24: add Focus. A balanced 5/5 build starts at maximum power.

The factor 6 keeps peak damage close to the previous game balance while leaving only a linear first derivative and a constant second derivative.

## Battle: release at the center

Let T be the charge duration in seconds and u = t/T be the elapsed fraction, from 0 to 1.

- Gauge fill: R(t) = 3u² − 2u³. This polynomial S-curve starts at 0 and ends at 1.
- Fill speed: R′(t) = 6u(1 − u)/T.
- Acceleration: R″(t) = (6 − 12u)/T².
- Set R″ = 0: u = 1/2, so t = T/2. Acceleration changes from positive to negative here, so this is both the inflection point and the fastest fill.
- Normalized timing score: R′ / maximum R′ = 4u(1 − u).
- Damage multiplier: 0.5 + 1.5 × score, from 0.5× at the endpoints to 2× at halfway.

For a normal 4-second charge, release at 2 seconds. A Level 1 hero with a 5/5 build deals round(150 × 0.6 × 2) = 180 damage at the center, versus 45 at either end. Critical hits allow a small timing margin (multiplier ≥ 1.8); only the exact center has R″ = 0. Dragon enrage shortens T to 3 seconds, while Sticky Goo multiplies the duration by 1.3.
