-- Execute as migration owner AFTER the migrations. CREATE LOGIN role beforehand
-- with a securely managed password, and ensure it has no BYPASSRLS privilege.
-- Example role name: hoople_api. Do not put real passwords in the repository.
GRANT USAGE ON SCHEMA public, app TO hoople_api;
GRANT SELECT, INSERT, UPDATE ON users TO hoople_api;
GRANT SELECT, INSERT, UPDATE ON organizations TO hoople_api;
GRANT SELECT, INSERT ON memberships TO hoople_api;
GRANT SELECT, INSERT ON audit_logs TO hoople_api;
GRANT SELECT, INSERT, DELETE ON creator_sessions TO hoople_api;
GRANT SELECT, INSERT, UPDATE ON creator_preferences TO hoople_api;
GRANT SELECT, INSERT, UPDATE, DELETE ON brand_kits, experiences, missions TO hoople_api;
