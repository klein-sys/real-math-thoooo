SLIME ESSENTIALS
Sprite Kitchen
Version 1.0

Four classic slime enemies for 2D side-scrolling games:
Green Slime, Blue Slime, Poison Slime and Fire Slime.

CONTENTS
4 transparent base sprites.
20 animation strips: five actions per slime.
148 individual transparent PNG frames.
JSON import metadata.
Individual animated GIF previews and a combined overview.

ANIMATIONS PER SLIME
Idle   - 5 frames - 160 ms per frame - loop
Hop    - 9 frames - 100 ms per frame - loop
Attack - 9 frames - 100 ms per frame - play once
Hurt   - 5 frames -  80 ms per frame - play once
Death  - 9 frames - 100 ms per frame - play once

37 frames per slime, 148 total.
Death includes a fully transparent final frame.
Idle, Hop, Attack and Hurt return to the base pose.

IMPORT
Native cell size: 64 x 64 pixels.
Each animation strip is a single horizontal row.
Padding: 0. Spacing: 0.
Suggested ground origin: x=32, y=49, measured from the top-left of the cell.
Use nearest-neighbor / Point filtering and integer scaling.
Hop is animated in place; move the game object through your own game code.
Attack lunges toward the right; mirror the sprite for the opposite direction.
Use a stable collision shape rather than deriving it from each rendered frame.
On Death completion, remove or hide the instance.

FILES
assets/bases/: four original base sprites.
assets/animations/<slime>/: PNG strips and per-action JSON metadata.
assets/animations/<slime>/<action>/: individual numbered frames.
assets/manifest_v1.json: complete animation inventory and import settings.
previews/<slime>/: enlarged GIF previews.
previews/slime_essentials_animated_overview_v1.gif: all actions together.
previews/slime_essentials_overview_v1.png: static overview.

PNG game assets have transparent backgrounds.
GIF previews are enlarged on an opaque plum background.
Attack, Hurt and Death are one-shot game clips; their preview GIFs repeat
after a viewing pause.
The files are standard PNGs and JSON metadata. No engine project is included.
Engine-specific import has not been tested.

CREATION PROCESS
The four base sprites were generated using PixelLab Pro Flash through MCP.
Final animation poses and motion were authored through PixelLab's exact
Pixel Art Workbench using the original sprite pixels and their palettes.
Generative animation drafts were reviewed during development and replaced
with the controlled Workbench animations included in this release.
All final animations preserve their base sprite's visible colors.

