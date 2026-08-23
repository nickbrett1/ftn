# Making mailroom / pshelf / nas-port-mcp public (to use the OSS 400k credit pool)

**Goal:** enable CircleCI "Free and Open Source" on these three private repos so their Linux builds draw from the 400k/mo OSS pool instead of the standard paid plan (~29.5k/mo: mailroom 16.6k, pshelf 11.7k, nas 1.2k).

**Precondition check (done 2026-08-23):** no committed secrets found across all three (secrets are injected via Doppler). So the main blockers are **personal data (mailroom)** and **internal infra exposure (all three)**.

---

## 1. mailroom — remove the unused personal-data dumps

`inputs/psn_dump.txt` and `inputs/psn_unmatched_games.txt` are **unused** (0 code references; the `game_catalog` pipeline sources from msgvault email receipts + PSN API, not these files).

- [ ] `git rm -r inputs/` (or just `git rm inputs/psn_dump.txt inputs/psn_unmatched_games.txt` if the dir is otherwise empty)
- [ ] Add `inputs/` to `.gitignore` so future scratch dumps stay out
- [ ] Verify no code references `inputs/`: `grep -rn "inputs/" src tests` (expect none)
- [ ] Optional: `git filter-repo` to purge these files from history if you want no trace of the personal game list in git history (recommended before making public)

## 2. All three — redact internal infra details from `deploy/`

The deploy runbooks and `homepage-services.yaml` reveal home-lab topology. Generalize or remove:

- [ ] Internal hostnames: `nas`, `msgvault`, `netdata` → replace with `<nas>` / placeholder
- [ ] Internal ports: `3003`, `8080`, `8082`, `server_info` endpoints → redact or note "configurable"
- [ ] Any absolute NAS paths (e.g. `/volume1/docker/...`) → replace with `$DATA_DIR`
- [ ] Watchtower / Synology Container Manager specifics → keep generic ("auto-updates via Watchtower")
- [ ] GHCR image names are fine to keep (they're public-ish once you go public); do NOT put `GHCR_TOKEN` values in the repo (they're in the CircleCI context)

Files to scrub (per repo):
- `deploy/README.md`
- `deploy/homepage-services.yaml`
- `docker-compose.yml`
- `.env.example` (should already be placeholders — verify)

## 3. General hygiene before going public

- [ ] Confirm `.gitignore` blocks `.env`, secrets, and now `inputs/`
- [ ] Run a secret scan: `git grep -I -nE "(ghp_|github_pat_|AKIA|BEGIN (RSA |OPENSSH )?PRIVATE KEY|password\s*=|api[_-]?key\s*=)"` across each repo
- [ ] Check `.circleci/config.yml` doesn't hardcode tokens (should use `context: common`)
- [ ] `git log -p` spot-check for accidentally committed secrets/data

## 4. Flip to public + enable OSS in CircleCI

- [ ] GitHub: Settings → Danger Zone → Change visibility → Public (per repo, in order: nas-port-mcp → pshelf → mailroom)
- [ ] CircleCI: Project Settings → Advanced → enable **"Free and Open Source"** on each
- [ ] Confirm the setting is also on for the other public projects (agent-swarm, stripe-toddler, dbt-duckdb, parquet-peek)

## Order & expected impact

1. nas-port-mcp (1.2k/mo) — quickest, least data → do first as a low-risk pilot
2. pshelf (11.7k/mo)
3. mailroom (16.6k/mo) — after the `inputs/` + history scrub

Once all three are OSS, the standard-plan drain drops to ~0, freeing the org to move off the paid plan.
