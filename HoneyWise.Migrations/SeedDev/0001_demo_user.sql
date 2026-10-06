-- LOCAL DEVELOPMENT ONLY (run with --seed-dev). Never run against production.
-- Runs on every migrator start, so it must stay idempotent.
--
-- Demo login:  username "demo"  /  password "HoneyWise123!"
-- The hash below is PasswordUtils.Hash("HoneyWise123!").
INSERT INTO "Tool"."User" ("Id", "FirstName", "LastName", "UserName", "Plan", "Password", "Email")
VALUES (
    '00000000-0000-0000-0000-00000000d3e0',
    'Demo',
    'User',
    'demo',
    'free',
    'AQAAAAIAAYagAAAAENyJE99cpisFazfw8KlwtiW3ZAYa1n3ZT6eALHfGCBo+OSEQkT7onNrMeCR33PPv+w==',
    'demo@example.com'
)
-- No conflict target: skip on either the Id or a "demo" username someone registered.
ON CONFLICT DO NOTHING;
