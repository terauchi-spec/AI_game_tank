# Frontline beginner cargo sprites

- `frontline_cargo_small.webp`: objective 1, one sprite, 640×320, 61,236 bytes.
- `frontline_cargo_large.webp`: objective 2, two side-by-side instances, 640×427, 83,250 bytes.
- Inputs: user attachments `最前線_コンテナ小.png` and `最前線_コンテナ大.png`.
- Processing: built-in image_gen background extraction, then Pillow downscaling and WebP encoding (quality 84, method 6), preserving alpha. Original uploads are unchanged.
- Runtime damage: at most six 4.5px nicks per sprite, cached only when damage changes. Sprite body colliders remain intact; damage grants no destruction points.
- Victory: a three-second transition with 12 simple sparkle shapes on each of the two large sprites. Advanced Frontline retains its antenna signal.

## Exact prompt (same prompt for each respective edit target)

Use case: background-extraction. Edit target: the attached military cargo container sprite. Remove ONLY the baked-in white/gray checkerboard background completely, including gaps around the guy wires. Output actual transparent alpha. Preserve the complete container arrangement, all wires, ground anchor plates, exact perspective, olive metal colors, scratches, handles, proportions and silhouette unchanged. Do not add objects, shadows or a floor; do not remove wires or anchors. Center the full intact subject with minimal transparent padding. This is an in-game sprite cutout, not a redesign.
