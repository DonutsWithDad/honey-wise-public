-- Usernames were only checked for uniqueness in code (UserStore.UserNameExists),
-- which two simultaneous sign-ups can race past. Enforce it in the database too.
-- Case-sensitive, matching how login and the existence check compare names.
CREATE UNIQUE INDEX IF NOT EXISTS "UX_User_UserName" ON "Tool"."User" ("UserName");
