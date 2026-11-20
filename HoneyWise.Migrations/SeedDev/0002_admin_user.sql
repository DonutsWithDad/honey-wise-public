-- LOCAL DEVELOPMENT ONLY (run with --seed-dev). Never run against production.
-- Runs on every migrator start, so it must stay idempotent.
--
-- Admin login:  username "admin@admin.com"  /  password "admin"
-- Login matches on UserName, so the email address doubles as the username.
-- The hash below is PasswordUtils.Hash("admin").
INSERT INTO "Tool"."User" ("Id", "FirstName", "LastName", "UserName", "Plan", "Password", "Email")
VALUES (
    '00000000-0000-0000-0000-0000000ad000',
    'Admin',
    'User',
    'admin@admin.com',
    'free',
    'AQAAAAIAAYagAAAAELHeNHD6Okiy+d4wJsz2ZB+01KYBkQMxBZWf61FIBdjyTz0bybRNwToBKp34kZ+FuA==',
    'admin@admin.com'
)
-- No conflict target: skip on either the Id or an "admin@admin.com" username someone registered.
ON CONFLICT DO NOTHING;
