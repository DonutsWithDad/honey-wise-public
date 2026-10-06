-- Recipe Book schema + ingredient-preset reference data.
-- IF NOT EXISTS / ON CONFLICT keep this a no-op on databases where it was
-- applied by hand before migrations existed.

-- One row per recipe. "UserId" is a foreign key to "Tool"."User"("Id"), so a
-- user has many recipes (one-to-many); deleting a user removes their recipes.
-- "Document" holds the whole recipe serialized as XML (see RecipeXmlSerializer).
CREATE TABLE IF NOT EXISTS "Tool"."Recipe" (
    "Id"        uuid        PRIMARY KEY,
    "UserId"    uuid        NOT NULL REFERENCES "Tool"."User" ("Id") ON DELETE CASCADE,
    "Name"      text        NOT NULL,
    "Document"  xml         NOT NULL,
    "CreatedAt" timestamptz NOT NULL,
    "UpdatedAt" timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS "IX_Recipe_UserId" ON "Tool"."Recipe" ("UserId");

-- Curated ingredient presets offered in the recipe form. Users can still enter
-- fully custom ingredients that aren't listed here. "SortOrder" lets a category
-- be ordered deliberately; ties fall back to name.
CREATE TABLE IF NOT EXISTS "Tool"."IngredientPreset" (
    "Id"        uuid    PRIMARY KEY,
    "Category"  text    NOT NULL,   -- Honey | Water | Yeast | Spice | Fruit | Nutrient | Stabilizer | Other
    "Name"      text    NOT NULL,
    "SortOrder" int     NOT NULL DEFAULT 0
);

-- One preset per (Category, Name) so re-running the seed can't duplicate rows.
CREATE UNIQUE INDEX IF NOT EXISTS "UX_IngredientPreset_Category_Name"
    ON "Tool"."IngredientPreset" ("Category", "Name");

INSERT INTO "Tool"."IngredientPreset" ("Id", "Category", "Name", "SortOrder")
VALUES
    -- Honey
    (gen_random_uuid(), 'Honey', 'Orange Blossom',        1),
    (gen_random_uuid(), 'Honey', 'Clover',                2),
    (gen_random_uuid(), 'Honey', 'Wildflower',            3),
    (gen_random_uuid(), 'Honey', 'Buckwheat',             4),
    (gen_random_uuid(), 'Honey', 'Tupelo',                5),
    (gen_random_uuid(), 'Honey', 'Acacia',                6),
    -- Water
    (gen_random_uuid(), 'Water', 'Spring',                1),
    (gen_random_uuid(), 'Water', 'Distilled',             2),
    (gen_random_uuid(), 'Water', 'Reverse Osmosis',       3),
    (gen_random_uuid(), 'Water', 'Tap',                   4),
    -- Yeast
    (gen_random_uuid(), 'Yeast', 'Lalvin D47',            1),
    (gen_random_uuid(), 'Yeast', 'Lalvin 71B',            2),
    (gen_random_uuid(), 'Yeast', 'Lalvin EC-1118',        3),
    (gen_random_uuid(), 'Yeast', 'Lalvin K1-V1116',       4),
    (gen_random_uuid(), 'Yeast', 'Red Star Premier Blanc',5),
    (gen_random_uuid(), 'Yeast', 'Wyeast Sweet Mead',     6),
    -- Spice
    (gen_random_uuid(), 'Spice', 'Cinnamon',              1),
    (gen_random_uuid(), 'Spice', 'Clove',                 2),
    (gen_random_uuid(), 'Spice', 'Vanilla Bean',          3),
    (gen_random_uuid(), 'Spice', 'Nutmeg',                4),
    (gen_random_uuid(), 'Spice', 'Ginger',                5),
    -- Fruit
    (gen_random_uuid(), 'Fruit', 'Cherries',              1),
    (gen_random_uuid(), 'Fruit', 'Blackberries',          2),
    (gen_random_uuid(), 'Fruit', 'Raspberries',           3),
    (gen_random_uuid(), 'Fruit', 'Apples',                4),
    (gen_random_uuid(), 'Fruit', 'Elderberries',          5),
    -- Nutrient
    (gen_random_uuid(), 'Nutrient', 'Fermaid O',          1),
    (gen_random_uuid(), 'Nutrient', 'Fermaid K',          2),
    (gen_random_uuid(), 'Nutrient', 'DAP',                3),
    (gen_random_uuid(), 'Nutrient', 'Go-Ferm',            4),
    -- Stabilizer
    (gen_random_uuid(), 'Stabilizer', 'Sparkolloid',      1),
    (gen_random_uuid(), 'Stabilizer', 'Potassium Sorbate',2),
    (gen_random_uuid(), 'Stabilizer', 'Potassium Metabisulfite', 3),
    (gen_random_uuid(), 'Stabilizer', 'Bentonite',        4)
ON CONFLICT ("Category", "Name") DO NOTHING;
