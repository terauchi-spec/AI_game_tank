# Developer mode

On the title screen, tap `Terauchi Takeharu` three times to open the password
form. The password is verified only by the Worker, never stored in browser
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

The existing SQLite Durable Object owns developer session data; no new binding
or database migration is required. Set the Cloudflare Worker Secret
`DEVELOPER_PASSWORD` to a unique random password of 16–256 characters in the
existing Worker (Settings → Variables and Secrets → Add → Secret), or run
`npx wrangler secret put DEVELOPER_PASSWORD` from an authenticated environment.
Do not put its value in source, wrangler.json, or a normal public configuration.
No default password exists: an absent/short secret disables developer API access
with HTTP 503 while normal gameplay and scoreboards remain available.
The login form now accepts that password instead of the former four-digit PIN. Sessions expire after eight
hours and are bounded to twenty. Login attempts are limited to eight per minute
per scoreboard instance. Logout revokes the cookie's server-side session.
Pre-fix sessions are ignored. Sessions are scoped to the configured password,
so rotating the Secret invalidates previously issued sessions. The password
never enters the client bundle or local storage. This is shared developer
authentication, not an individual account system.

API routes are `/api/developer/login`, `/api/developer/logout`,
`/api/developer/session`, `/api/developer/reset-scoreboard`. Mutating requests
require same-origin JSON; reset also requires the server-issued opaque cookie.
