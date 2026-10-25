# Unlock summary screen

A new gold summary screen is inserted before normal mission results whenever the finalized run contains a newly unlocked stage, skill, or first-time current title. Existing success/failure overlays remain. With no new unlocks, results open directly. Debug and unsuccessful saves do not generate unlock cards. Presentation reads the existing progression outcomes; unlock conditions and persistence are unchanged.

The summary is prepared once on the run object. Its fixed bottom button (or Enter, Space, Escape) acknowledges it and opens evaluation. Result SE and the subsequent theme begin only on evaluation opening. Repeated sync calls, double clicks, and achievement-screen returns do not repeat the summary or award anything.

Three supplied instructor images cycle 1 → 2 → 3 → 1. Only opening a new summary advances the index; a dedicated localStorage key remembers the next image, with an in-memory fallback when storage is unavailable. The original supplied artwork is resized and encoded as WebP (under 67 KB each), with only the current portrait requested. Existing stage, skill and title art is reused. Rendering occurs once per summary, with no additional animation loop or timers. The portrait is displayed on a pale gold panel; CSS multiply blends its supplied white background with the panel.

The independent scrollable layer reserves room for a safe-area-aware fixed evaluation button, uses the shared menu button font size, and hides underlying result cards and gameplay controls. Desktop and narrow mobile widths use the same responsive card flow. Existing inline unlock notices are visually consolidated into this screen; evaluation titles and achievement counts remain available as before.
