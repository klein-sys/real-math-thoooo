PIXEL MEDIEVAL PACK v6 - castle pieces, furniture, props, tiles
27 static objects, 7 animated objects, 6 seamless tiles. All 96x96 px, transparent PNG
(tiles are fully opaque and tile seamlessly).

Static objects: castle_tower, castle_wall, castle_gate, door_arched, window_stained, throne, table, chair, bed, bookshelf, chest_closed, chest_open, barrel, anvil, shield_swords, well, stone_pillar, stairs, drawbridge, cell_bars, armor_stand, weapon_rack, market_stall, crate_stack, hay_bale, writing_desk, alchemy_table
Animated (6 frames @ 8 fps): torch, banner, candelabra, fireplace, cauldron, campfire, brazier
Tiles: tile_wall, tile_floor_stone, tile_floor_wood, tile_carpet, tile_grass, tile_cobble

spritesheet_static.png/.json     all static objects + tiles, 5 columns (TexturePacker-style atlas)
spritesheet_animated.png/.json   one row per animated object, 6 columns; JSON has animations
frames/                          every sprite as its own PNG
palette.gpl                      421 colors (GIMP / Aseprite / Krita)
preview_*                        nearest-neighbour previews, not for use in game
itch_cover_630x500.png           cover image for an itch.io page
make_medieval_v6.py              generator source (Python + Pillow)

Objects sit on row 91 of 96: align the frame bottom to your ground line.
Engine tips: Nearest/Point filtering, no mipmaps. Tiles: set wrap mode to Repeat.
Unity: Sprite Mode Multiple, Grid By Cell Size 96x96, Pixels Per Unit 16.
Godot: AtlasTexture / TileSet with 96x96 cells, filter Nearest.

License: CC0 by default - change this line before publishing if you want other terms.
