# Emberbrook technical blueprint

Current stage: gameplay prototype. The group has not selected its calculus topic. The retained CalculusEngine and Forge UI are paused drafts, excluded from active combat and navigation.

Plain JavaScript, HTML Canvas and CSS. Open index.html with its adjacent files; production has no install or build step.

## Runtime order

1. world.js declares regions, entities, input, asset rendering, camera and exploration.
2. combat.js declares animation, inventory/run commands, encounter reports and captured math.
3. game.js initializes calculus, sound, saves, sprite fallbacks, dialogue, shops, progression and combat rules. It starts initWorld(), initCombat() and the animation loop.

These are regular browser scripts sharing global declarations. Keep this order. The main loop advances continuous movement, AI, world drawing and battle animation. The charge gauge has its own short-lived animation callback.

## World

WORLD defines region size, kind, spawn, doors, buildings and props. Entities belong to a region. enterMap() changes region, clears held input and saves. canStand() checks scenery, buildings, furniture and actors. nearbyTarget() selects an interaction; performInteraction() talks, fights or enters.

The camera transforms continuous coordinates into the viewport. Props and actors sort by ground position. Sprite strips have explicit frame counts. See [region and asset notes](RPG-EXPANSION.md).

## Temporary combat rules

PrototypeCombat in game.js provides temporary base power, level scaling, linear charge progress and timing bonuses. Active combat uses this boundary, allowing the group to replace a rule after agreeing on a topic. Old Strength allocations do not affect this version. CalculusEngine and [its examples](CALCULUS.md) remain for reference only.

activeBattle.playerTurn and isGaugeRunning guard actions. Strikes and items use one turn. Failed escapes use one turn; successful escapes award no rewards. Boss escape is blocked. Non-damaging effects last complete affected turns; poison and burn tick at the start of a player turn.

recordStrike() captures level, critical-hit status, damage and debug status. finishBattle() clears the encounter and shows Battle details. The How to play guide covers the adventure; formula and Forge screens are blocked by openModal().

## Saves

dq2 stores progression, economy, region, continuous coordinates and worldVersion. dq2c stores cast names/emojis. Loading validates known fields and defaults invalid values. Legacy positions migrate to Emberbrook while progression stays intact. Blocked storage produces a notice. User names are escaped before insertion into formatted HTML.

## Checks

Run `node --test tests/game.test.cjs`. Tests execute the runtime scripts in a browser substitute and inspect PNG dimensions. They cover boss progression, action locking, saves, input, portals, escape rules, reports, HTML nesting, asset paths and reachable exits.

tools/render-preview.cjs optionally renders canvas previews with @napi-rs/canvas. It does not test browser layout. tools/extract-assets.ps1 recreates selected artwork from the original archives.
