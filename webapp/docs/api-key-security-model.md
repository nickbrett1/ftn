# API key security model

How credentials work across `ftn` and the `genproj` Worker, and what protects
them.

## Two boundaries, two mechanisms

There are two different ways to reach genproj, and they do not need the same
answer:

| Boundary                     | Who is calling                 | Mechanism                              |
| ---------------------------- | ------------------------------ | -------------------------------------- |
| `ftn` server route → genproj | ftn itself, on a user's behalf | A shared secret (`SERVICE_SECRET`)     |
| Client → genproj             | Anyone on the internet         | A PAT, for the endpoints that need one |

The internal hop uses a shared secret because genproj does not need to know
_which user_ is asking — only that it was ftn that asked. The public surface uses
PATs because there the caller genuinely is unknown and must identify itself.

> Earlier revisions of this document described a third kind of credential, a
> per-user `system` key that ftn derived with an HMAC for each signed-in user, so
> that genproj could attribute and rate-limit internal calls per user. That is
> gone: it was a lot of machinery — a secret, a `rotation` counter, a derivation
> function, a rotate endpoint and a UI affordance — in service of attribution
> nothing actually depended on. See "What we gave up" below.

## The internal hop: `SERVICE_SECRET`

A Cloudflare service binding is an internal handle, not a network address, so
requests over it never leave Cloudflare. That alone is not enough to authenticate
them, because genproj also has a public `workers.dev` host: from inside
`fetch()` it cannot tell a binding call from an internet call.

So ftn presents a header, `x-service-secret`, and genproj compares it against its
own `SERVICE_SECRET` binding. That comparison is the whole of the authentication
on this hop.

- The secret lives in Doppler — `webapp` (ftn) and `genproj` — and reaches each
  Worker through its deploy job. It is never in a client, never in the database,
  never in a log.
- Both sides must hold the same value. Rotating it is a two-place change.
- Anyone holding it can call genproj's generation endpoints. There is no
  per-user granularity to revoke, because there are no per-user credentials
  here — the blast radius is "someone can call generate", which is the blast
  radius of the service token genproj uses to reach GitHub anyway.

ftn also sends `x-user-email` when a signed-in user is behind the call. genproj
logs it, and **must not treat it as authoritative** — the caller chose it. It
exists so a generation can still be traced to a person, which is useful, but it
is observability, not security.

`genproj`'s handlers reject a request with a missing or wrong secret. A missing
`SERVICE_SECRET` on ftn's side fails the call with a 500 rather than letting
genproj return a 401, so the misconfiguration points at itself.

## The public surface

- `POST /v1/preview` is **unauthenticated by design**. It is pure computation on
  a request body, has no side effects, and does not touch any credential.
- `POST /v1/generate` and `POST /v1/conflicts` are not part of the public API
  contract; they are called by ftn over the binding. They still check the
  service secret, so they are not open to the internet.
- `POST /mcp` (P3) is internet-facing and authenticates with a PAT, because
  there is no ftn in the path to vouch for the caller.

## PATs: one table, two kinds

Personal access tokens live in the `api-keys` D1 database (owned by ftn, bound
read-only by genproj), in `ApiKeys`:

| `kind` | Who holds it          | Used for                                        | Lifecycle                          |
| ------ | --------------------- | ----------------------------------------------- | ---------------------------------- |
| `user` | A person              | Calling the MCP from their own tooling          | Created and deleted in `/api-keys` |
| `api`  | A machine/integration | Calling the MCP from a service (one per caller) | Created by hand, revoked by hand   |

Only the SHA-256 hash is stored; `validateKey()` hashes the presented token and
looks for a match.

**Anyone signed in sees every row for their own email, whatever its kind**, and
can revoke any of them. That is deliberate: a token that authenticates as you
should be yours to switch off, with no class of credential that outlives your
ability to revoke it.

## Rate limiting

Per token, independent of kind: 100 requests per minute, enforced in
`validateKey()` via `rate_limit_count` / `rate_limit_reset_at`.

Internal calls are not rate-limited per user, because they no longer carry a
per-user credential. ftn's own request handling is the only thing bounding them.

## What we gave up

Swapping the derived system key for a shared secret removed per-user attribution
and per-user rate limiting on the internal hop. Neither was load-bearing:

- Nothing consumed the attribution. genproj logged an email it had no reason to
  trust and no decision depended on.
- The rate limit protected genproj from a signed-in ftn user looping generate.
  That is bounded by ftn's session and its own UI, and a shared secret does not
  make it worse than a static service token would.

In exchange the schema shrank to the two kinds that are actually used, and the
`ApiKeys` table stopped carrying rows that existed only to be the identity of a
service.

## The four existing rows

All four are `api` — one per MCP caller (`doppler`, `Open webui`, `Mac-studio`,
`NAS`). None are `user`.

## Known leftovers

- The `rotation` column is still on the live database. It was added for the
  derived-key scheme and is now unused. It was deliberately left in place rather
  than dropped: the migration that added it has already run, so removing it would
  make a fresh database diverge from the deployed one for no benefit.
- `SYSTEM_KEY_SECRET` has been removed from the `webapp` project's Doppler
  configs. Nothing read it once the derived-key scheme went away.
