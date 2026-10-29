# Category Gaps

This is the list for M14.25. It records every category word that a source prints, that an earlier seed lane reported as missing from the category vocabulary, and what I propose to do about each. Nothing here is decided. The owner approves, changes or rejects each row before any seed or entry file changes.

The seed rule is that a category is the source's own word, so a different word is never mapped silently (`compendium-seed/README.md`). Each "Map to" row below is therefore a proposal to make an exception on purpose, with a reason. Each "Add" row proposes a new category in `src/db/seed/categories.ts`, which needs no migration.

## How The Entry Lists Were Made

The seed files record almost none of this. A lane that met a missing word usually noted it in the lane report, not in the entry. So the entries below were found by matching each entry's recorded source and locator to the "Powers" line the book prints for that herb, plant, stone or metal. Treat the lists as machine-matched:

- 39 of 737 herb and plant locators did not match a book heading (for example "Aster", "Beet" and "Belladonna" in `cunningham-herbs`), so an entry can be missing from a list.
- A list is complete for the word as printed. It is not checked entry by entry, and step 2 rechecks each list before any entry file changes.
- Patience and Shadow Work are not "Powers" terms. Patience is cited from the carnelian entry's prose source. Shadow Work is not a gap.

No source or locator below is invented. Each entry line gives the entry's file name (without `.md`), the source handle and the locator as the file records it.

## Owner Decisions, 2026-10-29

These supersede the "Proposed decision" column in the table below wherever they differ. The table is the step 1 record and is not rewritten.

- Money maps to **Wealth**, not Prosperity. Exorcism maps to **Banishing**. The README lines "money is not Prosperity" and "exorcism is not Banishing" are amended to record both as deliberate.
- New categories accepted: Luck (Prosperity & Work); Chastity, Compassion, Trust (Love & Connection); Spirituality, Focus, Past-Life Work (Mind & Spirit); Patience, Hope, Determination (Wellbeing); Rain Magic (Practice & Place); Renewal (Cleansing & Release).
- Death/Funeral Practices becomes **Funeral Rites** (Practice & Place). No category name joins two words with "&".
- Consecrate/Bless becomes two categories, **Consecration** and **Blessing** (both Practice & Place). An entry under Kynes's joined "Consecrate/Bless" heading gets both.
- New categories, with a one-line description written in step 2b for the owner to review: Prophetic Dreams, Awareness (Mind & Spirit); Youth, Energy (Wellbeing); Security, Snake Repelling (Protection & Defense); Relationships (Love & Connection).
- Dream(s) maps to Dream Work. Wishes maps to Manifestation.
- These mappings stand: Psychism, Centering, Eloquence, Travel, Anti-Confusion, Popularity, Defense, Happiness, Employment, Loss/Sorrow.
- Left off, each with an Edit Notes line: Image Magic, Flying, Changing Sex (Persimmon), Elemental Power(s).
- Shadow Work: no change.

Answers to the sweep, 2026-10-29:

- New categories: Negativity (Cleansing & Release); Challenges (Prosperity & Work), named "Challenges" and not "Challenges/Obstacles"; Sex, Sexuality and Family (Love & Connection); and, each in the group the sweep table proposes, Emotions, Secrets, Growth, Faerie Sight, Skill, Adaptability, Leadership, Beauty, Invisibility, Astral Projection and Garden Magic.
- Kynes "Hexes (Break, Protect From)" maps to Hex-Breaking: the heading in Section0032.xhtml shows it means breaking hexes, not casting them.
- Kynes "Negativity" maps to Negativity. "Challenges/Obstacles" maps to Challenges. "Family and Home" maps to Family and Home Blessing. "Sex/Sexuality" maps to both Sex and Sexuality, on all 82 entries.
- Crystals "Male Sexual Dysfunction; Sexual Dysfunction; Sexual Energy; Sexual" map to Sex, not Lust.
- Love Divination maps to Love and Divination. Breaking Love Spells maps to Love and Hex-Breaking. Removing Obstacles maps to Challenges, not Success.
- Every other row in both sweep tables, and the single-word mappings, stand as proposed. Attraction maps to Attraction. Friendship, Business, Reconciliation and Hex-Breaking exist in the 63, so "if seeded" no longer applies.
- The left-off rows stay off.
- Potency (7 cunningham-herbs entries) maps to Sex. Marital Happiness (sardonyx) maps to Love, Harmony and Happiness; Happiness maps to Joy under the standing mapping, so the entry gets Love, Harmony and Joy.

Cross-check corrections, 2026-10-29:

- Aster (Callistephus chinensis): Hex-Breaking removed, since Kynes's "hexes" belongs to the Wood Avens row. Consecration, Blessing, Focus and Negativity added, from Kynes's Aster row ("consecrate/bless", "focus", "negativity").
- Avens (Geum urbanum): Hex-Breaking added, from Kynes "Wood Avens (Geum urbanum)".
- Sea holly (Eryngium): Luck added. Cunningham prints "Traveler's Luck", which maps to Safe Travel and Luck.
- Lapis lazuli: Joy added, from the cunningham-crystals Powers line (p. 107).
- Antimony: Strength removed. Its Powers line prints only Protection.
- Devil's shoestring: Kynes's Yucca entry matched only by common name, so everything resting on it alone was removed (the Yucca part of the locator and the description sentence naming Adam's needle) and nothing was added from it, Awareness included. The file's status is unchanged. Its Edit Notes record this.
- Crystal varieties get their family section's Powers words only when that section names the variety. Black Tourmaline is named in TOURMALINE, Blue Lace Agate and Moss Agate in AGATE, Rose, Rutilated and Smoky Quartz in CRYSTAL, QUARTZ, and Ammonite in FOSSILS, so nothing was removed. Tourmalinated quartz has no file.
- Aspen (Populus tremuloides): Cunningham's "Poplar" heading prints Populus tremuloides, so Wealth was added (Poplar: "Money").
- Quassia (Quassia amara): Wealth added. The Kynes appendix heading "Prosperity/Money" counts.

## The Gaps

38 gaps, plus Shadow Work, which was reported but is already seeded. 22 propose a mapping, 16 propose a new category, and 13 are marked unsure.

| Gap              | Printed as                                    | Reported by                                                    | Entries                                                   | Proposed decision                                                                                                                          | Reason                                                                                                                                                                                                                                                                                                                       |
| ---------------- | --------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chastity         | Chastity                                      | MB.243                                                         | 10 (cunningham-herbs)                                     | Add **Chastity** (Love & Connection): "Abstaining from sex, for a time or for good, by vow or by choice."                                  | No existing category covers abstinence. Fidelity is constancy inside a bond already made, which is a different thing.                                                                                                                                                                                                        |
| Money            | Money; Prosperity/Money                       | MB.248, MB.245, and the Mint entry (Questions for the Curator) | 161 (cunningham-herbs, kynes-plants, cunningham-crystals) | Map to **Prosperity**. **Unsure.**                                                                                                         | Prosperity is "enough coming in, and coming in reliably", which is what a money spell asks for. Wealth ("accumulation beyond sufficiency") is the other candidate. The seed README says "money is not Prosperity", so this reverses that rule on purpose. Kynes prints "Prosperity/Money" as one term.                       |
| Luck             | Luck; Gambling Luck                           | MB.248, MB.245                                                 | 169 (kynes-plants, cunningham-herbs, cunningham-crystals) | Add **Luck** (Prosperity & Work): "Fortune turning your way in everyday matters, apart from the stakes of a game."                         | Gambling is only "the luck they turn on", and Uncrossing clears crossed luck. Nothing covers good luck itself. It is among the most common words in the sources.                                                                                                                                                             |
| Energy           | Energy                                        | MB.248                                                         | 8 (cunningham-crystals)                                   | Map to **Strength**. **Unsure.**                                                                                                           | Strength is "endurance and physical power, for the work in front of you", the nearest to a stone said to give energy. The books print "Energy" in several senses. The alternative is a new Wellbeing category named Energy.                                                                                                  |
| Dream(s)         | Dreams; Dream Magic                           | MB.248                                                         | 5 (cunningham-herbs, cunningham-crystals)                 | Map to **Dream Work**. **Unsure.**                                                                                                         | Dream Work is "attending to dreams — recalling them, reading them, working within them". Dreams and Dream Magic map cleanly. Prophetic Dreams is a separate row below.                                                                                                                                                       |
| Prophetic dreams | Prophetic Dreams                              | Found while matching; not on a task list                       | 9 (cunningham-herbs)                                      | Map to **Dream Work**. **Unsure.**                                                                                                         | The seed README says it is neither Prophecy nor Dream Work, because neither word is printed. Dream Work is the nearer, since the entry is about dreams. The alternatives are Prophecy as well, or a new Mind & Spirit category named Prophetic Dreams. The owner decides whether the README rule still stands for this word. |
| Psychism         | Psychism                                      | MB.248                                                         | 12 (cunningham-crystals)                                  | Map to **Psychic Work**.                                                                                                                   | Psychic Work is "perception past the ordinary senses". Psychism is the same thing under an older word.                                                                                                                                                                                                                       |
| Spirituality     | Spirituality                                  | MB.248, MB.245                                                 | 66 (kynes-plants, cunningham-herbs, cunningham-crystals)  | Add **Spirituality** (Mind & Spirit): "The inner life and a person's bond with the sacred, however they name it."                          | Meditation and Spirit Work are practices, and Spirit Work is about spirits other than your dead. Neither is the general bond with the sacred.                                                                                                                                                                                |
| Centering        | Centering                                     | MB.248                                                         | 1 (cunningham-crystals)                                   | Map to **Grounding**.                                                                                                                      | Grounding is "settling into the body and the present, with your weight on the floor", which is what centering means.                                                                                                                                                                                                         |
| Compassion       | Compassion                                    | MB.248                                                         | 1 (cunningham-crystals)                                   | Add **Compassion** (Love & Connection): "Kindness towards another's suffering, with the wish to ease it."                                  | Forgiveness is setting down a grievance and Self-Love is regard for yourself. Neither is care for someone else's distress.                                                                                                                                                                                                   |
| Eloquence        | Eloquence                                     | MB.248                                                         | 4 (cunningham-herbs, cunningham-crystals)                 | Map to **Communication**.                                                                                                                  | Communication is "being heard and understood". Eloquence is speaking well enough to be.                                                                                                                                                                                                                                      |
| Patience         | Patience                                      | MB.248                                                         | 1 (cunningham-crystals)                                   | Add **Patience** (Wellbeing): "Waiting out delay or provocation without losing your composure."                                            | Peace is the absence of agitation and Strength is endurance of work. Neither is the act of waiting well. The source prints it in prose ("confers patience"), not in a Powers list.                                                                                                                                           |
| Travel           | Travel; Safety during Travel; Traveler's Luck | MB.248, and the Mint entry (Questions for the Curator)         | 5 (cunningham-herbs, cunningham-crystals)                 | Map to **Safe Travel**.                                                                                                                    | Safe Travel is "guarding a journey, and the traveller who makes it". Traveler's Luck is a luck word as well, so those entries may take Luck once that exists.                                                                                                                                                                |
| Anti-Confusion   | Anti-Confusion                                | MB.248                                                         | 1 (cunningham-crystals)                                   | Map to **Clarity**.                                                                                                                        | Clarity is "seeing a situation plainly, with the noise taken out of it", which is the removal of confusion.                                                                                                                                                                                                                  |
| Shadow Work      | Shadow Work                                   | MB.248                                                         | 1 ((entry file))                                          | Map to **Shadow Work**.                                                                                                                    | Not a gap. "Shadow Work" is already seeded (Cleansing & Release), and the Obsidian entry already links it. No change.                                                                                                                                                                                                        |
| Youth            | Youth; Eternal Youth                          | MB.245                                                         | 7 (cunningham-herbs, cunningham-crystals)                 | Map to **Longevity**. **Unsure.**                                                                                                          | Longevity is "long life, and the vitality that makes it worth having", which includes staying young. Youth is narrower than that, so a new Wellbeing category named Youth is the alternative.                                                                                                                                |
| Death/Funeral    | Death/Funeral Practices                       | MB.245                                                         | 65 (kynes-plants)                                         | Add **Death & Funeral Practices** (Practice & Place): "Rites for the dying and the dead, and what is carried, planted or burned for them." | Grief Work is mourning, and Ancestor Work is tending your own dead. Neither covers funeral rites in general.                                                                                                                                                                                                                 |
| Consecrate/Bless | Consecrate/Bless                              | MB.245                                                         | 78 (kynes-plants)                                         | Add **Consecration & Blessing** (Practice & Place): "Making a person, place or object holy, and calling a blessing on it."                 | Home Blessing is limited to a house. Purification restores something to a fit state, which is not the same as setting it apart.                                                                                                                                                                                              |
| Hope             | Hope                                          | MB.245                                                         | 24 (kynes-plants)                                         | Add **Hope** (Wellbeing): "Looking ahead with trust that things can get better."                                                           | Joy is gladness now, and Confidence is steadiness in your own ability. Neither looks forward.                                                                                                                                                                                                                                |
| Popularity       | Popularity                                    | MB.245                                                         | 1 (cunningham-herbs)                                      | Map to **Attraction**.                                                                                                                     | Attraction is "drawing notice and interest towards you". One entry.                                                                                                                                                                                                                                                          |
| Defense          | Defense                                       | MB.245                                                         | 71 (kynes-plants)                                         | Map to **Protection**.                                                                                                                     | Protection is "general shielding — keeping a person, place or thing from harm". Defense is the same act. Warding is the narrower "boundary set in advance".                                                                                                                                                                  |
| Focus            | Focus                                         | MB.245                                                         | 49 (kynes-plants)                                         | Add **Focus** (Mind & Spirit): "Holding your attention on one task until it is done."                                                      | Clarity is seeing plainly and Meditation is stilling the mind. Neither is sustained attention on work.                                                                                                                                                                                                                       |
| Happiness        | Happiness                                     | MB.245                                                         | 72 (kynes-plants, cunningham-herbs, cunningham-crystals)  | Map to **Joy**.                                                                                                                            | Joy is "gladness and good spirits".                                                                                                                                                                                                                                                                                          |
| Security         | Security                                      | MB.245                                                         | 31 (kynes-plants)                                         | Map to **Protection**. **Unsure.**                                                                                                         | Security can mean safety (Protection) or a settled home (Home Blessing). Protection is the likelier meaning.                                                                                                                                                                                                                 |
| Wishes           | Wishes                                        | MB.245, and the Pecan entry                                    | 41 (cunningham-herbs, kynes-plants)                       | Map to **Manifestation**. **Unsure.**                                                                                                      | Manifestation is "bringing an intention into the world in a form you can touch". The books may mean something narrower than manifesting. The alternative is a new Craft & Change category named Wishes.                                                                                                                      |
| Trust            | Trust                                         | MB.245                                                         | 22 (kynes-plants)                                         | Add **Trust** (Love & Connection): "Relying on another person, and being someone who can be relied on."                                    | Fidelity is constancy and Truth is telling honest from false. Neither is confidence in another person.                                                                                                                                                                                                                       |
| Rain Magic       | Rain Magic; Rain; Rain-Making                 | MB.245                                                         | 6 (cunningham-herbs)                                      | Add **Rain Magic** (Practice & Place): "Calling rain, or turning it away, by rite."                                                        | No weather category exists. Several entries print only rain.                                                                                                                                                                                                                                                                 |
| Employment       | Employment                                    | MB.245                                                         | 2 (cunningham-herbs)                                      | Map to **Career**.                                                                                                                         | Career is "the long arc of a working life", which includes getting and keeping a job. Two entries.                                                                                                                                                                                                                           |
| Awareness        | Awareness                                     | MB.245                                                         | 58 (kynes-plants)                                         | Map to **Clarity**. **Unsure.**                                                                                                            | Clarity is "seeing a situation plainly". Awareness could also be Intuition ("the quiet knowing") or a new Mind & Spirit category.                                                                                                                                                                                            |
| Determination    | Determination                                 | MB.245                                                         | 36 (kynes-plants)                                         | Add **Determination** (Wellbeing): "Holding to a course through difficulty until it is finished."                                          | Courage is acting despite fear, Strength is endurance, and Success is the outcome. None is the will to carry on.                                                                                                                                                                                                             |
| Snake Repelling  | Snake Repelling                               | MB.245                                                         | 1 (cunningham-herbs)                                      | Map to **Warding**. **Unsure.**                                                                                                            | Warding is "a boundary set in advance, so that what is unwelcome cannot cross it". Banishing is the alternative if the snake is already there. One entry.                                                                                                                                                                    |
| Changing Sex     | Changing Sex                                  | MB.245                                                         | 1 (cunningham-herbs)                                      | Map to **Transformation**. **Unsure.**                                                                                                     | Transformation is "deliberate change of state". One entry. A judgement call because the source means the change of the user's sex, and the category description speaks of a situation, habit or self.                                                                                                                        |
| Image Magic      | Image Magic                                   | MB.245                                                         | 1 (cunningham-herbs)                                      | Add **Image Magic** (Craft & Change): "Working on a person or thing through a likeness of it." **Unsure.**                                 | One entry (two source lines). Nothing existing fits: Glamour alters perception, Binding holds something still. Unsure whether one entry earns a category; the alternative is to leave it off with an Edit Notes line.                                                                                                        |
| Flying           | Flying                                        | MB.245                                                         | 1 (cunningham-herbs)                                      | Add **Flying** (Practice & Place): "Flight of the body or spirit, as the lore of flying ointments describes." **Unsure.**                  | One entry. No existing category fits, and the source gives no practice beyond the word. Unsure whether one entry earns a category; the alternative is to leave it off with an Edit Notes line.                                                                                                                               |
| Past-Life Work   | Past-Life Work                                | MB.245                                                         | 12 (kynes-plants)                                         | Add **Past-Life Work** (Mind & Spirit): "Reaching memories or debts from earlier lives, and working them through."                         | Sits beside Dream Work, Psychic Work and Meditation. None of them covers earlier lives.                                                                                                                                                                                                                                      |
| Loss/Sorrow      | Loss/Sorrow                                   | MB.245                                                         | 27 (kynes-plants)                                         | Map to **Grief Work**.                                                                                                                     | Grief Work is "sitting with a loss, and giving mourning somewhere to go".                                                                                                                                                                                                                                                    |
| Renewal          | Renewal                                       | MB.245                                                         | 52 (kynes-plants)                                         | Add **Renewal** (Cleansing & Release): "Starting again after an ending: a fresh start, a restored season, a restored self."                | Release is letting go and Transformation is deliberate change. Renewal is what comes after an ending, which neither says.                                                                                                                                                                                                    |
| Relationships    | Relationship(s)                               | MB.245                                                         | 40 (kynes-plants)                                         | Map to **Harmony**. **Unsure.**                                                                                                            | Harmony is "ease between people sharing a life, a house or a table". Love is romantic in its description. The alternative is a new Love & Connection category named Relationships.                                                                                                                                           |
| Exorcism         | Exorcism                                      | The Mint entry (Questions for the Curator)                     | 43 (cunningham-herbs)                                     | Map to **Banishing**.                                                                                                                      | Banishing is "driving out something already present, and telling it not to return", which is exorcism. The seed README says exorcism is not Banishing only because a different word is never mapped silently; this row maps it on purpose.                                                                                   |

## Sweep Of Every Printed Powers Word

Step 2a swept the Powers lines of the three sources (cunningham-herbs, kynes-plants, cunningham-crystals) for every printed word that has no category, either by the decisions above or in the existing 63. Counts are distinct entries, machine-matched as described above, so a count can be low. "Unsure" marks a proposal where more than one answer is reasonable. Where a proposal names a category "if seeded", I have not checked the seed for it and step 2b will.

### Printed Words The Existing 63 Do Not Name

| Printed as                                                         | Entries | Source                                | Proposal                                                            | Unsure                                              |
| ------------------------------------------------------------------ | ------- | ------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------- |
| Negativity                                                         | 124     | kynes-plants                          | Map to **Purification**.                                            | Yes. Banishing is also close.                       |
| Hexes                                                              | 106     | kynes-plants                          | Map to **Hex-Breaking** if seeded, otherwise Uncrossing.            | Yes.                                                |
| Sex/Sexuality                                                      | 82      | kynes-plants                          | Map to **Lust**.                                                    | Yes. A new category "Sexuality" is the alternative. |
| Challenges/Obstacles                                               | 54      | kynes-plants                          | Map to **Success**.                                                 | Yes. Uncrossing is the alternative.                 |
| Family and Home                                                    | 51      | kynes-plants                          | Map to **Home Blessing** for home and **Relationships** for family. | Yes.                                                |
| Changes/Transitions                                                | 40      | kynes-plants                          | Map to **Transformation**.                                          | No.                                                 |
| Emotions                                                           | 39      | kynes-plants                          | New category **Emotions** (Wellbeing).                              | Yes.                                                |
| Health                                                             | 39      | cunningham-herbs, cunningham-crystals | Map to **Healing**.                                                 | No.                                                 |
| Secrets                                                            | 37      | kynes-plants                          | New category **Secrets** (Mind & Spirit).                           | Yes.                                                |
| Growth                                                             | 24      | kynes-plants                          | New category **Growth** (Wellbeing).                                | Yes.                                                |
| See Faeries                                                        | 23      | kynes-plants                          | New category **Faerie Sight** (Mind & Spirit).                      | Yes.                                                |
| Mental Powers; Mental Abilities                                    | 19      | cunningham-herbs, cunningham-crystals | Map to **Clarity**.                                                 | Yes.                                                |
| Skills                                                             | 17      | kynes-plants                          | New category **Skill** (Craft & Change).                            | Yes.                                                |
| Adaptability                                                       | 16      | kynes-plants                          | New category **Adaptability** (Craft & Change).                     | Yes.                                                |
| Authority/Leadership                                               | 15      | kynes-plants                          | New category **Leadership** (Prosperity & Work).                    | Yes.                                                |
| Power                                                              | 15      | cunningham-herbs, cunningham-crystals | Map to **Strength**.                                                | Yes.                                                |
| Support                                                            | 13      | kynes-plants                          | Map to **Relationships** (accepted).                                | Yes.                                                |
| Beauty                                                             | 11      | cunningham-herbs, cunningham-crystals | Map to **Beauty** if seeded, otherwise new.                         | No.                                                 |
| Invisibility                                                       | 7       | cunningham-herbs, cunningham-crystals | New category **Invisibility** (Craft & Change).                     | Yes.                                                |
| Potency                                                            | 7       | cunningham-herbs                      | Map to **Lust**.                                                    | Yes.                                                |
| Love Divination                                                    | 7       | cunningham-herbs                      | Map to **Divination**.                                              | Yes. Love is the alternative.                       |
| Visions                                                            | 6       | cunningham-herbs                      | Map to **Prophecy**.                                                | Yes. Scrying is the alternative.                    |
| Astral Projection                                                  | 6       | cunningham-herbs, cunningham-crystals | New category **Astral Projection** (Mind & Spirit).                 | No.                                                 |
| Gardening; Garden Magic; Agriculture                               | 9       | cunningham-crystals, cunningham-herbs | New category **Garden Magic** (Practice & Place).                   | Yes.                                                |
| Defensive Magic                                                    | 4       | cunningham-crystals                   | Map to **Protection**.                                              | No.                                                 |
| Gem & Metal Magic                                                  | 5       | cunningham-crystals                   | Leave off.                                                          | Yes.                                                |
| Immortality                                                        | 3       | cunningham-herbs                      | Map to **Longevity**.                                               | Yes.                                                |
| Eyesight                                                           | 3       | cunningham-crystals                   | Map to **Healing**.                                                 | Yes.                                                |
| Fishing Magic; Hunting                                             | 4       | cunningham-herbs                      | Leave off.                                                          | Yes.                                                |
| Anti-Lightning; Anti-Fire; Halting Storms                          | 4       | cunningham-herbs                      | Map to **Protection**.                                              | Yes.                                                |
| Victory                                                            | 2       | cunningham-herbs, cunningham-crystals | Map to **Success**.                                                 | No.                                                 |
| Male Sexual Dysfunction; Sexual Dysfunction; Sexual Energy; Sexual | 6       | cunningham-crystals                   | Map to **Lust**.                                                    | Yes.                                                |
| Reducing Sexual Desires                                            | 1       | cunningham-crystals                   | Map to **Chastity** (accepted).                                     | Yes.                                                |
| Lactation                                                          | 2       | cunningham-crystals                   | Leave off.                                                          | Yes.                                                |
| Single-entry words (below)                                         | 1 each  | see below                             | Leave off unless a mapping is listed below.                         | Yes.                                                |

Single-entry words, each printed once: Anti-Hunger, Sea Rituals, Sea Spells, Wart Charming, Wind Spells, Wind, Wind Raising, Cat Magic, Snake-Removing, Repel Snakes, Snake Charming, Snake-Enraging, Removing Obstacles, Favors, Frugality, Commitment, Tenacity, Treasure-Finding, Comfort, Knot Magic, Strengthening Spells, Bullet-Proofing, Heating, Escape, Repelling Monsters, Tying Dog's Tongues, Respect, Breaking Love Spells, Lock-Opening, Release/Transformation, Halts Gossip, Anti-Gossip, Transformation in the Subconscious, Ending Relationships, Infertility, Raising the Dead, Transmutation, Energy Direction, Return of Stolen Goods, Invocation, Overcoming Alcoholism, Protection Against Thieves, Halting Bleeding, Relaxation, Will, Games of Chance, Dieting, Weight Loss, Easing Childbirth, Facilitating Childbirth, Marital Happiness, Past-Life Regression, Regulating Menstruation.

Likely mappings among them, all unsure: Tenacity and Commitment to Determination (accepted); Repel Snakes and Snake-Removing to Snake Repelling (accepted); Anti-Gossip, Halts Gossip, Protection Against Thieves, Bullet-Proofing and Anti-Fire to Protection; Breaking Love Spells to Hex-Breaking if seeded; Past-Life Regression to Past-Life Work (accepted); Marital Happiness to Happiness; Games of Chance to Luck (accepted); Weight Loss, Dieting, Infertility, Halting Bleeding, Easing and Facilitating Childbirth and Regulating Menstruation to Healing; Relaxation to Peace; Removing Obstacles to Success; Return of Stolen Goods to Protection. The rest are left off.

The crystals OCR also yields sentence fragments that are not Powers words (for example from the boji stones and staurolite pages). They are ignored.

### Printed Words The Existing 63 Name Only Loosely

These have a near category already. They are listed so the owner decides whether the near category is the answer.

| Printed as                      | Entries | Source                                | Proposal                                             | Unsure |
| ------------------------------- | ------- | ------------------------------------- | ---------------------------------------------------- | ------ |
| Spirit Guides/Spirits           | 98      | kynes-plants                          | Map to **Spirit Work**.                              | Yes.   |
| Nightmares; Anti-Nightmare      | 37      | kynes-plants, cunningham-crystals     | Map to **Nightmare Protection**.                     | No.    |
| Ancestors                       | 23      | kynes-plants                          | Map to **Ancestor Work**.                            | No.    |
| Calling Spirits; Spirit Calling | 4       | cunningham-crystals                   | Map to **Spirit Work**.                              | No.    |
| Anti-Theft                      | 7       | cunningham-herbs, cunningham-crystals | Map to **Protection**.                               | Yes.   |
| Riches                          | 3       | cunningham-crystals                   | Map to **Wealth**.                                   | No.    |
| Friendship; Friendships         | 8       | cunningham-herbs, cunningham-crystals | Map to **Friendship** if seeded.                     | No.    |
| Manifestations                  | 2       | cunningham-crystals                   | Map to **Manifestation**.                            | No.    |
| Business Success                | 1       | cunningham-crystals                   | Map to **Business** if seeded, otherwise Success.    | Yes.   |
| Attraction; Reconciliations     | 2       | cunningham-crystals                   | Map to **Love** and to **Reconciliation** if seeded. | Yes.   |

## Recheck Of The Unmatched Locators

The earlier figure was 39 unmatched herb and plant locators. A better matcher (it strips parentheses and qualifiers, tries prefix and suffix matches, and uses a short alias list) leaves 25 unmatched lines across the three sources.

- Herbs and plants still unmatched: Avens, Belladonna, Black Hellebore, German Chamomile, Hemlock, Henbane, Sandarac, Charcoal. For Hemlock, Henbane, Belladonna and Hellebore I checked that the book prints no Powers line. I did not check Avens, German Chamomile or Sandarac.
- Crystals and metals still unmatched: Ammonite, Egg, Electrum, Honey, Mercury, Pipestone, Snakeskin, Rose Quartz, Smoky Quartz, Rutilated Quartz, Tourmalinated Quartz, Charcoal. The OCR text has no separate Powers line for these, or they share the "Crystal, Quartz" entry. I did not confirm each.
- Unmatched entries are missing from every list in this file and from the counts above.

## Proposed New Group

None. Every proposed new category fits one of the eight existing groups.

## Entries Per Gap

### Chastity

10 entries.

- `cactus-cactaceae`: cunningham-herbs, under "Cactus"
- `camphor-camphora-officinarum`: cunningham-herbs, under "Camphor"; p. 266; cunningham-herbs, under "Camphor"
- `coconut-cocos-nucifera`: cunningham-herbs, under "Coconut"
- `cucumber-cucumis-sativus`: cunningham-herbs, under "Cucumber"; p. 266; cunningham-herbs, under "Cucumber"
- `hawthorn-crataegus`: cunningham-herbs, under "Hawthorn"; p. 266; cunningham-herbs, under "Hawthorn"
- `lavender-lavandula-angustifolia`: cunningham-herbs, under "Lavender"; p. 266; cunningham-herbs, under "Lavender"
- `lettuce-lactuca-sativa`: cunningham-herbs, under "Lettuce"; p. 266; cunningham-herbs, under "Lettuce"
- `sweet-pea-lathyrus-odoratus`: cunningham-herbs, under "Sweetpea"; p. 266
- `vervain-verbena-officinalis`: cunningham-herbs, under "Vervain"
- `witch-hazel-hamamelis-virginiana`: cunningham-herbs, under "Witch Hazel"

### Money

161 entries.

- `alfalfa-medicago-sativa`: cunningham-herbs, under "Alfalfa"; p. 266; cunningham-herbs, under "Alfalfa"
- `alkanet-alkanna-tinctoria`: kynes-plants, under "Alkanet" [prints "prosperity/money"]
- `allspice-pimenta-dioica`: cunningham-herbs, under "Allspice"; p. 266; kynes-plants, under "Allspice" [prints "prosperity/money"]
- `almond-prunus-amygdalus`: cunningham-herbs, under "Almond"; kynes-plants, under "Almond" [prints "prosperity/money"]
- `amaranth-amaranthus-hypochondriacus`: kynes-plants, under "Amaranth" [prints "prosperity/money"]
- `apple-malus-domestica`: kynes-plants, under "Apple" [prints "prosperity/money"]
- `ash-fraxinus-excelsior`: kynes-plants, under "Ash" [prints "prosperity/money"]
- `aspen-populus-tremula`: kynes-plants, under "Aspen" [prints "prosperity/money"]
- `aventurine-aventurine`: cunningham-crystals, p. 76; p. 190
- `avocado-persea-americana`: kynes-plants, under "Avocado" [prints "prosperity/money"]
- `babul-acacia-vachellia-nilotica`: kynes-plants, under "Acacia" [prints "prosperity/money"]
- `barberry-berberis-vulgaris`: kynes-plants, under "Barberry and Oregon Grape" [prints "prosperity/money"]
- `barley-hordeum-vulgare`: kynes-plants, under "Grain" [prints "prosperity/money"]
- `basil-ocimum-basilicum`: kynes-plants, under "Basil" [prints "prosperity/money"]
- `bay-laurel-laurus-nobilis`: kynes-plants, under "Bay" [prints "prosperity/money"]
- `beard-lichen-usnea`: kynes-plants, under "Lichen" [prints "prosperity/money"]
- `bee-balm-monarda-didyma`: kynes-plants, under "Bee Balm" [prints "prosperity/money"]
- `beech-fagus-sylvatica`: kynes-plants, under "Beech" [prints "prosperity/money"]
- `bergamot-orange-citrus-bergamia`: kynes-plants, under "Bergamot" [prints "prosperity/money"]
- `bilberry-vaccinium-myrtillus`: kynes-plants, under "Bilberry" [prints "prosperity/money"]
- `bitter-orange-citrus-aurantium`: kynes-plants, under "Orange" [prints "prosperity/money"]
- `black-mustard-rhamphospermum-nigrum`: kynes-plants, under "Mustard" [prints "prosperity/money"]
- `black-snakeroot-sanicula-marilandica`: cunningham-herbs, under "Snakeroot, Black"
- `black-tourmaline-schorl`: cunningham-crystals, p. 142
- `black-walnut-juglans-nigra`: kynes-plants, under "Walnut" [prints "prosperity/money"]
- `blackberry-rubus-subg-rubus`: cunningham-herbs, under "Blackberry"; p. 266; kynes-plants, under "Blackberry" [prints "prosperity/money"]; cunningham-herbs, under "Blackberry"
- `bladderwrack-fucus-vesiculosus`: cunningham-herbs, under "Bladderwrack"; p. 266; kynes-plants, under "Seaweed" [prints "prosperity/money"]
- `blue-flag-iris-versicolor`: cunningham-herbs, under "Blue Flag"; kynes-plants, under "Iris" [prints "prosperity/money"]
- `bog-myrtle-myrica-gale`: kynes-plants, under "Bog Myrtle" [prints "prosperity/money"]
- `box-buxus-sempervirens`: kynes-plants, under "Boxwood" [prints "prosperity/money"]
- `brass`: cunningham-crystals, pp. 153–154; cunningham-crystals, p. 154
- `bryony-bryonia`: kynes-plants, under "Bryony" [prints "prosperity/money"]
- `buckwheat-fagopyrum-esculentum`: cunningham-herbs, under "Buckwheat"
- `buttercup-ranunculus-acris`: kynes-plants, under "Buttercup" [prints "prosperity/money"]
- `calamus-acorus-calamus`: cunningham-herbs, under "Calamus"; kynes-plants, under "Sweet Flag" [prints "prosperity/money"]
- `calcite-calcite`: cunningham-crystals, under "Calcite"; pp. 79–80
- `camellia-camellia-japonica`: kynes-plants, under "Camellia" [prints "prosperity/money"]
- `cascara-sagrada-frangula-purshiana`: cunningham-herbs, under "Cascara Sagrada"
- `cassia-cinnamomum-cassia`: kynes-plants, under "Cinnamon" [prints "prosperity/money"]
- `cedar-cedrus-libani`: cunningham-herbs, under "Cedar"; p. 266; kynes-plants, under "Cedar" [prints "prosperity/money"]; cunningham-herbs, under "Cedar"
- `chestnut-castanea-sativa`: kynes-plants, under "Chestnut" [prints "prosperity/money"]
- `chicory-cichorium-intybus`: kynes-plants, under "Chicory" [prints "prosperity/money"]
- `chrysoprase-quartz-var-chrysoprase`: cunningham-crystals, p. 83
- `cinnamon-cinnamomum-verum`: kynes-plants, under "Cinnamon" [prints "prosperity/money"]
- `cinquefoil-potentilla-reptans`: cunningham-herbs, under "Cinquefoil"; kynes-plants, under "Cinquefoil" [prints "prosperity/money"]
- `clove-syzygium-aromaticum`: cunningham-herbs, under "Clove"; kynes-plants, under "Clove" [prints "prosperity/money"]
- `clover-trifolium-pratense`: cunningham-herbs, under "Clover"; p. 266; kynes-plants, under "Clover" [prints "prosperity/money"]; cunningham-herbs, under "Clover"
- `club-moss-lycopodium-clavatum`: kynes-plants, under "Club Moss" [prints "prosperity/money"]
- `coal-coal`: cunningham-crystals, under "Coal"; p. 84
- `coltsfoot-tussilago-farfara`: kynes-plants, under "Coltsfoot" [prints "prosperity/money"]
- `comfrey-symphytum-officinale`: cunningham-herbs, under "Comfrey"; p. 266; cunningham-herbs, under "Comfrey"
- `copper-copper`: cunningham-crystals, pp. 154–155; cunningham-crystals, p. 155
- `corn-poppy-papaver-rhoeas`: kynes-plants, under "Poppy" [prints "prosperity/money"]
- `cowslip-primula-veris`: kynes-plants, under "Cowslip" [prints "prosperity/money"]
- `crab-apple-malus-sylvestris`: kynes-plants, under "Crabapple" [prints "prosperity/money"]
- `cypress-cupressus-sempervirens`: kynes-plants, under "Cypress" [prints "prosperity/money"]
- `dill-anethum-graveolens`: cunningham-herbs, under "Dill"; p. 266; kynes-plants, under "Dill" [prints "prosperity/money"]; cunningham-herbs, under "Dill"
- `dock-rumex`: cunningham-herbs, under "Dock"; p. 266; kynes-plants, under "Dock" [prints "prosperity/money"]; cunningham-herbs, under "Dock"
- `elder-sambucus`: kynes-plants, under "Elder" [prints "prosperity/money"]
- `emerald-beryl-var-emerald`: cunningham-crystals, pp. 93–94; p. 190; cunningham-crystals, p. 94
- `fenugreek-trigonella-foenum-graecum`: cunningham-herbs, under "Fenugreek"; p. 266; cunningham-herbs, under "Fenugreek"
- `fig-ficus-carica`: kynes-plants, under "Fig" [prints "prosperity/money"]
- `flax-linum-usitatissimum`: cunningham-herbs, under "Flax"; kynes-plants, under "Flax" [prints "prosperity/money"]; cunningham-herbs, under "Flax"; p. 266
- `fumitory-fumaria-officinalis`: cunningham-herbs, under "Fumitory"; kynes-plants, under "Fumitory" [prints "prosperity/money"]
- `galangal-alpinia-officinarum`: cunningham-herbs, under "Galangal"; p. 266; kynes-plants, under "Galangal" [prints "prosperity/money"]; cunningham-herbs, under "Galangal"
- `garlic-allium-sativum`: kynes-plants, under "Garlic" [prints "prosperity/money"]
- `german-chamomile-matricaria-chamomilla`: kynes-plants, under "Chamomile" [prints "prosperity/money"]
- `ginger-zingiber-officinale`: cunningham-herbs, under "Ginger"; p. 266; kynes-plants, under "Ginger" [prints "prosperity/money"]; cunningham-herbs, under "Ginger"
- `gold-gold`: cunningham-crystals, pp. 156–158; cunningham-crystals, pp. 157–158
- `goldenrod-solidago`: cunningham-herbs, under "Goldenrod"; p. 266; kynes-plants, under "Goldenrod" [prints "prosperity/money"]; cunningham-herbs, under "Goldenrod"
- `goldenseal-hydrastis-canadensis`: cunningham-herbs, under "Golden Seal"; p. 266; kynes-plants, under "Goldenseal" [prints "prosperity/money"]
- `gorse-ulex-europaeus`: cunningham-herbs, under "Gorse"; kynes-plants, under "Gorse" [prints "prosperity/money"]
- `grains-of-paradise-aframomum-melegueta`: cunningham-herbs, under "Grains of Paradise"; p. 266; cunningham-herbs, under "Grains of Paradise"
- `grape-vitis-vinifera`: cunningham-herbs, under "Grape"; p. 266; kynes-plants, under "Grape" [prints "prosperity/money"]
- `hawthorn-crataegus`: kynes-plants, under "Hawthorn" [prints "prosperity/money"]
- `hazel-corylus`: kynes-plants, under "Hazel" [prints "prosperity/money"]
- `heliotrope-heliotropium-europaeum`: kynes-plants, under "Heliotrope" [prints "prosperity/money"]
- `henna-lawsonia-inermis`: kynes-plants, under "Henna" [prints "prosperity/money"]
- `hickory-carya`: kynes-plants, under "Hickory and Pecan" [prints "prosperity/money"]
- `high-john-the-conqueror-ipomoea-purga`: kynes-plants, under "High John" [prints "prosperity/money"]
- `hollyhock-alcea-rosea`: kynes-plants, under "Hollyhock" [prints "prosperity/money"]
- `holy-basil-ocimum-tenuiflorum`: kynes-plants, under "Basil" [prints "prosperity/money"]
- `honesty-lunaria-annua`: cunningham-herbs, under "Honesty"; kynes-plants, under "Honesty" [prints "prosperity/money"]
- `honeysuckle-lonicera-caprifolium`: cunningham-herbs, under "Honeysuckle"; kynes-plants, under "Honeysuckle" [prints "prosperity/money"]
- `horse-chestnut-aesculus-hippocastanum`: cunningham-herbs, under "Horse Chestnut"; kynes-plants, under "Chestnut" [prints "prosperity/money"]
- `irish-moss-chondrus-crispus`: cunningham-herbs, under "Irish Moss"
- `jade-jade`: cunningham-crystals, under "Jade"; pp. 102–103
- `jasmine-jasminum-officinale`: cunningham-herbs, under "Jasmine"; kynes-plants, under "Jasmine" [prints "prosperity/money"]
- `juniper-juniperus-communis`: kynes-plants, under "Juniper" [prints "prosperity/money"]
- `lodestone-magnetite`: cunningham-crystals, under "Lodestone"; pp. 161–166; cunningham-crystals, under "Lodestone"; p. 164
- `maize-zea-mays`: kynes-plants, under "Grain" [prints "prosperity/money"]
- `mandrake-mandragora-officinarum`: cunningham-herbs, under "Mandrake"; kynes-plants, under "Mandrake" [prints "prosperity/money"]
- `maple-acer`: cunningham-herbs, under "Maple"; p. 266; kynes-plants, under "Maple" [prints "prosperity/money"]; cunningham-herbs, under "Maple"
- `marjoram-origanum-majorana`: cunningham-herbs, under "Marjoram"; p. 266; kynes-plants, under "Oregano and Marjoram" [prints "prosperity/money"]
- `marsh-marigold-caltha-palustris`: kynes-plants, under "Marsh Marigold" [prints "prosperity/money"]
- `mayapple-podophyllum-peltatum`: cunningham-herbs, under "May Apple"; Part II, How to Read the Entries; kynes-plants, under "Mayapple" [prints "prosperity/money"]
- `mint-mentha`: cunningham-herbs, under "Mint"
- `moonwort-botrychium`: cunningham-herbs, under "Moonwort"; kynes-plants, under "Moonwort" [prints "prosperity/money"]
- `moss-bryophyta`: cunningham-herbs, under "Moss"; kynes-plants, under "Moss" [prints "prosperity/money"]
- `myrtle-myrtus-communis`: cunningham-herbs, under "Myrtle"; p. 266; cunningham-herbs, under "Myrtle"
- `nutmeg-myristica-fragrans`: cunningham-herbs, under "Nutmeg"; p. 266; kynes-plants, under "Nutmeg" [prints "prosperity/money"]
- `oak-quercus`: cunningham-herbs, under "Oak"; p. 266; kynes-plants, under "Oak" [prints "prosperity/money"]; cunningham-herbs, under "Oak"
- `oakmoss-evernia-prunastri`: kynes-plants, under "Lichen" [prints "prosperity/money"]
- `oats-avena-sativa`: cunningham-herbs, under "Oats"; kynes-plants, under "Grain" [prints "prosperity/money"]
- `olive-olea-europaea`: kynes-plants, under "Olive" [prints "prosperity/money"]
- `onion-allium-cepa`: cunningham-herbs, under "Onion"; kynes-plants, under "Onion" [prints "prosperity/money"]
- `opal-opal`: cunningham-crystals, under "Opal"; pp. 121–122
- `opium-poppy-papaver-somniferum`: cunningham-herbs, under "Poppy"; p. 266; kynes-plants, under "Poppy" [prints "prosperity/money"]
- `orange-citrus-sinensis`: cunningham-herbs, under "Orange"; kynes-plants, under "Orange" [prints "prosperity/money"]
- `oregano-origanum-vulgare`: kynes-plants, under "Oregano and Marjoram" [prints "prosperity/money"]
- `oregon-grape-berberis-aquifolium`: cunningham-herbs, under "Oregon Grape"; kynes-plants, under "Barberry and Oregon Grape" [prints "prosperity/money"]
- `orris-iris-germanica`: kynes-plants, under "Iris" [prints "prosperity/money"]
- `parsley-petroselinum-crispum`: kynes-plants, under "Parsley" [prints "prosperity/money"]
- `patchouli-pogostemon-cablin`: cunningham-herbs, under "Patchouly"; kynes-plants, under "Patchouli" [prints "prosperity/money"]
- `pea-lathyrus-oleraceus`: cunningham-herbs, under "Pea"; kynes-plants, under "Pea" [prints "prosperity/money"]
- `pear-pyrus-communis`: kynes-plants, under "Pear" [prints "prosperity/money"]
- `pearl-pearl`: cunningham-crystals, under "Pearl"; pp. 122–124, 190
- `pecan-carya-illinoinensis`: cunningham-herbs, under "Pecan"; kynes-plants, under "Hickory and Pecan" [prints "prosperity/money"]
- `pennyroyal-mentha-pulegium`: kynes-plants, under "Pennyroyal" [prints "prosperity/money"]
- `peony-paeonia-officinalis`: kynes-plants, under "Peony" [prints "prosperity/money"]
- `peppermint-mentha-piperita`: kynes-plants, under "Mint" [prints "prosperity/money"]
- `periwinkle-vinca-minor`: cunningham-herbs, under "Periwinkle"; p. 266; kynes-plants, under "Periwinkle" [prints "prosperity/money"]
- `pine-pinus-spp`: cunningham-herbs, under "Pine"; kynes-plants, under "Pine" [prints "prosperity/money"]
- `pipsissewa-chimaphila-umbellata`: cunningham-herbs, under "Pipsissewa"
- `pomegranate-punica-granatum`: kynes-plants, under "Pomegranate" [prints "prosperity/money"]
- `poplar-populus-nigra`: kynes-plants, under "Poplar" [prints "prosperity/money"]
- `pyrite-pyrite`: cunningham-crystals, under "Pyrite"; pp. 168–169
- `quince-cydonia-oblonga`: kynes-plants, under "Quince" [prints "prosperity/money"]
- `ragwort-jacobaea-vulgaris`: kynes-plants, under "Ragwort" [prints "prosperity/money"]
- `rice-oryza-sativa`: cunningham-herbs, under "Rice"; p. 266; kynes-plants, under "Grain" [prints "prosperity/money"]
- `roman-chamomile-chamaemelum-nobile`: cunningham-herbs, under "Chamomile, Roman"; p. 266; kynes-plants, under "Chamomile" [prints "prosperity/money"]
- `rye-secale-cereale`: kynes-plants, under "Grain" [prints "prosperity/money"]
- `salt-sodium-chloride`: cunningham-crystals, pp. 129–131
- `sapphire-corundum-var-sapphire`: cunningham-crystals, pp. 132–133; p. 190
- `sassafras-sassafras-albidum`: cunningham-herbs, under "Sassafras"; p. 266; kynes-plants, under "Sassafras" [prints "prosperity/money"]
- `seneca-snakeroot-senega-officinalis`: cunningham-herbs, under "Rattlesnake Root"; p. 266; cunningham-herbs, under "Rattlesnake Root"
- `sesame-sesamum-indicum`: cunningham-herbs, under "Sesame"; p. 266; kynes-plants, under "Sesame" [prints "prosperity/money"]; cunningham-herbs, under "Sesame"
- `silver-silver`: cunningham-crystals, pp. 169–171; cunningham-crystals, pp. 170–171; cunningham-crystals, p. 169; cunningham-crystals, pp. 169–170
- `spinel-spinel`: cunningham-crystals, p. 136
- `spruce-picea`: kynes-plants, under "Spruce" [prints "prosperity/money"]
- `squill-drimia-maritima`: cunningham-herbs, under "Squill"; p. 266
- `staurolite-staurolite`: cunningham-crystals, under "Staurolite"; pp. 137-138
- `sunflower-helianthus-annuus`: kynes-plants, under "Sunflower" [prints "prosperity/money"]
- `sweet-gum-liquidambar-styraciflua`: kynes-plants, under "Storax" [prints "prosperity/money"]
- `sweet-woodruff-galium-odoratum`: cunningham-herbs, under "Woodruff"; p. 266
- `tin-tin`: cunningham-crystals, pp. 171–172; cunningham-crystals, p. 172
- `tonka-bean-dipteryx-odorata`: cunningham-herbs, under "Tonka"; p. 266; kynes-plants, under "Tonka Bean" [prints "prosperity/money"]
- `topaz-topaz`: cunningham-crystals, p. 141; p. 190
- `tourmaline-tourmaline`: cunningham-crystals, pp. 141–142
- `tulip-tulipa`: kynes-plants, under "Tulip" [prints "prosperity/money"]
- `turmeric-curcuma-longa`: kynes-plants, under "Turmeric" [prints "prosperity/money"]
- `turquoise-turquoise`: cunningham-crystals, under "Turquoise"; pp. 143–144; p. 191
- `valerian-valeriana-officinalis`: kynes-plants, under "Valerian" [prints "prosperity/money"]
- `vervain-verbena-officinalis`: cunningham-herbs, under "Vervain"; kynes-plants, under "Vervain" [prints "prosperity/money"]
- `vetiver-chrysopogon-zizanioides`: kynes-plants, under "Vetiver" [prints "prosperity/money"]
- `virginia-snakeroot-aristolochia-serpentaria`: cunningham-herbs, under "Snakeroot"; p. 266; kynes-plants, under "Snakeroot" [prints "prosperity/money"]
- `water-mint-mentha-aquatica`: kynes-plants, under "Mint" [prints "prosperity/money"]
- `wheat-triticum-aestivum`: cunningham-herbs, under "Wheat"
- `woad-isatis-tinctoria`: kynes-plants, under "Woad" [prints "prosperity/money"]
- `wood-sorrel-oxalis-acetosella`: kynes-plants, under "Wood Sorrel" [prints "prosperity/money"]
- `yellow-flag-iris-pseudacorus`: kynes-plants, under "Iris" [prints "prosperity/money"]

### Luck

169 entries.

- `adam-and-eve-root-aplectrum-hyemale`: kynes-plants, under "Orchid"
- `alder-alnus-glutinosa`: kynes-plants, under "Alder"
- `alexandrite-chrysoberyl-var-alexandrite`: cunningham-crystals, p. 68
- `alkanet-alkanna-tinctoria`: kynes-plants, under "Alkanet"
- `allspice-pimenta-dioica`: cunningham-herbs, under "Allspice"; p. 266; kynes-plants, under "Allspice"
- `almond-prunus-amygdalus`: kynes-plants, under "Almond"
- `aloe-aloe-vera`: cunningham-herbs, under "Aloe"; p. 266; kynes-plants, under "Aloe"
- `amber-amber`: cunningham-crystals, under "Amber"; pp. 69–71; cunningham-crystals, under "Amber"; p. 69; cunningham-crystals, under "Amber"; p. 70; cunningham-crystals, under "Amber"; p. 71; cunningham-crystals, under "Amber"; pp. 70–71
- `american-ginseng-panax-quinquefolius`: kynes-plants, under "Ginseng"
- `apple-malus-domestica`: kynes-plants, under "Apple"
- `ash-fraxinus-excelsior`: kynes-plants, under "Ash"
- `asian-ginseng-panax-ginseng`: kynes-plants, under "Ginseng"
- `aventurine-aventurine`: cunningham-crystals, p. 76; p. 190
- `bamboo-bambusa-vulgaris`: cunningham-herbs, under "Bamboo"; p. 266; kynes-plants, under "Bamboo"; cunningham-herbs, under "Bamboo"
- `banyan-ficus-benghalensis`: cunningham-herbs, under "Banyan"; p. 266; cunningham-herbs, under "Banyan"
- `barley-hordeum-vulgare`: kynes-plants, under "Grain"
- `basil-ocimum-basilicum`: kynes-plants, under "Basil"
- `bean-phaseolus-vulgaris`: kynes-plants, under "Bean"
- `beard-lichen-usnea`: kynes-plants, under "Lichen"
- `beech-fagus-sylvatica`: kynes-plants, under "Beech"
- `bergamot-orange-citrus-bergamia`: kynes-plants, under "Bergamot"
- `bilberry-vaccinium-myrtillus`: cunningham-herbs, under "Huckleberry"; kynes-plants, under "Bilberry"
- `black-cohosh-actaea-racemosa`: kynes-plants, under "Black Cohosh"
- `black-walnut-juglans-nigra`: kynes-plants, under "Walnut"
- `blackberry-rubus-subg-rubus`: kynes-plants, under "Blackberry"
- `blue-flag-iris-versicolor`: kynes-plants, under "Iris"
- `bog-myrtle-myrica-gale`: kynes-plants, under "Bog Myrtle"
- `box-buxus-sempervirens`: kynes-plants, under "Boxwood"
- `bracken-pteridium-aquilinum`: kynes-plants, under "Bracken"
- `bryony-bryonia`: kynes-plants, under "Bryony"
- `butterwort-pinguicula-vulgaris`: kynes-plants, under "Butterwort"
- `cabbage-brassica-oleracea`: cunningham-herbs, under "Cabbage"; kynes-plants, under "Cabbage"
- `cactus-cactaceae`: kynes-plants, under "Cactus"
- `calamus-acorus-calamus`: cunningham-herbs, under "Calamus"; kynes-plants, under "Sweet Flag"
- `carnation-dianthus-caryophyllus`: kynes-plants, under "Carnation"
- `cassia-cinnamomum-cassia`: kynes-plants, under "Cinnamon"
- `catnip-nepeta-cataria`: kynes-plants, under "Catnip"
- `centaury-centaurium-erythraea`: kynes-plants, under "Centaury"
- `chalcedony-quartz-var-chalcedony`: cunningham-crystals, p. 82
- `cherry-prunus-avium`: kynes-plants, under "Cherry"
- `chestnut-castanea-sativa`: kynes-plants, under "Chestnut"
- `chicory-cichorium-intybus`: kynes-plants, under "Chicory"
- `chilli-pepper-capsicum-annuum`: kynes-plants, under "Chili Pepper"
- `chinaberry-melia-azedarach`: cunningham-herbs, under "China Berry"; kynes-plants, under "Chinaberry"
- `chrysoprase-quartz-var-chrysoprase`: cunningham-crystals, p. 83
- `cinchona-cinchona-calisaya`: cunningham-herbs, under "Cinchona"
- `cinnamon-cinnamomum-verum`: kynes-plants, under "Cinnamon"
- `cinquefoil-potentilla-reptans`: kynes-plants, under "Cinquefoil"
- `clover-trifolium-pratense`: kynes-plants, under "Clover"
- `club-moss-lycopodium-clavatum`: kynes-plants, under "Club Moss"
- `copper-copper`: cunningham-crystals, pp. 154–155; cunningham-crystals, p. 155
- `corn-poppy-papaver-rhoeas`: kynes-plants, under "Poppy"
- `cotton-gossypium-barbadense`: cunningham-herbs, under "Cotton"; cunningham-herbs, under "Cotton"; p. 266
- `couch-grass-elymus-repens`: kynes-plants, under "Grass"
- `daffodil-narcissus`: cunningham-herbs, under "Daffodil"; kynes-plants, under "Daffodil"
- `daisy-bellis-perennis`: kynes-plants, under "Daisy"
- `date-palm-phoenix-dactylifera`: kynes-plants, under "Date"
- `devils-bit-scabious-succisa-pratensis`: cunningham-herbs, under "Devil's Bit"; kynes-plants, under "Devil's Bit Scabious"
- `devils-shoestring`: cunningham-herbs, under "Devil's Shoestring" [prints "gambling luck"]; kynes-plants, under "Devil's Shoestring"; under "Yucca"; kynes-plants, under "Devil's Shoestring"
- `edelweiss-leontopodium-nivale`: kynes-plants, under "Edelweiss"
- `elecampane-inula-helenium`: kynes-plants, under "Elecampane"
- `fern-polypodiopsida`: cunningham-herbs, under "Fern"
- `fly-agaric-amanita-muscaria`: kynes-plants, under "Fly Agaric"
- `forget-me-not-myosotis`: kynes-plants, under "Forget-Me-Not"
- `frankincense-boswellia-sacra`: kynes-plants, under "Frankincense"
- `fumitory-fumaria-officinalis`: kynes-plants, under "Fumitory"
- `galangal-alpinia-officinarum`: kynes-plants, under "Galangal"
- `garlic-allium-sativum`: kynes-plants, under "Garlic"
- `goldenrod-solidago`: kynes-plants, under "Goldenrod"
- `gorse-ulex-europaeus`: kynes-plants, under "Gorse"
- `grains-of-paradise-aframomum-melegueta`: cunningham-herbs, under "Grains of Paradise"; p. 266; cunningham-herbs, under "Grains of Paradise"
- `harebell-campanula-rotundifolia`: cunningham-herbs, under "Bluebell"
- `hawthorn-crataegus`: kynes-plants, under "Hawthorn"
- `hazel-corylus`: cunningham-herbs, under "Hazel"; p. 266; kynes-plants, under "Hazel"; cunningham-herbs, under "Hazel"
- `heather-calluna-vulgaris`: cunningham-herbs, under "Heather"; kynes-plants, under "Heather and Heath"; cunningham-herbs, under "Heather"; p. 266
- `henna-lawsonia-inermis`: kynes-plants, under "Henna"
- `high-john-the-conqueror-ipomoea-purga`: kynes-plants, under "High John"
- `holly-ilex-aquifolium`: cunningham-herbs, under "Holly"; kynes-plants, under "Holly"
- `holy-basil-ocimum-tenuiflorum`: kynes-plants, under "Basil"
- `honesty-lunaria-annua`: kynes-plants, under "Honesty"
- `honeysuckle-lonicera-caprifolium`: kynes-plants, under "Honeysuckle"
- `horse-chestnut-aesculus-hippocastanum`: kynes-plants, under "Chestnut"
- `houseleek-sempervivum-tectorum`: cunningham-herbs, under "Houseleek"; kynes-plants, under "Houseleek"
- `hyacinth-hyacinthus-orientalis`: kynes-plants, under "Hyacinth"
- `irish-moss-chondrus-crispus`: cunningham-herbs, under "Irish Moss"
- `ivy-hedera-helix`: kynes-plants, under "Ivy"
- `jet-jet`: cunningham-crystals, under "Jet"; pp. 105–106; p. 190; cunningham-crystals, under "Jet"; pp. 105–106; cunningham-crystals, under "Jet"; p. 106
- `jobs-tears-coix-lacryma-jobi`: cunningham-herbs, under "Job’s Tears"
- `joe-pye-weed-eutrochium-purpureum`: kynes-plants, under "Joe Pye Weed"
- `kava-piper-methysticum`: cunningham-herbs, under "Kava-Kava"; kynes-plants, under "Kava"
- `ladys-mantle-alchemilla-vulgaris`: kynes-plants, under "Lady's Mantle"
- `larch-larix`: kynes-plants, under "Larch"
- `lavender-lavandula-angustifolia`: kynes-plants, under "Lavender"
- `lemongrass-cymbopogon-citratus`: kynes-plants, under "Lemongrass"
- `lepidolite-lepidolite`: cunningham-crystals, under "Lepidolite"; pp. 110–112; cunningham-crystals, under "Lepidolite"; p. 111
- `lilac-syringa-vulgaris`: kynes-plants, under "Lilac"
- `lily-of-the-valley-convallaria-majalis`: kynes-plants, under "Lily of the Valley"
- `linden-tilia-europaea`: cunningham-herbs, under "Linden"; p. 266; cunningham-herbs, under "Linden"
- `maidenhair-fern-adiantum`: kynes-plants, under "Maidenhair Fern"
- `maize-zea-mays`: cunningham-herbs, under "Corn"; p. 266; kynes-plants, under "Grain"; cunningham-herbs, under "Corn"
- `male-fern-dryopteris-filix-mas`: cunningham-herbs, under "Male Fern"
- `mandrake-mandragora-officinarum`: kynes-plants, under "Mandrake"
- `marsh-marigold-caltha-palustris`: kynes-plants, under "Marsh Marigold"
- `meadowsweet-filipendula-ulmaria`: kynes-plants, under "Meadowsweet"
- `mimosa-acacia-dealbata`: kynes-plants, under "Mimosa"
- `mistletoe-viscum-album`: kynes-plants, under "Mistletoe"
- `moonwort-botrychium`: kynes-plants, under "Moonwort"
- `moss-bryophyta`: cunningham-herbs, under "Moss"; kynes-plants, under "Moss"
- `mugwort-artemisia-vulgaris`: kynes-plants, under "Mugwort"
- `mulberry-morus-nigra`: kynes-plants, under "Mulberry"
- `myrtle-myrtus-communis`: kynes-plants, under "Myrtle"
- `nutmeg-myristica-fragrans`: cunningham-herbs, under "Nutmeg"; p. 266; kynes-plants, under "Nutmeg"
- `oak-quercus`: cunningham-herbs, under "Oak"; p. 266; kynes-plants, under "Oak"; cunningham-herbs, under "Oak"
- `oakmoss-evernia-prunastri`: kynes-plants, under "Lichen"
- `oats-avena-sativa`: kynes-plants, under "Grain"
- `olive-olea-europaea`: kynes-plants, under "Olive"
- `opal-opal`: cunningham-crystals, under "Opal"; pp. 121–122
- `opium-poppy-papaver-somniferum`: cunningham-herbs, under "Poppy"; p. 266; kynes-plants, under "Poppy"
- `orange-citrus-sinensis`: cunningham-herbs, under "Orange"
- `orchid-orchis`: kynes-plants, under "Orchid"
- `orris-iris-germanica`: kynes-plants, under "Iris"
- `ox-eye-daisy-leucanthemum-vulgare`: kynes-plants, under "Daisy"
- `pea-lathyrus-oleraceus`: kynes-plants, under "Pea"
- `peach-prunus-persica`: kynes-plants, under "Peach and Nectarine"
- `pear-pyrus-communis`: kynes-plants, under "Pear"
- `pearl-pearl`: cunningham-crystals, under "Pearl"; pp. 122–124, 190
- `peony-paeonia-officinalis`: kynes-plants, under "Peony"
- `peppermint-mentha-piperita`: kynes-plants, under "Mint"
- `persimmon-diospyros-virginiana`: cunningham-herbs, under "Persimmon"
- `plantain-plantago-spp`: kynes-plants, under "Plantain"
- `ploughmans-spikenard-pentanema-squarrosum`: kynes-plants, under "Spikenard"
- `pomegranate-punica-granatum`: cunningham-herbs, under "Pomegranate"; p. 266; kynes-plants, under "Pomegranate"; cunningham-herbs, under "Pomegranate"
- `purslane-portulaca-oleracea`: cunningham-herbs, under "Purslane"
- `pyrite-pyrite`: cunningham-crystals, under "Pyrite"; pp. 168–169
- `quince-cydonia-oblonga`: kynes-plants, under "Quince"
- `ragwort-jacobaea-vulgaris`: kynes-plants, under "Ragwort"
- `raspberry-rubus-idaeus`: kynes-plants, under "Raspberry"
- `rice-oryza-sativa`: kynes-plants, under "Grain"
- `rose-rosa`: cunningham-herbs, under "Rose"; p. 266; kynes-plants, under "Rose"; cunningham-herbs, under "Rose"
- `rowan-sorbus-aucuparia`: kynes-plants, under "Rowan"
- `rue-ruta-graveolens`: kynes-plants, under "Rue"
- `rye-secale-cereale`: kynes-plants, under "Grain"
- `sardonyx-quartz-var-sardonyx`: cunningham-crystals, pp. 133–134; cunningham-crystals, p. 134
- `solomons-seal-polygonatum-multiflorum`: kynes-plants, under "Solomon's Seal"
- `southernwood-artemisia-abrotanum`: kynes-plants, under "Southernwood"
- `speedwell-veronica-officinalis`: kynes-plants, under "Speedwell"
- `star-anise-illicium-verum`: cunningham-herbs, under "Star Anise"; kynes-plants, under "Star Anise"
- `stinging-nettle-urtica-dioica`: kynes-plants, under "Nettle"
- `strawberry-fragaria-vesca`: cunningham-herbs, under "Strawberry"
- `sunflower-helianthus-annuus`: kynes-plants, under "Sunflower"
- `thyme-thymus-vulgaris`: kynes-plants, under "Thyme"
- `ti-cordyline-fruticosa`: kynes-plants, under "Ti Plant"
- `tin-tin`: cunningham-crystals, pp. 171–172; cunningham-crystals, p. 172
- `tonka-bean-dipteryx-odorata`: kynes-plants, under "Tonka Bean"
- `tulip-tulipa`: kynes-plants, under "Tulip"
- `turmeric-curcuma-longa`: kynes-plants, under "Turmeric"
- `turquoise-turquoise`: cunningham-crystals, under "Turquoise"; pp. 143–144; p. 191
- `vanilla-vanilla-planifolia`: kynes-plants, under "Vanilla"
- `vervain-verbena-officinalis`: kynes-plants, under "Vervain"
- `vetiver-chrysopogon-zizanioides`: kynes-plants, under "Vetiver"
- `violet-viola-odorata`: cunningham-herbs, under "Violet"
- `virginia-snakeroot-aristolochia-serpentaria`: cunningham-herbs, under "Snakeroot"; p. 266; kynes-plants, under "Snakeroot"
- `water-lily-nymphaea-alba`: kynes-plants, under "Water Lily"
- `water-mint-mentha-aquatica`: kynes-plants, under "Mint"
- `white-deadnettle-lamium-album`: kynes-plants, under "Deadnettle"
- `wild-thyme-thymus-serpyllum`: kynes-plants, under "Thyme"
- `wood-anemone-anemonoides-nemorosa`: kynes-plants, under "Anemone"
- `wood-sorrel-oxalis-acetosella`: kynes-plants, under "Wood Sorrel"
- `yellow-flag-iris-pseudacorus`: kynes-plants, under "Iris"

### Energy

8 entries.

- `beryl-beryl`: cunningham-crystals, pp. 76–78; p. 190; cunningham-crystals, p. 77
- `black-tourmaline-schorl`: cunningham-crystals, p. 142
- `calcite-calcite`: cunningham-crystals, under "Calcite"; pp. 79–80
- `rhodochrosite-rhodochrosite`: cunningham-crystals, under "Rhodocrosite"; p. 127
- `selenite-gypsum-var-selenite`: cunningham-crystals, under "Selenite"; p. 134
- `spinel-spinel`: cunningham-crystals, p. 136
- `sunstone-feldspar-var-sunstone`: cunningham-crystals, under "Sunstone"; pp. 139–140; p. 190; cunningham-crystals, under "Sunstone"; p. 140
- `tourmaline-tourmaline`: cunningham-crystals, pp. 141–142

### Dream(s)

5 entries.

- `amethyst-quartz-var-amethyst`: cunningham-crystals, pp. 71–73
- `azurite-azurite`: cunningham-crystals, under "Azurite"; p. 76
- `bilberry-vaccinium-myrtillus`: cunningham-herbs, under "Huckleberry" [prints "dream magic"]
- `holly-ilex-aquifolium`: cunningham-herbs, under "Holly" [prints "dream magic"]
- `silver-silver`: cunningham-crystals, pp. 169–171; cunningham-crystals, pp. 170–171; cunningham-crystals, p. 169; cunningham-crystals, pp. 169–170

### Prophetic dreams

9 entries.

- `bracken-pteridium-aquilinum`: cunningham-herbs, under "Bracken"; p. 266; cunningham-herbs, under "Bracken"
- `buchu-agathosma-betulina`: cunningham-herbs, under "Buchu"
- `cinquefoil-potentilla-reptans`: cunningham-herbs, under "Cinquefoil"
- `heliotrope-heliotropium-europaeum`: cunningham-herbs, under "Heliotrope"
- `jasmine-jasminum-officinale`: cunningham-herbs, under "Jasmine"
- `marigold-calendula-officinalis`: cunningham-herbs, under "Marigold"; p. 266; cunningham-herbs, under "Marigold"
- `mimosa-acacia-dealbata`: cunningham-herbs, under "Mimosa"; p. 266
- `mugwort-artemisia-vulgaris`: cunningham-herbs, under "Mugwort"; p. 266
- `onion-allium-cepa`: cunningham-herbs, under "Onion"

### Psychism

12 entries.

- `amethyst-quartz-var-amethyst`: cunningham-crystals, pp. 71–73
- `aquamarine-beryl-var-aquamarine`: cunningham-crystals, pp. 74–75; p. 190; cunningham-crystals, p. 74
- `azurite-azurite`: cunningham-crystals, under "Azurite"; p. 76
- `beryl-beryl`: cunningham-crystals, pp. 76–78; p. 190; cunningham-crystals, p. 77
- `citrine-quartz-var-citrine`: cunningham-crystals, p. 44; pp. 83–84; p. 190
- `emerald-beryl-var-emerald`: cunningham-crystals, pp. 93–94; p. 190; cunningham-crystals, p. 94
- `lapis-lazuli-lapis-lazuli`: cunningham-crystals, under "Lapis Lazuli"; pp. 107–109; cunningham-crystals, under "Lapis Lazuli"; p. 108
- `moonstone-feldspar-var-moonstone`: cunningham-crystals, under "Moonstone"; pp. 113–115; p. 190; cunningham-crystals, under "Moonstone"; pp. 114–115
- `opal-opal`: cunningham-crystals, under "Opal"; pp. 121–122
- `sapphire-corundum-var-sapphire`: cunningham-crystals, pp. 132–133; p. 190
- `silver-silver`: cunningham-crystals, pp. 169–171; cunningham-crystals, pp. 170–171; cunningham-crystals, p. 169; cunningham-crystals, pp. 169–170
- `staurolite-staurolite`: cunningham-crystals, under "Staurolite"; pp. 137-138

### Spirituality

66 entries.

- `adders-tongue-erythronium-americanum`: kynes-plants, under "Adder's Tongue"
- `african-violet-streptocarpus-ionanthus`: cunningham-herbs, under "African Violet"; p. 266; kynes-plants, under "African Violet"; cunningham-herbs, under "African Violet"
- `allspice-pimenta-dioica`: kynes-plants, under "Allspice"
- `almond-prunus-amygdalus`: kynes-plants, under "Almond"
- `angelica-angelica-archangelica`: kynes-plants, under "Angelica"
- `babul-acacia-vachellia-nilotica`: kynes-plants, under "Acacia"
- `bean-phaseolus-vulgaris`: kynes-plants, under "Bean"
- `bearberry-arctostaphylos-uva-ursi`: kynes-plants, under "Uva Ursi"
- `benzoin-styrax-benzoin`: kynes-plants, under "Benzoin"
- `bodhi-tree-ficus-religiosa`: kynes-plants, under "Bodhi"
- `buttercup-ranunculus-acris`: kynes-plants, under "Buttercup"
- `calcite-calcite`: cunningham-crystals, under "Calcite"; pp. 79–80
- `camellia-camellia-japonica`: kynes-plants, under "Camellia"
- `cassia-cinnamomum-cassia`: kynes-plants, under "Cinnamon"
- `cedar-cedrus-libani`: kynes-plants, under "Cedar"
- `cherry-prunus-avium`: kynes-plants, under "Cherry"
- `chicory-cichorium-intybus`: kynes-plants, under "Chicory"
- `cinnamon-cinnamomum-verum`: cunningham-herbs, under "Cinnamon"; p. 266; kynes-plants, under "Cinnamon"; cunningham-herbs, under "Cinnamon"
- `clove-syzygium-aromaticum`: kynes-plants, under "Clove"
- `coconut-cocos-nucifera`: kynes-plants, under "Coconut"
- `columbine-aquilegia`: kynes-plants, under "Columbine"
- `cumin-cuminum-cyminum`: kynes-plants, under "Cumin"
- `date-palm-phoenix-dactylifera`: kynes-plants, under "Date"
- `diamond-diamond`: cunningham-crystals, pp. 91–93; p. 190; cunningham-crystals, pp. 92–93
- `dragons-blood-calamus-draco`: kynes-plants, under "Dragon's Blood"
- `elder-sambucus`: kynes-plants, under "Elder"
- `eucalyptus-eucalyptus-globulus`: kynes-plants, under "Eucalyptus"
- `fir-abies`: kynes-plants, under "Fir"
- `frankincense-boswellia-sacra`: kynes-plants, under "Frankincense"
- `gardenia-gardenia-jasminoides`: cunningham-herbs, under "Gardenia"; p. 266; kynes-plants, under "Gardenia"; cunningham-herbs, under "Gardenia"
- `gum-arabic-senegalia-senegal`: cunningham-herbs, under "Arabic, Gum"; p. 266
- `henna-lawsonia-inermis`: kynes-plants, under "Henna"
- `holly-ilex-aquifolium`: kynes-plants, under "Holly"
- `hyssop-hyssopus-officinalis`: kynes-plants, under "Hyssop"
- `ivy-hedera-helix`: kynes-plants, under "Ivy"
- `jasmine-jasminum-officinale`: kynes-plants, under "Jasmine"
- `ladys-mantle-alchemilla-vulgaris`: kynes-plants, under "Lady's Mantle"
- `larch-larix`: kynes-plants, under "Larch"
- `lavender-lavandula-angustifolia`: kynes-plants, under "Lavender"
- `lemon-balm-melissa-officinalis`: kynes-plants, under "Lemon Balm"
- `lemongrass-cymbopogon-citratus`: kynes-plants, under "Lemongrass"
- `lepidolite-lepidolite`: cunningham-crystals, under "Lepidolite"; pp. 110–112; cunningham-crystals, under "Lepidolite"; p. 111
- `lilac-syringa-vulgaris`: kynes-plants, under "Lilac"
- `lily-of-the-valley-convallaria-majalis`: kynes-plants, under "Lily of the Valley"
- `lotus-nelumbo-nucifera`: kynes-plants, under "Lotus"
- `mallow-malva-sylvestris`: kynes-plants, under "Mallow"
- `marshmallow-althaea-officinalis`: kynes-plants, under "Mallow"
- `myrrh-commiphora-myrrha`: cunningham-herbs, under "Myrrh"; kynes-plants, under "Myrrh"; cunningham-herbs, under "Myrrh"; p. 266
- `olive-olea-europaea`: kynes-plants, under "Olive"
- `opoponax-commiphora-guidottii`: kynes-plants, under "Myrrh"
- `passionflower-passiflora-incarnata`: kynes-plants, under "Passionflower"
- `patchouli-pogostemon-cablin`: kynes-plants, under "Patchouli"
- `poplar-populus-nigra`: kynes-plants, under "Poplar"
- `primrose-primula-vulgaris`: kynes-plants, under "Primrose"
- `sandalwood-santalum-album`: cunningham-herbs, under "Sandalwood, White"; kynes-plants, under "Sandalwood"
- `self-heal-prunella-vulgaris`: kynes-plants, under "Self Heal"
- `sphene-titanite`: cunningham-crystals, under "Sphene"; pp. 135-136
- `spruce-picea`: kynes-plants, under "Spruce"
- `st-johns-wort-hypericum-perforatum`: kynes-plants, under "St. John’s Wort"
- `star-anise-illicium-verum`: kynes-plants, under "Star Anise"
- `staurolite-staurolite`: cunningham-crystals, under "Staurolite"; pp. 137-138
- `sunflower-helianthus-annuus`: kynes-plants, under "Sunflower"
- `sweetgrass-hierochloe-odorata`: kynes-plants, under "Sweetgrass"
- `tamarisk-tamarix`: kynes-plants, under "Tamarisk"
- `turmeric-curcuma-longa`: kynes-plants, under "Turmeric"
- `vetiver-chrysopogon-zizanioides`: kynes-plants, under "Vetiver"

### Centering

1 entry.

- `calcite-calcite`: cunningham-crystals, under "Calcite"; pp. 79–80

### Compassion

1 entry.

- `celestite-celestine`: cunningham-crystals, under "Celestite"; pp. 81–82

### Eloquence

4 entries.

- `aspen-populus-tremuloides`: cunningham-herbs, under "Aspen"; under "Poplar"; p. 266; cunningham-herbs, under "Aspen"; under "Poplar"
- `carnelian-quartz-var-carnelian`: cunningham-crystals, p. 80; p. 190; cunningham-crystals, p. 80
- `celestite-celestine`: cunningham-crystals, under "Celestite"; pp. 81–82
- `sardonyx-quartz-var-sardonyx`: cunningham-crystals, pp. 133–134; cunningham-crystals, p. 134

### Patience

1 entry.

- `carnelian-quartz-var-carnelian`: cunningham-crystals, p. 80; p. 190 [prints "patience (prose: "It also confers patience.")"]

### Travel

5 entries.

- `chalcedony-quartz-var-chalcedony`: cunningham-crystals, p. 82
- `comfrey-symphytum-officinale`: cunningham-herbs, under "Comfrey"; p. 266 [prints "safety during travel"]; cunningham-herbs, under "Comfrey" [prints "safety during travel"]
- `mint-mentha`: cunningham-herbs, under "Mint"
- `sea-holly-eryngium`: cunningham-herbs, under "Eryngo"; p. 266 [prints "traveler's luck"]
- `silver-silver`: cunningham-crystals, pp. 169–171; cunningham-crystals, pp. 170–171; cunningham-crystals, p. 169; cunningham-crystals, pp. 169–170

### Anti-Confusion

1 entry.

- `rhodonite-rhodonite`: cunningham-crystals, under "Rhodonite"; pp. 127–128

### Shadow Work

1 entry.

- `obsidian-obsidian`: the Obsidian entry already links it

### Youth

7 entries.

- `anise-pimpinella-anisum`: cunningham-herbs, under "Anise"; p. 266; cunningham-herbs, under "Anise"
- `cowslip-primula-veris`: cunningham-herbs, under "Cowslip"; p. 266; cunningham-herbs, under "Cowslip"
- `fern-polypodiopsida`: cunningham-herbs, under "Fern" [prints "eternal youth"]
- `moonstone-feldspar-var-moonstone`: cunningham-crystals, under "Moonstone"; pp. 113–115; p. 190; cunningham-crystals, under "Moonstone"; pp. 114–115
- `myrtle-myrtus-communis`: cunningham-herbs, under "Myrtle"; p. 266; cunningham-herbs, under "Myrtle"
- `rosemary-salvia-rosmarinus`: cunningham-herbs, under "Rosemary"; p. 266; cunningham-herbs, under "Rosemary"
- `vervain-verbena-officinalis`: cunningham-herbs, under "Vervain"

### Death/Funeral

65 entries.

- `alder-alnus-glutinosa`: kynes-plants, under "Alder" [prints "death/funeral practices"]
- `aloe-aloe-vera`: kynes-plants, under "Aloe" [prints "death/funeral practices"]
- `amaranth-amaranthus-hypochondriacus`: kynes-plants, under "Amaranth" [prints "death/funeral practices"]
- `american-bittersweet-celastrus-scandens`: kynes-plants, under "Bittersweet" [prints "death/funeral practices"]
- `apple-malus-domestica`: kynes-plants, under "Apple" [prints "death/funeral practices"]
- `aspen-populus-tremula`: kynes-plants, under "Aspen" [prints "death/funeral practices"]
- `babul-acacia-vachellia-nilotica`: kynes-plants, under "Acacia" [prints "death/funeral practices"]
- `barley-hordeum-vulgare`: kynes-plants, under "Grain" [prints "death/funeral practices"]
- `basil-ocimum-basilicum`: kynes-plants, under "Basil" [prints "death/funeral practices"]
- `bean-phaseolus-vulgaris`: kynes-plants, under "Bean" [prints "death/funeral practices"]
- `birch-betula-pendula`: kynes-plants, under "Birch" [prints "death/funeral practices"]
- `bistort-bistorta-officinalis`: kynes-plants, under "Bistort" [prints "death/funeral practices"]
- `bittersweet-nightshade-solanum-dulcamara`: kynes-plants, under "Bittersweet" [prints "death/funeral practices"]
- `black-hellebore-helleborus-niger`: kynes-plants, under "Hellebore" [prints "death/funeral practices"]
- `blackberry-rubus-subg-rubus`: kynes-plants, under "Blackberry" [prints "death/funeral practices"]
- `box-buxus-sempervirens`: kynes-plants, under "Boxwood" [prints "death/funeral practices"]
- `broom-cytisus-scoparius`: kynes-plants, under "Broom" [prints "death/funeral practices"]
- `camellia-camellia-japonica`: kynes-plants, under "Camellia" [prints "death/funeral practices"]
- `caraway-carum-carvi`: kynes-plants, under "Caraway" [prints "death/funeral practices"]
- `carnation-dianthus-caryophyllus`: kynes-plants, under "Carnation" [prints "death/funeral practices"]
- `celery-apium-graveolens`: kynes-plants, under "Celery" [prints "death/funeral practices"]
- `chrysanthemum-chrysanthemum-morifolium`: kynes-plants, under "Chrysanthemum" [prints "death/funeral practices"]
- `corn-poppy-papaver-rhoeas`: kynes-plants, under "Poppy" [prints "death/funeral practices"]
- `crab-apple-malus-sylvestris`: kynes-plants, under "Crabapple" [prints "death/funeral practices"]
- `cypress-cupressus-sempervirens`: kynes-plants, under "Cypress" [prints "death/funeral practices"]
- `daffodil-narcissus`: kynes-plants, under "Daffodil" [prints "death/funeral practices"]
- `elder-sambucus`: kynes-plants, under "Elder" [prints "death/funeral practices"]
- `fig-ficus-carica`: kynes-plants, under "Fig" [prints "death/funeral practices"]
- `fir-abies`: kynes-plants, under "Fir" [prints "death/funeral practices"]
- `fly-agaric-amanita-muscaria`: kynes-plants, under "Fly Agaric" [prints "death/funeral practices"]
- `hemp-cannabis-sativa`: kynes-plants, under "Hemp" [prints "death/funeral practices"]
- `henbane-hyoscyamus-niger`: kynes-plants, under "Henbane" [prints "death/funeral practices"]
- `holly-ilex-aquifolium`: kynes-plants, under "Holly" [prints "death/funeral practices"]
- `holy-basil-ocimum-tenuiflorum`: kynes-plants, under "Basil" [prints "death/funeral practices"]
- `immortelle-helichrysum-italicum`: kynes-plants, under "Immortelle" [prints "death/funeral practices"]
- `lily-lilium`: kynes-plants, under "Lily" [prints "death/funeral practices"]
- `maize-zea-mays`: kynes-plants, under "Grain" [prints "death/funeral practices"]
- `marjoram-origanum-majorana`: kynes-plants, under "Oregano and Marjoram" [prints "death/funeral practices"]
- `mistletoe-viscum-album`: kynes-plants, under "Mistletoe" [prints "death/funeral practices"]
- `monkshood-aconitum-napellus`: kynes-plants, under "Aconite" [prints "death/funeral practices"]
- `myrrh-commiphora-myrrha`: kynes-plants, under "Myrrh" [prints "death/funeral practices"]
- `myrtle-myrtus-communis`: kynes-plants, under "Myrtle" [prints "death/funeral practices"]
- `oats-avena-sativa`: kynes-plants, under "Grain" [prints "death/funeral practices"]
- `olive-olea-europaea`: kynes-plants, under "Olive" [prints "death/funeral practices"]
- `onion-allium-cepa`: kynes-plants, under "Onion" [prints "death/funeral practices"]
- `opium-poppy-papaver-somniferum`: kynes-plants, under "Poppy" [prints "death/funeral practices"]
- `opoponax-commiphora-guidottii`: kynes-plants, under "Myrrh" [prints "death/funeral practices"]
- `oregano-origanum-vulgare`: kynes-plants, under "Oregano and Marjoram" [prints "death/funeral practices"]
- `parsley-petroselinum-crispum`: kynes-plants, under "Parsley" [prints "death/funeral practices"]
- `pea-lathyrus-oleraceus`: kynes-plants, under "Pea" [prints "death/funeral practices"]
- `peach-prunus-persica`: kynes-plants, under "Peach and Nectarine" [prints "death/funeral practices"]
- `pomegranate-punica-granatum`: kynes-plants, under "Pomegranate" [prints "death/funeral practices"]
- `poplar-populus-nigra`: kynes-plants, under "Poplar" [prints "death/funeral practices"]
- `rice-oryza-sativa`: kynes-plants, under "Grain" [prints "death/funeral practices"]
- `rose-rosa`: kynes-plants, under "Rose" [prints "death/funeral practices"]
- `rosemary-salvia-rosmarinus`: kynes-plants, under "Rosemary" [prints "death/funeral practices"]
- `rye-secale-cereale`: kynes-plants, under "Grain" [prints "death/funeral practices"]
- `sage-salvia-officinalis`: kynes-plants, under "Sage" [prints "death/funeral practices"]
- `snowdrop-galanthus-nivalis`: kynes-plants, under "Snowdrop" [prints "death/funeral practices"]
- `tamarisk-tamarix`: kynes-plants, under "Tamarisk" [prints "death/funeral practices"]
- `tansy-tanacetum-vulgare`: kynes-plants, under "Tansy" [prints "death/funeral practices"]
- `white-hellebore-veratrum-album`: kynes-plants, under "Hellebore" [prints "death/funeral practices"]
- `willow-salix-alba`: kynes-plants, under "Willow" [prints "death/funeral practices"]
- `wormwood-artemisia-absinthium`: kynes-plants, under "Wormwood" [prints "death/funeral practices"]
- `yew-taxus-baccata`: kynes-plants, under "Yew" [prints "death/funeral practices"]

### Consecrate/Bless

78 entries.

- `african-violet-streptocarpus-ionanthus`: kynes-plants, under "African Violet"
- `allspice-pimenta-dioica`: kynes-plants, under "Allspice"
- `angelica-angelica-archangelica`: kynes-plants, under "Angelica"
- `anise-pimpinella-anisum`: kynes-plants, under "Anise"
- `apple-malus-domestica`: kynes-plants, under "Apple"
- `babul-acacia-vachellia-nilotica`: kynes-plants, under "Acacia"
- `barley-hordeum-vulgare`: kynes-plants, under "Grain"
- `carnation-dianthus-caryophyllus`: kynes-plants, under "Carnation"
- `cassia-cinnamomum-cassia`: kynes-plants, under "Cinnamon"
- `cattail-typha`: kynes-plants, under "Cattail"
- `centaury-centaurium-erythraea`: kynes-plants, under "Centaury"
- `chestnut-castanea-sativa`: kynes-plants, under "Chestnut"
- `chrysanthemum-chrysanthemum-morifolium`: kynes-plants, under "Chrysanthemum"
- `cinnamon-cinnamomum-verum`: kynes-plants, under "Cinnamon"
- `coconut-cocos-nucifera`: kynes-plants, under "Coconut"
- `columbine-aquilegia`: kynes-plants, under "Columbine"
- `comfrey-symphytum-officinale`: kynes-plants, under "Comfrey"
- `coriander-coriandrum-sativum`: kynes-plants, under "Coriander"
- `cypress-cupressus-sempervirens`: kynes-plants, under "Cypress"
- `daffodil-narcissus`: kynes-plants, under "Daffodil"
- `daisy-bellis-perennis`: kynes-plants, under "Daisy"
- `dragons-blood-calamus-draco`: kynes-plants, under "Dragon's Blood"
- `elder-sambucus`: kynes-plants, under "Elder"
- `fairy-wand-chamaelirium-luteum`: kynes-plants, under "Fairy Wand"
- `frankincense-boswellia-sacra`: kynes-plants, under "Frankincense"
- `fumitory-fumaria-officinalis`: kynes-plants, under "Fumitory"
- `galangal-alpinia-officinarum`: kynes-plants, under "Galangal"
- `german-chamomile-matricaria-chamomilla`: kynes-plants, under "Chamomile"
- `ginger-zingiber-officinale`: kynes-plants, under "Ginger"
- `goldenseal-hydrastis-canadensis`: kynes-plants, under "Goldenseal"
- `grape-vitis-vinifera`: kynes-plants, under "Grape"
- `hawthorn-crataegus`: kynes-plants, under "Hawthorn"
- `henbane-hyoscyamus-niger`: kynes-plants, under "Henbane"
- `henna-lawsonia-inermis`: kynes-plants, under "Henna"
- `holly-ilex-aquifolium`: kynes-plants, under "Holly"
- `horse-chestnut-aesculus-hippocastanum`: kynes-plants, under "Chestnut"
- `hyssop-hyssopus-officinalis`: kynes-plants, under "Hyssop"
- `juniper-juniperus-communis`: kynes-plants, under "Juniper"
- `lily-lilium`: kynes-plants, under "Lily"
- `lily-of-the-valley-convallaria-majalis`: kynes-plants, under "Lily of the Valley"
- `lime-citrus-aurantiifolia`: kynes-plants, under "Lime"
- `lotus-nelumbo-nucifera`: kynes-plants, under "Lotus"
- `maize-zea-mays`: kynes-plants, under "Grain"
- `marigold-calendula-officinalis`: kynes-plants, under "Marigold"
- `mimosa-acacia-dealbata`: kynes-plants, under "Mimosa"
- `monkshood-aconitum-napellus`: kynes-plants, under "Aconite"
- `mugwort-artemisia-vulgaris`: kynes-plants, under "Mugwort"
- `mulberry-morus-nigra`: kynes-plants, under "Mulberry"
- `myrrh-commiphora-myrrha`: kynes-plants, under "Myrrh"
- `oak-quercus`: kynes-plants, under "Oak"
- `oats-avena-sativa`: kynes-plants, under "Grain"
- `olive-olea-europaea`: kynes-plants, under "Olive"
- `opoponax-commiphora-guidottii`: kynes-plants, under "Myrrh"
- `ox-eye-daisy-leucanthemum-vulgare`: kynes-plants, under "Daisy"
- `patchouli-pogostemon-cablin`: kynes-plants, under "Patchouli"
- `pear-pyrus-communis`: kynes-plants, under "Pear"
- `ploughmans-spikenard-pentanema-squarrosum`: kynes-plants, under "Spikenard"
- `rice-oryza-sativa`: kynes-plants, under "Grain"
- `roman-chamomile-chamaemelum-nobile`: kynes-plants, under "Chamomile"
- `rose-rosa`: kynes-plants, under "Rose"
- `rosemary-salvia-rosmarinus`: kynes-plants, under "Rosemary"
- `rowan-sorbus-aucuparia`: kynes-plants, under "Rowan"
- `rue-ruta-graveolens`: kynes-plants, under "Rue"
- `rye-secale-cereale`: kynes-plants, under "Grain"
- `sage-salvia-officinalis`: kynes-plants, under "Sage"
- `sandalwood-santalum-album`: kynes-plants, under "Sandalwood"
- `sesame-sesamum-indicum`: kynes-plants, under "Sesame"
- `st-johns-wort-hypericum-perforatum`: kynes-plants, under "St. John’s Wort"
- `star-anise-illicium-verum`: kynes-plants, under "Star Anise"
- `sweet-woodruff-galium-odoratum`: kynes-plants, under "Sweet Woodruff"
- `sweetgrass-hierochloe-odorata`: kynes-plants, under "Sweetgrass"
- `thyme-thymus-vulgaris`: kynes-plants, under "Thyme"
- `turmeric-curcuma-longa`: kynes-plants, under "Turmeric"
- `valerian-valeriana-officinalis`: kynes-plants, under "Valerian"
- `vervain-verbena-officinalis`: kynes-plants, under "Vervain"
- `watercress-nasturtium-officinale`: kynes-plants, under "Cress"
- `wild-thyme-thymus-serpyllum`: kynes-plants, under "Thyme"
- `yarrow-achillea-millefolium`: kynes-plants, under "Yarrow"

### Hope

24 entries.

- `almond-prunus-amygdalus`: kynes-plants, under "Almond"
- `barley-hordeum-vulgare`: kynes-plants, under "Grain"
- `birch-betula-pendula`: kynes-plants, under "Birch"
- `coconut-cocos-nucifera`: kynes-plants, under "Coconut"
- `cornflower-centaurea-cyanus`: kynes-plants, under "Cornflower"
- `fir-abies`: kynes-plants, under "Fir"
- `gorse-ulex-europaeus`: kynes-plants, under "Gorse"
- `greater-celandine-chelidonium-majus`: kynes-plants, under "Celandine"
- `hawthorn-crataegus`: kynes-plants, under "Hawthorn"
- `hops-humulus-lupulus`: kynes-plants, under "Hop"
- `lesser-celandine-ficaria-verna`: kynes-plants, under "Celandine"
- `lily-lilium`: kynes-plants, under "Lily"
- `maize-zea-mays`: kynes-plants, under "Grain"
- `marigold-calendula-officinalis`: kynes-plants, under "Marigold"
- `oats-avena-sativa`: kynes-plants, under "Grain"
- `olive-olea-europaea`: kynes-plants, under "Olive"
- `pomegranate-punica-granatum`: kynes-plants, under "Pomegranate"
- `poplar-populus-nigra`: kynes-plants, under "Poplar"
- `rice-oryza-sativa`: kynes-plants, under "Grain"
- `rye-secale-cereale`: kynes-plants, under "Grain"
- `self-heal-prunella-vulgaris`: kynes-plants, under "Self Heal"
- `snowdrop-galanthus-nivalis`: kynes-plants, under "Snowdrop"
- `spruce-picea`: kynes-plants, under "Spruce"
- `tamarisk-tamarix`: kynes-plants, under "Tamarisk"

### Popularity

1 entry.

- `oregon-grape-berberis-aquifolium`: cunningham-herbs, under "Oregon Grape"

### Defense

71 entries.

- `apricot-prunus-armeniaca`: kynes-plants, under "Apricot"
- `bay-laurel-laurus-nobilis`: kynes-plants, under "Bay"
- `black-cohosh-actaea-racemosa`: kynes-plants, under "Black Cohosh"
- `black-locust-robinia-pseudoacacia`: kynes-plants, under "Locust"
- `black-pepper-piper-nigrum`: kynes-plants, under "Pepper"
- `blackthorn-prunus-spinosa`: kynes-plants, under "Blackthorn"
- `blessed-thistle-centaurea-benedicta`: kynes-plants, under "Thistle"
- `blue-flag-iris-versicolor`: kynes-plants, under "Iris"
- `bog-myrtle-myrica-gale`: kynes-plants, under "Bog Myrtle"
- `box-buxus-sempervirens`: kynes-plants, under "Boxwood"
- `buckthorn-rhamnus-cathartica`: kynes-plants, under "Buckthorn"
- `burdock-arctium-lappa`: kynes-plants, under "Burdock"
- `chicory-cichorium-intybus`: kynes-plants, under "Chicory"
- `chilli-pepper-capsicum-annuum`: kynes-plants, under "Chili Pepper"
- `cinquefoil-potentilla-reptans`: kynes-plants, under "Cinquefoil"
- `corn-poppy-papaver-rhoeas`: kynes-plants, under "Poppy"
- `cypress-cupressus-sempervirens`: kynes-plants, under "Cypress"
- `devils-bit-scabious-succisa-pratensis`: kynes-plants, under "Devil's Bit Scabious"
- `devils-shoestring`: kynes-plants, under "Devil's Shoestring"; under "Yucca"; kynes-plants, under "Devil's Shoestring"
- `dill-anethum-graveolens`: kynes-plants, under "Dill"
- `dodder-cuscuta-europaea`: kynes-plants, under "Dodder"
- `dogwood-cornus-florida`: kynes-plants, under "Dogwood"
- `dragons-blood-calamus-draco`: kynes-plants, under "Dragon's Blood"
- `elder-sambucus`: kynes-plants, under "Elder"
- `feverfew-tanacetum-parthenium`: kynes-plants, under "Feverfew"
- `frankincense-boswellia-sacra`: kynes-plants, under "Frankincense"
- `globeflower-trollius-europaeus`: kynes-plants, under "Globeflower"
- `gorse-ulex-europaeus`: kynes-plants, under "Gorse"
- `hawthorn-crataegus`: kynes-plants, under "Hawthorn"
- `hazel-corylus`: kynes-plants, under "Hazel"
- `heather-calluna-vulgaris`: kynes-plants, under "Heather and Heath"
- `hemlock-conium-maculatum`: kynes-plants, under "Hemlock"
- `hickory-carya`: kynes-plants, under "Hickory and Pecan"
- `high-john-the-conqueror-ipomoea-purga`: kynes-plants, under "High John"
- `holly-ilex-aquifolium`: kynes-plants, under "Holly"
- `honey-locust-gleditsia-triacanthos`: kynes-plants, under "Locust"
- `jasmine-jasminum-officinale`: kynes-plants, under "Jasmine"
- `juniper-juniperus-communis`: kynes-plants, under "Juniper"
- `lemongrass-cymbopogon-citratus`: kynes-plants, under "Lemongrass"
- `lilac-syringa-vulgaris`: kynes-plants, under "Lilac"
- `lily-of-the-valley-convallaria-majalis`: kynes-plants, under "Lily of the Valley"
- `linden-tilia-europaea`: kynes-plants, under "Linden"
- `lotus-nelumbo-nucifera`: kynes-plants, under "Lotus"
- `maidenhair-fern-adiantum`: kynes-plants, under "Maidenhair Fern"
- `marjoram-origanum-majorana`: kynes-plants, under "Oregano and Marjoram"
- `milk-thistle-silybum-marianum`: kynes-plants, under "Thistle"
- `moonwort-botrychium`: kynes-plants, under "Moonwort"
- `motherwort-leonurus-cardiaca`: kynes-plants, under "Motherwort"
- `mugwort-artemisia-vulgaris`: kynes-plants, under "Mugwort"
- `mullein-verbascum-thapsus`: kynes-plants, under "Mullein"
- `oak-quercus`: kynes-plants, under "Oak"
- `opium-poppy-papaver-somniferum`: kynes-plants, under "Poppy"
- `oregano-origanum-vulgare`: kynes-plants, under "Oregano and Marjoram"
- `orris-iris-germanica`: kynes-plants, under "Iris"
- `patchouli-pogostemon-cablin`: kynes-plants, under "Patchouli"
- `pecan-carya-illinoinensis`: kynes-plants, under "Hickory and Pecan"
- `purslane-portulaca-oleracea`: kynes-plants, under "Purslane"
- `rosemary-salvia-rosmarinus`: kynes-plants, under "Rosemary"
- `rue-ruta-graveolens`: kynes-plants, under "Rue"
- `sesame-sesamum-indicum`: kynes-plants, under "Sesame"
- `speedwell-veronica-officinalis`: kynes-plants, under "Speedwell"
- `spurge-euphorbia`: kynes-plants, under "Spurge"
- `st-johns-wort-hypericum-perforatum`: kynes-plants, under "St. John’s Wort"
- `stinging-nettle-urtica-dioica`: kynes-plants, under "Nettle"
- `tansy-tanacetum-vulgare`: kynes-plants, under "Tansy"
- `thistle-carduus`: kynes-plants, under "Thistle"
- `vervain-verbena-officinalis`: kynes-plants, under "Vervain"
- `vetiver-chrysopogon-zizanioides`: kynes-plants, under "Vetiver"
- `wood-sorrel-oxalis-acetosella`: kynes-plants, under "Wood Sorrel"
- `yarrow-achillea-millefolium`: kynes-plants, under "Yarrow"
- `yellow-flag-iris-pseudacorus`: kynes-plants, under "Iris"

### Focus

49 entries.

- `ash-fraxinus-excelsior`: kynes-plants, under "Ash"
- `basil-ocimum-basilicum`: kynes-plants, under "Basil"
- `bee-balm-monarda-didyma`: kynes-plants, under "Bee Balm"
- `benzoin-styrax-benzoin`: kynes-plants, under "Benzoin"
- `birch-betula-pendula`: kynes-plants, under "Birch"
- `bitter-orange-citrus-aurantium`: kynes-plants, under "Orange"
- `blue-flag-iris-versicolor`: kynes-plants, under "Iris"
- `bog-myrtle-myrica-gale`: kynes-plants, under "Bog Myrtle"
- `bracken-pteridium-aquilinum`: kynes-plants, under "Bracken"
- `broom-cytisus-scoparius`: kynes-plants, under "Broom"
- `camphor-camphora-officinarum`: kynes-plants, under "Camphor"
- `campion-silene`: kynes-plants, under "Campion"
- `cardamom-elettaria-cardamomum`: kynes-plants, under "Cardamom"
- `cypress-cupressus-sempervirens`: kynes-plants, under "Cypress"
- `eucalyptus-eucalyptus-globulus`: kynes-plants, under "Eucalyptus"
- `fennel-foeniculum-vulgare`: kynes-plants, under "Fennel"
- `forget-me-not-myosotis`: kynes-plants, under "Forget-Me-Not"
- `frankincense-boswellia-sacra`: kynes-plants, under "Frankincense"
- `geranium-pelargonium`: kynes-plants, under "Geranium"
- `groundsel-senecio-vulgaris`: kynes-plants, under "Groundsel"
- `hibiscus-hibiscus`: kynes-plants, under "Hibiscus"
- `holy-basil-ocimum-tenuiflorum`: kynes-plants, under "Basil"
- `ladys-mantle-alchemilla-vulgaris`: kynes-plants, under "Lady's Mantle"
- `lemon-balm-melissa-officinalis`: kynes-plants, under "Lemon Balm"
- `lemongrass-cymbopogon-citratus`: kynes-plants, under "Lemongrass"
- `lilac-syringa-vulgaris`: kynes-plants, under "Lilac"
- `maidenhair-fern-adiantum`: kynes-plants, under "Maidenhair Fern"
- `marjoram-origanum-majorana`: kynes-plants, under "Oregano and Marjoram"
- `moonwort-botrychium`: kynes-plants, under "Moonwort"
- `myrrh-commiphora-myrrha`: kynes-plants, under "Myrrh"
- `nutmeg-myristica-fragrans`: kynes-plants, under "Nutmeg"
- `opoponax-commiphora-guidottii`: kynes-plants, under "Myrrh"
- `orange-citrus-sinensis`: kynes-plants, under "Orange"
- `oregano-origanum-vulgare`: kynes-plants, under "Oregano and Marjoram"
- `orris-iris-germanica`: kynes-plants, under "Iris"
- `pansy-viola-tricolor`: kynes-plants, under "Pansy"
- `parsley-petroselinum-crispum`: kynes-plants, under "Parsley"
- `peppermint-mentha-piperita`: kynes-plants, under "Mint"
- `pine-pinus-spp`: kynes-plants, under "Pine"
- `ploughmans-spikenard-pentanema-squarrosum`: kynes-plants, under "Spikenard"
- `primrose-primula-vulgaris`: kynes-plants, under "Primrose"
- `rosemary-salvia-rosmarinus`: kynes-plants, under "Rosemary"
- `sage-salvia-officinalis`: kynes-plants, under "Sage"
- `skullcap-scutellaria`: kynes-plants, under "Skullcap"
- `solomons-seal-polygonatum-multiflorum`: kynes-plants, under "Solomon's Seal"
- `summer-savory-satureja-hortensis`: kynes-plants, under "Savory"
- `vanilla-vanilla-planifolia`: kynes-plants, under "Vanilla"
- `water-mint-mentha-aquatica`: kynes-plants, under "Mint"
- `yellow-flag-iris-pseudacorus`: kynes-plants, under "Iris"

### Happiness

72 entries.

- `ague-root-aletris-farinosa`: kynes-plants, under "Unicorn Root"
- `alkanet-alkanna-tinctoria`: kynes-plants, under "Alkanet"
- `almond-prunus-amygdalus`: kynes-plants, under "Almond"
- `amethyst-quartz-var-amethyst`: cunningham-crystals, pp. 71–73
- `apple-malus-domestica`: kynes-plants, under "Apple"
- `apricot-prunus-armeniaca`: kynes-plants, under "Apricot"
- `bamboo-bambusa-vulgaris`: kynes-plants, under "Bamboo"
- `basil-ocimum-basilicum`: kynes-plants, under "Basil"
- `bitter-orange-citrus-aurantium`: kynes-plants, under "Orange"
- `blackberry-rubus-subg-rubus`: kynes-plants, under "Blackberry"
- `borage-borago-officinalis`: kynes-plants, under "Borage"
- `box-buxus-sempervirens`: kynes-plants, under "Boxwood"
- `buttercup-ranunculus-acris`: kynes-plants, under "Buttercup"
- `catnip-nepeta-cataria`: cunningham-herbs, under "Catnip"; kynes-plants, under "Catnip"
- `cherry-prunus-avium`: kynes-plants, under "Cherry"
- `chervil-anthriscus-cerefolium`: kynes-plants, under "Chervil"
- `chrysanthemum-chrysanthemum-morifolium`: kynes-plants, under "Chrysanthemum"
- `chrysoprase-quartz-var-chrysoprase`: cunningham-crystals, p. 83
- `clove-syzygium-aromaticum`: kynes-plants, under "Clove"
- `cornflower-centaurea-cyanus`: kynes-plants, under "Cornflower"
- `couch-grass-elymus-repens`: cunningham-herbs, under "Witch Grass"; p. 266; kynes-plants, under "Grass"; cunningham-herbs, under "Witch Grass"
- `crocus-crocus`: kynes-plants, under "Crocus"
- `cyclamen-cyclamen`: cunningham-herbs, under "Cyclamen"; p. 266; kynes-plants, under "Cyclamen"; cunningham-herbs, under "Cyclamen"
- `elecampane-inula-helenium`: kynes-plants, under "Elecampane"
- `eyebright-euphrasia-officinalis`: kynes-plants, under "Eyebright"
- `fairy-ring-mushroom-marasmius-oreades`: kynes-plants, under "Mushroom"
- `figwort-scrophularia-nodosa`: kynes-plants, under "Figwort"
- `fir-abies`: kynes-plants, under "Fir"
- `frankincense-boswellia-sacra`: kynes-plants, under "Frankincense"
- `grape-vitis-vinifera`: kynes-plants, under "Grape"
- `greater-celandine-chelidonium-majus`: cunningham-herbs, under "Celandine"; kynes-plants, under "Celandine"
- `hawthorn-crataegus`: cunningham-herbs, under "Hawthorn"; p. 266; kynes-plants, under "Hawthorn"; cunningham-herbs, under "Hawthorn"
- `henna-lawsonia-inermis`: kynes-plants, under "Henna"
- `hibiscus-hibiscus`: kynes-plants, under "Hibiscus"
- `high-john-the-conqueror-ipomoea-purga`: kynes-plants, under "High John"
- `hollyhock-alcea-rosea`: kynes-plants, under "Hollyhock"
- `holy-basil-ocimum-tenuiflorum`: kynes-plants, under "Basil"
- `honesty-lunaria-annua`: kynes-plants, under "Honesty"
- `hyacinth-hyacinthus-orientalis`: cunningham-herbs, under "Hyacinth"; kynes-plants, under "Hyacinth"
- `juniper-juniperus-communis`: kynes-plants, under "Juniper"
- `ladys-mantle-alchemilla-vulgaris`: kynes-plants, under "Lady's Mantle"
- `lavender-lavandula-angustifolia`: cunningham-herbs, under "Lavender"; p. 266; cunningham-herbs, under "Lavender"
- `lemon-citrus-limon`: kynes-plants, under "Lemon"
- `lesser-celandine-ficaria-verna`: kynes-plants, under "Celandine"
- `lilac-syringa-vulgaris`: kynes-plants, under "Lilac"
- `lily-of-the-valley-convallaria-majalis`: cunningham-herbs, under "Lily of the Valley"; kynes-plants, under "Lily of the Valley"
- `marigold-calendula-officinalis`: kynes-plants, under "Marigold"
- `marjoram-origanum-majorana`: cunningham-herbs, under "Marjoram"; p. 266; kynes-plants, under "Oregano and Marjoram"
- `meadowsweet-filipendula-ulmaria`: cunningham-herbs, under "Meadowsweet"; p. 266; kynes-plants, under "Meadowsweet"
- `mimosa-acacia-dealbata`: kynes-plants, under "Mimosa"
- `morning-glory-ipomoea`: cunningham-herbs, under "Morning Glory"; Part II, "How to Read the Entries"; kynes-plants, under "Morning Glory and Moonflower"; cunningham-herbs, under "Morning Glory"
- `motherwort-leonurus-cardiaca`: kynes-plants, under "Motherwort"
- `mugwort-artemisia-vulgaris`: kynes-plants, under "Mugwort"
- `orange-citrus-sinensis`: kynes-plants, under "Orange"
- `oregano-origanum-vulgare`: kynes-plants, under "Oregano and Marjoram"
- `parsley-petroselinum-crispum`: kynes-plants, under "Parsley"
- `peach-prunus-persica`: kynes-plants, under "Peach and Nectarine"
- `peony-paeonia-officinalis`: kynes-plants, under "Peony"
- `pine-pinus-spp`: kynes-plants, under "Pine"
- `puffball-lycoperdon-perlatum`: kynes-plants, under "Mushroom"
- `purslane-portulaca-oleracea`: cunningham-herbs, under "Purslane"
- `quince-cydonia-oblonga`: cunningham-herbs, under "Quince"
- `saffron-crocus-sativus`: cunningham-herbs, under "Saffron"; p. 266; kynes-plants, under "Crocus"
- `snowdrop-galanthus-nivalis`: kynes-plants, under "Snowdrop"
- `st-johns-wort-hypericum-perforatum`: cunningham-herbs, under "St. John’s Wort"; p. 266; kynes-plants, under "St. John’s Wort"; cunningham-herbs, under "St. John’s Wort"
- `star-anise-illicium-verum`: kynes-plants, under "Star Anise"
- `summer-savory-satureja-hortensis`: kynes-plants, under "Savory"
- `sunflower-helianthus-annuus`: kynes-plants, under "Sunflower"
- `tulip-tulipa`: kynes-plants, under "Tulip"
- `vanilla-vanilla-planifolia`: kynes-plants, under "Vanilla"
- `water-lily-nymphaea-alba`: kynes-plants, under "Water Lily"
- `wood-sorrel-oxalis-acetosella`: kynes-plants, under "Wood Sorrel"

### Security

31 entries.

- `ague-root-aletris-farinosa`: kynes-plants, under "Unicorn Root"
- `aloe-aloe-vera`: kynes-plants, under "Aloe"
- `apple-malus-domestica`: kynes-plants, under "Apple"
- `arnica-arnica-montana`: kynes-plants, under "Arnica"
- `bay-laurel-laurus-nobilis`: kynes-plants, under "Bay"
- `borage-borago-officinalis`: kynes-plants, under "Borage"
- `comfrey-symphytum-officinale`: kynes-plants, under "Comfrey"
- `coriander-coriandrum-sativum`: kynes-plants, under "Coriander"
- `daffodil-narcissus`: kynes-plants, under "Daffodil"
- `dragons-blood-calamus-draco`: kynes-plants, under "Dragon's Blood"
- `eucalyptus-eucalyptus-globulus`: kynes-plants, under "Eucalyptus"
- `evening-primrose-oenothera-biennis`: kynes-plants, under "Evening Primrose"
- `fennel-foeniculum-vulgare`: kynes-plants, under "Fennel"
- `geranium-pelargonium`: kynes-plants, under "Geranium"
- `hickory-carya`: kynes-plants, under "Hickory and Pecan"
- `ivy-hedera-helix`: kynes-plants, under "Ivy"
- `maidenhair-fern-adiantum`: kynes-plants, under "Maidenhair Fern"
- `marjoram-origanum-majorana`: kynes-plants, under "Oregano and Marjoram"
- `mayapple-podophyllum-peltatum`: kynes-plants, under "Mayapple"
- `meadowsweet-filipendula-ulmaria`: kynes-plants, under "Meadowsweet"
- `mimosa-acacia-dealbata`: kynes-plants, under "Mimosa"
- `moonwort-botrychium`: kynes-plants, under "Moonwort"
- `morning-glory-ipomoea`: kynes-plants, under "Morning Glory and Moonflower"
- `mullein-verbascum-thapsus`: kynes-plants, under "Mullein"
- `oregano-origanum-vulgare`: kynes-plants, under "Oregano and Marjoram"
- `pecan-carya-illinoinensis`: kynes-plants, under "Hickory and Pecan"
- `periwinkle-vinca-minor`: kynes-plants, under "Periwinkle"
- `raspberry-rubus-idaeus`: kynes-plants, under "Raspberry"
- `spruce-picea`: kynes-plants, under "Spruce"
- `st-johns-wort-hypericum-perforatum`: kynes-plants, under "St. John’s Wort"
- `stinging-nettle-urtica-dioica`: kynes-plants, under "Nettle"

### Wishes

41 entries.

- `american-ginseng-panax-quinquefolius`: cunningham-herbs, under "Ginseng, American"; kynes-plants, under "Ginseng"
- `asian-ginseng-panax-ginseng`: kynes-plants, under "Ginseng"
- `bamboo-bambusa-vulgaris`: cunningham-herbs, under "Bamboo"; p. 266; kynes-plants, under "Bamboo"; cunningham-herbs, under "Bamboo"
- `bay-laurel-laurus-nobilis`: kynes-plants, under "Bay"
- `beech-fagus-sylvatica`: cunningham-herbs, under "Beech"; kynes-plants, under "Beech"; cunningham-herbs, under "Beech"; p. 266
- `black-walnut-juglans-nigra`: kynes-plants, under "Walnut"
- `blessed-thistle-centaurea-benedicta`: kynes-plants, under "Thistle"
- `buckthorn-rhamnus-cathartica`: cunningham-herbs, under "Buckthorn"; kynes-plants, under "Buckthorn"
- `camellia-camellia-japonica`: kynes-plants, under "Camellia"
- `cassia-cinnamomum-cassia`: kynes-plants, under "Cinnamon"
- `chestnut-castanea-sativa`: kynes-plants, under "Chestnut"
- `cinnamon-cinnamomum-verum`: kynes-plants, under "Cinnamon"
- `couch-grass-elymus-repens`: kynes-plants, under "Grass"
- `dandelion-taraxacum-officinale`: cunningham-herbs, under "Dandelion"; kynes-plants, under "Dandelion"; cunningham-herbs, under "Dandelion"; p. 266
- `dogwood-cornus-florida`: cunningham-herbs, under "Dogwood"; p. 266; kynes-plants, under "Dogwood"; cunningham-herbs, under "Dogwood"
- `elm-ulmus-glabra`: kynes-plants, under "Elm"
- `fairy-wand-chamaelirium-luteum`: kynes-plants, under "Fairy Wand"
- `grains-of-paradise-aframomum-melegueta`: cunningham-herbs, under "Grains of Paradise"; p. 266; cunningham-herbs, under "Grains of Paradise"
- `hawthorn-crataegus`: kynes-plants, under "Hawthorn"
- `hazel-corylus`: cunningham-herbs, under "Hazel"; p. 266; cunningham-herbs, under "Hazel"
- `hickory-carya`: kynes-plants, under "Hickory and Pecan"
- `horehound-marrubium-vulgare`: kynes-plants, under "Horehound"
- `horse-chestnut-aesculus-hippocastanum`: kynes-plants, under "Chestnut"
- `jobs-tears-coix-lacryma-jobi`: cunningham-herbs, under "Job’s Tears"
- `juniper-juniperus-communis`: kynes-plants, under "Juniper"
- `milk-thistle-silybum-marianum`: kynes-plants, under "Thistle"
- `pea-lathyrus-oleraceus`: kynes-plants, under "Pea"
- `peach-prunus-persica`: cunningham-herbs, under "Peach"; p. 266; kynes-plants, under "Peach and Nectarine"; cunningham-herbs, under "Peach"
- `pear-pyrus-communis`: kynes-plants, under "Pear"
- `pecan-carya-illinoinensis`: kynes-plants, under "Hickory and Pecan"
- `pomegranate-punica-granatum`: cunningham-herbs, under "Pomegranate"; p. 266; kynes-plants, under "Pomegranate"; cunningham-herbs, under "Pomegranate"
- `purple-loosestrife-lythrum-salicaria`: kynes-plants, under "Loosestrife"
- `sage-salvia-officinalis`: cunningham-herbs, under "Sage"; p. 266; kynes-plants, under "Sage"; cunningham-herbs, under "Sage"
- `sandalwood-santalum-album`: cunningham-herbs, under "Sandalwood, White"; kynes-plants, under "Sandalwood"
- `snowdrop-galanthus-nivalis`: kynes-plants, under "Snowdrop"
- `sunflower-helianthus-annuus`: cunningham-herbs, under "Sunflower"; kynes-plants, under "Sunflower"
- `thistle-carduus`: kynes-plants, under "Thistle"
- `tonka-bean-dipteryx-odorata`: cunningham-herbs, under "Tonka"; p. 266; kynes-plants, under "Tonka Bean"
- `violet-viola-odorata`: cunningham-herbs, under "Violet"
- `walnut-juglans-regia`: cunningham-herbs, under "Walnut"; p. 266; cunningham-herbs, under "Walnut"
- `wood-anemone-anemonoides-nemorosa`: kynes-plants, under "Anemone"

### Trust

22 entries.

- `barley-hordeum-vulgare`: kynes-plants, under "Grain"
- `basil-ocimum-basilicum`: kynes-plants, under "Basil"
- `blessed-thistle-centaurea-benedicta`: kynes-plants, under "Thistle"
- `bracken-pteridium-aquilinum`: kynes-plants, under "Bracken"
- `camellia-camellia-japonica`: kynes-plants, under "Camellia"
- `columbine-aquilegia`: kynes-plants, under "Columbine"
- `cowslip-primula-veris`: kynes-plants, under "Cowslip"
- `heather-calluna-vulgaris`: kynes-plants, under "Heather and Heath"
- `holy-basil-ocimum-tenuiflorum`: kynes-plants, under "Basil"
- `lemongrass-cymbopogon-citratus`: kynes-plants, under "Lemongrass"
- `maize-zea-mays`: kynes-plants, under "Grain"
- `milk-thistle-silybum-marianum`: kynes-plants, under "Thistle"
- `oats-avena-sativa`: kynes-plants, under "Grain"
- `pennyroyal-mentha-pulegium`: kynes-plants, under "Pennyroyal"
- `peppermint-mentha-piperita`: kynes-plants, under "Mint"
- `raspberry-rubus-idaeus`: kynes-plants, under "Raspberry"
- `rice-oryza-sativa`: kynes-plants, under "Grain"
- `rose-rosa`: kynes-plants, under "Rose"
- `rye-secale-cereale`: kynes-plants, under "Grain"
- `snowdrop-galanthus-nivalis`: kynes-plants, under "Snowdrop"
- `thistle-carduus`: kynes-plants, under "Thistle"
- `water-mint-mentha-aquatica`: kynes-plants, under "Mint"

### Rain Magic

6 entries.

- `bracken-pteridium-aquilinum`: cunningham-herbs, under "Bracken"; p. 266; cunningham-herbs, under "Bracken"
- `cotton-gossypium-barbadense`: cunningham-herbs, under "Cotton" [prints "rain"]; cunningham-herbs, under "Cotton"; p. 266 [prints "rain"]
- `fern-polypodiopsida`: cunningham-herbs, under "Fern" [prints "rain-making"]
- `heather-calluna-vulgaris`: cunningham-herbs, under "Heather" [prints "rain-making"]; cunningham-herbs, under "Heather"; p. 266 [prints "rain-making"]
- `pansy-viola-tricolor`: cunningham-herbs, under "Pansy"
- `rice-oryza-sativa`: cunningham-herbs, under "Rice"; p. 266 [prints "rain"]

### Employment

2 entries.

- `devils-shoestring`: cunningham-herbs, under "Devil's Shoestring"
- `pecan-carya-illinoinensis`: cunningham-herbs, under "Pecan"

### Awareness

58 entries.

- `almond-prunus-amygdalus`: kynes-plants, under "Almond"
- `anise-pimpinella-anisum`: kynes-plants, under "Anise"
- `ash-fraxinus-excelsior`: kynes-plants, under "Ash"
- `babul-acacia-vachellia-nilotica`: kynes-plants, under "Acacia"
- `bearberry-arctostaphylos-uva-ursi`: kynes-plants, under "Uva Ursi"
- `benzoin-styrax-benzoin`: kynes-plants, under "Benzoin"
- `blackberry-rubus-subg-rubus`: kynes-plants, under "Blackberry"
- `bladderwrack-fucus-vesiculosus`: kynes-plants, under "Seaweed"
- `bodhi-tree-ficus-religiosa`: kynes-plants, under "Bodhi"
- `borage-borago-officinalis`: kynes-plants, under "Borage"
- `butterwort-pinguicula-vulgaris`: kynes-plants, under "Butterwort"
- `camellia-camellia-japonica`: kynes-plants, under "Camellia"
- `carnation-dianthus-caryophyllus`: kynes-plants, under "Carnation"
- `cassia-cinnamomum-cassia`: kynes-plants, under "Cinnamon"
- `catnip-nepeta-cataria`: kynes-plants, under "Catnip"
- `celery-apium-graveolens`: kynes-plants, under "Celery"
- `cherry-prunus-avium`: kynes-plants, under "Cherry"
- `cinnamon-cinnamomum-verum`: kynes-plants, under "Cinnamon"
- `cypress-cupressus-sempervirens`: kynes-plants, under "Cypress"
- `daisy-bellis-perennis`: kynes-plants, under "Daisy"
- `dandelion-taraxacum-officinale`: kynes-plants, under "Dandelion"
- `deers-tongue-carphephorus-odoratissimus`: kynes-plants, under "Deer's Tongue"
- `fairy-ring-mushroom-marasmius-oreades`: kynes-plants, under "Mushroom"
- `fir-abies`: kynes-plants, under "Fir"
- `flax-linum-usitatissimum`: kynes-plants, under "Flax"
- `fly-agaric-amanita-muscaria`: kynes-plants, under "Fly Agaric"
- `forget-me-not-myosotis`: kynes-plants, under "Forget-Me-Not"
- `foxglove-digitalis-purpurea`: kynes-plants, under "Foxglove"
- `frankincense-boswellia-sacra`: kynes-plants, under "Frankincense"
- `galangal-alpinia-officinarum`: kynes-plants, under "Galangal"
- `hazel-corylus`: kynes-plants, under "Hazel"
- `heather-calluna-vulgaris`: kynes-plants, under "Heather and Heath"
- `heliotrope-heliotropium-europaeum`: kynes-plants, under "Heliotrope"
- `hemp-cannabis-sativa`: kynes-plants, under "Hemp"
- `henbane-hyoscyamus-niger`: kynes-plants, under "Henbane"
- `ladys-mantle-alchemilla-vulgaris`: kynes-plants, under "Lady's Mantle"
- `ladys-slipper-cypripedium-parviflorum`: kynes-plants, under "Lady's Slipper"
- `larkspur-consolida-regalis`: kynes-plants, under "Larkspur"
- `lavender-lavandula-angustifolia`: kynes-plants, under "Lavender"
- `lemon-citrus-limon`: kynes-plants, under "Lemon"
- `lotus-nelumbo-nucifera`: kynes-plants, under "Lotus"
- `mimosa-acacia-dealbata`: kynes-plants, under "Mimosa"
- `morning-glory-ipomoea`: kynes-plants, under "Morning Glory and Moonflower"
- `mugwort-artemisia-vulgaris`: kynes-plants, under "Mugwort"
- `mullein-verbascum-thapsus`: kynes-plants, under "Mullein"
- `myrrh-commiphora-myrrha`: kynes-plants, under "Myrrh"
- `nutmeg-myristica-fragrans`: kynes-plants, under "Nutmeg"
- `oak-quercus`: kynes-plants, under "Oak"
- `opoponax-commiphora-guidottii`: kynes-plants, under "Myrrh"
- `ox-eye-daisy-leucanthemum-vulgare`: kynes-plants, under "Daisy"
- `periwinkle-vinca-minor`: kynes-plants, under "Periwinkle"
- `puffball-lycoperdon-perlatum`: kynes-plants, under "Mushroom"
- `sandalwood-santalum-album`: kynes-plants, under "Sandalwood"
- `star-anise-illicium-verum`: kynes-plants, under "Star Anise"
- `thyme-thymus-vulgaris`: kynes-plants, under "Thyme"
- `wild-thyme-thymus-serpyllum`: kynes-plants, under "Thyme"
- `yarrow-achillea-millefolium`: kynes-plants, under "Yarrow"
- `yucca-yucca`: kynes-plants, under "Yucca"

### Determination

36 entries.

- `allspice-pimenta-dioica`: kynes-plants, under "Allspice"
- `apricot-prunus-armeniaca`: kynes-plants, under "Apricot"
- `aspen-populus-tremula`: kynes-plants, under "Aspen"
- `black-locust-robinia-pseudoacacia`: kynes-plants, under "Locust"
- `black-pepper-piper-nigrum`: kynes-plants, under "Pepper"
- `blessed-thistle-centaurea-benedicta`: kynes-plants, under "Thistle"
- `blue-flag-iris-versicolor`: kynes-plants, under "Iris"
- `bog-myrtle-myrica-gale`: kynes-plants, under "Bog Myrtle"
- `broom-cytisus-scoparius`: kynes-plants, under "Broom"
- `butterwort-pinguicula-vulgaris`: kynes-plants, under "Butterwort"
- `cactus-cactaceae`: kynes-plants, under "Cactus"
- `campion-silene`: kynes-plants, under "Campion"
- `cattail-typha`: kynes-plants, under "Cattail"
- `dragons-blood-calamus-draco`: kynes-plants, under "Dragon's Blood"
- `edelweiss-leontopodium-nivale`: kynes-plants, under "Edelweiss"
- `elm-ulmus-glabra`: kynes-plants, under "Elm"
- `eucalyptus-eucalyptus-globulus`: kynes-plants, under "Eucalyptus"
- `gorse-ulex-europaeus`: kynes-plants, under "Gorse"
- `honey-locust-gleditsia-triacanthos`: kynes-plants, under "Locust"
- `hops-humulus-lupulus`: kynes-plants, under "Hop"
- `knapweed-centaurea-nigra`: kynes-plants, under "Knapweed"
- `knotgrass-polygonum-aviculare`: kynes-plants, under "Knotgrass"
- `mallow-malva-sylvestris`: kynes-plants, under "Mallow"
- `marshmallow-althaea-officinalis`: kynes-plants, under "Mallow"
- `mesquite-neltuma-juliflora`: kynes-plants, under "Mesquite"
- `milk-thistle-silybum-marianum`: kynes-plants, under "Thistle"
- `mimosa-acacia-dealbata`: kynes-plants, under "Mimosa"
- `oak-quercus`: kynes-plants, under "Oak"
- `orris-iris-germanica`: kynes-plants, under "Iris"
- `plantain-plantago-spp`: kynes-plants, under "Plantain"
- `snowdrop-galanthus-nivalis`: kynes-plants, under "Snowdrop"
- `sunflower-helianthus-annuus`: kynes-plants, under "Sunflower"
- `thistle-carduus`: kynes-plants, under "Thistle"
- `white-deadnettle-lamium-album`: kynes-plants, under "Deadnettle"
- `wood-anemone-anemonoides-nemorosa`: kynes-plants, under "Anemone"
- `yellow-flag-iris-pseudacorus`: kynes-plants, under "Iris"

### Snake Repelling

1 entry.

- `plantain-plantago-spp`: cunningham-herbs, under "Plantain"

### Changing Sex

1 entry.

- `persimmon-diospyros-virginiana`: cunningham-herbs, under "Persimmon"

### Image Magic

1 entry.

- `potato-solanum-tuberosum`: cunningham-herbs, under "Potato"; p. 266; cunningham-herbs, under "Potato"

### Flying

1 entry.

- `basil-ocimum-basilicum`: cunningham-herbs, under "Basil"; p. 266; cunningham-herbs, under "Basil"

### Past-Life Work

12 entries.

- `camphor-camphora-officinarum`: kynes-plants, under "Camphor"
- `cyclamen-cyclamen`: kynes-plants, under "Cyclamen"
- `cypress-cupressus-sempervirens`: kynes-plants, under "Cypress"
- `eucalyptus-eucalyptus-globulus`: kynes-plants, under "Eucalyptus"
- `frankincense-boswellia-sacra`: kynes-plants, under "Frankincense"
- `hazel-corylus`: kynes-plants, under "Hazel"
- `lemon-balm-melissa-officinalis`: kynes-plants, under "Lemon Balm"
- `lilac-syringa-vulgaris`: kynes-plants, under "Lilac"
- `myrrh-commiphora-myrrha`: kynes-plants, under "Myrrh"
- `opoponax-commiphora-guidottii`: kynes-plants, under "Myrrh"
- `poplar-populus-nigra`: kynes-plants, under "Poplar"
- `sandalwood-santalum-album`: kynes-plants, under "Sandalwood"

### Loss/Sorrow

27 entries.

- `aloe-aloe-vera`: kynes-plants, under "Aloe"
- `amaranth-amaranthus-hypochondriacus`: kynes-plants, under "Amaranth"
- `borage-borago-officinalis`: kynes-plants, under "Borage"
- `chervil-anthriscus-cerefolium`: kynes-plants, under "Chervil"
- `chrysanthemum-chrysanthemum-morifolium`: kynes-plants, under "Chrysanthemum"
- `cypress-cupressus-sempervirens`: kynes-plants, under "Cypress"
- `eucalyptus-eucalyptus-globulus`: kynes-plants, under "Eucalyptus"
- `fairy-wand-chamaelirium-luteum`: kynes-plants, under "Fairy Wand"
- `forget-me-not-myosotis`: kynes-plants, under "Forget-Me-Not"
- `goldenrod-solidago`: kynes-plants, under "Goldenrod"
- `harebell-campanula-rotundifolia`: kynes-plants, under "Harebell"
- `hyacinth-hyacinthus-orientalis`: kynes-plants, under "Hyacinth"
- `knotgrass-polygonum-aviculare`: kynes-plants, under "Knotgrass"
- `maple-acer`: kynes-plants, under "Maple"
- `morning-glory-ipomoea`: kynes-plants, under "Morning Glory and Moonflower"
- `pansy-viola-tricolor`: kynes-plants, under "Pansy"
- `peony-paeonia-officinalis`: kynes-plants, under "Peony"
- `pomegranate-punica-granatum`: kynes-plants, under "Pomegranate"
- `poplar-populus-nigra`: kynes-plants, under "Poplar"
- `primrose-primula-vulgaris`: kynes-plants, under "Primrose"
- `sage-salvia-officinalis`: kynes-plants, under "Sage"
- `snowdrop-galanthus-nivalis`: kynes-plants, under "Snowdrop"
- `willow-salix-alba`: kynes-plants, under "Willow"
- `witch-hazel-hamamelis-virginiana`: kynes-plants, under "Witch Hazel"
- `wood-anemone-anemonoides-nemorosa`: kynes-plants, under "Anemone"
- `wood-betony-betonica-officinalis`: kynes-plants, under "Betony"
- `yew-taxus-baccata`: kynes-plants, under "Yew"

### Renewal

52 entries.

- `alder-alnus-glutinosa`: kynes-plants, under "Alder"
- `almond-prunus-amygdalus`: kynes-plants, under "Almond"
- `american-bittersweet-celastrus-scandens`: kynes-plants, under "Bittersweet"
- `angelica-angelica-archangelica`: kynes-plants, under "Angelica"
- `apple-malus-domestica`: kynes-plants, under "Apple"
- `apricot-prunus-armeniaca`: kynes-plants, under "Apricot"
- `aspen-populus-tremula`: kynes-plants, under "Aspen"
- `barley-hordeum-vulgare`: kynes-plants, under "Grain"
- `beech-fagus-sylvatica`: kynes-plants, under "Beech"
- `birch-betula-pendula`: kynes-plants, under "Birch"
- `bittersweet-nightshade-solanum-dulcamara`: kynes-plants, under "Bittersweet"
- `black-pepper-piper-nigrum`: kynes-plants, under "Pepper"
- `box-buxus-sempervirens`: kynes-plants, under "Boxwood"
- `carnation-dianthus-caryophyllus`: kynes-plants, under "Carnation"
- `cherry-prunus-avium`: kynes-plants, under "Cherry"
- `chervil-anthriscus-cerefolium`: kynes-plants, under "Chervil"
- `corn-poppy-papaver-rhoeas`: kynes-plants, under "Poppy"
- `cumin-cuminum-cyminum`: kynes-plants, under "Cumin"
- `cypress-cupressus-sempervirens`: kynes-plants, under "Cypress"
- `daffodil-narcissus`: kynes-plants, under "Daffodil"
- `elm-ulmus-glabra`: kynes-plants, under "Elm"
- `english-bluebell-hyacinthoides-non-scripta`: kynes-plants, under "Bluebell"
- `fennel-foeniculum-vulgare`: kynes-plants, under "Fennel"
- `fir-abies`: kynes-plants, under "Fir"
- `flax-linum-usitatissimum`: kynes-plants, under "Flax"
- `fly-agaric-amanita-muscaria`: kynes-plants, under "Fly Agaric"
- `gorse-ulex-europaeus`: kynes-plants, under "Gorse"
- `hickory-carya`: kynes-plants, under "Hickory and Pecan"
- `holly-ilex-aquifolium`: kynes-plants, under "Holly"
- `ivy-hedera-helix`: kynes-plants, under "Ivy"
- `lemon-balm-melissa-officinalis`: kynes-plants, under "Lemon Balm"
- `maize-zea-mays`: kynes-plants, under "Grain"
- `marsh-marigold-caltha-palustris`: kynes-plants, under "Marsh Marigold"
- `mimosa-acacia-dealbata`: kynes-plants, under "Mimosa"
- `mistletoe-viscum-album`: kynes-plants, under "Mistletoe"
- `oats-avena-sativa`: kynes-plants, under "Grain"
- `opium-poppy-papaver-somniferum`: kynes-plants, under "Poppy"
- `pansy-viola-tricolor`: kynes-plants, under "Pansy"
- `parsley-petroselinum-crispum`: kynes-plants, under "Parsley"
- `peach-prunus-persica`: kynes-plants, under "Peach and Nectarine"
- `pecan-carya-illinoinensis`: kynes-plants, under "Hickory and Pecan"
- `pomegranate-punica-granatum`: kynes-plants, under "Pomegranate"
- `poplar-populus-nigra`: kynes-plants, under "Poplar"
- `rice-oryza-sativa`: kynes-plants, under "Grain"
- `rye-secale-cereale`: kynes-plants, under "Grain"
- `southernwood-artemisia-abrotanum`: kynes-plants, under "Southernwood"
- `spruce-picea`: kynes-plants, under "Spruce"
- `st-johns-wort-hypericum-perforatum`: kynes-plants, under "St. John’s Wort"
- `thyme-thymus-vulgaris`: kynes-plants, under "Thyme"
- `wild-thyme-thymus-serpyllum`: kynes-plants, under "Thyme"
- `wormwood-artemisia-absinthium`: kynes-plants, under "Wormwood"
- `zedoary-curcuma-zedoaria`: kynes-plants, under "Zedoary"

### Relationships

40 entries.

- `allspice-pimenta-dioica`: kynes-plants, under "Allspice"
- `amaranth-amaranthus-hypochondriacus`: kynes-plants, under "Amaranth"
- `apple-malus-domestica`: kynes-plants, under "Apple"
- `apricot-prunus-armeniaca`: kynes-plants, under "Apricot"
- `babul-acacia-vachellia-nilotica`: kynes-plants, under "Acacia"
- `bean-phaseolus-vulgaris`: kynes-plants, under "Bean"
- `bog-myrtle-myrica-gale`: kynes-plants, under "Bog Myrtle"
- `caraway-carum-carvi`: kynes-plants, under "Caraway"
- `cardamom-elettaria-cardamomum`: kynes-plants, under "Cardamom"
- `carnation-dianthus-caryophyllus`: kynes-plants, under "Carnation"
- `chickweed-stellaria-media`: kynes-plants, under "Chickweed"
- `cinquefoil-potentilla-reptans`: kynes-plants, under "Cinquefoil"
- `clove-syzygium-aromaticum`: kynes-plants, under "Clove"
- `crocus-crocus`: kynes-plants, under "Crocus"
- `cyclamen-cyclamen`: kynes-plants, under "Cyclamen"
- `daffodil-narcissus`: kynes-plants, under "Daffodil"
- `elecampane-inula-helenium`: kynes-plants, under "Elecampane"
- `forget-me-not-myosotis`: kynes-plants, under "Forget-Me-Not"
- `foxglove-digitalis-purpurea`: kynes-plants, under "Foxglove"
- `geranium-pelargonium`: kynes-plants, under "Geranium"
- `ginger-zingiber-officinale`: kynes-plants, under "Ginger"
- `hawthorn-crataegus`: kynes-plants, under "Hawthorn"
- `jojoba-simmondsia-chinensis`: kynes-plants, under "Jojoba"
- `ladys-mantle-alchemilla-vulgaris`: kynes-plants, under "Lady's Mantle"
- `lavender-lavandula-angustifolia`: kynes-plants, under "Lavender"
- `lemon-balm-melissa-officinalis`: kynes-plants, under "Lemon Balm"
- `lemon-citrus-limon`: kynes-plants, under "Lemon" [prints "relationship"]
- `lovage-levisticum-officinale`: kynes-plants, under "Lovage"
- `marigold-calendula-officinalis`: kynes-plants, under "Marigold"
- `meadowsweet-filipendula-ulmaria`: kynes-plants, under "Meadowsweet"
- `monkshood-aconitum-napellus`: kynes-plants, under "Aconite"
- `passionflower-passiflora-incarnata`: kynes-plants, under "Passionflower"
- `primrose-primula-vulgaris`: kynes-plants, under "Primrose"
- `rue-ruta-graveolens`: kynes-plants, under "Rue"
- `saffron-crocus-sativus`: kynes-plants, under "Crocus"
- `skullcap-scutellaria`: kynes-plants, under "Skullcap"
- `sweet-woodruff-galium-odoratum`: kynes-plants, under "Sweet Woodruff"
- `white-deadnettle-lamium-album`: kynes-plants, under "Deadnettle"
- `wood-anemone-anemonoides-nemorosa`: kynes-plants, under "Anemone"
- `yarrow-achillea-millefolium`: kynes-plants, under "Yarrow"

### Exorcism

43 entries.

- `angelica-angelica-archangelica`: cunningham-herbs, under "Angelica"; p. 266; cunningham-herbs, under "Angelica"
- `asafoetida-ferula-assa-foetida`: cunningham-herbs, under "Asafoetida"; cunningham-herbs, under "Asafoetida"; p. 266
- `avens-geum-urbanum`: cunningham-herbs, under "Avens"; p. 266
- `basil-ocimum-basilicum`: cunningham-herbs, under "Basil"; p. 266; cunningham-herbs, under "Basil"
- `bean-phaseolus-vulgaris`: cunningham-herbs, under "Bean"
- `birch-betula-pendula`: cunningham-herbs, under "Birch"; p. 266; cunningham-herbs, under "Birch"
- `black-pepper-piper-nigrum`: cunningham-herbs, under "Pepper"; p. 266
- `blackthorn-prunus-spinosa`: cunningham-herbs, under "Sloe"; p. 266; cunningham-herbs, under "Sloe"
- `boneset-eupatorium-perfoliatum`: cunningham-herbs, under "Boneset"; p. 266
- `buckthorn-rhamnus-cathartica`: cunningham-herbs, under "Buckthorn"
- `clove-syzygium-aromaticum`: cunningham-herbs, under "Clove"
- `clover-trifolium-pratense`: cunningham-herbs, under "Clover"; p. 266; cunningham-herbs, under "Clover"
- `couch-grass-elymus-repens`: cunningham-herbs, under "Witch Grass"; p. 266; cunningham-herbs, under "Witch Grass"
- `cumin-cuminum-cyminum`: cunningham-herbs, under "Cumin"; p. 266; cunningham-herbs, under "Cumin"
- `devils-bit-scabious-succisa-pratensis`: cunningham-herbs, under "Devil's Bit"
- `dragons-blood-calamus-draco`: cunningham-herbs, under "Dragon's Blood"
- `elder-sambucus`: cunningham-herbs, under "Elder, American"; p. 266; cunningham-herbs, under "Elder, American"
- `fern-polypodiopsida`: cunningham-herbs, under "Fern"
- `fumitory-fumaria-officinalis`: cunningham-herbs, under "Fumitory"
- `garlic-allium-sativum`: cunningham-herbs, under "Garlic"; p. 266; cunningham-herbs, under "Garlic"
- `heliotrope-heliotropium-europaeum`: cunningham-herbs, under "Heliotrope"
- `horehound-marrubium-vulgare`: cunningham-herbs, under "Horehound"
- `horseradish-armoracia-rusticana`: cunningham-herbs, under "Horseradish"
- `juniper-juniperus-communis`: cunningham-herbs, under "Juniper"
- `leek-allium-ampeloprasum`: cunningham-herbs, under "Leek"; p. 266; cunningham-herbs, under "Leek"
- `lilac-syringa-vulgaris`: cunningham-herbs, under "Lilac"; p. 266; cunningham-herbs, under "Lilac"
- `mallow-malva-sylvestris`: cunningham-herbs, under "Mallow"; p. 266; cunningham-herbs, under "Mallow"
- `mint-mentha`: cunningham-herbs, under "Mint"
- `mistletoe-viscum-album`: cunningham-herbs, under "Mistletoe"; p. 266; cunningham-herbs, under "Mistletoe"
- `mullein-verbascum-thapsus`: cunningham-herbs, under "Mullein"; p. 266; cunningham-herbs, under "Mullein"
- `myrrh-commiphora-myrrha`: cunningham-herbs, under "Myrrh"; cunningham-herbs, under "Myrrh"; p. 266
- `onion-allium-cepa`: cunningham-herbs, under "Onion"
- `peach-prunus-persica`: cunningham-herbs, under "Peach"; p. 266; cunningham-herbs, under "Peach"
- `peony-paeonia-officinalis`: cunningham-herbs, under "Peony"
- `pine-pinus-spp`: cunningham-herbs, under "Pine"
- `rosemary-salvia-rosmarinus`: cunningham-herbs, under "Rosemary"; p. 266; cunningham-herbs, under "Rosemary"
- `rue-ruta-graveolens`: cunningham-herbs, under "Rue"; p. 266; cunningham-herbs, under "Rue"
- `sandalwood-santalum-album`: cunningham-herbs, under "Sandalwood, White"
- `solomons-seal-polygonatum-multiflorum`: cunningham-herbs, under "Solomon's Seal"
- `stinging-nettle-urtica-dioica`: cunningham-herbs, under "Nettle"
- `strawberry-tree-arbutus-unedo`: cunningham-herbs, under "Arbutus"
- `tamarisk-tamarix`: cunningham-herbs, under "Tamarisk"
- `yarrow-achillea-millefolium`: cunningham-herbs, under "Yarrow"; p. 266
