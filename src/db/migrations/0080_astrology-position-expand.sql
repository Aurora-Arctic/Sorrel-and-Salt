ALTER TABLE "celestial_bodies" ADD COLUMN "position" integer;--> statement-breakpoint
ALTER TABLE "zodiac_signs" ADD COLUMN "position" integer;--> statement-breakpoint
-- M12.52: where a facet lists a sign or body, carried onto databases the
-- astrology seed has already filled (the seed inserts only missing rows, so a
-- new seed value never reaches an existing one). A row is set only while it is
-- live, still holds the seed's key and has no position, so one a curator has
-- positioned stays theirs. Stamped as the seed's.
UPDATE "zodiac_signs" SET "position" = v.position, "updated_by" = '00000000-0000-0000-0000-000000000001'
FROM (VALUES
  ('aries', 1), ('taurus', 2), ('gemini', 3), ('cancer', 4), ('leo', 5), ('virgo', 6),
  ('libra', 7), ('scorpio', 8), ('sagittarius', 9), ('capricorn', 10), ('aquarius', 11),
  ('pisces', 12), ('ophiuchus', 13)
) AS v(seed_key, position)
WHERE "zodiac_signs"."seed_key" = v.seed_key AND "zodiac_signs"."position" IS NULL AND "zodiac_signs"."deleted_at" IS NULL;--> statement-breakpoint
UPDATE "celestial_bodies" SET "position" = v.position, "updated_by" = '00000000-0000-0000-0000-000000000001'
FROM (VALUES
  ('sun', 1), ('moon', 2), ('mercury', 3), ('venus', 4), ('earth', 5), ('mars', 6),
  ('jupiter', 7), ('saturn', 8), ('uranus', 9), ('neptune', 10), ('pluto', 11)
) AS v(seed_key, position)
WHERE "celestial_bodies"."seed_key" = v.seed_key AND "celestial_bodies"."position" IS NULL AND "celestial_bodies"."deleted_at" IS NULL;
