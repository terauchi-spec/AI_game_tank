# MP3 SE integration

The green B-column cells in `こっそり戦車大作戦_ゲーム_SE.xlsx` identify the 56 supplied event mappings. The ten skill-activation events now alias the single `se_skills.mp3` asset, giving 47 active MP3 files before subsequent additions; the current bank has 58 files. `se-installed.json` records the active file paths and shared-skill aliases. Playback assets are stored under `assets/audio/se/`.

`js/audio.js` shares the existing AudioContext and replaces matching synthesized effects. Unprovided effects retain their existing synthesis. Before a requested MP3 has finished loading, gameplay uses its existing fallback instead of blocking or replaying the event late.

- Two concurrent fetch/decode jobs, deduplicated per effect.
- Decoded buffers use a 32 MiB LRU cache. Playing buffers are protected from eviction.
- At most 16 registered voices, with short fades when replacing voices. Rapid gunfire, impacts and alerts have per-effect cooldowns and voice limits.
- Distance attenuation culls distant effects; explicitly supplied floor identities suppress sounds from other indoor floors.
- Preload common effects during the existing preparation screen and load stage/skill effects as needed. Do not fetch unavailable files.
- Persistent vehicle, flamethrower, rainfall, alarm, aircraft and nearby fire sources are controlled at 10 Hz. Grass footsteps follow actual player movement.
- Stop loops on menus, stopping movement, tab hiding, window blur and resets. Pending loop downloads cannot resurrect stopped sources.
- One master gain and a shared compressor control summed output. Per-effect gains are in `playGameSe`; loop gains are in `updateGameAudio`.

Throw, hide (including water), decoy placement, reinforcement call, drill start, wall build, flame start, sniper deployment, hound command and partner command all resolve to `skillActivate`, backed by `se_skills.mp3`. Downloads, decoding, cache entries and voice limits are shared. Decoy signals, flame sustain, dog barks, weapon sounds and other physical effects retain their own files. Original redundant MP3 uploads are retained but no longer requested.

Validation: the original 56 supplied files matched GitHub blob hashes and decoded fully with FFmpeg; the shared skill asset has the same verified hash as the supplied skill placeholders. Automated audio tests exercise caching, concurrency, failures, distance, throttling, voice caps, loop cancellation and lifecycle. Browser/device listening and perceived loudness still require in-game confirmation.

`se_063_drill_contact.mp3` loops only while the active drill intersects cover, objects, the mission target or an enemy tank. Releasing contact, expiring the skill, boarding a vehicle, or entering a menu stops the loop. The shared skill activation sound remains `se_skills.mp3`.

Every active MP3 URL carries the corresponding Git blob revision from `se-revisions.json`, so replaced audio assets bypass old browser/CDN cache entries without changing filenames.

Rain loop gain is 0.20 times rain intensity (doubled from 0.10). The refreshed drill-contact clip is used, and the updated root-level tank movement upload is copied into the playback asset directory. Revision URLs match the refreshed playback files.

Enemy tanks use the supplied `se_00_enemy_tank_movement_loop.mp3` (3.024 seconds). Actual position changes are sampled at 10 Hz; stationary and destroyed tanks are silent. Distance attenuation fades the loudest moving enemy into one shared loop, culling at 1200 px and avoiding stacked loops in crowds. Menus, reset, tab hiding and blur stop playback and clear movement samples. The player vehicle keeps its separate existing sound.

Player and partner-operated tank cannons use seven distinct clips: T-34 = `se_025_tank_cannon_fire_7`, Tiger I = `_2`, Type 10 = `se_025_tank_cannon_fire`, M1 Abrams = `_4`, M4 Sherman = `_5`, Churchill = `_6`, King Tiger = `_3`. The active bank has 58 files. Vehicle type data supplies `cannonSe`; enemy cannons and commander bazookas keep their existing sounds. Cannon variants share the previous cannon gain and synthesized fallback. Only the currently boarded tank variant is preloaded on a vehicle change; other variants load on demand within the existing 32 MiB cache, two-decode and 16-voice limits. Trucks and armored cars use the refreshed `se_043_wheeled_vehicle_loop` with its updated content revision.

Dirt and grass footsteps share one tracked voice. Stopping, boarding, hiding, entering water/indoor areas or leaving play fades and stops that voice immediately, before the 10 Hz environmental scan. Other sound effects continue, and a loaded footstep is never replayed late. The refreshed wheeled vehicle clip uses its new Git content revision.
