# Player tank artwork

Seven friendly tanks use the approved painted hull and turret cutouts. PNG
masters are kept in `docs/player-tank-art/`; gameplay loads only fourteen WebP
images under `assets/vehicles/player/`, approximately 145 KiB combined.

| Game ID | Finish and details |
| --- | --- |
| t34 | Olive, rounded turret, compact glacis and rear engine grille. |
| tiger | Warm gray beige, box turret, thick mantlet and muzzle brake. |
| type10 | Green/brown camouflage, modular turret panels and track covers. |
| m1 | Desert sand, angular turret, rear stowage and track covers. |
| sherman | Olive drab, rounded cast turret and shorter gun. |
| churchill | Dark olive, riveted armor and heavy track covers. |
| kingtiger | Sand/green/red-brown camouflage, sloped turret and partial skirts. |

Hull images keep their aspect ratio and use a 2.12-unit height. Hulls, turrets
and tracks are sized from the same source-sheet pixel measurements for each
model. Width, spacing and length of the shared animated track strips now match
the samples, instead of the wider legacy pixel-tank footprint. The original
painted edge panels provide the partial track covers; no duplicated side panels
are added. Turrets keep their individual rotation pivots.

The enemy turret raster compresses only the projecting barrel by 5 percent.
The barrel attachment, housing pixels, rotation pivot and weapon calculations
retain their existing coordinates. No new image files are required.

Images are requested once when initial artwork loading starts. Each model
caches only its hull and turret raster, independent of vehicle count and
rotation. Ready images replace fallback pixels without pausing gameplay; late
loads invalidate only that model's rasters. Original vector drawing remains the
fallback for failed images. Source cutouts are at most 192 by 256 pixels when
loaded, 526,848 pixels total before browser overhead (approximately 2 MiB RGBA).

Vehicle statistics, collision geometry, weapon origins and spawn rules remain
in the original gameplay code. Hull and turret keep independent headings,
caller opacity and foreground/foliage layering. Destruction and detached wreck
parts continue through the existing pixel renderer, without painted sprites.
Enemy tank assets and their pivot animation use the existing enemy path.
