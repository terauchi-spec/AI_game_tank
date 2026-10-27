# Input-only comparison

Open `/input-test.html?mode=touch&zone=12` on the affected phone/browser.
Repeat the B/S/A release → stick press handoff ten times, then select the other
mode and repeat the same movement. Keep the selected dead zone identical.
Also compare holding the stick finger down while tapping an action.

- `pointer`: the input-handler section from `c93572a` (before these input fixes).
- `touch`: the input-handler section from `3ace2ea` (current game input).
- Both snapshots use the shared `inputTestDeadZone` instead of their original
  dead-zone constant. No other input code is altered. Only one snapshot activates.
- `zone=12` gives about 8 CSS pixels on a 132px stick; `zone=30` about 20px.
- Buttons, geometry and zoom guards are shared. Game rendering, maps, AI, assets,
  sound and scoring are absent. The snapshots retain their existing 50ms action
  UI synchronization, equally in both modes; no game loop runs.
- The observer uses passive listeners and a microtask after dispatch to display
  raw event counts and accepted direction/action state. Four fixed touch markers
  and five recent log entries are bounded. Nothing is stored or transmitted.
- The test does not automatically know the user's physical touches. Matching
  start/end totals alone cannot rule out a completely missing touch sequence.

Interpretation: a difference between modes suggests an input implementation
factor. The same dropped sequence in both modes, without game load, warrants
investigating browser/platform delivery. A successful isolated test does not
by itself prove game performance or input behavior is correct on the phone.
