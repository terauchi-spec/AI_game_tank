# Infiltration prop assets

Generated with the built-in image_gen tool (transparent_background: true). Used only by the infiltration stage.

PNG sources were cropped to the object's alpha bounds and downsampled to at most 256×256, then encoded as WebP quality 80, method 6; transparency is preserved. Furniture sprites keep their source aspect ratios; collision rectangles are sized before navigation is built. Beds are restricted to one-cell rooms and use a uniform 104px world length. Containers are twice their proportionally fitted size. Door approaches and corridor center lanes remain clear.

## container

Saved asset: `assets/indoor/container.webp`

Final prompt:

```text
Use case: stylized-concept. Asset type: transparent WebP-ready sprite for a top-down 2D military infiltration game. Primary request: One rectangular olive-drab steel military storage/shipping container. Roof with corrugated ribs, corner castings, subtle rust and worn paint. Strictly its roof/top silhouette only. Composition: exactly one object centered, fully contained with small transparent padding, aligned vertically with long axis top to bottom. Camera is STRICT 90-degree overhead orthographic, no isometric or perspective, no visible vertical front/side surfaces. Style: realistic detailed game prop with restrained weathering, muted military colors, readable silhouette at 100 pixels. Soft ambient lighting with only subtle contact shading inside the silhouette. Background: genuinely transparent alpha, no floor, no ground shadow beyond object, no text labels, no watermark, no people, no border.
```

## equipment

Saved asset: `assets/indoor/equipment.webp`

Final prompt:

```text
Use case: stylized-concept. Asset type: transparent WebP-ready sprite for a top-down 2D military infiltration game. Primary request: One compact rectangular military field communications/electronics equipment station, dark olive steel case, small inset screens and control panel facing upward, sturdy handles and vents. No antenna extending beyond footprint. Composition: exactly one object centered, fully contained with small transparent padding, aligned vertically with long axis top to bottom. Camera is STRICT 90-degree overhead orthographic, no isometric or perspective, no visible vertical front/side surfaces. Style: realistic detailed game prop with restrained weathering, muted military colors, readable silhouette at 100 pixels. Soft ambient lighting with only subtle contact shading inside the silhouette. Background: genuinely transparent alpha, no floor, no ground shadow beyond object, no text labels, no watermark, no people, no border.
```

## shelf

Saved asset: `assets/indoor/shelf.webp`

Final prompt:

```text
Use case: stylized-concept. Asset type: transparent WebP-ready sprite for a top-down 2D military infiltration game. Primary request: One low rectangular military storage shelving unit seen vertically from above, its top tier holding neatly arranged supply boxes and folded gear within the shelf footprint. Clearly readable metal shelving frame. Composition: exactly one object centered, fully contained with small transparent padding, aligned vertically with long axis top to bottom. Camera is STRICT 90-degree overhead orthographic, no isometric or perspective, no visible vertical front/side surfaces. Style: realistic detailed game prop with restrained weathering, muted military colors, readable silhouette at 100 pixels. Soft ambient lighting with only subtle contact shading inside the silhouette. Background: genuinely transparent alpha, no floor, no ground shadow beyond object, no text labels, no watermark, no people, no border.
```

## cabinet

Saved asset: `assets/indoor/cabinet.webp`

Final prompt:

```text
Use case: stylized-concept. Asset type: transparent WebP-ready sprite for a top-down 2D military infiltration game. Primary request: One rectangular gray-green military filing/storage cabinet viewed vertically from above, flat worn steel top, subtle panel joints and handles at one edge. Only top silhouette visible. Composition: exactly one object centered, fully contained with small transparent padding, aligned vertically with long axis top to bottom. Camera is STRICT 90-degree overhead orthographic, no isometric or perspective, no visible vertical front/side surfaces. Style: realistic detailed game prop with restrained weathering, muted military colors, readable silhouette at 100 pixels. Soft ambient lighting with only subtle contact shading inside the silhouette. Background: genuinely transparent alpha, no floor, no ground shadow beyond object, no text labels, no watermark, no people, no border.
```

## desk

Saved asset: `assets/indoor/desk.webp`

Final prompt:

```text
Use case: stylized-concept. Asset type: transparent WebP-ready sprite for a top-down 2D military infiltration game. Primary request: One rectangular military office wooden desk viewed vertically from above, a few paper sheets, a small field telephone and a closed folder on its flat desktop. No chair. Composition: exactly one object centered, fully contained with small transparent padding, aligned vertically with long axis top to bottom. Camera is STRICT 90-degree overhead orthographic, no isometric or perspective, no visible vertical front/side surfaces. Style: realistic detailed game prop with restrained weathering, muted military colors, readable silhouette at 100 pixels. Soft ambient lighting with only subtle contact shading inside the silhouette. Background: genuinely transparent alpha, no floor, no ground shadow beyond object, no text labels, no watermark, no people, no border.
```

## bed

Saved asset: `assets/indoor/bed.webp`

Final prompt:

```text
Use case: stylized-concept. Asset type: transparent WebP-ready sprite for a top-down 2D military infiltration game. Primary request: One single rectangular military barracks bed viewed vertically from above, olive-green blanket, off-white pillow at the top, thin dark metal frame. Neatly made with subtle fabric folds. Composition: exactly one object centered, fully contained with small transparent padding, aligned vertically with long axis top to bottom. Camera is STRICT 90-degree overhead orthographic, no isometric or perspective, no visible vertical front/side surfaces. Style: realistic detailed game prop with restrained weathering, muted military colors, readable silhouette at 100 pixels. Soft ambient lighting with only subtle contact shading inside the silhouette. Background: genuinely transparent alpha, no floor, no ground shadow beyond object, no text labels, no watermark, no people, no border.
```


## shell_pallet_hd

Saved asset: `assets/indoor/shell_pallet_hd.webp`

Built-in image_gen edit of the original `assets/cover/shell_pallet.webp`, exported to 512×512 WebP at quality 82 with alpha. Only infiltration uses this version; other stages retain the original 80×80 asset.

Final prompt:

```text
Use case: precise-object-edit. Asset type: transparent high resolution sprite for a top-down military infiltration game. Reference/edit target: the attached 80px wooden ammunition pallet sprite. Reconstruct the SAME object at high detail with crisp readable textures: a square weathered wooden pallet containing orderly rows of upright olive-green metal artillery shells with brass tips. Preserve the square footprint, shell arrangement, muted color palette, overhead camera angle and isolated silhouette of the reference. Improve fine detail of wooden slats, steel casings and brass tips without adding objects. No floor, no text, no watermark, no painted symbols. Genuinely transparent alpha background, no external cast shadow. One centered square sprite with minimal transparent margin. Production asset suitable for 512x512 export.
```
