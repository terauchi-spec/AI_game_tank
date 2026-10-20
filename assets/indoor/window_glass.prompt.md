# 潜入ステージ窓ガラス / imagegen

Built-in imagegen. Reference: repository concrete wall sprite (local reference copy `door-art-refs/maze_wall.webp`).

## Intact glass

Use case: stylized-concept. Asset type: transparent 2D military tactical action game window sprite. Create ONE narrow horizontal double-pane window assembly, exact straight-on orthographic top-down map sprite compatible with the supplied concrete wall style reference. Wide rectangular aspect about 3.3:1. Weathered grey olive metal frame, dark outline, bolts, small rust streaks; two realistic smoky blue cyan glass panes with subtle pale sky reflection streaks, scratches and dusty edges, readable as glass at tiny game scale. Hand-painted detailed digital illustration, muted military palette, upper edge highlight. Flat aligned rectangle, no perspective distortion, no building around it. Glass mostly dark blue translucent appearance, restrained light cyan reflections, no bright glow. Object fills bounds, transparent outside. No ground, no cast shadow, no text, no objects or landscape reflected distinctly.

## Broken glass (edit of intact generated sprite)

Use case: precise-object-edit. Edit target: supplied horizontal double-pane military window sprite. Create its DESTROYED GLASS state. Preserve exact same outline, position, dimensions, frame, central divider, bolts, rust, lighting and color. Change only the two glass panes: both panes shattered and almost entirely missing, interiors genuinely transparent alpha holes showing no surface or background; leave a few small sharp blue glass shards attached along the pane edges. No full glass pane, no reflections spanning holes. Keep outside fully transparent too. No ground, no shadow, no text. Same top-down 2D tactical game handpainted detailed raster sprite.

## Runtime assets

Alpha bounds trimmed (alpha > 16), normalized to 512 × 106, WebP quality 85, method 6. Preserve alpha holes. One shared cached image per state; rotated for vertical windows. No per-frame raster processing.
