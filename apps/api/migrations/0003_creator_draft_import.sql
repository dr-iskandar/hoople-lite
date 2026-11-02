-- Preserve immutable 0001/0002 checksums: add stable local draft import key in v0003.
ALTER TABLE experiences ADD COLUMN import_key text CHECK (import_key IS NULL OR length(import_key) BETWEEN 3 AND 96);
CREATE UNIQUE INDEX idx_experiences_org_import_key ON experiences(organization_id,import_key)
  WHERE import_key IS NOT NULL;

-- Only the owner-controlled API role may mutate authenticated draft editor tables.
-- Run migration with the DDL owner; runtime must remain a non-BYPASSRLS role.
GRANT INSERT, UPDATE, DELETE ON brand_kits, experiences, missions TO hoople_api;
