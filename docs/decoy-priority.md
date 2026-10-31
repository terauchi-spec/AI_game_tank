# Decoy target priority (2026-11-01)

Eligible decoys now take priority over the player, partner and allied infantry in
shared enemy target selection. Capture-area automatic awareness no longer
supersedes a decoy for infantry or tanks. Infantry also face the decoy during
their existing discovery pause instead of looking back at the player. Without an eligible decoy, the existing
capture-area and nearest-friendly target rules are retained. The tank's silent
drill behavior is unchanged.

Keep the existing five-second duration, eight-second cooldown, 500-world-pixel
sound radius (halved during conversation) and visual-detection fallback beyond
hearing range. Sound can draw attention through cover, but shots continue to
require line of sight. Indoor guards retain their existing dedicated decoy AI
and floor restrictions.

Each enemy records the current active decoy identity with its ordinary detection
cache. New placement, replacement and expiry invalidate that cache immediately;
unchanged scenes keep the existing throttled checks. There is no global enemy
scan on deployment and no new timer, polling loop, or visual asset. Choosing an
audible decoy skips the otherwise redundant ally/partner sight checks.
