# 00 準備 — 訓練施設

Stage `training` is listed before 01, is always selectable, and uses the existing
HQ terrain tile. It is intentionally absent from `STAGE_ORDER`: the 01–07 IDs,
numbers, prerequisites, achievements, stage records and leaderboard remain intact.
New players see it selected first until training is completed; the completion key
`tankGameTrainingCompleteV1` affects only that default selection, not unlocks.

The guide uses a lightweight SVG portrait of a female military assistant, a speech
bubble, screen-wide tap-to-advance dialogue and an optional step-clear overlay. Dialogues
and the 1.05-second clear presentation freeze simulation using the existing update
loop; there are no additional polling or animation timers. Dialogue reveals one character per 40 ms using the same game loop; a tap reveals the full current line before advancing. A pulsing triangle appears once that line is complete. The menu stays above the tap surface, and opening it hides the guide and pauses typing. The greeting reads the saved player name. Pausing also pauses the
training. Active progress text is updated at most 10 Hz; inactive training performs
no repeated DOM writes. Field props and training guards are bounded.

| Step | Condition | Reset / progression |
| --- | --- | --- |
| 1 Introduction | Read the sequential control introduction | Immediately show bomb instruction; no walking task or clear banner |
| 2 Bomb | Place/detonate an actual bomb and destroy the barrel | Non-bomb removal cannot clear |
| 3 Bush | Stay inside the natural seven-bush patch, unseen, for 2 consecutive seconds | Seen, guard hurt/killed, or destroyed/burning bush resets this step |
| 4 Stun | Use A from behind to stun both live guards without detection | Front approach, detection or bomb casualties reset this step; both guards disappear on clear |
| 5 Vehicle | Board the training tank and actually fire cannon and MG | Both real fire calls required; unlimited supplies and no damage |
| 6 Turret | Destroy four cardinal targets with cannon direct hits or MG | Hull movement/dismount disabled; bombs and blast-radius hits do not count |

There are no ordinary enemy spawns. The same grass patch, player position and two guards carry directly from hiding into the stun drill. Failed stun attempts restore that transition checkpoint. The guards begin on the left/right sides of the patch; discovery calls the normal found-mode reaction (face the player, red ! and detection sound), then resets after 1.2 seconds. Only the two non-firing tutorial guards appear
in steps 3/4. They use common sight/cover and real A-stun behavior, with a training-
only rear-angle requirement. Other steps contain no enemy soldiers. Checkpoints,
guards, bombs, bullets, fire, fallen sprites and timer counters reset together.

An invisible north boundary limits both player progress and camera exposure until each clear; there is no dashed line or boundary caption.
The last drill uses a centered camera and targets sized/spaced to the viewport.
Normal collisions, bomb burning/explosion, boarding and projectile hit handling are
reused. Hooks into those systems are gated strictly by `stageMode==='training'`.
The chosen skill is retained in selection state, but infantry skill use in training
is reserved for the closing explanation; it cannot spawn support actors.

Finish reads all four closing lines, then shows the existing mission-success page.
The next button opens the normal unlock presentation with no items and no rewards.
Its button returns to stage selection (01 selected), never evaluation. Finalization
short-circuits all normal score, title/rank, history, unlock and leaderboard writes.
Abandoning training likewise cannot grant rewards or open a graded evaluation.

Completed tasks latch for 2 seconds before the clear banner; input is released while explosion/fragment effects continue. The banner then lasts 1.05 seconds. Both delays pause with the menu. Only actual dialogue shows the assistant portrait and speech bubble. Objective/progress text has a separate dark rectangular panel. The triangle is absolutely placed in the bubble corner and reserves no extra row; dialogue fonts are 26 px desktop / 21 px mobile.

The tank is at y=10700, 380 world units ahead of the bush/stun patch (previously 1960 units). Intro dialogue directly enters the bomb lesson, without a standalone movement objective or completion delay.

The opening has two welcome lines followed by one combined movement explanation. The former separate introductory bomb line is omitted. Training vehicle HUD retains name/armor only; ammunition and fuel rows are not drawn and the panel is shortened. Other stages retain the complete HUD.

Intro and bomb practice share the same initial north camera limit so advancing dialogue preserves both world and screen position on tall mobile viewports. Every task uses the existing capture-complete SE once when the delayed clear banner appears; it is preloaded for training. Bush rustling throughout the game now follows actual movement, stops on the first stationary frame, and safely cancels pending playback if decoding finishes after stopping.
