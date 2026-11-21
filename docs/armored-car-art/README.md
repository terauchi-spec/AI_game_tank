# Approved armored car artwork

Source of truth for the design is the user's attached narrow six-wheel sheet,
not the wider alternate sample. Preserve `approved-sheet-master.png` unchanged.
`hull-without-tires-master.png` is an image-tool edit removing only the six rubber
tires from the middle hull; fenders and the mounting ring remain.

The hull is 157×256 WebP (~12KB), the turret is 147×256 WebP (~9KB).
The turret is extracted unchanged from sheet rectangle (1350,180)-(1620,650).
Its bearing/pivot is (135,321) in that 270×470 source crop. Hull pivot is at
normalized (0.5,0.46), matching the mounting ring. Shared source scaling keeps
hull and turret proportions intact. Six tires span the old outer width of
29×1.76 pixels, retaining the approved hull's narrow aspect ratio.

`js/armored-car-art.js` draws the tires first, then the hull with its fenders,
then the independently rotated turret. It loads two images once, with no
per-frame image reloads or per-vehicle canvas caches. Both images must be ready
before replacing the legacy renderer, avoiding partial hull/turret display.
`sharedVehicleTireStrip` and `truckTirePhase` reuse the truck's cached 8×32 strip
and signed real-displacement phase. Idle, pause and in-place turns do not move
treads. Reverse/coasting motion and repeated parked/driven rendering are handled
by the existing displacement helper; large teleports do not spin the treads.

Gameplay definitions, speed, ammo, fuel, vehicle collisions, gun direction and
pixel wreck rendering are unchanged. The old vector armoredShape remains the
loading/error fallback. Existing caller opacity and independent headings remain.

Validation: a native Canvas composite with turret headings 0/45/90 degrees was
visually reviewed. Tests cover six tire positions, body/turret aspect ratios,
independent rotations, pivot placement, shared resources, signed motion, pause,
owner forwarding, loading fallback and existing wheeled-vehicle behavior.
iPhone hardware has not been tested.
