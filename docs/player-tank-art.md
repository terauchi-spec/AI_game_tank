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
are added. Turrets keep their individual rotation pivots. Each complete friendly tank is
uniformly scaled at draw time to the legacy pixel tank's 2.10-unit outer width,
including track rims. Hull, turret, barrel, shadow and animated tracks share this
scale, preserving the sample proportions and rotation centres. Raster cache
sizes and source images stay the same.

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

All seven friendly tanks bake black hull/turret outlines from a shared temporary
alpha mask when their image layers are cached. The six models other than Type 10
use 1.5x barrel thickness and 1.1x projecting length. Type 10 uses its existing
1.5x thickness and 1.2x length. Each muzzle head is a further 20% wider and 15%
longer; per-model source boundaries preserve the original mantlet and housing.
The cached outlines, source images and animated track strips are reused on
subsequent frames.

Sherman, Churchill and Tiger I retain only 20% of the extra muzzle emphasis
(+4% width and +3% length relative to their enlarged barrels). Friendly hull
and turret outline radius is 1 cache pixel, reduced from 1.3 pixels.

Player steering now turns smoothly at 135 degrees per second. Changes up to
90 degrees drive along a 24px-radius single-track arc, then resume normal
speed. Larger changes retain the stationary pivot until aligned. Movement
continues through playerMove for collisions, terrain and fuel consumption.

Player contact destruction emits three small dust/spark chips at most once per
0.1 seconds, shared across cover/object collisions, using the existing bounded
particle array and renderer. Chips last 0.22–0.26 seconds and use no random draws.
