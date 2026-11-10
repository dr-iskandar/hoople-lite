-- Staging-only checkout requests. An unauthenticated callback MUST NOT mark one as paid.
-- Append-only migrations: do not modify applied 0001-0003.
CREATE TABLE billing_checkout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  creator_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  idempotency_key uuid NOT NULL,
  plan_id text NOT NULL CHECK (plan_id IN ('starter','creator','studio')),
  amount_idr integer NOT NULL CHECK (amount_idr > 0),
  state text NOT NULL DEFAULT 'creating' CHECK (state IN ('creating','redirect_ready','initiation_failed')),
  checkout_url text CHECK (checkout_url IS NULL OR length(checkout_url) <= 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id,creator_user_id,idempotency_key)
);
CREATE INDEX idx_billing_checkout_org_time ON billing_checkout_requests(organization_id,created_at DESC);
ALTER TABLE billing_checkout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_checkout_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY billing_checkout_member ON billing_checkout_requests
  USING (organization_id = app.current_org_id() AND creator_user_id = app.current_user_id()
    AND EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id=app.current_org_id()
      AND m.user_id=app.current_user_id()))
  WITH CHECK (organization_id = app.current_org_id() AND creator_user_id = app.current_user_id()
    AND EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id=app.current_org_id()
      AND m.user_id=app.current_user_id()));

GRANT SELECT, INSERT, UPDATE ON billing_checkout_requests TO hoople_api;
