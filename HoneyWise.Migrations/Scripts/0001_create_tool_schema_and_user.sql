-- The "Tool" schema and the "User" table every other table hangs off.
-- Written with IF NOT EXISTS so databases created by hand before migrations
-- existed are adopted as-is; the definition matches those databases exactly.
CREATE SCHEMA IF NOT EXISTS "Tool";

CREATE TABLE IF NOT EXISTS "Tool"."User" (
    "Id"        uuid              PRIMARY KEY,
    "FirstName" character varying NULL,
    "LastName"  character varying NOT NULL,
    "UserName"  character varying NOT NULL,
    "Plan"      character varying NOT NULL DEFAULT 'free',
    "Password"  character varying NOT NULL,   -- PBKDF2 hash (see PasswordUtils), never plaintext
    "Email"     character varying NULL
);
