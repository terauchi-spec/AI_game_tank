# Stage 07 — 決戦

`decisive` is a normal, persistent stage after `front` (06 制圧・上級). It is available in developer all-stage selection too. Existing version-2 progress needs no migration. Records, leaderboard validation, unlock notices and the all-stage title include stage 07; already-earned titles are retained.

The world keeps the existing 960 × 12800 coordinate system and generation pipeline:

1. Starting grass, with one player and no automatic allies.
2. Three distinct shuffled areas from the existing outdoor pool (grass, forest, village, hills, frontline base, town, wetland, wilderness).
3. A relay capture circle near the north end of the third random area. Its 300px radius and dry clearing are reserved after generation. The player can capture alone here: 48 seconds while not hiding or flying and with no conscious enemies or enemy tanks inside. Enemies contest/decay progress using the capture-stage rule. The desert boundary stays closed until capture finishes.
4. Three consecutive desert zones. Each has three concrete bunkers, six destructible sandbag walls and a supplied tank. Defenses occupy alternating flanks, preserving a central route. Bunkers stop shooting when their intact cover is broken.
5. The final desert contains a 600 × 400 moving fortress with 90 HP, using existing base hit detection, fragment damage, bombs, cannons and destruction/success flow. It moves laterally at 18px/s within a 150px patrol range and waits if the next collider position would overlap units or vehicles. Its front cannon uses existing enemy shells. It cannot take objective damage before the relay falls.

`js/decisive.js` owns only the new stage's orchestration. Before the relay, `stageMode` is `decisive`, retaining ordinary destruction-stage patrol/combat. Desert infantry remain inactive reserves. Relay capture changes `stageMode` to `front`, so existing frontline infantry target acquisition, commander roles, detours, ally sight and stun behavior are reused. The wave functions keep the ordinary 16-enemy cap and standard 6-player-side initial squad, with normal reinforcement checks. Dead or incapacitated pre-relay troops do not reappear as reserve reinforcements. The new mission update never triggers the standard capture-all-points victory: only fortress destruction wins.

`currentStageId()` remains `decisive` throughout both phases. `scoreStats.stage` and sortie records also remain `decisive`. Hybrid objective progress allocates half to relay capture and half to fortress damage. Scoring uses the frontline wave/support caps throughout the run. The final approach point guides allies to a firing position below the fortress, rather than into its collider.

Assets load once on entering this stage. Desert textures, bunker and sandbag WebPs and fortress/preview WebPs have SVG source where applicable. Drawing uses the existing viewport culling and fragment caches. Bunker target scans run at 5Hz; infantry wave logic keeps its existing cadence and population bounds. No new timers, workers or per-frame image loading are used.

Validation: `node --test tests/*.test.cjs`. The engine integration harness runs the actual scripts, map generation, mission updates, AI updates and victory/persistence code with deterministic randomness and mock DOM/canvas/audio/network. It does not replace browser/iPhone visual or audio validation.
