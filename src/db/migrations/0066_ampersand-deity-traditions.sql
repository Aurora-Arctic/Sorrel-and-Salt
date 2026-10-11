-- MB.115: the five seeded traditions joining two names now join them with "&",
-- carried onto databases the deity seed has already filled: the seed inserts
-- only missing rows, so a new seed name never reaches an existing one. A row
-- is renamed only while it is live and still holds the old seed name under
-- the seed's key, so a tradition an admin has renamed stays theirs. Slugs do
-- not change, since `slugify` spells "&" as "and". Stamped as the seed's,
-- whose names these are.
UPDATE "deity_traditions" SET "name" = v.new, "updated_by" = '00000000-0000-0000-0000-000000000001'
FROM (VALUES
  ('akkadian-and-babylonian', 'Akkadian and Babylonian', 'Akkadian & Babylonian'),
  ('canaanite-and-phoenician', 'Canaanite and Phoenician', 'Canaanite & Phoenician'),
  ('anglo-saxon-and-continental-germanic', 'Anglo-Saxon and Continental Germanic', 'Anglo-Saxon & Continental Germanic'),
  ('gaulish-and-british', 'Gaulish and British', 'Gaulish & British'),
  ('fon-and-ewe', 'Fon and Ewe', 'Fon & Ewe')
) AS v(seed_key, old, new)
WHERE "deity_traditions"."seed_key" = v.seed_key AND "deity_traditions"."name" = v.old AND "deity_traditions"."deleted_at" IS NULL;
