# Player tank artwork

The seven player tanks use original, simplified top-down Canvas artwork. Their
silhouettes follow the references below; they are not blueprints or exact scale
reproductions. Vehicle statistics, collision geometry, weapon origins, spawns and
enemy tank graphics are unchanged by the art update.

| Game ID | Visual reference | Distinguishing features |
| --- | --- | --- |
| t34 | T-34/85 | Sloping hull, rounded elongated turret, five suspension groups, rear side fuel drums. |
| tiger | Tiger I | Rectangular hull, horseshoe turret, rear cooling fans, turret storage bin, 88 mm muzzle brake. |
| type10 | Type 10 | Faceted modular turret, rear bustle, side skirts, five suspension groups, green/brown camouflage. |
| m1 | M1A1-family Abrams | Broad angular turret cheeks, large rear bustle, seven suspension groups, rear engine grilles, sand finish. |
| sherman | M4A1 with 75 mm gun | Cast rounded hull and turret, short gun without brake, three VVSS suspension groups per side. |
| churchill | Churchill Mk VII | Long narrow infantry-tank chassis, full-length track guards, compact turret and many small suspension groups. |
| kingtiger | Tiger II production turret | Sloped hull, angular turret, long 88 mm gun with double-baffle brake, rear cooling fans and three-color camouflage. |

The national/variant paint treatments are representative artistic choices, not a
claim that every tank of the type used the same camouflage. Small fittings are
simplified for readability at the game's 30 px drawing scale.

## References

- The Tank Museum, [T-34/85](https://tankmuseum.org/tank-nuts/tank-collection/t-34-85/).
- The Tank Museum, [Tiger I / Tiger 131](https://tankmuseum.org/tank-nuts/tank-collection/tiger-i/).
- The Tank Museum, [M4 Sherman collection](https://tankmuseum.org/tank-nuts/tank-collection/m4-sherman/).
- The Tank Museum, [Tiger II](https://tankmuseum.org/tank_collection/tiger-ii/).
- Australian Armour & Artillery Museum, [collection including Churchill Mk VII](https://www.ausarmour.com/exhibits/).
- Mitsubishi Heavy Industries, [Type 10](https://www.mhi.com/jp/business/products-services/space-defense/defense-vehicles/type-10-main-battle-tank).
- Japan Ground Self-Defense Force, [vehicle equipment](https://www.mod.go.jp/gsdf/equipment/ve/).
- US Army ODIN, [M1A1 Abrams](https://odin.t2com.army.mil/WEG/Asset/M1A1_Abrams_American_Main_Battle_Tank_).

Reference photographs are not bundled, copied into textures or redistributed.

## Rendering and budget

`js/player-tank-art.js` draws each hull and turret once into separate, tightly cropped
transparent canvases (hulls 64 x 103 px; turrets at most 54 x 119 px). Both layers rotate independently using the same world
positions and headings as before. The seven-type cache is bounded to fourteen
canvases (86,266 pixels, about 0.33 MiB of RGBA pixels before any platform raster
mirrors). It is independent of the number of vehicles, headings and drawing sizes.

There are no new bitmap downloads. On a cache hit, a complete tank requires two
raster draws plus a small hull shadow; detailed tracks, camouflage, hatches and
grilles are not replayed each frame. The existing static raster helper is retained
for mobile compatibility. Lazy generation avoids work for types absent from play.

Wrecks reuse the armor outlines with their existing blackened styling. The legacy
enemy renderer remains the fallback; armor/weapon statistics stay in `TYPES`.
