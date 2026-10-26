# Developer mode

On the title screen, tap `Terauchi Takeharu` three times to open the four-digit PIN
form. The requested PIN is verified only by the Worker, never stored in browser
storage or included in the client script. Successful login shows a purple
`開発者` button. Three further taps on the title credit exit developer mode.
Reloading the page starts in normal mode; there is no authentication polling.

Developer mode reveals the all-skills toggle, all-stages toggle, area debugger,
Oni test stage and in-game P control. P/O/L keys and the corresponding entry
functions are gated too. Exiting clears debug, invincibility, all-content and
patrol-route overrides. Normal progression and local saved records are unchanged.

The developer page has a scoreboard reset button. It requires explicit UI
confirmation and the server's valid HttpOnly session cookie. It clears overall
and every normal stage board, preserving authorization/session data and local
progression. This browser's unsent scoreboard entries are cleared after success.
Other browsers' future submissions can populate the boards again.

The existing SQLite Durable Object owns the new developer session data; no new
binding, secret or database migration is required. Sessions expire after eight
hours and are bounded to twenty. Login attempts are limited to eight per minute
per scoreboard instance. Logout revokes the cookie's server-side session.
The chosen four-digit shared PIN is an access gate, not an individual account
system; use is intended for this game's development tools.

API routes are `/api/developer/login`, `/api/developer/logout`,
`/api/developer/session`, `/api/developer/reset-scoreboard`. Mutating requests
require same-origin JSON; reset also requires the server-issued opaque cookie.
