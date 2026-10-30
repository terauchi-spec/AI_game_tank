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
| 1 Introduction | Read the sequential control introduction | Clear banner, then north gate opens |
| 2 Bomb | Place/detonate an actual bomb and destroy the barrel | Non-bomb removal cannot clear |
| 3 Bush | Stay inside the natural seven-bush patch, unseen, for 2 consecutive seconds | Seen, guard hurt/killed, or destroyed/burning bush resets this step |
| 4 Stun | Use A from behind to stun both live guards without detection | Front approach, detection or bomb casualties reset this step; both guards disappear on clear |
| 5 Vehicle | Board the training tank and actually fire cannon and MG | Both real fire calls required; unlimited supplies and no damage |
| 6 Turret | Destroy four cardinal targets with cannon direct hits or MG | Hull movement/dismount disabled; bombs and blast-radius hits do not count |

There are no ordinary enemy spawns. The same grass patch, player position and two guards carry directly from hiding into the stun drill. Failed stun attempts restore that transition checkpoint. Only the two non-firing tutorial guards appear
in steps 3/4. They use common sight/cover and real A-stun behavior, with a training-
only rear-angle requirement. Other steps contain no enemy soldiers. Checkpoints,
guards, bombs, bullets, fire, fallen sprites and timer counters reset together.

A north boundary limits both player progress and camera exposure until each clear.
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
