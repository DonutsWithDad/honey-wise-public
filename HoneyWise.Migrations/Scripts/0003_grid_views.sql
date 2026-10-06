-- Saved grid views. IF NOT EXISTS keeps this a no-op on databases where it was
-- applied by hand before migrations existed.

-- One row per named view a user saves for a grid. "GridKey" names the grid the
-- view belongs to (e.g. 'recipes'), so one table serves every grid in the app.
-- "State" is opaque JSON owned by the web app (AG Grid column/sort/filter state
-- plus any page-level filters); the API stores it without interpreting it.
CREATE TABLE IF NOT EXISTS "Tool"."GridView" (
    "Id"        uuid        PRIMARY KEY,
    "UserId"    uuid        NOT NULL REFERENCES "Tool"."User" ("Id") ON DELETE CASCADE,
    "GridKey"   text        NOT NULL,
    "Name"      text        NOT NULL,
    "State"     jsonb       NOT NULL,
    "IsDefault" boolean     NOT NULL DEFAULT false,
    "CreatedAt" timestamptz NOT NULL,
    "UpdatedAt" timestamptz NOT NULL
);

-- View names are unique per user and grid, ignoring case.
CREATE UNIQUE INDEX IF NOT EXISTS "UX_GridView_User_Grid_Name"
    ON "Tool"."GridView" ("UserId", "GridKey", lower("Name"));

-- At most one default view per user and grid.
CREATE UNIQUE INDEX IF NOT EXISTS "UX_GridView_User_Grid_Default"
    ON "Tool"."GridView" ("UserId", "GridKey")
    WHERE "IsDefault";
