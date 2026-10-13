# Nurture's supplied artwork

All habit-plant and watering-can illustrations are **unchanged copies of the supplied transparent PNGs**. There is no generated foliage, replacement pot, or drawn-on face. The original filenames and 768 x 768 source canvases are preserved.

## Plant states

The images live in `public/assets/plants/`. Each prefix below has two files:

- `{prefix}-plain-transparent.png`: neutral, before watering.
- `{prefix}-doodle-transparent.png`: the supplied smiling version, after watering.

| Plant | File prefix |
| --- | --- |
| Azulita succulent | `succulent-azulita` |
| Daisy | `daisy` |
| Monstera | `monstera` |
| Sunflower | `sunflower` |
| Columnar cactus | `succulent-columnar-cactus` |
| Cream orchid | `cream-orchid` |
| Bonsai | `bonsai` |
| Hydrangea | `hydrangea` |
| Snake plant | `snake-plant` |
| Potted bamboo | `potted-bamboo` |
| Ivy | `ivy` |
| Bird of paradise | `bird-of-paradise` |
| Aloe vera | `aloe-vera` |

[PlantArt](src/components/PlantArt.tsx) crossfades the two complete illustrations. Faces stay exactly where the supplied artist placed them, including on flower heads. Small sways and squishes animate the intact illustration instead of synthesizing separate foliage or pot layers.

### Display framing

The original PNGs contain generous transparent margins. [artwork.ts](src/lib/artwork.ts) records a shared visible frame for each pair, measured from the union of their alpha bounds with a small safety margin.

Both states use that **same frame** in a bottom-aligned **200 x 250** display box. CSS positions the original image inside a clipped viewport; no pixels are cropped, redrawn, recolored, or resaved. The shared frame prevents the plant from jumping in size or position when its smile appears.

Each plant also has a `soil` point in its original 768 x 768 image coordinates. [Watering geometry](src/lib/watering.ts) uses the same framing calculation as the renderer to place the stream at that plant's actual pot opening.

## Watering can and droplets

The can files live in `public/assets/objects/`:

- `watering-can-no-drops-transparent.png` is used by the animated can and the help illustration.
- `watering-can-plain-transparent.png` supplies the animated droplets. Each of the four falling drops displays only the isolated bottom droplet from this image through a small SVG viewport; it is not a newly drawn shape.

Current source-coordinate anchors:

| Setting | Value |
| --- | --- |
| Source canvas | 768 x 768 |
| Can display frame | x=179, y=233, width=402, height=297 |
| Rotation pivot | (420, 400) |
| Emitting nozzle point | (209, 325) |
| Droplet viewport | x=170, y=433, width=30, height=41 |

The same anchors drive [CanArt and WateringCan](src/components/WateringCan.tsx) and the water stream. The can may be mirrored near a garden edge, but its source image is unchanged.

## Existing gardens

The catalog contains only the thirteen supplied plants. On loading older saved data, the approved replacements are:

- Fern -> Monstera
- Tulip -> cream orchid
- Wildflower -> hydrangea

Habit IDs, names, positions, care dates, history, and growth stages are preserved. The old generic `succulent` and `cactus` storage keys now display the supplied Azulita succulent and columnar cactus. Unknown types still produce a visible storage error rather than silently replacing the garden.

## Future replacements

Keep neutral and happy artwork aligned on an identical canvas. Update the filenames, shared frame, source dimensions, and soil point in [artwork.ts](src/lib/artwork.ts) when changing an illustration. For a new can, also update its pivot, nozzle, and droplet viewport there. Interaction timing and saved care history do not need to change.

`growthStage` remains independent of daily happiness and stays at `young` for new V0 plants. Additional growth artwork can be selected inside `PlantArt` later.

Garden ground, small hearts, motion cues, and UI icons remain separate decorative effects, not plant or can illustrations. Reduced motion uses a static water cue while retaining the supplied smiling state.

Run `npm test`, `npm run build`, and `npm run test:e2e` after asset changes. Verify a real pour and the small-screen picker, not only the static garden.
