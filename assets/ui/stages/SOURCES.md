# Stage selection illustrations

Generated with the built-in image_gen tool using the user-provided object reference images. Uploaded originals remain unchanged. Final assets are 432 × 288 WebP, quality 80, loaded lazily in stage selection only.

## Prompt set

Shared instructions: New opaque landscape 3:2 environment scene. Faithfully preserve the supplied object's distinctive shape, materials, colors, proportions and industrial details. Polished painted 3D game concept art, elevated three-quarter aerial view, earthy green palette and warm daylight. Complete central object readable in a small thumbnail, surrounded by terrain. No text, logo, interface, frame, watermark or checkerboard.

- `satellite.webp`: Reference `拠点破壊_大型パラボラアンテナの無線施設.png`. Large white parabolic dish atop a compact square concrete and olive military radio building with open doorway and yellow-black trim, in open grassy meadow.
- `headquarters.webp`: Reference `拠点破壊_開いた車庫の工業倉庫アセット.png`. Low rectangular concrete industrial warehouse with green roof, two skylights, fans, pipes and open garage, with rural grass and scattered trees.
- `supplies.webp`: Reference `最前線_コンテナ大(1).png`. Pair of low heavy olive armored cargo containers with straps, reinforced corners, caution stripes and connecting cables in a grassy forest clearing.
- `antenna.webp`: Reference `最前線_大きなアンテナ sprite(1).png`. Slender white and red tactical antenna with cross arms, rectangular panels, lattice lower section and industrial base on a green hill.

## User-supplied infiltration scene

- `infiltration_beginner.webp`: User attachment `697DDBB6-CBE6-4F3C-9077-9A4B50864E8B.jpeg`, the compact rectangular night facility. Direct image conversion with no AI regeneration or visual alterations, preserving the entire 3:2 composition. 432 × 288 WebP, quality 85, lazy-loaded only in the beginner infiltration stage card.

- `infiltration_advanced.webp`: User attachment `5DB513BD-DDC8-462A-8A89-A3ABD87E203F(1).jpeg`, large arched-roof night facility. Direct image conversion with no AI regeneration or visual alterations, preserving the entire 3:2 composition. 432x288 WebP at quality 85, lazy loaded only on the advanced infiltration stage card.

## Training ground selection artwork

- `training.webp`: generated with built-in `image_gen` using `headquarters.webp` as an art-style reference and `assets/ui/training/target.webp` as the target-prop reference. Final 432 × 288 WebP, quality 80, loaded lazily in the training stage card. No gameplay rendering changes.
- Generated source: `exec-dd284885-a6c7-40b8-b7ba-4d31b2aafce9.png`.

### Final prompt

Use case: stylized-concept. Create one new landscape 3:2 stage-selection thumbnail illustration for a military adventure game: an inviting outdoor BASIC TRAINING GROUND in warm daylight. Image 1 is a STYLE reference only: match its polished painted 3D game environment look, earthy olive colors, detailed yet clear miniature forms and elevated three-quarter aerial viewpoint, but do NOT copy its headquarters building. Image 2 is the exact PROP reference for the circular red-and-ivory bullseye targets on simple metal stands. Scene: a compact gravel-and-earth training courtyard bordered by two parallel low pale concrete block walls, with a prominent olive-green practice tank with rounded stylized proportions in the central foreground, three round bullseye targets on stands in the far half, one small wooden practice crate and a low dense patch of green hiding grass beside a short concrete shelter barrier. Keep the layout open and approachable, surrounded by meadow, a few distant trees. The tank and round targets should be the two strongest shapes and immediately recognizable even at thumbnail size. Natural consistent architectural perspective. Fit all important props within the middle 80 percent with comfortable ground margins. Full opaque scenic background. No soldiers or people, no battle, no explosions, no extra buildings, no text, numbers, letters, logos, signs, UI, frames, watermark or collage.
