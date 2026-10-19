# Pumpkin Moon Date

A cozy Halloween story for couples, created with built-in image generation. Six original Disney-inspired 3D scenes, consistent adult characters and no text baked into the artwork.

## Story order

1. **The Halloween meeting** — The couple meets in costume outside a glowing autumn cottage. `01-the-halloween-meeting.png`
2. **Picking our pumpkins** — They choose two pumpkins together. `02-picking-our-pumpkins.png`
3. **Lanterns we made** — Their pumpkins become glowing lanterns. `03-lanterns-we-made.png`
4. **A friendly little boo** — A tiny friendly ghost surprises them with an invitation. `04-a-friendly-little-boo.png`
5. **The moonlit invitation** — They receive the ghost's mysterious letter. `05-the-midnight-invitation.png`
6. **Our pumpkin moon date** — They end the evening together beneath the moon. `06-our-pumpkin-moon-date.png`

## Files

- Six numbered PNG images.
- `preview.html`: local sequence viewer; open it after extracting this whole folder.
- `image-prompts.json`: the complete prompts used to generate every image, including continuity instructions and reference roles.
- `video-prompts.json`: optional five-second image-to-video prompts; videos have not been generated.
- `PROMPTS.md`: human-readable scene prompts and animation instructions.
- `sequence.json`: ordered assets, story beats, timing and suggested HTML invitation content.
- `IDE_PROMPT.txt`: copy-ready implementation request for the existing Bonded app.

## Aspect ratio and playback

Native PNG dimensions are 1672 x 941, approximately 16:9. The preview uses an exact 16:9 viewport and object-fit: cover. Images themselves have not been cropped or resized after generation. Four or six-second scenes can also work; the supplied timing is five seconds per scene with 500ms overlapping fades. If continuously composited with overlap, six scenes total 27.5 seconds.

## Character continuity

Scene 1 establishes the Halloween costumes and environment, using the previous Starlit Story couple as a facial/style reference. Scenes 2–6 use Halloween scene 1 as their reference. When regenerating, provide the approved scene 1 image; text alone cannot guarantee identity consistency. Keep the same faces, hair, hat, dress, cape, waistcoat, accessories and proportions.

The small friendly ghost appears only in scenes 4–5. The two chosen pumpkins become the recurring heart-cutout and friendly-face lanterns. The card and envelope remain unlettered. Tiny background, decorative and pose variations may occur between generated frames; use crossfades rather than expecting seamless geometric interpolation.

All personalized wording belongs in application HTML. Suggested final interaction: choose a Halloween activity, then agree on a date/time. The preview is a media viewer, not a live saved-response flow.

