# Friendly truck WebP body and pixel tires

The approved four-wheel truck uses one transparent body sprite plus four pixel
tires underneath. Vehicle definitions, movement, boarding, coasting, collisions,
health, fuel and existing pixel wreck rendering are unchanged. Blue road trucks
keep their original renderer. Armored cars reuse the same pixel tread strip
through their own WebP hull/turret renderer.

- `approved-truck-master.png`: approved generated PNG, preserved as supplied.
- `truck-body-master.png`: generated edit removing only rubber tires for pixel overlays.
- Runtime: `assets/vehicles/player/truck/body.webp`, 162×256 RGBA, about 13KB.
- Body preparation: crop master to (185,153)-(887,1265), preserve aspect ratio,
  then reduce for the game. No ground shadow is baked into the image.
- `js/truck-art.js`: one shared decoded image and one shared 8×32 tire strip.
  The body matches the previous outer width (1.54 × requested draw size).
- Four tires are rendered first with nearest-neighbor sampling; body/fenders
  are drawn above them. The body uses smooth sampling. Caller alpha is preserved.
- Treads use the existing displacement phase helper, so no new update loops or
  per-frame image loading/canvas allocations are introduced. Parked, paused and
  fuel-stopped trucks do not advance the phase. Reverse travel runs it backward;
  actual coasting travel runs it even after fuel runs out. Large teleports are ignored.
- If the body has not loaded, the existing pixel renderer remains the fallback.

Body-edit prompt: preserve the accepted olive four-wheel truck design, lighting,
canvas, windshield, bumpers and fenders; remove only the four black tires into
transparent holes for game-rendered pixel tires. Generated with the image tool.

Validation: composited native Canvas render reviewed with three tread phases;
unit checks cover shared assets, four tire positions, preserved body aspect ratio,
alpha, repeat draws, idle, reverse, pause, turning, fuel stops, coasting, teleports,
normal drawVehicle routing and the legacy enemy path. iPhone hardware not tested.

## Medium olive color update

New `*-mid-olive-master.png` originals preserve the earlier source PNGs.
Image-tool edit prompt: change paint only to the approved medium olive-sage
reference (midtones #83925a, highlights #a4b77a, shadows #52683d), retaining
top-down geometry, dark hardware, transparent tire openings and thin outlines.
Truck canopy uses warm khaki sage #a7ae82. Runtime dimensions and draw sizes
remain unchanged; URL versions invalidate cached images.
Truck uses the same source crop as before.
