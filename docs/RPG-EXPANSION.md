# RPG expansion

**Current direction:** Emberbrook: The Lost Harvest is a gameplay prototype. Course integration is paused pending group discussion. The areas and art below remain current; battle reports now show hits and damage without formulas.

## Connected world

```text
Elder’s House ← Emberbrook Village → Vulcan’s Forge
                        ↕
                Whispering Forest
                  ↙          ↘
       Stonebound Cavern    Ember Summit
```

Emberbrook is 44 × 30 terrain units, the forest 44 × 34, the cavern 28 × 26, the summit 32 × 30, and each interior 20 × 16. Terrain cells draw textures; the hero moves at continuous coordinates at 3.8 units per second. Diagonal input is normalized. Collision slides along each axis, and the camera follows the hero.

Pointer release, pointer cancellation, focus loss and menus stop movement. Transitions have a cooldown. The minimap shows exits and the hero. The Elder and smith live inside furnished houses. Props and actors draw in depth order.

## Supplied artwork

| Source archive | Used for |
| --- | --- |
| kiro 2.0.zip | Hero idle, walking, attack, hurt and death |
| pixel_medieval_dungeon_bundle.zip | Terrain, walls, doors, windows, furniture, well, market, fire and cave objects |
| slime_essentials_4_slimes_v1.zip | Blue slime idle, movement, attack, hurt and death |
| Fantasy_Creatures_Bundle.zip | Crystal Rune Golem and Emberwing Dragon |
| DebtsInTheDepthsAssets.zip | Goblin, wizard Elder and lizard monk smith |
| loot_essentials_24.zip | Potion inventory art and extracted item icons |

Original archives remain in assets/recipes/. Source README/license files are retained where included in the extraction. The fantasy creature pack declares CC0; other source notes remain alongside their assets. The extraction script validates destination paths.

The supplied hero and creature sheets are side-view art used in an overhead world and a side-view battle. Horizontal facing is mirrored. Procedural sprites remain as loading fallbacks. Trees and house roofs are canvas scenery; terrain, furnishings and characters use archive artwork.

## Battle reports

Attack uses a temporary timing mechanic. Item opens an inventory. Run succeeds 75% of the time against regular monsters and is unavailable against guardians. Failed escapes allow an enemy turn.

The battle canvas displays animated actors, lunges, hit flashes and floating damage. Victory, defeat and escape show a report. Battle details records the level, critical-hit status and damage of each attack. Formula explanations are paused until a course mechanic is agreed.

## Further calculus topics

When the course topic folder is supplied, review it against CalculusEngine in game.js, the worked examples in CALCULUS.md and strike recording in combat.js. Add topics where they govern or explain a real gameplay decision. No additional course topics have been assumed or added yet.

## Validation

Run `node --test tests/game.test.cjs`. Checks cover calculus, saves, turns, progression, menus, joystick, continuous position, house transitions, escape rules, recorded math, assets and reachable exits in all six areas.

Offline previews use the actual canvas code through optional @napi-rs/canvas. Responsive CSS and native touch behavior still need browser/device testing.
