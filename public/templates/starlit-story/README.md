# Starlit Story

A romantic couples story, created with built-in image generation. Six text-free original Disney-inspired 3D illustrations on a cozy rooftop terrace under fairy lights and twilight skies.

## Story order

1. **The Meeting** — Under glowing fairy lights and a warm sunset sky, our evening begins. `01-the-meeting.png`
2. **A Rose For You** — A single pink rose, exchanged with a quiet smile across the table. `02-a-rose-for-you.png`
3. **A Letter From The Heart** — A wax-sealed ivory envelope resting between two warm tea cups. `03-a-letter-from-the-heart.png`
4. **The Letter Opens** — Every unspoken feeling, unfolded in written words just for you. `04-the-letter-opens.png`
5. **Beneath One Sky** — Looking up as the twilight turns indigo and stars begin to glow. `05-beneath-one-sky.png`
6. **Our Evening Together** — Shoulder to shoulder beneath fairy lights, holding onto this quiet moment. `06-our-evening-together.png`

## Contents

- Six numbered PNGs.
- `preview.html`: local sequence viewer. Extract this entire folder before opening it.
- `PROMPTS.md`: human-readable image and optional animation prompts.
- `image-prompts.json`: complete generation prompts and reference roles.
- `video-prompts.json`: six optional image-to-video prompts; videos have not been generated.
- `sequence.json`: asset order, timing and suggested application copy.
- `IDE_PROMPT.txt`: copy-ready implementation instructions for the Bonded app.

## Image size

Native PNGs are 1672 x 941, approximately 16:9. The preview displays an exact 16:9 frame with object-fit:cover. No post-generation cropping or resizing has been applied to the PNGs.

## Continuity and use

All six scenes use the same approved couple as an image reference. Keep faces, hair, costumes and proportions fixed when regenerating.

The story uses a rose, ivory envelope, cream letter, bench and fairy lights as recurring motifs. Scene 4 reveals the unfolded letter card; scene 5 and 6 show the couple together beneath the twilight sky. No text is embedded in the artwork. Render names, messages and actions separately in HTML.

The preview is a local media viewer. Real saved replies, paired profiles and confirmed plans need the existing app's supported flows, as described in the IDE prompt.
