-- Stage 1: OIDC creator sessions, workspace preference and draft builder entities.
-- Run with DDL owner role. Do not rewrite 0001 (migration checksums are immutable).

-- A verified OIDC callback may upsert a creator before their app.current_user_id is known.
-- NEVER derive these settings from HTTP input; only from a validated OIDC ID token.
CREATE POLICY users_oidc_bootstrap ON users FOR ALL
  USING (identity_provider = current_setting('app.oidc_issuer', true)
    AND provider_subject = current_setting('app.oidc_subject', true))
  WITH CHECK (identity_provider = current_setting('app.oidc_issuer', true)
    AND provider_subject = current_setting('app.oidc_subject', true));

-- Listing own workspaces requires membership and organization reads across tenants.
-- Writes still require app.current_org_id and application RBAC.
CREATE POLICY memberships_creator_list ON memberships FOR SELECT
  USING (user_id = app.current_user_id());
CREATE POLICY organizations_creator_list ON organizations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.organization_id = organizations.id AND m.user_id = app.current_user_id()
  ));
-- Restrictive guards prevent a caller from reading or editing a foreign org
-- solely by setting app.current_org_id. All policies must permit the operation.
CREATE POLICY memberships_self_guard ON memberships AS RESTRICTIVE FOR SELECT
  USING (user_id = app.current_user_id());
CREATE POLICY memberships_creator_insert ON memberships AS RESTRICTIVE FOR INSERT
  WITH CHECK (user_id = app.current_user_id());
CREATE POLICY organizations_member_guard ON organizations AS RESTRICTIVE FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.organization_id = organizations.id AND m.user_id = app.current_user_id()
  ));
CREATE POLICY organizations_update_guard ON organizations AS RESTRICTIVE FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.organization_id = organizations.id AND m.user_id = app.current_user_id()
  ));
ALTER TABLE organizations ADD COLUMN archived_at timestamptz;

CREATE TABLE creator_sessions (
  token_hash text PRIMARY KEY CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_creator_sessions_expiry ON creator_sessions(expires_at);
ALTER TABLE creator_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY creator_session_access ON creator_sessions
  USING (token_hash = current_setting('app.session_hash', true))
  WITH CHECK (token_hash = current_setting('app.session_hash', true)
    AND user_id = app.current_user_id());

CREATE TABLE creator_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  active_organization_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_active_membership FOREIGN KEY (active_organization_id, user_id)
    REFERENCES memberships(organization_id, user_id) ON DELETE SET NULL (active_organization_id)
);
ALTER TABLE creator_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_preferences FORCE ROW LEVEL SECURITY;
CREATE POLICY creator_preferences_self ON creator_preferences
  USING (user_id = app.current_user_id())
  WITH CHECK (user_id = app.current_user_id());

CREATE TABLE brand_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
  primary_color text NOT NULL DEFAULT '#981CEB' CHECK (primary_color ~ '^#[A-Fa-f0-9]{6}$'),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(settings) = 'object'),
  logo_asset_id uuid,
  cover_desktop_asset_id uuid,
  cover_mobile_asset_id uuid,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id)
);
CREATE INDEX idx_brand_kits_org ON brand_kits(organization_id);

CREATE TABLE experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  brand_kit_id uuid,
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  experience_type text NOT NULL CHECK (experience_type IN ('passport', 'hunt', 'quiz')),
  lifecycle_status text NOT NULL DEFAULT 'draft'
    CHECK (lifecycle_status IN ('draft', 'scheduled', 'live', 'paused', 'ended')),
  release_at timestamptz,
  release_timezone text NOT NULL DEFAULT 'Asia/Jakarta',
  publication_mode text NOT NULL DEFAULT 'manual' CHECK (publication_mode IN ('manual', 'scheduled')),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(settings) = 'object'),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, slug),
  FOREIGN KEY (organization_id, brand_kit_id) REFERENCES brand_kits(organization_id, id),
  CHECK (publication_mode <> 'scheduled' OR release_at IS NOT NULL)
);
CREATE INDEX idx_experiences_org_status ON experiences(organization_id, lifecycle_status);

CREATE TABLE missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  experience_id uuid NOT NULL,
  position integer NOT NULL CHECK (position >= 0),
  kind text NOT NULL CHECK (kind IN ('checkin','photo','qr','quiz')),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
  description text NOT NULL DEFAULT '',
  points integer NOT NULL DEFAULT 0 CHECK (points BETWEEN 0 AND 100000),
  public_config jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(public_config) = 'object'),
  private_validation jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(private_validation) = 'object'),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, experience_id) REFERENCES experiences(organization_id, id) ON DELETE CASCADE,
  UNIQUE (experience_id, position) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX idx_missions_experience_order ON missions(experience_id, position);

DO $$
DECLARE name text;
BEGIN
  FOREACH name IN ARRAY ARRAY['brand_kits','experiences','missions'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', name);
    EXECUTE format($p$CREATE POLICY %I ON %I
      USING (organization_id = app.current_org_id() AND EXISTS (
        SELECT 1 FROM memberships m WHERE m.organization_id = app.current_org_id()
          AND m.user_id = app.current_user_id()))
      WITH CHECK (organization_id = app.current_org_id() AND EXISTS (
        SELECT 1 FROM memberships m WHERE m.organization_id = app.current_org_id()
          AND m.user_id = app.current_user_id()))$p$, name || '_tenant', name);
  END LOOP;
END $$;

-- The migrator owns the schema; use a separate, non-BYPASSRLS runtime DB role.
-- Provision only required SELECT/INSERT/UPDATE/DELETE grants for this role before serving traffic.
