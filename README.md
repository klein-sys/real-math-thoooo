# Emberbrook: The Lost Harvest — Gameplay Prototype

A browser RPG for MATH 101, using a working title while the group develops the game design. Explore Emberbrook, visit its houses, train in the forest, and defeat the Stone Golem and Ember Dragon. The course topic is undecided; current combat values are temporary playtest rules.

## Play

Open `index.html` in a modern browser. Keep the JavaScript, CSS and `assets/game/` folders beside it. No install or build is needed to play.

- **Move:** hold WASD / arrow keys, or drag the joystick. Movement is continuous, with diagonal movement, collision and a following camera.
- **Interact:** E / Space, the Action button or the nearby prompt. Walk through a marked doorway to enter or leave.
- **Meet the Elder:** enter the blue-roofed house on the left.
- **Heal and shop:** enter the blacksmith’s red-roofed house on the right.
- **Travel:** take the village’s north path into Whispering Forest. Stonebound Cavern is northwest; Ember Summit is northeast.

## Battles

- **Guard:** take 65% less direct damage on the next enemy turn. Your next strike deals 35% more damage.

- **Attack:** charge, then release at the center for the strongest hit.
- **Item:** open your inventory and use a healing potion. It restores 40 HP and uses your turn.
- **Run:** 75% chance to escape forest monsters. Failure uses your turn. Guardians block escape.
- **After the fight:** choose **Battle details** to review hits and damage, then **Continue adventure** to return to exploring.
- **Help:** open **How to play** for controls, preparation and travel advice.

Reach Level 3 before fighting the Golem. Defeat the Golem and reach Level 5 to enter the volcano. Losing returns you to Emberbrook with full HP and half your gold.

## Exploration and visuals

Hold Shift while moving to sprint. Open the marked supply caches in Emberbrook, Whispering Forest, and Stonebound Cavern for one potion and 15 gold each. Claimed caches stay open across saves.

Emberbrook has an original illustrated map generated with ImageGen. Its layout follows the prompt for a warm woodland village with two distinct cottages, a central well, and a northbound path. The fullscreen HUD and battle panels share a warm brass and woodland palette.

## Current design focus

Focus on exploration, NPCs, visual design, battle choices and pacing. The old Forge and math screens are paused. Existing build allocations do not affect active combat. The earlier engine and [worked examples](docs/CALCULUS.md) remain as unapproved drafts for later review.

The final assignment still requires one calculus concept to affect gameplay. Choose it with the group after reviewing the course topics. The current prototype does not claim that requirement is complete. See [the game design](docs/GAME-DESIGN.md) for scope and next priorities.

## Project files

| File | Purpose |
| --- | --- |
| `index.html` | Interface, menus and dialogs |
| `rpg.css` | RPG presentation, joystick and responsive layout |
| `world.js` | Six areas, movement, collision, portals, camera and asset rendering |
| `combat.js` | Battle animation, item/run commands, results and recorded hits |
| `game.js` | Temporary combat rules, sound, saves, progression, dialogue, shop and paused course draft |
| `assets/game/` | Selected artwork extracted from the supplied bundles |
| `assets/recipes/` | Original recipes and source archives |
| `tests/game.test.cjs` | Gameplay, asset and map checks |
| `previews/` | Offline renders of the areas and battle scene |

Existing saves preserve progression, inventory, gold and debt. Saves from the previous map start in Emberbrook; new saves preserve the region and continuous position. The developer panel supports level overrides, region warps, God Mode, AI freeze and debuff toggles.

## Development checks

Run `node --test tests/game.test.cjs` with Node.js. Tests execute the actual game scripts with browser substitutes and verify math, turns, input, portals, map reachability, saves and PNG paths. They do not replace browser/device testing.

`tools/extract-assets.ps1` regenerates selected assets from the archives. `tools/render-preview.cjs` renders the drawing code using optional `@napi-rs/canvas`; set `CANVAS_MODULE` to its module path if needed.

See [RPG design and asset notes](docs/RPG-EXPANSION.md), [the technical blueprint](docs/TECHNICAL-BLUEPRINT.md) and [the course rubric](docs/RUBRIC.md).

The interface now lives inside the game screen: HUD, objectives, menus, battles and notifications. Village warmth and readable action feedback draw inspiration from Stardew Valley and Soul Knight while retaining Emberbrook’s own story and existing turn-based combat.

The illustrated backdrop is in Emberbrook Village. An existing save can resume in another region. Open **Dev**, then choose **Emberbrook** under region warps to preview the village without resetting progress. Character names appear in the world and dialogue.
