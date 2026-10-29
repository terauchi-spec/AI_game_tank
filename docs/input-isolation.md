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
- The observer uses passive capture listeners to record raw input and bubble listeners
  after the input handlers to display
  raw event counts and accepted direction/action state. The display is labeled `v2`; it no longer reads state in a microtask that can
  run before the input handler. Four fixed touch markers
  and five recent log entries are bounded. Nothing is stored or transmitted.
- The test does not automatically know the user's physical touches. Matching
  start/end totals alone cannot rule out a completely missing touch sequence.

Interpretation: a difference between modes suggests an input implementation
factor. The same dropped sequence in both modes, without game load, warrants
investigating browser/platform delivery. A successful isolated test does not
by itself prove game performance or input behavior is correct on the phone.

## Minimum B/S/A hold experiment

Open the **game** at `/?buttonHold=200` to enable a minimum 200ms logical hold
for touchscreen B/S/A. The title update label includes `BAS 0.2秒テスト`.
Normal URLs and mouse/keyboard input keep their usual release behavior.

- Actions start immediately. An early touchend frees physical touch ownership
  immediately, but delays the key/button visual release until 200ms from touchstart.
  Holding longer than 200ms releases immediately on touchend. The stick is unchanged.
- Tank B fires on logical release, so a short tap fires at 200ms; S/MG and other
  hold-based actions remain held for that minimum. A new tap is accepted separately
  and replaces any pending release for the same button, without clearing another button.
- Touch cancellation releases immediately and never fires a cancelled tank shot.
  Blur, hidden-page and menu resets discard pending timers and delayed shots.
- Only short released taps create a one-shot timer (at most one per button).
  There is no polling, game-loop work, storage, or event-delivery simulation.
- This tests game-side release timing only. It cannot extend a physical touch or
  recover a whole touch sequence that the browser never delivers. Device behavior
  and any change in the reported handoff failures still require real-phone testing.
