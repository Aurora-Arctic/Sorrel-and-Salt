## The astrology vocabulary seed (MB.93)

`src/db/seed/astrology.ts` seeds DESIGN.md §5's planet and zodiac
table: nineteen `planets` and thirteen `zodiac_signs`, in §5's order, as the
`PLANETS` and `ZODIAC_SIGNS` literals. It takes
[the form seed](form-vocabulary-seed.md)'s shape —
reference data rather than a scenario, `npm run db:seed:astrology` as a
third `scripts/db-seed.ts` target, run by `migrate.yml` in the same step as the
other two, idempotent by seed key and ignoring `deleted_at` (MB.172), updating nothing
already present, stamped by the bootstrap user with the GUC published — with
`seedFlatVocabulary` in place of the two-tier helper, since there is no group
to insert first. `standard` seeds both inside its own transaction, and every
planet its compendium lists is a curated one, as MB.162 requires of every
compendium entry; no uncurated planet is seeded on a coven's entry either, so
the autofill's in-use bucket is exercised by tests that write one. §5's table is lower-case; the seed writes each name in title case
(`North Node`).

**A description is a gloss, not a correspondence list.** Each names the
body's or sign's other names, what it is and what it is read for — the Ram,
cardinal fire, courage and beginnings; the Moon's ascending node, what is
sought — because the suggestion query matches descriptions
(§5), so the words a reader reaches for have to be there: Lilith's carries
_Black Moon_, the nodes' _Rahu_ and _Ketu_, Ophiuchus's _Serpentarius_. Ophiuchus has no agreed modality or
element, so its themes carry it alone. A sign's description leaves out its
ruling planet, so typing `Mars` as a zodiac sign does not offer Aries. As with the
forms, the descriptions are pairwise distinct within each table, and the
literal is §5's table, nineteen and thirteen — held to it by review, not a
test (MB.225). `astrology.test.ts` keeps what a re-run leaves of an admin's
edits.

**Sources.** Researched when M4.5 settled the lists, and recast in Chicago form
by MB.156, each page fetched again on October 6, 2026. MB.156 seeds each as a
compendium `references` row ([references.md](references.md)), linked to the
bodies and signs its nested line names: those it gives correspondences or
readings for.

The traditional seven and their sign rulerships:

- yronwode, catherine. "Planetary Rulerships of Herbs, Flowers, and Roots." Lucky Mojo Curio Company. Accessed October 6, 2026. https://www.luckymojo.com/planetaryrulers.html.
  - Linked to: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpio, Sagittarius, Capricorn, Aquarius, Pisces.
- Kenney, Matthew. "The Planetary Rulerships of Plants." Ancient Astrology. March 3, 2019. Accessed October 6, 2026. https://www.ancientastrology.com/articles-/the-planetary-rulership-of-plants.
  - Linked to: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn.

Herbs assigned to the outer planets in modern practice:

- "Planetary Correspondences of Pluto." Alchemy Works. Accessed October 6, 2026. https://www.alchemy-works.com/planets_pluto.html.
  - Linked to: Pluto.
- "The Astrology of Herbs." Anima Mundi Herbals. September 29, 2022. Accessed October 6, 2026. https://animamundiherbals.com/blogs/blog/the-astrology-of-herbs.
  - Linked to: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto.
- "Herbs of the Solar System." Mystical Magical Herbs. October 26, 2013. Accessed October 6, 2026. https://mysticalmagicalherbs.com/2013/10/26/herbs-of-the-solar-system/.
  - Linked to: Sun, Moon, Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto.

The asteroid goddesses (Ceres, Pallas, Juno, Vesta) and their rulerships:

- George, Demetra. _Asteroid Goddesses: The Mythology, Psychology, and Astrology of the Re-Emerging Feminine_. ACS Publications, 1986. (Confirmed through Open Library, https://openlibrary.org/books/OL8339254M, and read through a reader's highlights on Goodreads, https://www.goodreads.com/notes/20698760-asteroid-goddesses/7429292-erik.)
  - Linked to: Ceres, Pallas, Juno, Vesta.
- johngumbs. "Reading Astrological Charts: Ceres, Pallas Athene, Vesta, Juno and Lilith." Booksie. January 20, 2020. Accessed October 6, 2026. https://www.booksie.com/509359-reading-astrological-charts-chapter-36.
  - Linked to: Ceres, Pallas, Juno, Vesta, Lilith.

Chiron, the lunar nodes and Ophiuchus are on the lists because practices use
them, not because a source above gives them herb correspondences: few online
sources do, and "few sources" is not a reason to refuse a practice. Earth's
correspondences are Mystical Magical Herbs' alone.
