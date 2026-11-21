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

Hull images keep their aspect ratio and use the same 1.94-unit height. Turret
housing widths share a 1.24-unit envelope, with a separate rotation pivot for
each cutout. The seven live tanks share the reference's compact track footprint;
Churchill's former extra-long live tracks now use that same footprint. No wheel
circles are drawn over the animated belts. Track covers extend the cutout's
edge panels over the inner belts, leaving the outer tread strips exposed.

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
