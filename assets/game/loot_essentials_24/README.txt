LOOT ESSENTIALS
Sprite Kitchen
Version 1.0

CONTENTS
24 static medieval fantasy inventory icons.
Every icon is a native 32 x 32 PNG with transparent background.
Four categories, six items each:

POTIONS
Health Potion, Mana Potion, Stamina Potion, Antidote, Poison, Elixir.

TREASURES
Gold Coin, Coin Pile, Gold Pouch, Ruby, Aquamarine, Amethyst.

EQUIPMENT
Iron Sword, Iron Axe, Iron Dagger, Wooden Bow, Magic Staff, Iron Shield.

EXPLORATION
Iron Key, Gold Key, Ancient Key, Scroll, Treasure Map, Torch.

FILES
assets/png/: individual PNGs organized by category.
assets/spritesheets/loot_essentials_24_items_32x32_v1.png:
    full transparent sheet, 192 x 128 pixels, six columns and four rows.
assets/spritesheets/*_6_items_32x32_v1.png:
    four category strips, each 192 x 32 pixels.
assets/manifest_v1.json: item names, file paths, rectangles and provenance.
assets/palette_v1.json: the shared 18-color palette.
previews/loot_essentials_24_items_v1.png: enlarged presentation.

IMPORT
Cell size: 32 x 32 pixels.
Padding: 0. Spacing: 0.
Read each row left to right. Row order:
potions, treasures, equipment, exploration.
Use nearest-neighbor filtering and integer scaling for crisp pixel art.
The PNGs contain static icons, not animated sequences.
The source pixels are preserved when assembling spritesheets.

CREATION
Generated using the PixelLab MCP, Pro Flash.
The original approved Health Potion is the style reference.
All 24 icons use subsets of the same custom 18-color palette.
The four approved samples remain unchanged in the complete collection.

WORKSPACE SOURCE FILES
These files are retained in the workspace and are not included in the release ZIP.
source/full_pack_requests_v1.json: prompts, seeds, palette and style settings.
source/sample_requests_v1.json: the four original sample prompts.
source/responses/: PixelLab request and completion metadata.
source/full_pack_validation_v1.json: technical checks and SHA-256 hashes.
source/download_full_pack.py: downloads unchanged generated PNGs.
source/assemble_full_pack.py: assembles the sheets and presentation.
samples/ and README_SAMPLES.txt: the preserved first review batch.

