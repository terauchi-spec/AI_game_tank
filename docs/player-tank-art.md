# Player tank artwork

The seven player tanks share the original compact, round, stylized renderer in
`drawOriginalTankShape()`. Wide tracks, large bright wheels, oversized turrets,
short hulls and the original palette define their appearance. Real-vehicle cues
are small accents within that style, rather than scale-model proportions.

| Game ID | Model cues |
| --- | --- |
| t34 | Round turret, sloped nose and small rear-side fuel drums. |
| tiger | Broad box hull and turret, rear cooling fans and chunky muzzle brake. |
| type10 | Compact angular turret and side skirts. |
| m1 | Sand finish, broad angular turret and rear bustle. |
| sherman | Rounded cast nose and round turret with a shorter gun. |
| churchill | Slightly longer track runs, track guards and a compact turret. |
| kingtiger | Sloped hull, angular turret and longer gun with a muzzle brake. |

Vehicle statistics, collision geometry, weapon origins, spawn rules and enemy
tank graphics are unchanged. The infantry armor-impact sound fix is retained.

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

The original illustrations are drawn once into separate cropped hull/turret
canvases, then rotated independently through the existing static raster helper.
The cache has at most fourteen small canvases, fewer than 110,000 pixels total
(under 0.42 MiB of RGBA pixels, before platform raster mirrors). It is independent
of the number of vehicles, headings and drawing sizes. There are no new bitmap
downloads and no repeated track/hatch drawing on cache hits. Wrecks use the
original compact outlines and blackened styling.
