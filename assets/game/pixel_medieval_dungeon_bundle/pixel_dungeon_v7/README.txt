PIXEL DUNGEON PACK v7 - crypt, prison and dungeon props, tiles
24 static objects, 7 animated objects, 4 seamless tiles. All 96x96 px, transparent PNG
(tiles are fully opaque and tile seamlessly). Same size and style as the medieval pack.

Static objects: dungeon_door, cell_door, wall_shackles, skeleton_sitting, skull_pile, bones, cobweb_corner, sarcophagus, wooden_coffin, gravestone, altar, spike_pit, treasure_pile, stocks, broken_barrel, hanging_cage, lever_off, lever_on, stairs_down, broken_pillar, rubble_pile, wall_cracked, chest_iron, gargoyle
Animated (6 frames @ 8 fps): soul_torch, skull_candles, crystals, mushrooms, water_drip, spike_trap, wisp
Tiles: tile_dungeon_wall, tile_dungeon_floor, tile_mossy_floor, tile_dirt

spritesheet_static.png/.json     all static objects + tiles, 5 columns (TexturePacker-style atlas)
spritesheet_animated.png/.json   one row per animated object, 6 columns; JSON has animations
frames/                          every sprite as its own PNG
palette.gpl                      325 colors (GIMP / Aseprite / Krita)
preview_*                        nearest-neighbour previews, not for use in game
itch_cover_630x500.png           cover image for an itch.io page
make_dungeon_v7.py               generator source (Python + Pillow)

Objects sit on row 91 of 96: align the frame bottom to your ground line.
Hanging items (hanging_cage) and wall items (wall_shackles, cobweb_corner) attach to the top/wall instead.
Engine tips: Nearest/Point filtering, no mipmaps. Tiles: set wrap mode to Repeat.
Unity: Sprite Mode Multiple, Grid By Cell Size 96x96, Pixels Per Unit 16.
Godot: AtlasTexture / TileSet with 96x96 cells, filter Nearest.

License: CC0 by default - change this line before publishing if you want other terms.
