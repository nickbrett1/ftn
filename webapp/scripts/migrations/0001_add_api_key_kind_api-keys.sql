-- Add a `kind` column to ApiKeys (api-keys D1).
--
-- Apply with:
--   npx wrangler d1 execute api-keys --remote \
--     --file=scripts/migrations/0001_add_api_key_kind_api-keys.sql
--
-- Note: webapp/migrations/ is gitignored (it holds prod->dev dumps), so schema
-- changes live here instead, next to api_keys_schema.sql which is kept in step
-- for fresh databases.
--
-- `kind` separates the credentials that share this table:
--   'user'   - a PAT a human created in the /api-keys UI. Deletable by its owner.
--   'api'    - a service credential held by an MCP caller. Not tied to a
--              person's daily use; rotated by an operator.
--   'system' - a per-user credential provisioned by ftn itself, used when ftn's
--              own server routes have to call the genproj Worker as the user who
--              is logged in. Shown read-only in the UI and rotatable, but never
--              deleted from the UI — deleting it would silently break the
--              genproj-backed parts of the app for that user.
--
-- Every row that already exists was created by hand for an MCP caller, so the
-- migration sets them all to 'api' rather than leaving them on the column
-- default. ('user' is the default for the column only because that is the
-- safest value for anything that forgets to pass one; the application always
-- passes an explicit kind.)
--
-- `rotation` is a counter bumped on each rotation of a 'system' key, so the
-- previous value stops working without the store needing to know what it was.
--
-- D1 has no rename/alter-drop, only ALTER TABLE ADD COLUMN, which is why the
-- columns are added rather than the table rebuilt.

ALTER TABLE ApiKeys ADD COLUMN kind TEXT NOT NULL DEFAULT 'user';
ALTER TABLE ApiKeys ADD COLUMN rotation INTEGER NOT NULL DEFAULT 0;

-- There are four credentials in this table today, one per MCP caller.
UPDATE ApiKeys SET kind = 'api';
