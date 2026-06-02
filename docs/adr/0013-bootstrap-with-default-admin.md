# Bootstrap with a temporary default admin

BFitLog no longer uses a first-run setup form to create the initial admin and partner users. Instead, API startup ensures a temporary default admin user exists with username `admin` and password `admin` when no real admin exists.

The first operator logs in with that default admin account and creates the first real user from the admin area. The first real user-created account is always promoted to `admin`. After that account exists, the default admin account is deleted, invalidating the temporary bootstrap session. Later users are created by admins and default to the `member` role unless an admin explicitly chooses otherwise.

This keeps first-run deployment simple for self-hosting and avoids a separate setup workflow. The tradeoff is that a fresh public deployment has a known temporary credential, so operators must create a real admin immediately and should not expose an uninitialized instance publicly longer than necessary.
