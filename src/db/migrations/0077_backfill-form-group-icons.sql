-- M12.6. The glyph each of the six seeded form groups names, carried onto
-- databases the form seed has already filled: the seed inserts only missing
-- rows, so a new seed field never reaches an existing one. Written only where
-- the icon is still NULL, so one an admin has set stays theirs; this runs
-- once, straight after 0076 adds the column, so no admin has yet had the
-- chance to clear one. Stamped as the seed's, whose values these are.
UPDATE "ingredient_form_groups" SET "icon" = v.icon::form_group_icon, "updated_by" = '00000000-0000-0000-0000-000000000001'
FROM (VALUES
  ('botanical', 'botanical'),
  ('animal', 'animal'),
  ('mineral', 'mineral'),
  ('substance', 'substance'),
  ('fluid', 'fluid'),
  ('curio', 'curio')
) AS v(seed_key, icon)
WHERE "ingredient_form_groups"."seed_key" = v.seed_key AND "ingredient_form_groups"."icon" IS NULL AND "ingredient_form_groups"."deleted_at" IS NULL;
