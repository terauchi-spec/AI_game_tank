# Menu background music

`assets/audio/bgm/stahlmarsch_zum_sieg.mp3` is the supplied 60.160-second MP3. It plays once across title, skill selection and stage selection without restarting between those screens. Other screens and hidden/blurred pages pause it. Returning to an eligible screen resumes its position; once ended, it stays ended until the page reloads.

Browser autoplay restrictions require the first trusted pointer/key interaction before audible playback. No additional start button is added. One streaming HTMLAudioElement and, when available, a gain on the existing AudioContext keep full-song decoded buffers out of the SE cache. BGM gain is 0.23 and SE gains are unchanged. Playback errors cannot block the game or create automatic retry loops. The main render loop only checks playback state; it does not restart a playing track.
