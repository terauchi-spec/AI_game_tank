# Infiltration room equipment

Built-in image_gen mode, one generation per distinct asset, transparent_background=true. Server rack, operations table and generator received background-extraction edits with the same built-in tool; no CLI fallback was used. Only the infiltration adapter consumes these assets.

## Saved assets

| Asset | Path | Dimensions | Bytes |
| --- | --- | --- | --- |
| Weapon rack | assets/indoor/weapon_rack.webp | 179×384 | 18,216 |
| Server rack | assets/indoor/server_rack.webp | 127×384 | 14,334 |
| Operations table | assets/indoor/operations_table.webp | 241×384 | 21,258 |
| Personal lockers | assets/indoor/personal_lockers.webp | 194×384 | 21,888 |
| Generator | assets/indoor/generator.webp | 253×384 | 28,112 |

Total transfer: 103,808 bytes. Total decoded RGBA: 1,526,784 bytes. Sources were cropped around their opaque silhouette with a small transparent margin, then reduced once using Lanczos with premultiplied alpha and saved at WebP quality 82, alpha quality 100, method 6. Transparent alpha and the cropped source aspect ratio are preserved. Maximum sprite length is 144 world pixels, with 384 source pixels along the long edge. Canvas smoothing uses high quality. There is no runtime image resampling canvas or additional per-frame layout/pathfinding pass.

## Rooms and placement

Each floor assigns one operations room, armory, communications room and utility room. The existing guard post stays a guard post. Remaining one-cell rooms are quarters; remaining larger rooms are storage or records rooms. Quarters use beds and personal lockers; armories use weapon racks and lockers; communications rooms use servers and electronics; utility rooms use generators and equipment; operations rooms use planning tables and office furniture. Room names are metadata and are not printed on the floor.

One supplemental furniture candidate is added per non-post room. Placement protects door approaches, room centers and connections between room tiles. If a main asset conflicts, a bounded generation-time search tries both orientations, then smaller proportional footprints in the same room. It may replace supplemental decoration, and cargo cannot replace a room's main equipment. Hallway side/count rules are preserved. Collision and navigation use the final sprite proportions.

## Final generation prompt set

Each initial prompt is the following shared specification followed by its Subject paragraph.

```text
Use case: stylized-concept. Asset type: transparent top-down sprite for an existing realistic 2D military infiltration game. Strict orthographic overhead view, camera exactly vertically down 90 degrees, zero perspective, no visible front facade, no isometric angle. Single isolated furniture object centered and aligned vertically, entire object in frame with modest transparent margin. Realistic weathered olive drab and charcoal painted metal, restrained wear, soft upper-left light, subtle contact shading contained very close to the object, clear smooth antialiased silhouettes, chunky readable details suitable for rendering 60-120 pixels long; avoid thin wires, tiny grids and text. High resolution source. Actual transparent alpha background, no floor, no backdrop, no people, no labels, no logos, no border.
```

### weapon_rack

```text
Subject: ONE military small-arms weapon storage rack seen from directly above: long narrow low steel open rack, four clearly readable dark unloaded rifles lying parallel inside their dividers, stock and barrel silhouettes distinct, olive frame, long axis vertical. This is a storage furniture game prop, not a technical weapon diagram.
```

### server_rack

```text
Subject: ONE military communications server cabinet viewed straight down: long narrow rectangular dark steel cabinet, solid top with two broad cooling fan grilles and readable panel seams, muted teal accents, orderly rugged equipment. Show only overhead footprint, long axis vertical.
```

### operations_table

```text
Subject: ONE large rectangular military operations planning table viewed straight down: olive metal edge and muted wood top, a large pale folded topographic map, two chunky colored markers, one closed field notebook, one radio handset. No chairs, no surrounding accessories. Table long axis vertical, width about two thirds of length. Map has nonverbal broad terrain marks, no legible text.
```

### personal_lockers

```text
Subject: ONE bank of three connected military personal storage lockers viewed exactly from above: a wide long rectangular olive steel roof footprint subdivided into three broad rectangular top panels with seams, rolled bedding and folded field packs on top to identify soldiers' storage, all belongings within the rectangle. Long axis vertical. Never show upright front doors or an oblique view.
```

### generator

```text
Subject: ONE compact military diesel generator equipment skid viewed exactly from above: olive protective rectangular steel frame, bulky charcoal engine casing, pale cooling fan grille with broad slats, fuel tank cap, thick exhaust bend contained within frame. Long axis vertical. Strong simple industrial silhouette, no tiny wires or labels.
```

## Background extraction edits

The server rack and table edits preserve object geometry, orientation, proportions and materials while removing the concrete background and external cast shadows. The generator edit additionally removes floor visible through holes in its open frame. All require actual transparent alpha outside the object, antialiased contours, and no new elements. Alpha was inspected before WebP conversion.

