## The astrology vocabulary seed (MB.93)

`src/db/seed/astrology.ts` seeds DESIGN.md §5's planet and zodiac
table: nineteen `planets` and thirteen `zodiac_signs`, in §5's order, as the
`PLANETS` and `ZODIAC_SIGNS` literals. It takes
[the form seed](form-vocabulary-seed.md)'s shape —
reference data rather than a scenario, `npm run db:seed:astrology` as a
third `scripts/db-seed.ts` target, run by `migrate.yml` in the same step as the
other two, idempotent by slug and ignoring `deleted_at`, updating nothing
already present, stamped by the bootstrap user with the GUC published — with
`seedFlatVocabulary` in place of the two-tier helper, since there is no group
to insert first. `standard` seeds both inside its own transaction, and every
planet its compendium lists is a curated one, as MB.162 requires of every
compendium entry; no uncurated planet is seeded on a coven's entry either, so
the autofill's in-use bucket is exercised by tests that write one. §5's table is lower-case; the seed writes each name in title case
(`North Node`), and `astrology.test.ts` compares case-insensitively and
then checks every word's capital separately.

**A description is a gloss, not a correspondence list.** Each names the
body's or sign's other names, what it is and what it is read for — the Ram,
cardinal fire, courage and beginnings; the Moon's ascending node, what is
sought — because the suggestion query matches descriptions
(§5), so the words a reader reaches for have to be there: Lilith's carries
_Black Moon_, the nodes' _Rahu_ and _Ketu_, Ophiuchus's _Serpentarius_, and
the test asserts those four by name. Ophiuchus has no agreed modality or
element, so its themes carry it alone. A sign's description leaves out its
ruling planet, so typing `Mars` as a zodiac sign does not offer Aries. As with the
forms, the descriptions are pairwise distinct within each table, and §5's
table is parsed at test time with the parse itself checked — two vocabularies,
nineteen and thirteen.

**Sources.** Researched when M4.5 settled the lists. The traditional seven and
their sign rulerships:

- [Lucky Mojo, "Planetary Rulerships of Herbs, Flowers, and Roots"](https://www.luckymojo.com/planetaryrulers.html)
- [Ancient Astrology, "The Planetary Rulerships of Plants"](https://www.ancientastrology.com/articles-/the-planetary-rulership-of-plants)

Herbs assigned to the outer planets in modern practice:

- [Alchemy Works, "Planetary Correspondences of Pluto"](https://www.alchemy-works.com/planets_pluto.html)
- [Anima Mundi Herbals, "The Astrology of Herbs"](https://animamundiherbals.com/blogs/blog/the-astrology-of-herbs)
- [Mystical Magical Herbs, "Herbs of the Solar System"](https://mysticalmagicalherbs.com/2013/10/26/herbs-of-the-solar-system/)

The asteroid goddesses (Ceres, Pallas, Juno, Vesta) and their rulerships:

- [Demetra George and Douglas Bloch, _Asteroid Goddesses_](https://www.goodreads.com/notes/20698760-asteroid-goddesses/7429292-erik?page=1)
- ["Reading astrological charts: Ceres, Pallas Athene, Vesta, Juno and Lilith"](https://www.booksie.com/509359-reading-astrological-charts-chapter-36)

Earth, Chiron, the lunar nodes and Ophiuchus are on the lists because practices
use them, not because a source above gives them herb correspondences: few
online sources do, and "few sources" is not a reason to refuse a practice.
