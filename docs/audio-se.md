# MP3 SE integration

The green B-column cells in `こっそり戦車大作戦_ゲーム_SE.xlsx` identify the 56 installed effects. `se-installed.json` records their English file paths. Files remain unchanged under `assets/audio/se/`.

`js/audio.js` shares the existing AudioContext and replaces matching synthesized effects. Unprovided effects retain their existing synthesis. Before a requested MP3 has finished loading, gameplay uses its existing fallback instead of blocking or replaying the event late.

- Two concurrent fetch/decode jobs, deduplicated per effect.
- Decoded buffers use a 32 MiB LRU cache. Playing buffers are protected from eviction.
- At most 16 registered voices, with short fades when replacing voices. Rapid gunfire, impacts and alerts have per-effect cooldowns and voice limits.
- Distance attenuation culls distant effects; explicitly supplied floor identities suppress sounds from other indoor floors.
- Preload common effects during the existing preparation screen and load stage/skill effects as needed. Do not fetch unavailable files.
- Persistent vehicle, flamethrower, rainfall, alarm, aircraft and nearby fire sources are controlled at 10 Hz. Grass footsteps follow actual player movement.
- Stop loops on menus, stopping movement, tab hiding, window blur and resets. Pending loop downloads cannot resurrect stopped sources.
- One master gain and a shared compressor control summed output. Per-effect gains are in `playGameSe`; loop gains are in `updateGameAudio`.

Some supplied skill MP3s have identical content. Each supplied filename is mapped to its own intended gameplay event without modifying the uploaded audio.

Validation: all 56 files matched GitHub blob hashes and decoded fully with FFmpeg. Automated audio tests exercise caching, concurrency, failures, distance, throttling, voice caps, loop cancellation and lifecycle. Browser/device listening and perceived loudness still require in-game confirmation.
