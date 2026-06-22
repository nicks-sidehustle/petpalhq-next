# PetPalHQ Content Cron — Run Log

Append-only log of every cron tick. Format: `<ISO-timestamp> | <slug-or-empty> | <outcome> | <details>`

Outcome categories:
- `shipped` — guide live, indexed, queue advanced
- `abort_insufficient_picks` — fewer than 3 picks above $50 floor
- `abort_fk_unfixable` — FK > 13.5 after 3 rewrite passes
- `abort_image_gen` — gen-hero.mjs failed twice
- `abort_build_failure` — npm run build exited non-zero
- `partial_deploy_timeout` — deploy poll exceeded 10 minutes
- `queue_empty` — no pending entries

## Log
