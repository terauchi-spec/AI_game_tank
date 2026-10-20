# Infiltration visual suspicion

Only the dedicated indoor guard AI uses this model. Outdoor stage AI and graphics are unchanged.

Before recognizing the player, a guard accumulates evidence from four visible cues: illumination (30%), movement speed (25%), proximity (25%), and closeness to the center of the guard's view (20%). The weighted score is squared, making overlapping cues more dangerous than one cue alone. Existing walls, doors, concealment, sight cones, light-dependent sight ranges, and stair sanctuary still gate visibility.

The evidence rate is `0.08 + 2.72 * score²` per second. Lighting is normalized over 0.24–0.96, motion over 0–120 world pixels/second, proximity over 260–35 world pixels, and facing over the existing outer cone. Full recognition requires 1 evidence on patrol, or 0.8 while searching. The earliest patrol confirmation under sustained maximum cues is approximately 0.36 seconds. These are tuning values, not guaranteed encounter times: guard facing, movement, and occlusion change the inputs.

Patrol guards react and show the existing suspicion indicator after evidence exceeds 0.14. Weaker glimpses allow patrol to continue. When sight is blocked, evidence decays at 1.6 per second; the last observed spot is retained without refreshing it from hidden player movement. Searchers cannot overwrite their report or trigger discovery until evidence is confirmed. Confirmed pursuit keeps its original 1.35-second sight-loss grace, last-seen destination and bounded search. The existing visual relay from already alerted soldiers and nearby footstep investigation (including the silent rear 45-degree sector) remain intact.

Cue arithmetic runs only on the existing roughly 0.12–0.14-second vision samples and reuses the sampled light, distance and angle. There are no new vision rays, lighting passes, assets or per-frame canvas operations. Only evidence accumulation/decay runs between samples. Search/sweep guards sample movement only when visible; patrol's unseen motion sampling is used solely by its existing hearing rules. Cross-floor teleports of 50 pixels or more are excluded from motion evidence.

Tests cover cue combinations, weak glimpses, faster recognition of movement in bright close sightlines, fading evidence, sampling frequency, hidden coordinates, reacquisition, hearing, alarm conversations and outdoor guard isolation. Real-device feel and mobile frame rate still require playtesting.
