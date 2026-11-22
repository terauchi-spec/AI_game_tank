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

Friendly hulls and animated tracks are 15% shorter along the front-to-back
axis. Hull and belt widths and belt spacing retain the existing scale. The
narrower rims slightly reduce the outermost width. Turrets and barrels are
scaled uniformly to 88% about their individual rotation pivots. Track covers
remain part of the hull artwork. The existing display scale and raster sizes
are retained for all seven models.

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
The enemy hull WebP is drawn over the animated tracks, rims and shadow.
The original pixel hull is used as a fallback until the WebP is ready.

All seven friendly tanks bake dark gray hull/turret outlines from a shared temporary
alpha mask when their image layers are cached. The six models other than Type 10
use 1.5x barrel thickness and 1.1x projecting length. Type 10 uses its existing
1.5x thickness and 1.2x length. Each muzzle head is a further 20% wider and 15%
longer; per-model source boundaries preserve the original mantlet and housing.
The cached outlines, source images and animated track strips are reused on
subsequent frames.

Sherman, Churchill and Tiger I retain only 20% of the extra muzzle emphasis
(+4% width and +3% length relative to their enlarged barrels). Friendly hull
and turret outline radius is 0.65 cache pixels. Track rims use the same dark
gray and a narrower stroke.

Player steering now uses the model-specific rates in player-tank-balance.md. Changes up to
90 degrees drive along a 24px-radius single-track arc, then resume normal
speed. Larger changes retain the stationary pivot until aligned. Movement
continues through playerMove for collisions, terrain and fuel consumption.

Player contact destruction emits three small dust/spark chips at most once per
0.1 seconds, shared across cover/object collisions, using the existing bounded
particle array and renderer. Chips last 0.32–0.36 seconds and use no random draws. They draw at full
opacity until the final 0.12 seconds, with 5–6px bright fills and a 1px dark
border. At most 12 contact chips coexist during uninterrupted contact.
