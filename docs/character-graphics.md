# Character graphics

The game uses individual transparent WebP cutouts, not a pixel-art or animation
sprite sheet. Source artwork was generated with the built-in image-generation
tool using the supplied illustrations as visual references.

## Rendering

- `assets/characters/player.webp`: overhead camouflage player with red helmet stripe.
- `blue.webp`, `white.webp`: overhead ordinary blue / white elite infantry.
- `blue_commander.webp`: blue commander with radio and antenna.
- `white_commander.webp`: white commander with broad rust-red helmet stripe.
- `rifle.webp`, `launcher.webp`: separate weapon artwork.
- `scope_*.webp`: front-view enemy cutouts used by the sniper scope.

All files are relative to `assets/characters/`. Combined compressed payload is
about 185 KB. The original generated high-resolution PNGs are not downloaded by
the game. Gameplay cutouts are at most 192 pixels per side; scope cutouts are at
most 288 pixels tall. Generated alpha is preserved.

`js/characters.js` decodes images once and splits limb regions into small cached
canvases. Movement distance drives alternating steps; idle and blocked characters
stop stepping. All five roles share a distance-driven gait capped at 80 ms/radian;
slower patrols step more slowly than a running player.
Boots draw beneath the torso; toes extend ahead in a longer stride and
the raised kicking boot extends clearly past the pack at rear extension,
with a connected trouser leg and a slight outward lift. All five roles use
roughly 10 × 9 world-pixel boot cutouts, proportionate to hands.
Free arms translate in counterphase (±4.5 px, opposite the foot on the same side).
Armed enemies hold their arms steady while their legs move.
There is no sideways body bob. Procedural limb compositions are cached and reused. The cache is
bounded to 18 poses per overhead model; there is no frame atlas, per-frame image
readback, new navigation/vision scan, or remote image-generation request in play.
Overhead weapons draw beneath the body and helmet. Ordinary blue infantry rifles
are 1.5 times their original WebP display dimensions. Aiming, weapon visibility,
recoil and muzzle flash follow existing actor states.
The physical actor collision radii, movement speeds, AI and damage remain intact.

## Restoring the original graphics

The original Canvas renderer remains in `index.html` as the automatic fallback.
Its exact pre-change source, including all five roles, original walk animation,
commander equipment, bush outlines, prone sniper pose and scope drawing, is also
archived in `js/characters-legacy.js` from commit `4141005`.
Transparent WebP snapshots of all five original roles in idle and attack states
are preserved under `docs/legacy-character-previews/` for visual comparison.

To restore the old renderer for every actor, change the first setting in
`js/characters.js`:

```js
const CHARACTER_GRAPHICS_MODE='legacy';
```

The new textures are then skipped, and all original render paths are used.
Set this value back to `'webp'` to enable the new artwork. No gameplay or score
storage migration is involved. Do not delete the legacy archive during future
visual changes.

## Generation direction

Final overhead prompt: orthographic directly-overhead camera, facing right,
helmet crown centered, backpack and boots behind, arms to both sides, nearly
square footprint; worn metal, detailed military cloth and leather in the supplied
stylized 3D illustration world; genuine transparency; one figure, no sheet,
no scenery, ground, text, glow or baked cast shadow.

Role prompts: khaki camouflage/red helmet stripe for player; slate blue/no stripe
for blue infantry; slate blue with olive field radio and whip antenna for blue
commander; warm ivory and light-grey helmet for elite; ivory/light-grey helmet
with a broad rust-red stripe for white commander. All variants preserve the same
overhead orientation and silhouette. Scope variants use the same material and
palette in a high-angle front view. Weapons are separate horizontal 3D cutouts,
muzzle right: a wooden-stock gunmetal rifle and an olive shoulder launcher.

## Validation and limits

Browser tests cover successful decode of all eleven WebPs, non-identical gait
frames, weapon show/hide, idle/stun/prone/scope states and old-renderer fallback.
Synthetic Canvas timing is a relative implementation check, not an iPhone FPS
measurement. iPhone hardware performance still requires a device playtest.
