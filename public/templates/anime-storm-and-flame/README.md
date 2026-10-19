# Storm & Flame

An original six-scene Japanese 2D anime couples template combining spectacular elemental power with visible love and trust. Created with built-in image generation.

**Two powers. One promise.**

## Sequence

1. **Before the storm** — A playful training moment reveals affection beneath their strength. `01-before-the-storm.png`
2. **The awakening** — As a storm gathers, they awaken their complementary powers. `02-the-awakening.png`
3. **I have your back** — They protect each other when the storm strikes. `03-i-have-your-back.png`
4. **A promise in the storm** — In a quiet moment, they choose to face everything together. `04-a-promise-in-the-storm.png`
5. **Our combined strength** — Their bond turns two powers into one overwhelming force. `05-our-combined-strength.png`
6. **After the storm** — Their power settles, and their love remains. `06-after-the-storm.png`

## Contents

- Six numbered text-free PNGs.
- `preview.html`: local sequence viewer; extract the entire folder before opening.
- `CHARACTERS.md`: character, wardrobe, power-color and style continuity.
- `PROMPTS.md`: human-readable scene prompts and optional animation prompts.
- `image-prompts.json`: complete generation prompts and reference roles.
- `video-prompts.json`: six optional five-second image-to-video prompts. Videos have not been generated.
- `sequence.json`: scene order, dimensions, timing and optional HTML copy.
- `IDE_PROMPT.txt`: implementation prompt for the existing Bonded app.

## Image size and presentation

PNGs are 1672px wide and 940–941px high, approximately 16:9. The preview uses an exact 16:9 viewport with object-fit:cover and does not stretch the art. PNGs were not cropped or resized after generation. Use five-second scenes and 500ms overlapping transitions; continuous edited playback totals 27.5 seconds.

## Continuity

Scene 1 establishes both original adult anime designs. All later scenes use it as their image reference. Her cyan lightning and his amber fire remain consistent; the costumes, hairstyles, teal/burgundy sashes and red wrist cords are retained. Small generated background/accessory variations can occur; these are a story sequence, not geometrically continuous animation frames.

No words are baked into the images. All names, personal messages, captions and final actions should be HTML. The local preview only displays media; saved promises, replies and plans need the real app integration described in the IDE prompt.

