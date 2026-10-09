-- The owner's retuned pairs for §6's eight groups, carried onto databases the
-- category seed has already filled: the seed inserts only missing rows, so a
-- new seed value never reaches an existing one. A colour is replaced only
-- while it is still the old seed's, so a colour an admin has since chosen
-- stays theirs, and each column is matched alone, so retuning one half of a
-- pair keeps the other. Stamped as the seed's, whose values these are.
UPDATE "category_groups" SET "color_dark" = v.new, "updated_by" = '00000000-0000-0000-0000-000000000001'
FROM (VALUES
  ('protection-and-defense', '#4e8bc2', '#5d8ab1'),
  ('cleansing-and-release', '#35987d', '#50a58e'),
  ('prosperity-and-work', '#7b9132', '#86964a'),
  ('love-and-connection', '#cb6883', '#cf6e87'),
  ('wellbeing', '#379835', '#559c54'),
  ('craft-and-change', '#c45dc7', '#c371c6')
) AS v(seed_key, old, new)
WHERE "category_groups"."seed_key" = v.seed_key AND lower("category_groups"."color_dark") = v.old AND "category_groups"."deleted_at" IS NULL;--> statement-breakpoint
UPDATE "category_groups" SET "color_light" = v.new, "updated_by" = '00000000-0000-0000-0000-000000000001'
FROM (VALUES
  ('protection-and-defense', '#0c5393', '#286ba6'),
  ('cleansing-and-release', '#097255', '#1d755d'),
  ('prosperity-and-work', '#576d09', '#606c2f'),
  ('love-and-connection', '#930c31', '#a44c63'),
  ('mind-and-spirit', '#2b0c93', '#6e4ce6'),
  ('wellbeing', '#0d770a', '#326d31'),
  ('craft-and-change', '#8f0c93', '#a13ba5'),
  ('practice-and-place', '#934c0c', '#8a5628')
) AS v(seed_key, old, new)
WHERE "category_groups"."seed_key" = v.seed_key AND lower("category_groups"."color_light") = v.old AND "category_groups"."deleted_at" IS NULL;
