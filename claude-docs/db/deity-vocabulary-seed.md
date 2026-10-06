## The deity vocabulary seed (list MB.127; seed MB.129)

The starting list for `deity_traditions` and `deities`
([the model](deity-vocabulary.md)), recorded by MB.127 for MB.129 to seed:
thirty-five traditions and 216 deities, in the order the two tables below give
them. The owner asked for a broad list, 100 to 200, across the practices the
project serves, and that the deities be grouped by tradition; the five
African traditions added on review carried it past 200. The seed parses
both tables at test time, as MB.93's parses DESIGN.md §5's, and checks the
parse itself: thirty-five traditions, 216 deities, every deity's tradition
one of the thirty-five.

The list lives here rather than in DESIGN.md §5, where the planet and zodiac
values are, because 216 rows with their descriptions are data, not
specification: §5 states the model and points here.

**Names are written as their tradition spells them in English**, one spelling
each, and the seed copies them exactly: unlike §5's lower-case planet table,
this one is already cased, and not every word is capitalised (`Manannan mac
Lir`). Every name is plain ASCII, so a slug is the name lower-cased and
hyphenated, and the other spellings a reader might type — _Hekate_, _Freyja_,
_Bast_, _Guanyin_ — are in the description, which the autofill matches
(§5). **A deity is filed under one tradition** even where several honour it:
Apollo is Greek, and his description says Roman too; Lilith is Akkadian and
Babylonian, and hers names Jewish folklore. A practice that wants a second
row, a Roman Apollo, can have one: uniqueness is on the slug, so it needs a
name of its own, as the forms' `wax` does
([the form seed](form-vocabulary-seed.md)).

**A tradition is a people or a religion, never a region**, the owner's call:
Irish, Welsh and Gaulish and British rather than Celtic; Sumerian, Akkadian
and Babylonian, and Canaanite and Phoenician rather than Mesopotamian and
Levantine; Taoist, Chinese Buddhist and Chinese folk rather than Chinese;
Aztec and Maya rather than Mesoamerican; Akan, Igbo, Fon and Ewe, Yoruba,
Kongo and Zulu, each its own, rather than any corner of a continent. A member
reads the tradition a practice actually names, and no living religion is
filed as a region's footnote. The cost is a few traditions of one or two
rows, which is the size of what the sources support, not a reason to merge
them. Where a tradition's record is thin — the Anglo-Saxon and continental
Germanic goddesses known from Bede, Tacitus and later folklore — the
tradition's description says so.

**A description is a gloss**, as the planets' are: the tradition, what the
deity is god or goddess of, and the other names, because the suggestion query
matches descriptions and a name match outranks a description match. It names
no herb: which plants are sacred to a deity is an ingredient's correspondence,
recorded on the ingredient, not the vocabulary's. Descriptions are pairwise
distinct within each table, and so are names.

### Traditions

| Name                                 | Description                                                                                                                                        |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Greek                                | The gods of ancient Greece: the Olympians, the Titans, the primordial powers, and the heroes and enchantresses honoured as gods.                   |
| Roman                                | The gods of ancient Rome, many identified with Greek counterparts, beside the native Italic powers of field, door and hearth.                      |
| Anatolian                            | The gods of Phrygia and ancient Anatolia, whose Great Mother's cult spread to Greece and Rome.                                                     |
| Egyptian                             | The gods of ancient Egypt, of the Sun, the Nile, the dead and the order of the world.                                                              |
| Sumerian                             | The gods of Sumer, the oldest Mesopotamian record, whose names the later cities carried into their own.                                            |
| Akkadian and Babylonian              | The gods of Akkad, Babylon and Assyria, many of them the Sumerian gods under Akkadian names.                                                       |
| Canaanite and Phoenician             | The gods of Canaan, Ugarit and the Phoenician cities of the Levant.                                                                                |
| Persian                              | The gods of ancient Iran, the yazatas of the Zoroastrian tradition and those before it.                                                            |
| Norse                                | The gods of the Norse, the Aesir and the Vanir, as the Eddas and the sagas record them.                                                            |
| Anglo-Saxon and Continental Germanic | The gods and goddesses of the Anglo-Saxons and the continental Germanic peoples, known from Bede, Tacitus and later folklore.                      |
| Irish                                | The gods of Ireland, the Tuatha De Danann and the figures of Irish literature honoured as gods today.                                              |
| Welsh                                | The gods of Wales, the figures of the Mabinogi and Welsh literature honoured as gods today.                                                        |
| Gaulish and British                  | The gods of Gaul and Roman Britain, known from altars, inscriptions and the Romans who named them.                                                 |
| Slavic                               | The gods of the Slavic peoples and the figures of their folklore.                                                                                  |
| Baltic                               | The gods of the Lithuanians and Latvians, whose old religion lasted longest in Europe.                                                             |
| Finnish                              | The gods and forest spirits of Finnish and Karelian tradition, many named in the Kalevala.                                                         |
| Hindu                                | The gods of Hinduism, from the Vedic hymns to living worship.                                                                                      |
| Taoist                               | The gods and immortals of religious Taoism.                                                                                                        |
| Chinese Buddhist                     | The buddhas and bodhisattvas as Chinese Buddhism honours them, and as folk religion honours them beside it.                                        |
| Chinese folk                         | The gods of Chinese folk religion: culture heroes, city and household gods, and the deified dead.                                                  |
| Japanese                             | The kami of Shinto, and the gods Japanese Buddhism brought with it.                                                                                |
| Akan                                 | The abosom of the Akan peoples of Ghana and Ivory Coast, the Asante, Fante and Bono among them, beneath the sky god Nyame and the earth Asase Yaa. |
| Igbo                                 | The alusi of the Igbo people of south-eastern Nigeria, the spirits the creator Chukwu set over the earth, the sky, the river and the farm.         |
| Fon and Ewe                          | The vodun of the Fon and Ewe peoples of Benin and Togo, the Vodun of the old kingdom of Dahomey from which Haitian Vodou grew.                     |
| Yoruba                               | The orishas of the Yoruba religion and of the traditions it carried to the Americas: Lucumi, Santeria and Candomble.                               |
| Kongo                                | The gods and nature spirits of the Bakongo of central Africa, whose religion also underlies Palo in Cuba.                                          |
| Zulu                                 | The gods and the Lord of the Sky of the Zulu people of southern Africa, honoured beside the ancestral shades.                                      |
| Haitian Vodou                        | The lwa of Haitian Vodou, grown from the vodun of Dahomey and the religions of the Kongo and the Yoruba.                                           |
| Aztec                                | The gods of the Mexica and the Nahua peoples of central Mexico.                                                                                    |
| Maya                                 | The gods of the Maya peoples of Yucatan, Guatemala and the highlands.                                                                              |
| Inca                                 | The gods of the Inca and of the Quechua and Aymara peoples of the Andes, honoured there still.                                                     |
| Hawaiian                             | The akua of Hawaiian religion, and their kin across Polynesia.                                                                                     |
| Wicca                                | The god and goddess of Wicca and of the modern pagan witchcraft that grew from it.                                                                 |
| English folklore                     | Figures of English folklore and church carving honoured as gods in modern practice.                                                                |
| Italian folk witchcraft              | Figures of Italian folk witchcraft as Charles Leland recorded it, honoured in Stregheria and modern practice.                                      |

### Deities

| Name             | Tradition                            | Description                                                                                                                                                                                                                                      |
| ---------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Adonis           | Greek                                | Greek god of beauty and desire, who dies and returns with the year's vegetation; Aphrodite's beloved.                                                                                                                                            |
| Aphrodite        | Greek                                | Greek goddess of love, beauty, desire and the sea foam she rose from; Roman Venus.                                                                                                                                                               |
| Apollo           | Greek                                | Greek and Roman god of light, music, poetry, prophecy and healing; Phoebus, lord of the laurel.                                                                                                                                                  |
| Ares             | Greek                                | Greek god of war, courage and raw force; Roman Mars.                                                                                                                                                                                             |
| Artemis          | Greek                                | Greek goddess of the hunt, the wild, childbirth and the Moon, for whom the artemisias are named; Roman Diana.                                                                                                                                    |
| Asclepius        | Greek                                | Greek god of medicine and healing, whose staff bears a serpent; also Asklepios, Roman Aesculapius.                                                                                                                                               |
| Athena           | Greek                                | Greek goddess of wisdom, craft, strategy and the olive; Pallas Athene, Roman Minerva.                                                                                                                                                            |
| Circe            | Greek                                | Greek goddess and enchantress of Aeaea, mistress of herbs and transforming potions.                                                                                                                                                              |
| Demeter          | Greek                                | Greek goddess of grain, harvest and the fertile earth, mother of Persephone; Roman Ceres.                                                                                                                                                        |
| Dionysus         | Greek                                | Greek god of wine, the vine, ivy, ecstasy and theatre; also Dionysos, Roman Bacchus.                                                                                                                                                             |
| Eros             | Greek                                | Greek god of love and desire, son of Aphrodite; Roman Cupid.                                                                                                                                                                                     |
| Gaia             | Greek                                | Greek primordial goddess of the Earth, mother of all; also Gaea, Ge.                                                                                                                                                                             |
| Hades            | Greek                                | Greek god of the underworld, the dead and the riches beneath the earth; Roman Pluto.                                                                                                                                                             |
| Hecate           | Greek                                | Greek goddess of witchcraft, crossroads, keys, the night and the dead; also Hekate, Trivia.                                                                                                                                                      |
| Helios           | Greek                                | Greek god and personification of the Sun, driving its chariot across the sky; Roman Sol.                                                                                                                                                         |
| Hephaestus       | Greek                                | Greek god of the forge, fire, smiths and metalwork; also Hephaistos, Roman Vulcan.                                                                                                                                                               |
| Hera             | Greek                                | Greek queen of the gods, goddess of marriage, women and family; Roman Juno.                                                                                                                                                                      |
| Hermes           | Greek                                | Greek messenger god of travel, trade, thieves and boundaries, guide of souls; Roman Mercury.                                                                                                                                                     |
| Hestia           | Greek                                | Greek goddess of the hearth, the home and its fire; Roman Vesta.                                                                                                                                                                                 |
| Hyacinthus       | Greek                                | Greek divine youth beloved of Apollo, from whose blood the hyacinth sprang, honoured as a hero at Amyclae; also Hyakinthos.                                                                                                                      |
| Hygieia          | Greek                                | Greek goddess of health, cleanliness and the prevention of illness, daughter of Asclepius; also Hygeia, Roman Salus.                                                                                                                             |
| Hypnos           | Greek                                | Greek god of sleep, crowned with poppies; Roman Somnus.                                                                                                                                                                                          |
| Iris             | Greek                                | Greek goddess of the rainbow and messenger of the gods, for whom the iris flower is named.                                                                                                                                                       |
| Nyx              | Greek                                | Greek primordial goddess of the night, mother of sleep and death; Roman Nox.                                                                                                                                                                     |
| Pan              | Greek                                | Greek goat-legged god of the wild, shepherds, flocks and rustic music; Roman Faunus.                                                                                                                                                             |
| Persephone       | Greek                                | Greek queen of the underworld and maiden of spring, daughter of Demeter, bound by the pomegranate; also Kore, Roman Proserpina.                                                                                                                  |
| Poseidon         | Greek                                | Greek god of the sea, earthquakes and horses; Roman Neptune.                                                                                                                                                                                     |
| Rhea             | Greek                                | Greek Titan mother of the gods, goddess of fertility and the mountain earth, linked with Cybele.                                                                                                                                                 |
| Selene           | Greek                                | Greek goddess and personification of the Moon, driving its chariot by night; Roman Luna.                                                                                                                                                         |
| Zeus             | Greek                                | Greek king of the gods, god of the sky, thunder, justice and the oak; Roman Jupiter.                                                                                                                                                             |
| Bacchus          | Roman                                | Roman god of wine, revelry and the grape harvest; also Liber, Greek Dionysus.                                                                                                                                                                    |
| Cardea           | Roman                                | Roman goddess of hinges, thresholds and the door's guarding, who turns harm away with the hawthorn.                                                                                                                                              |
| Ceres            | Roman                                | Roman goddess of grain, agriculture and the harvest, from whose name comes cereal; Greek Demeter.                                                                                                                                                |
| Cupid            | Roman                                | Roman god of love and desire, with bow and arrows; also Amor, Greek Eros.                                                                                                                                                                        |
| Diana            | Roman                                | Roman goddess of the hunt, woodland, the Moon and childbirth, queen of witches in folk tradition; Greek Artemis.                                                                                                                                 |
| Faunus           | Roman                                | Roman god of forests, fields, flocks and prophecy; Greek Pan.                                                                                                                                                                                    |
| Flora            | Roman                                | Roman goddess of flowers, blossoming plants and spring, honoured at the Floralia.                                                                                                                                                                |
| Fortuna          | Roman                                | Roman goddess of luck, chance and fortune, turning her wheel; Greek Tyche.                                                                                                                                                                       |
| Janus            | Roman                                | Roman two-faced god of doors, gates, beginnings, endings and passages.                                                                                                                                                                           |
| Juno             | Roman                                | Roman queen of the gods, protector of women, marriage and childbirth; Greek Hera.                                                                                                                                                                |
| Jupiter          | Roman                                | Roman king of the gods, god of the sky, thunder, oaths and the oak; also Jove, Greek Zeus.                                                                                                                                                       |
| Mars             | Roman                                | Roman god of war and, earlier, of fields and their guarding; Greek Ares.                                                                                                                                                                         |
| Mercury          | Roman                                | Roman god of messages, commerce, travel and eloquence; Greek Hermes.                                                                                                                                                                             |
| Minerva          | Roman                                | Roman goddess of wisdom, crafts, medicine and strategy; Greek Athena.                                                                                                                                                                            |
| Neptune          | Roman                                | Roman god of the sea and of fresh water; Greek Poseidon.                                                                                                                                                                                         |
| Pluto            | Roman                                | Roman god of the underworld and its wealth; also Dis Pater, Greek Hades.                                                                                                                                                                         |
| Pomona           | Roman                                | Roman goddess of fruit trees, orchards and their tending.                                                                                                                                                                                        |
| Saturn           | Roman                                | Roman god of sowing, agriculture, wealth and time, honoured at the Saturnalia; Greek Cronus.                                                                                                                                                     |
| Silvanus         | Roman                                | Roman god of woods, uncultivated land and the boundaries of fields.                                                                                                                                                                              |
| Venus            | Roman                                | Roman goddess of love, beauty, desire and gardens; Greek Aphrodite.                                                                                                                                                                              |
| Vesta            | Roman                                | Roman goddess of the hearth, its sacred fire and the home, tended by the Vestal Virgins; Greek Hestia.                                                                                                                                           |
| Vulcan           | Roman                                | Roman god of fire, volcanoes and the forge; Greek Hephaestus.                                                                                                                                                                                    |
| Attis            | Anatolian                            | Phrygian god of vegetation, death and rebirth, consort of Cybele, linked with the pine.                                                                                                                                                          |
| Cybele           | Anatolian                            | Phrygian Great Mother of the gods, goddess of mountains, wild nature and fertility; Magna Mater.                                                                                                                                                 |
| Amun             | Egyptian                             | Egyptian king of the gods, the hidden one, joined with the Sun as Amun-Ra; also Amon, Amen.                                                                                                                                                      |
| Anubis           | Egyptian                             | Egyptian jackal-headed god of embalming, cemeteries and the guiding of souls; also Anpu, Inpu.                                                                                                                                                   |
| Bastet           | Egyptian                             | Egyptian cat goddess of the home, protection, joy, women and perfume; also Bast.                                                                                                                                                                 |
| Bes              | Egyptian                             | Egyptian dwarf god guarding households, mothers, children and childbirth against harm.                                                                                                                                                           |
| Geb              | Egyptian                             | Egyptian god of the earth, its crops and what grows from it, husband of Nut.                                                                                                                                                                     |
| Hathor           | Egyptian                             | Egyptian goddess of love, music, dance, joy and motherhood, the cow-horned Lady of the West.                                                                                                                                                     |
| Horus            | Egyptian                             | Egyptian falcon-headed god of the sky and kingship, son of Isis and Osiris; as a child, Harpocrates.                                                                                                                                             |
| Isis             | Egyptian                             | Egyptian goddess of magic, healing, motherhood and the throne, wife of Osiris; also Aset.                                                                                                                                                        |
| Maat             | Egyptian                             | Egyptian goddess of truth, justice, balance and cosmic order, whose feather weighs the heart; also Ma'at.                                                                                                                                        |
| Min              | Egyptian                             | Egyptian god of fertility, the harvest and the desert roads, linked with the lettuce.                                                                                                                                                            |
| Nephthys         | Egyptian                             | Egyptian goddess of mourning, night, the dead and protection, sister of Isis; also Nebet-Het.                                                                                                                                                    |
| Nut              | Egyptian                             | Egyptian goddess of the sky, whose body arches over the earth and swallows the Sun each night.                                                                                                                                                   |
| Osiris           | Egyptian                             | Egyptian god of the dead, the afterlife, resurrection and the grain's rebirth, husband of Isis.                                                                                                                                                  |
| Ptah             | Egyptian                             | Egyptian creator god of craftsmen, builders and artisans, worshipped at Memphis.                                                                                                                                                                 |
| Ra               | Egyptian                             | Egyptian god of the Sun and creation, sailing his barque across the sky; also Re.                                                                                                                                                                |
| Sekhmet          | Egyptian                             | Egyptian lioness goddess of war, plague and healing, the Eye of Ra; also Sakhmet.                                                                                                                                                                |
| Set              | Egyptian                             | Egyptian god of storms, the desert, chaos and foreigners, slayer of Osiris; also Seth, Sutekh.                                                                                                                                                   |
| Thoth            | Egyptian                             | Egyptian ibis-headed god of writing, knowledge, magic, the Moon and the reckoning of time; also Djehuty.                                                                                                                                         |
| Enki             | Sumerian                             | Sumerian god of fresh water, wisdom, craft, magic and healing; Akkadian Ea.                                                                                                                                                                      |
| Ereshkigal       | Sumerian                             | Sumerian queen of the underworld, sister of Inanna, whose realm Akkadian texts call Irkalla.                                                                                                                                                     |
| Inanna           | Sumerian                             | Sumerian goddess of love, war, fertility and the morning and evening star, who descended to the underworld; Queen of Heaven.                                                                                                                     |
| Ishtar           | Akkadian and Babylonian              | Akkadian and Babylonian goddess of love, war, fertility and the evening star, Inanna's Akkadian name.                                                                                                                                            |
| Lilith           | Akkadian and Babylonian              | Akkadian and Babylonian night spirit of storms and childbirth, carried into Jewish folklore and honoured as a goddess in modern practice; also Lilitu.                                                                                           |
| Tammuz           | Akkadian and Babylonian              | Akkadian and Babylonian shepherd god of vegetation and its yearly death, consort of Ishtar; Sumerian Dumuzi, consort of Inanna.                                                                                                                  |
| Anat             | Canaanite and Phoenician             | Canaanite goddess of war and fierce protection, sister and consort of Baal; also Anath.                                                                                                                                                          |
| Asherah          | Canaanite and Phoenician             | Canaanite mother goddess and consort of El, worshipped at sacred trees and poles; also Athirat.                                                                                                                                                  |
| Astarte          | Canaanite and Phoenician             | Phoenician and Canaanite goddess of love, fertility, war and the evening star; also Ashtoreth, Ashtart.                                                                                                                                          |
| Baal             | Canaanite and Phoenician             | Canaanite god of storms, rain and the fertility they bring; also Hadad.                                                                                                                                                                          |
| Anahita          | Persian                              | Persian goddess of the waters, fertility, healing and wisdom; also Aredvi Sura Anahita.                                                                                                                                                          |
| Mithra           | Persian                              | Persian god of covenants, light and the rising sun, and of the Roman mysteries as Mithras.                                                                                                                                                       |
| Baldur           | Norse                                | Norse god of light, beauty and goodness, slain by a mistletoe dart; also Balder, Baldr.                                                                                                                                                          |
| Eir              | Norse                                | Norse goddess of healing and medicine, the physician among the goddesses.                                                                                                                                                                        |
| Freya            | Norse                                | Norse goddess of love, beauty, fertility, war and seidr magic; also Freyja.                                                                                                                                                                      |
| Freyr            | Norse                                | Norse god of fertility, sunshine, rain and the harvest's plenty, brother of Freya; also Frey, Yngvi.                                                                                                                                             |
| Frigg            | Norse                                | Norse queen of the gods, goddess of marriage, the home and foresight, wife of Odin; also Frigga.                                                                                                                                                 |
| Hel              | Norse                                | Norse goddess ruling the realm of the dead that bears her name, daughter of Loki.                                                                                                                                                                |
| Idun             | Norse                                | Norse goddess of youth and spring, keeper of the apples that keep the gods young; also Idunn, Iduna.                                                                                                                                             |
| Loki             | Norse                                | Norse trickster god of cunning, change and fire, father of Hel.                                                                                                                                                                                  |
| Njord            | Norse                                | Norse god of the sea, seafaring, wind and wealth, father of Freya and Freyr; also Njordr.                                                                                                                                                        |
| Odin             | Norse                                | Norse all-father, god of wisdom, poetry, the runes, magic, war and death; also Woden, Wotan.                                                                                                                                                     |
| Sif              | Norse                                | Norse goddess of golden hair, linked with grain and the fertile earth, wife of Thor.                                                                                                                                                             |
| Skadi            | Norse                                | Norse giantess and goddess of winter, mountains, skiing and the hunt.                                                                                                                                                                            |
| Thor             | Norse                                | Norse god of thunder, storms, strength and the protection of people, wielding the hammer Mjolnir; also Donar, Thunor.                                                                                                                            |
| Tyr              | Norse                                | Norse god of law, justice, oaths and war, who gave his hand to bind Fenrir; also Tiw.                                                                                                                                                            |
| Berchta          | Anglo-Saxon and Continental Germanic | Continental Germanic and Alpine goddess of spinning, the Twelve Nights and the household's order; also Perchta, Bertha.                                                                                                                          |
| Eostre           | Anglo-Saxon and Continental Germanic | Anglo-Saxon goddess of spring and the dawn, named by Bede, whom Easter recalls; also Ostara.                                                                                                                                                     |
| Holda            | Anglo-Saxon and Continental Germanic | Continental Germanic goddess of winter, spinning and the hearth, who shakes snow from her featherbed; also Holle, Hulda.                                                                                                                         |
| Nerthus          | Anglo-Saxon and Continental Germanic | Continental Germanic earth goddess of fertility and peace, carried among her people in a wagon, as Tacitus tells.                                                                                                                                |
| Aengus           | Irish                                | Irish god of love, youth and poetic inspiration, son of the Dagda; also Angus, Oengus.                                                                                                                                                           |
| Aine             | Irish                                | Irish goddess of summer, the Sun, wealth and sovereignty, honoured at Knockainey.                                                                                                                                                                |
| Airmed           | Irish                                | Irish goddess of healing and herbalism, who gathered the herbs that grew from her brother Miach's grave; also Airmid.                                                                                                                            |
| Boann            | Irish                                | Irish goddess of the river Boyne, of poetry, fertility and knowledge; also Boand.                                                                                                                                                                |
| Brigid           | Irish                                | Irish goddess of poetry, healing, smithcraft, fire and holy wells, honoured at Imbolc; also Brighid, Brigit, Bride.                                                                                                                              |
| Dagda            | Irish                                | Irish father god of plenty, the seasons, life and death, with his cauldron and club; the Good God.                                                                                                                                               |
| Danu             | Irish                                | Irish mother goddess of the Tuatha De Danann; also Anu, Dana.                                                                                                                                                                                    |
| Dian Cecht       | Irish                                | Irish god of healing and physician to the Tuatha De Danann, father of Airmed; also Diancecht.                                                                                                                                                    |
| Lugh             | Irish                                | Irish god of skill in every art, light, the harvest and oaths, honoured at Lughnasadh; Welsh Lleu, Gaulish Lugus.                                                                                                                                |
| Manannan mac Lir | Irish                                | Irish god of the sea, mists and the Otherworld and its crossings, son of Lir; Manx Mannan.                                                                                                                                                       |
| Morrigan         | Irish                                | Irish goddess of war, fate, sovereignty and prophecy, appearing as a crow; the Morrigan, Morrigu, the Great Queen.                                                                                                                               |
| Ogma             | Irish                                | Irish god of eloquence, strength and writing, said to have made the ogham alphabet; also Oghma.                                                                                                                                                  |
| Arianrhod        | Welsh                                | Welsh goddess of the silver wheel, the stars, fate and the Moon, mother of Lleu.                                                                                                                                                                 |
| Blodeuwedd       | Welsh                                | Welsh woman made of flowers by Math and Gwydion and turned into an owl, honoured as a goddess of flowers and owls.                                                                                                                               |
| Cerridwen        | Welsh                                | Welsh enchantress and goddess of the cauldron, transformation, inspiration and herbal brewing; also Ceridwen, Kerridwen.                                                                                                                         |
| Gwydion          | Welsh                                | Welsh magician god of enchantment, trickery, poetry and learning, son of Don.                                                                                                                                                                    |
| Mabon            | Welsh                                | Welsh divine youth and hunter, son of Modron, rescued from captivity; namesake of the autumn equinox in modern practice.                                                                                                                         |
| Rhiannon         | Welsh                                | Welsh goddess of horses, birds, sovereignty and the Otherworld, whose birds wake the dead and lull the living.                                                                                                                                   |
| Belenus          | Gaulish and British                  | Gaulish and British god of light, the Sun and healing springs; also Belenos, Bel.                                                                                                                                                                |
| Cernunnos        | Gaulish and British                  | Gaulish horned god of animals, the wild, fertility and wealth; also Kernunnos.                                                                                                                                                                   |
| Epona            | Gaulish and British                  | Gaulish goddess of horses, mules and fertility, whose cult Roman soldiers carried across the empire.                                                                                                                                             |
| Sulis            | Gaulish and British                  | British goddess of the hot springs at Bath, of healing and of curses; Sulis Minerva.                                                                                                                                                             |
| Taranis          | Gaulish and British                  | Gaulish god of thunder and the sky, matched with Jupiter by the Romans and read by scholars as the wheel god.                                                                                                                                    |
| Baba Yaga        | Slavic                               | Slavic forest witch of folklore, living in a hut on hen's legs, both devourer and giver of wisdom.                                                                                                                                               |
| Lada             | Slavic                               | Slavic goddess of fertility, marriage and spring, as later folklore has it, her very existence disputed.                                                                                                                                         |
| Mokosh           | Slavic                               | Slavic goddess of women, spinning, moist earth and fertility, the one goddess of Vladimir's pantheon; also Makosh.                                                                                                                               |
| Morana           | Slavic                               | Slavic goddess of winter and death in Polish, Czech and Slovak rite, whose effigy is drowned in spring, and of spring and the waters in Ukrainian; also Marzanna, Morena, Marena.                                                                |
| Perun            | Slavic                               | Slavic god of thunder, lightning, the sky and the oak, foe of Veles.                                                                                                                                                                             |
| Veles            | Slavic                               | Slavic god of the underworld, cattle, wealth, waters and magic; also Volos.                                                                                                                                                                      |
| Laima            | Baltic                               | Latvian and Lithuanian goddess of fate, birth and luck, linked with the linden; also Laime.                                                                                                                                                      |
| Perkunas         | Baltic                               | Lithuanian god of thunder, rain and the oak; Latvian Perkons.                                                                                                                                                                                    |
| Zemyna           | Baltic                               | Lithuanian goddess of the earth and everything that grows from it; also Zemynele.                                                                                                                                                                |
| Mielikki         | Finnish                              | Finnish goddess of forests and the hunt, wife of Tapio; the Forest-mother, Mistress of the woods.                                                                                                                                                |
| Ukko             | Finnish                              | Finnish god of the sky, weather, thunder and the rain the harvest needs.                                                                                                                                                                         |
| Agni             | Hindu                                | Hindu god of fire, the sacrificial flame and the hearth, who carries offerings to the gods.                                                                                                                                                      |
| Dhanvantari      | Hindu                                | Hindu physician of the gods and god of Ayurveda, who rose from the ocean bearing the nectar of immortality.                                                                                                                                      |
| Durga            | Hindu                                | Hindu warrior goddess, the invincible mother, slayer of the buffalo demon Mahishasura.                                                                                                                                                           |
| Ganesha          | Hindu                                | Hindu elephant-headed god of beginnings, wisdom and the removal of obstacles; also Ganapati.                                                                                                                                                     |
| Hanuman          | Hindu                                | Hindu monkey god of devotion, strength and courage, who carried a mountain of healing herbs.                                                                                                                                                     |
| Kali             | Hindu                                | Hindu goddess of time, death, destruction and liberation, the dark mother.                                                                                                                                                                       |
| Krishna          | Hindu                                | Hindu god of love, compassion and divine play, an avatar of Vishnu.                                                                                                                                                                              |
| Lakshmi          | Hindu                                | Hindu goddess of wealth, fortune, prosperity and beauty, wife of Vishnu, honoured at Diwali; also Laxmi.                                                                                                                                         |
| Parvati          | Hindu                                | Hindu goddess of devotion, fertility, marriage and power, wife of Shiva.                                                                                                                                                                         |
| Saraswati        | Hindu                                | Hindu goddess of knowledge, music, art, speech and learning; also Sarasvati.                                                                                                                                                                     |
| Shiva            | Hindu                                | Hindu god of destruction, transformation, yoga and meditation, the auspicious one; also Siva, Mahadeva.                                                                                                                                          |
| Soma             | Hindu                                | Vedic god of the sacred ritual drink pressed from a plant, later identified with the Moon.                                                                                                                                                       |
| Surya            | Hindu                                | Hindu god of the Sun, light and health, riding a chariot drawn by seven horses.                                                                                                                                                                  |
| Vishnu           | Hindu                                | Hindu god who preserves the universe, returning as avatars such as Rama and Krishna.                                                                                                                                                             |
| Xi Wangmu        | Taoist                               | Taoist Queen Mother of the West, goddess of immortality and keeper of the peaches of long life; also Xiwangmu, Hsi Wang Mu.                                                                                                                      |
| Kuan Yin         | Chinese Buddhist                     | Chinese Buddhist bodhisattva of compassion and mercy, honoured as a goddess in folk religion across East Asia; also Guanyin, Kwan Yin, Kannon.                                                                                                   |
| Shennong         | Chinese folk                         | Chinese folk religion's divine farmer, god of agriculture and herbal medicine, said to have tasted hundreds of herbs; the Divine Husbandman, Shen Nong.                                                                                          |
| Amaterasu        | Japanese                             | Japanese Shinto goddess of the Sun and the Plain of High Heaven, ancestor of the imperial line; also Amaterasu Omikami.                                                                                                                          |
| Benzaiten        | Japanese                             | Japanese goddess of water, music, eloquence, wealth and knowledge, come from Saraswati; also Benten.                                                                                                                                             |
| Inari            | Japanese                             | Japanese Shinto deity of rice, grain, agriculture, foxes and prosperity, whose shrines are kept by fox messengers; also Oinari.                                                                                                                  |
| Tsukuyomi        | Japanese                             | Japanese Shinto god of the Moon and the night, brother of Amaterasu; also Tsukiyomi.                                                                                                                                                             |
| Nyame            | Akan                                 | Akan supreme god of the sky, creator of the world and giver of rain and sunshine, born on Saturday; also Onyame, Nyankopon, Onyankopon, Odomankoma.                                                                                              |
| Asase Yaa        | Akan                                 | Akan goddess of the earth, fertility and truth, second only to Nyame, whose Thursday no one tills; also Asase Ya, Asaase Yaa, Aberewa, Mother Earth, Fante Asase Efua.                                                                           |
| Tano             | Akan                                 | Akan obosom of the Tano river and head of the river gods, god of thunder and of war among the Asante, son of Nyame and Asase Yaa; also Ta Kora, Tano Kora, Fante Tando.                                                                          |
| Bia              | Akan                                 | Akan obosom of the Bia river and of the wilderness and barren land, elder twin of Tano.                                                                                                                                                          |
| Bosomtwe         | Akan                                 | Akan obosom of Lake Bosomtwe, son of Nyame and Asase Yaa, honoured in the form of an antelope; also Bosomtwi, Bosumtwi.                                                                                                                          |
| Chukwu           | Igbo                                 | Igbo supreme god and creator, who made the alusi and gives every person a chi; also Chineke, Chi Ukwu, Chukwu Okike, Obasi.                                                                                                                      |
| Ala              | Igbo                                 | Igbo alusi of the earth, fertility, morality and the dead, who holds the ancestors in her womb and judges by custom, honoured in mbari houses; also Ani, Ana, Ale, Ali.                                                                          |
| Amadioha         | Igbo                                 | Igbo alusi of thunder, lightning and justice, who strikes the oppressor, shown as a white ram; also Amadiora, Kamalu, Kalu.                                                                                                                      |
| Anyanwu          | Igbo                                 | Igbo alusi of the Sun, good fortune, knowledge and wisdom, whose name is the eye of the sun.                                                                                                                                                     |
| Agwu             | Igbo                                 | Igbo alusi of divination and medicine, patron of the dibia, who possesses the healer to show the cure; also Agwu Nsi.                                                                                                                            |
| Njoku Ji         | Igbo                                 | Igbo alusi of the yam and its farming, guardian of the farm, honoured at the planting festival; also Ahiajoku, Ahiajioku, Ifejioku.                                                                                                              |
| Nana Buluku      | Fon and Ewe                          | Fon and Ewe creator of the world, mother of Mawu and Lisa, who made all things and withdrew; also Nana Buruku, Nana Buku, Nanan-bouclou, Candomble's Nana.                                                                                       |
| Mawu-Lisa        | Fon and Ewe                          | Fon and Ewe twin creator vodun, Mawu of the Moon, night and gentleness and Lisa of the Sun, day and strength, spoken of as one; also Mawu, Lisa, Mahu.                                                                                           |
| Sagbata          | Fon and Ewe                          | Fon and Ewe vodun of the earth and of smallpox, who watches over fields and waters and punishes with disease, head of the earth pantheon; also Sakpata, Shapata, Yoruba Sopona.                                                                  |
| Xevioso          | Fon and Ewe                          | Fon and Ewe vodun of thunder, lightning and rain, who sends the fertilising rains and strikes liars and thieves with the thunderbolt, shown as a ram with a double axe; also Hevioso, Heviosso, Sogbo, So.                                       |
| Gu               | Fon and Ewe                          | Fon and Ewe vodun of iron, metalwork, tools and war, twin of Xevioso and counterpart of Yoruba Ogun; also Egu, Gou.                                                                                                                              |
| Legba            | Fon and Ewe                          | Fon and Ewe vodun of the crossroads and the gate, messenger between the vodun and the living and divine trickster, youngest child of Mawu-Lisa; Haitian Vodou's Papa Legba, Yoruba Elegba.                                                       |
| Dan              | Fon and Ewe                          | Fon and Ewe serpent vodun of the rainbow, riches and cool breezes, who carried Mawu-Lisa at the creation and coils beneath the earth; also Da, Dan Ayido Hwedo, Aido Hwedo, Haitian Damballah and Ayida Wedo.                                    |
| Agbe             | Fon and Ewe                          | Fon and Ewe vodun of the sea and head of its pantheon, beside Sagbata's earth and Xevioso's thunder.                                                                                                                                             |
| Elegba           | Yoruba                               | Yoruba and Lucumi orisha of crossroads, roads and doorways, who opens the way; also Eleggua, Eshu, Exu.                                                                                                                                          |
| Obatala          | Yoruba                               | Yoruba orisha of purity, wisdom, peace and creation, eldest of the orishas and sculptor of humankind; also Oxala.                                                                                                                                |
| Ogun             | Yoruba                               | Yoruba orisha of iron, metalwork, labour, war and the clearing of paths; also Ogoun, Ogum.                                                                                                                                                       |
| Orunmila         | Yoruba                               | Yoruba orisha of wisdom, divination and destiny, the witness of fate in Ifa.                                                                                                                                                                     |
| Osanyin          | Yoruba                               | Yoruba orisha of herbs, leaves, medicine and healing, who holds the knowledge of every plant; also Osain, Ossaim.                                                                                                                                |
| Oshun            | Yoruba                               | Yoruba orisha of rivers, fresh water, love, beauty, sweetness and fertility; also Ochun, Oxum.                                                                                                                                                   |
| Oya              | Yoruba                               | Yoruba orisha of winds, storms, transformation and the cemetery gates; also Yansa, Iansa.                                                                                                                                                        |
| Shango           | Yoruba                               | Yoruba orisha of thunder, lightning, fire, drumming and justice; also Chango, Xango.                                                                                                                                                             |
| Yemaya           | Yoruba                               | Yoruba orisha of the sea, motherhood and protection; also Yemoja, Iemanja.                                                                                                                                                                       |
| Nzambi Mpungu    | Kongo                                | Kongo supreme god and creator, lord of the sky and the Sun's fire, who made the world and withdrew above it; also Nzambi a Mpungu, Nzambi Ampungu, Nzambi, and Palo's Nsambi, Sambia.                                                            |
| Nzambici         | Kongo                                | Kongo goddess of the earth and the Moon, mother of all living things, the essence beside Nzambi Mpungu's sky and Sun, his consort and counterpart.                                                                                               |
| Simbi            | Kongo                                | Kongo spirits of water and the wild honoured as nature deities, the bisimbi of springs, pools and rocks who held the land before people came and guide the dead across the water; also bisimbi, basimbi, cymbee, the Simbi lwa of Haitian Vodou. |
| Kalunga          | Kongo                                | Kongo god and force of the beginning, the fire from which the world came, the ocean, and the watery line between the living and the dead; also Kalunga Line, Nzambi Kalunga.                                                                     |
| Mbumba           | Kongo                                | Kongo rainbow serpent of the waters and the rain, who climbs from the rivers to the sky.                                                                                                                                                         |
| Unkulunkulu      | Zulu                                 | Zulu creator and first ancestor, the old, old one who came forth at the beginning and gave the first people fire, cattle and marriage; also uNkulunkulu, Nkulunkulu.                                                                             |
| Umvelinqangi     | Zulu                                 | Zulu supreme being and Lord of the Sky, the first to come forth, god of thunder, lightning and the heavens, often identified with Unkulunkulu; also uMvelinqangi, Mvelinqangi, iNkosi yeZulu.                                                    |
| Nomkhubulwane    | Zulu                                 | Zulu princess of heaven, goddess of rain, the rainbow, spring, fertility and the crops, honoured by girls at her planting rite; also Nomkhubulwana, Nomkubulwana, Inkosazana, iNkosazana yeZulu.                                                 |
| Mamlambo         | Zulu                                 | Zulu goddess of rivers, a great water serpent of the deep pools whose favour is both sought and feared; also uMamlambo, Momlambo, Nomhoyi.                                                                                                       |
| Baron Samedi     | Haitian Vodou                        | Haitian Vodou lwa of the dead, the cemetery and resurrection, head of the Gede.                                                                                                                                                                  |
| Damballah        | Haitian Vodou                        | Haitian Vodou serpent lwa of creation, wisdom, springs, waterfalls and peace; also Danbala, Damballa, from the Fon serpent Dan.                                                                                                                  |
| Erzulie          | Haitian Vodou                        | Haitian Vodou family of lwa of love, beauty, jealousy and motherhood, among them Erzulie Freda and Erzulie Dantor; also Ezili.                                                                                                                   |
| Maman Brigitte   | Haitian Vodou                        | Haitian Vodou lwa of the dead and the cemetery, wife of Baron Samedi.                                                                                                                                                                            |
| Papa Legba       | Haitian Vodou                        | Haitian Vodou lwa of the crossroads, gatekeeper between the living and the lwa, who opens every ceremony; also Legba.                                                                                                                            |
| Chalchiuhtlicue  | Aztec                                | Aztec goddess of rivers, lakes, streams and birth, and of the newborn's bathing rite; She of the Jade Skirt.                                                                                                                                     |
| Quetzalcoatl     | Aztec                                | Aztec feathered serpent god of wind, learning, the morning star and creation; Maya Kukulkan.                                                                                                                                                     |
| Tlaloc           | Aztec                                | Aztec god of rain, storms, water and the fertility of the fields.                                                                                                                                                                                |
| Xochipilli       | Aztec                                | Aztec god of flowers, art, song, dance and the visionary plants; the Flower Prince.                                                                                                                                                              |
| Xochiquetzal     | Aztec                                | Aztec goddess of flowers, love, beauty, fertility and weaving.                                                                                                                                                                                   |
| Ixchel           | Maya                                 | Maya goddess of midwifery, medicine, weaving and fertility, the Moon in popular account; also Ix Chel, Chak Chel.                                                                                                                                |
| Inti             | Inca                                 | Inca god of the Sun, ancestor of the emperors, honoured at Inti Raymi.                                                                                                                                                                           |
| Pachamama        | Inca                                 | Inca goddess of the earth, fertility, planting and harvest, honoured across the Andes still; Mother Earth.                                                                                                                                       |
| Hina             | Hawaiian                             | Hawaiian and Polynesian goddess of the Moon, tapa-making and women.                                                                                                                                                                              |
| Kane             | Hawaiian                             | Hawaiian god of creation, life, procreation and fresh water, the water of life.                                                                                                                                                                  |
| Laka             | Hawaiian                             | Hawaiian goddess of the hula and of the forest and its wild plants.                                                                                                                                                                              |
| Lono             | Hawaiian                             | Hawaiian god of agriculture, rain, peace and fertility, honoured at the Makahiki.                                                                                                                                                                |
| Pele             | Hawaiian                             | Hawaiian goddess of volcanoes and fire, who dwells at Kilauea.                                                                                                                                                                                   |
| Horned God       | Wicca                                | Wiccan and modern pagan god of the wild, the hunt, fertility and the dying and returning year.                                                                                                                                                   |
| Green Man        | English folklore                     | English folklore's leaf-masked face of church carving, honoured in modern practice as a spirit of vegetation and the greenwood.                                                                                                                  |
| Herne            | English folklore                     | English folklore's antlered hunter of Windsor Forest, honoured as a horned god in modern practice; Herne the Hunter.                                                                                                                             |
| Aradia           | Italian folk witchcraft              | Italian witch goddess of Leland's Aradia, or the Gospel of the Witches, daughter of Diana, who taught witchcraft to the oppressed.                                                                                                               |

### What is left out, and why

The list is a start, not a canon: anything off it is typed as free text and
reaches the admin's to-do list (§5). These were left out on purpose, and each
is the owner's to revisit:

- **Figures their own traditions do not call deities**: Jesus, the Virgin
  Mary, the saints and the Buddha. Folk practice that names them on an herb,
  as many do, writes them as free text. Kuan Yin is the exception: she is a
  bodhisattva in Buddhism, but Chinese folk religion widely honours her as a
  goddess of mercy.
- **Mortal and legendary enchantresses**: Medea and Morgan le Fay. Circe is
  listed because Homer calls her a goddess.
- **White Buffalo Calf Woman**, a sacred figure of a closed Lakota
  tradition, is not the project's to curate into a general list.
- **Tricksters and culture heroes their sources do not call gods**: Anansi,
  whom the Akan sources call a folk hero, by the rule that keeps Medea off.
- **Spirits a tradition keeps apart from its gods**: the Igbo Ikenga and
  Ekwensu, a personal spirit and a boundary spirit; Mami Wata, who belongs
  to no one tradition here; the Zulu Inkosazana, folded into Nomkhubulwane
  as her title. Simbi and Kalunga are listed because the Kongo scholarship
  calls them divine, and their rows say what else they are.
- **Names no reference-quality page reached**: the Igbo river goddess
  Idemili, the Akan sea god Epo, and the Zulu "Mbaba Mwana Waresa" that
  popular pages attach to Nomkhubulwane. Each joins when a source does.

### Sources

Every row above records where it came from, under CLAUDE.md's rule that what
the compendium says, it sources, and MB.156 writes what follows as
`references` rows linked to each tradition and deity. Citations are Chicago
Manual of Style, bibliography form. Academic and reference sources come
first — university presses, the _Encyclopedia of Religion_ (read through
Encyclopedia.com's reprint of the second edition), national encyclopaedias,
museum and university pages, the primary texts — and Wikipedia is cited as
an ordinary entry where it is the best or only verified source for a detail,
the owner's call. Every web address was fetched on October 6, 2026 and read
for the deities it is cited for; every book was confirmed through a
publisher, library or review record fetched the same day, and no page number
is given that was not seen. Encyclopaedia Britannica and Oxford Reference
refused every automated fetch and are cited nowhere, though each has entries
for most of these names; a reader with a browser can add them.

**Which deities to list** was drawn from the correspondence references that
name deities per herb, before any tradition was rounded out:

- Cunningham, Scott. _Cunningham's Encyclopedia of Magical Herbs_. St. Paul, MN: Llewellyn Publications, 1985. (Each entry names the herb's deities.)
- "A–Z Gods and Goddesses & Plant Associations." Otherworldly Oracle. Accessed October 6, 2026. https://otherworldlyoracle.com/gods-goddesses-plant-associations/.
- "Herbs Correspondences." Sacred Wicca. Accessed October 6, 2026. https://www.sacredwicca.com/herbs-correspondences.
- "Herbs & Plants of Hekate." Hekate Covenant. Accessed October 6, 2026. https://www.hekatecovenant.com/herbsandplants.
- Wikipedia, s.v. "Table of magical correspondences." Accessed October 6, 2026. https://en.wikipedia.org/wiki/Table_of_magical_correspondences.

Each tradition was then rounded out, choosing gods of the earth, plants,
healing, the hearth, the Sun, Moon and weather, love and the dead over gods
of statecraft, and its names, spellings and filings checked against the
sources below. The five African traditions were added on the owner's
request after the first draft, and each was researched from its own
scholarship rather than from a correspondence list.

#### Greek

What the sources settle: Theoi's index names 28 of the 30 Greek rows (all but Adonis and Circe, which it covers on their own pages) and tables the Roman names of the twelve Olympians; its deity pages give the Greek spellings (Hekate, Asklepios, Dionysos, Hyakinthos, Hygeia, Kirke) and the Roman names the descriptions carry (Trivia, Aesculapius, Bacchus, Salus, Sol, Luna, Somnus, Nox, Proserpina, Pluto, Cupid, Faunus, Ops). World History Encyclopedia covers the Olympians, Hades, Persephone, Helios, Selene, Hecate, Pan, Eros and Asclepius in one article; the _Oxford Classical Dictionary_ is the standard one-volume reference behind both.

- Atsma, Aaron J. "Greek Gods & Goddesses." Theoi Greek Mythology. Accessed October 6, 2026. https://www.theoi.com/greek-mythology/greek-gods.html.
- Cartwright, Mark. "Greek Mythology." World History Encyclopedia. July 29, 2012. Accessed October 6, 2026. https://www.worldhistory.org/Greek_Mythology/.
- Hornblower, Simon, Antony Spawforth, and Esther Eidinow, eds. _The Oxford Classical Dictionary_. 4th ed. Oxford: Oxford University Press, 2012. (Existence and details confirmed through Bryn Mawr Classical Review 2012.08.34, https://bmcr.brynmawr.edu/2012/2012.08.34/.)

Per-deity:

- **Adonis** (filed Greek; "god of beauty and desire, who dies and returns") — Azar, Elias N. "Adonis." World History Encyclopedia. February 21, 2016. Accessed October 6, 2026. https://www.worldhistory.org/Adonis/. Calls him the god of beauty whose death and return figure the year's rebirth and Aphrodite's beloved, while placing his origin in the Near East (Canaanite Adon), so the Greek filing is by cult, not origin.
- **Apollo** (filed Greek, "Greek and Roman" in the description) — Atsma, Aaron J. "Apollo." Theoi Greek Mythology. Accessed October 6, 2026. https://www.theoi.com/Olympios/Apollon.html. Gives Apollo as his Roman name too, with Rome's first temple to him in 430 BC, and the epithet Phoibos and the laurel among his attributes.
- **Artemis** ("for whom the artemisias are named") — Missouri Botanical Garden. "Artemisia vulgaris." Plant Finder. Accessed October 6, 2026. https://plantfinder.mobot.org/PlantFinderDetails.aspx?taxonid=256948. States "Genus is named for Artemis, Greek goddess of the moon, wild animals and hunting."
- **Asclepius** ("also Asklepios, Roman Aesculapius") — Atsma, Aaron J. "Asclepius." Theoi Greek Mythology. Accessed October 6, 2026. https://www.theoi.com/Ouranios/Asklepios.html. Gives Asklepios, Asclepius and Roman Aesculapius, the serpent-entwined staff, and medicine as his domain.
- **Circe** ("goddess and enchantress of Aeaea") — Atsma, Aaron J. "Circe." Theoi Greek Mythology. Accessed October 6, 2026. https://www.theoi.com/Titan/Kirke.html. Heads her "Greek Goddess of Sorcery, Sorceress of Aeaea" and quotes Homer calling her "a goddess with braided hair," which is the ground the seed gives for listing her.
- **Dionysus** ("also Dionysos, Roman Bacchus") — Atsma, Aaron J. "Dionysus." Theoi Greek Mythology. Accessed October 6, 2026. https://www.theoi.com/Olympios/Dionysos.html. Gives Dionysos, Dionysus and the Roman names Bacchus and Liber, noting Bacchus began as an epithet.
- **Eros** ("Roman Cupid") — Atsma, Aaron J. "Eros." Theoi Greek Mythology. Accessed October 6, 2026. https://www.theoi.com/Ouranios/Eros.html. Gives Cupid and Amor as Roman names and Aphrodite as his mother.
- **Gaia** ("also Gaea, Ge") — Atsma, Aaron J. "Gaia." Theoi Greek Mythology. Accessed October 6, 2026. https://www.theoi.com/Protogenos/Gaia.html. Gives Gaia, Gaea and Ge, and Terra/Tellus as the Roman names.
- **Hades** ("Roman Pluto"; "riches beneath the earth") — Atsma, Aaron J. "Hades." Theoi Greek Mythology. Accessed October 6, 2026. https://www.theoi.com/Khthonios/Haides.html. Gives Pluto, Dis and Orcus as Roman names and the hidden wealth of the earth as his.
- **Hecate** ("also Hekate, Trivia"; keys) — Atsma, Aaron J. "Hecate." Theoi Greek Mythology. Accessed October 6, 2026. https://www.theoi.com/Khthonios/Hekate.html. Gives Hekate, Hecate and the Roman name Trivia; witchcraft, magic, night, ghosts and crossroads. Wikipedia, s.v. "Hecate," last modified September 29, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Hecate, adds keys among her symbols and Trivia as the Roman epithet.
- **Helios** ("Roman Sol") — Atsma, Aaron J. "Helius." Theoi Greek Mythology. Accessed October 6, 2026. https://www.theoi.com/Titan/Helios.html. Roman Sol; the sun's chariot.
- **Hyacinthus** ("divine youth"; "also Hyakinthos, Hiakinthos") — Atsma, Aaron J. "Hyacinthus." Theoi Greek Mythology. Accessed October 6, 2026. https://www.theoi.com/Heros/Hyakinthos.html. Treats him as a Spartan prince loved by Apollo, the flower sprung from his death, and offerings at Amyklai "as to a hero" before Apollo's sacrifice, which supports the tradition's "heroes honoured as gods" rather than a god outright; it spells Hyakinthos and Hyacinthus, not Hiakinthos. Wikipedia, s.v. "Hyacinth (mythology)," last modified September 28, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Hyacinth_(mythology), calls him "a deified hero" with a Mycenaean-era cult at Amyclae and the Hyacinthia, which is the "divine youth" of the table.
- **Hygieia** ("also Hygeia, Roman Salus"; daughter of Asclepius) — Atsma, Aaron J. "Hygeia." Theoi Greek Mythology. Accessed October 6, 2026. https://www.theoi.com/Ouranios/AsklepiasHygeia.html. Goddess of good health, daughter and attendant of Asklepios, Roman Salus.
- **Hypnos** ("Roman Somnus"; poppies) — Atsma, Aaron J. "Hypnos." Theoi Greek Mythology. Accessed October 6, 2026. https://www.theoi.com/Daimon/Hypnos.html. Roman Somnus (or Sopor); the poppy among his attributes.
- **Iris** ("for whom the iris flower is named") — Missouri Botanical Garden. "Iris germanica." Plant Finder. Accessed October 6, 2026. https://plantfinder.mobot.org/PlantFinderDetails.aspx?kempercode=f471. States "Genus named for the Greek goddess of the rainbow"; Theoi's "Iris" page (https://www.theoi.com/Pontios/Iris.html) gives the rainbow and the messenger's office but is silent on the flower.
- **Nyx** ("Roman Nox"; mother of sleep and death) — Atsma, Aaron J. "Nyx." Theoi Greek Mythology. Accessed October 6, 2026. https://www.theoi.com/Protogenos/Nyx.html. Roman Nox; Hypnos and Thanatos among her children.
- **Pan** ("Roman Faunus") — Atsma, Aaron J. "Pan." Theoi Greek Mythology. Accessed October 6, 2026. https://www.theoi.com/Georgikos/Pan.html. Roman Faunus (also Inuus); shepherds, the wilds, rustic music, goat legs.
- **Persephone** ("also Kore, Roman Proserpina"; pomegranate) — Atsma, Aaron J. "Persephone." Theoi Greek Mythology. Accessed October 6, 2026. https://www.theoi.com/Khthonios/Persephone.html. Titled Kore, Roman Proserpina, bound by the pomegranate seeds.
- **Rhea** ("linked with Cybele") — Atsma, Aaron J. "Rhea." Theoi Greek Mythology. Accessed October 6, 2026. https://www.theoi.com/Titan/TitanisRhea.html. States Rhea "was closely identified with the Anatolian mother-goddess Kybele (Cybele)," which is the link the description hedges on; Roman Ops.
- **Selene** ("Roman Luna") — Atsma, Aaron J. "Selene." Theoi Greek Mythology. Accessed October 6, 2026. https://www.theoi.com/Titan/Selene.html. Roman Luna; the moon's chariot.

#### Roman

What the sources settle: World History Encyclopedia's two articles cover the state gods (Jupiter, Juno, Minerva, Mars, Venus, Vesta, Janus, Saturn, Diana, Mercury, Neptune, Vulcan, Pluto, Bacchus, Cupid, Faunus) and the Greek identifications; Smith's _Dictionary_, hosted by Perseus, supplies the native Italic powers the encyclopedias skip (Cardea, Pomona, Flora, Silvanus, Fortuna, Liber) and the older characters of Venus, Minerva and Neptune; the _Oxford Classical Dictionary_ stands behind the whole table.

- Wasson, Donald L. "Roman Religion." World History Encyclopedia. November 13, 2013. Accessed October 6, 2026. https://www.worldhistory.org/Roman_Religion/.
- Wasson, Donald L. "Roman Mythology." World History Encyclopedia. May 8, 2018. Accessed October 6, 2026. https://www.worldhistory.org/Roman_Mythology/.
- Smith, William, ed. _A Dictionary of Greek and Roman Biography and Mythology_. London: John Murray, 1873. Perseus Digital Library, Tufts University. Accessed October 6, 2026. https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.04.0104.
- Hornblower, Simon, Antony Spawforth, and Esther Eidinow, eds. _The Oxford Classical Dictionary_. 4th ed. Oxford: Oxford University Press, 2012.

Per-deity:

- **Bacchus** (filed Roman beside Dionysus; "also Liber") — Smith, William, ed. "Liber." In _A Dictionary of Greek and Roman Biography and Mythology_. Perseus Digital Library. Accessed October 6, 2026. https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.04.0104%3Aentry%3Dliber-bio-1. Liber is an ancient Italian god of the vine with his own festival, the Liberalia, whom the poets identified with Bacchus/Dionysus, which is what earns the Roman row its own name.
- **Cardea** (hinges, thresholds, hawthorn) — Smith, William, ed. "Cardea." Perseus Digital Library. Accessed October 6, 2026. https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.04.0104%3Aentry%3Dcardea-bio-1; and Ovid. _Fasti_ 6. Translated by James G. Frazer. Theoi Classical Texts Library. Accessed October 6, 2026. https://www.theoi.com/Text/OvidFasti6.html. Both give the goddess of the hinge who keeps harm from doors with the whitethorn.
- **Diana** ("queen of witches in folk tradition") — Leland, Charles G. "Chapter I. How Diana Gave Birth to Aradia." In _Aradia, or the Gospel of the Witches_ (1899). Internet Sacred Text Archive. Accessed October 6, 2026. https://sacred-texts.com/pag/aradia/ara03.htm. Leland's text makes Diana the mother of Aradia, sent to earth to teach witchcraft, which is the folk tradition the description hedges on; Wasson's "Diana" (World History Encyclopedia, May 16, 2023, https://www.worldhistory.org/Diana/) gives hunt, moon, childbirth and the Artemis identification and says nothing of witches.
- **Faunus** ("Greek Pan") — Atsma, "Pan" (above), which heads Pan "(Roman Faunus)"; Wasson, "Roman Mythology" (above), gives Faunus as god of nature and protector of crops.
- **Flora** (Floralia) — Smith, William, ed. "Flora." Perseus Digital Library. Accessed October 6, 2026. https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.04.0104%3Aentry%3Dflora-bio-1. Goddess of flowers and spring; her festival from April 28 to May 1.
- **Ceres** ("from whose name comes cereal"; "Greek Demeter") — Wikipedia, s.v. "Ceres (mythology)," last modified August 17, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Ceres_(mythology). States "The word cereal derives from Ceres's association with edible grains" and the identification with Demeter, which Theoi's index table also gives.
- **Fortuna** ("Greek Tyche"; "turning her wheel") — Smith, William, ed. "Fortuna." Perseus Digital Library. Accessed October 6, 2026. https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.04.0104%3Aentry%3Dfortuna-bio-1. Goddess of chance and good luck, cross-referenced to Tyche. Wikipedia, s.v. "Fortuna," last modified August 13, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Fortuna, supplies the wheel (Rota Fortunae) and "Her Greek equivalent is Tyche."
- **Mars** ("earlier, of fields") — Wasson, "Roman Mythology" (above). Calls Mars a former agricultural deity before the war god.
- **Minerva** ("medicine") — Smith, William, ed. "Minerva." Perseus Digital Library. Accessed October 6, 2026. https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.04.0104%3Aentry%3Dminerva-bio-1. Patroness of arts and trades, invoked by those in medicine among others; identified with Athena.
- **Neptune** ("and of fresh water") — Smith, William, ed. "Neptunus." Perseus Digital Library. Accessed October 6, 2026. https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.04.0104%3Aentry%3Dneptunus-bio-1. Chief marine divinity identified with Poseidon. Wikipedia, s.v. "Neptune (mythology)," last modified September 22, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Neptune_(mythology), settles the fresh water: "likely associated with freshwater springs before the sea," with Servius naming him god of rivers, springs and waters.
- **Pluto** ("also Dis Pater") — Atsma, "Hades" (above). Gives Pluto, Dis and Orcus as the Roman names of Haides.
- **Pomona** — Smith, William, ed. "Pomona." Perseus Digital Library. Accessed October 6, 2026. https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.04.0104%3Aentry%3Dpomona-bio-1. Divinity of the fruit of trees, with her own flamen.
- **Saturn** ("Greek Cronus") — Wasson, "Roman Mythology" (above). Gives Saturn as the equivalent of Cronus.
- **Silvanus** (woods, uncultivated land, boundaries) — Smith, William, ed. "Silvanus." Perseus Digital Library. Accessed October 6, 2026. https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.04.0104%3Aentry%3Dsilvanus-bio-1. Divinity of fields and forests and protector of field boundaries.
- **Venus** ("and gardens") — Smith, William, ed. "Venus." Perseus Digital Library. Accessed October 6, 2026. https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.04.0104%3Aentry%3Dvenus-bio-1. Notes Venus "is also said to have presided over gardens," as a minor point beside her identification with Aphrodite.

#### Anatolian

What the sources settle: Cybele is Phrygian, the Mother of the Gods worshipped in central Anatolia, later equated with Rhea by the Greeks and received at Rome as Magna Mater; Attis is her Phrygian consort, a vegetation god bound to the pine. Roller's monograph is the standard study and its subtitle carries the filing.

- Atsma, Aaron J. "Cybele." Theoi Greek Mythology. Accessed October 6, 2026. https://www.theoi.com/Phrygios/Kybele.html.
- Wasson, Donald L. "Cybele." World History Encyclopedia. February 4, 2015. Accessed October 6, 2026. https://www.worldhistory.org/Cybele/.
- Roller, Lynn E. _In Search of God the Mother: The Cult of Anatolian Cybele_. Berkeley: University of California Press, 1999. (Confirmed through Bryn Mawr Classical Review 2001.09.17, https://bmcr.brynmawr.edu/2001/2001.09.17, and Open Library, https://openlibrary.org/books/OL360560M/In_search_of_god_the_mother.)

Per-deity:

- **Cybele** (filed Anatolian rather than Greek or Roman; "Magna Mater") — Atsma, "Cybele" (above). Calls her the "ancient Phrygian Mother of the Gods" worshipped in central Anatolia, whom the Greeks equated with Rhea and the Romans adopted as Mother of the Gods with a Palatine temple and the Megalesia, so the Greek and Roman cults are receptions of a Phrygian goddess; Wasson's article gives the title Magna Mater and the dates of the cult's arrival in Athens and Rome.
- **Attis** (filed Anatolian; vegetation, death and rebirth, the pine) — Atsma, Aaron J. "Attis." Theoi Greek Mythology. Accessed October 6, 2026. https://www.theoi.com/Phrygios/Attis.html. Calls him "the ancient Phrygian god of vegetation and consort of the great Mother of the Gods Kybele" and quotes his transformation into the pine; Wasson's "Cybele" (above) adds his yearly return with the rebirth of vegetation.

#### Egyptian

What the sources settle: World History Encyclopedia's list names all eighteen Egyptian rows and carries several of the alternative names (Amun-Ra, Bast, Harpocrates, Sutekh, "Ra (Atum or Re)", Ma'at), with its deity articles supplying the rest (Amon and Amen, Anpu and Inpu, Nebet-het, Djehuty); Wilkinson is the standard illustrated reference for the whole pantheon; a museum glossary and a museum bulletin settle the Min and Sakhmet details.

- Mark, Joshua J. "Egyptian Gods - The Complete List." World History Encyclopedia. April 14, 2016. Accessed October 6, 2026. https://www.worldhistory.org/article/885/egyptian-gods---the-complete-list/.
- Wilkinson, Richard H. _The Complete Gods and Goddesses of Ancient Egypt_. London: Thames & Hudson, 2017. (Paperback edition confirmed through Google Books, https://books.google.com/books/about/The_Complete_Gods_and_Goddesses_of_Ancie.html?id=ozgBOQAACAAJ, ISBN 9780500284247; Open Library records first publication in 2003.)
- Global Egyptian Museum. "Min." Glossary. Accessed October 6, 2026. https://www.globalegyptianmuseum.org/glossary.aspx?id=246.

Per-deity:

- **Amun** ("also Amon, Amen"; "Amun-Ra") — Mark, Joshua J. "Amun." World History Encyclopedia. July 29, 2016. Accessed October 6, 2026. https://www.worldhistory.org/Amun/. Opens "Amun (also Amon, Ammon, Amen, Amun-Ra)," the hidden one who became King of the Gods when joined with Ra.
- **Anubis** ("also Anpu, Inpu") — Mark, Joshua J. "Anubis." World History Encyclopedia. July 25, 2016. Accessed October 6, 2026. https://www.worldhistory.org/Anubis/. Gives Inpu and Anpu as the Egyptian name behind the Greek form; embalming, tombs and the guiding of souls.
- **Bastet** ("also Bast"; "perfume") — Mark, Joshua J. "Bastet." World History Encyclopedia. July 24, 2016. Accessed October 6, 2026. https://www.worldhistory.org/Bastet/. Home, women and protection, with the name read (after Pinch) as "She of the Ointment Jar," which is the ground for "perfume"; the list entry gives "Bastet (Bast)."
- **Geb** ("its crops and what grows from it") — Mark, "Egyptian Gods - The Complete List" (above): "God of the earth and growing things," husband of Nut.
- **Hathor** ("Lady of the West") — Mark, Joshua J. "Hathor." World History Encyclopedia. September 2, 2009. Accessed October 6, 2026. https://www.worldhistory.org/Hathor/. Love, music, dance, joy and motherhood, cow-horned, and "the goddess of the West" who receives the setting sun.
- **Horus** ("as a child, Harpocrates") — Mark, "Egyptian Gods - The Complete List" (above): "Harpocrates - The Greek and Roman name for Horus the Child, son of Osiris and Isis."
- **Isis** ("also Aset") — Mark, Joshua J. "Isis." World History Encyclopedia. February 19, 2016. Accessed October 6, 2026. https://www.worldhistory.org/isis/. Magic, healing, motherhood and the throne as her name's meaning; it spells the Egyptian name Eset. Wikipedia, s.v. "Isis," last modified October 3, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Isis, gives the name in transliteration as _ꜣst_, whose conventional Egyptological reading is Aset (see Notes).
- **Maat** ("also Ma'at") — Mark, "Egyptian Gods - The Complete List" (above), under "Ma'at": truth, justice and harmony.
- **Min** ("desert roads", "linked with the lettuce") — Global Egyptian Museum, "Min" (above). Fertility god and protector of the desert and foreign lands, often shown with tall lettuce plants, tied to Coptos at the mouth of the Wadi Hammamat; the WHE list adds "god of the eastern deserts."
- **Nephthys** ("also Nebet-Het") — Mark, Joshua J. "Nephthys." World History Encyclopedia. March 13, 2016. Accessed October 6, 2026. https://www.worldhistory.org/Nephthys/. Gives Nebthwt, Nebet-het and Nebt-het; funerary goddess of twilight and darkness, Isis's sister.
- **Nut** ("swallows the Sun each night") — Wikipedia, s.v. "Nut (goddess)," last modified May 25, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Nut_(goddess). Arching over the earth, Geb's wife, the Sun swallowed at dusk and reborn at dawn; the WHE list gives her as the sky goddess, wife of Geb.
- **Ra** ("also Re") — Mark, "Egyptian Gods - The Complete List" (above): "Ra (Atum or Re) - The great sun god of Heliopolis."
- **Sekhmet** ("also Sakhmet") — Ranke, Hermann. "Egyptian Deities and Their Sacred Animals." _Museum Bulletin_, Penn Museum, November 1950. Accessed October 6, 2026. https://www.penn.museum/sites/bulletin/3283/. Uses the spelling "Sakhmet, goddess of war. Mostly with head of lioness"; the WHE list gives her as a leonine goddess under "Sekhmet." Wikipedia, s.v. "Sekhmet," last modified September 20, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Sekhmet, gives Sakhmet as the romanised form and plague, healing and the epithet "the eye of Ra."
- **Set** ("also Seth, Sutekh") — Mark, "Egyptian Gods - The Complete List" (above): "Sutekh - The Semitic name for the god Set (Seth)."
- **Thoth** ("also Djehuty") — Mark, Joshua J. "Thoth." World History Encyclopedia. July 26, 2016. Accessed October 6, 2026. https://www.worldhistory.org/Thoth/. Gives Djehuty; writing, magic, wisdom, the moon and the reckoning of time, ibis-headed.

#### Sumerian

What the sources settle: Enki (Akkadian Ea), Ereshkigal (Irkalla) and Inanna (Ishtar as her Akkadian name, Queen of Heaven, the descent to the underworld, Ereshkigal her sister, Dumuzi her consort), and the filing of all three as Sumerian with Akkadian counterparts. Oracc's list is the University of Pennsylvania's academic reference and spells the names Enki/Ea, Ereškigal, Inana/Ištar.

- Black, Jeremy, and Anthony Green. _Gods, Demons and Symbols of Ancient Mesopotamia: An Illustrated Dictionary_. Illustrated by Tessa Rickards. London: British Museum Press; Austin: University of Texas Press, 1992.
- "Ancient Mesopotamian Gods and Goddesses: List of Deities." Oracc (Open Richly Annotated Cuneiform Corpus), University of Pennsylvania Museum. Content last modified December 18, 2019. Accessed October 6, 2026. http://oracc.museum.upenn.edu/amgg/listofdeities/.
- Mark, Joshua J. "The Mesopotamian Pantheon: The Ancient Gods and Goddesses of the Near East." World History Encyclopedia. Last modified May 3, 2026. Accessed October 6, 2026. https://www.worldhistory.org/article/221/the-mesopotamian-pantheon/.
- Mark, Joshua J. "Inanna: The Most Popular Goddess of Ancient Mesopotamia." World History Encyclopedia. Last modified May 18, 2026. Accessed October 6, 2026. https://www.worldhistory.org/Inanna/.

Per-deity:

- **Inanna / Ishtar** (one Sumerian row, one Akkadian and Babylonian row) — Mark, "Inanna," above. It states that Ishtar is Inanna's Akkadian counterpart, which supports keeping two rows that each name the other.

#### Akkadian and Babylonian

What the sources settle: Ishtar as the Akkadian and Babylonian name of Inanna (love, war, fertility, the evening star); Tammuz as the Akkadian form of Sumerian Dumuzi, shepherd and consort of Inanna; Lilith's descent from the Mesopotamian lilitu demons and her place in Jewish folklore.

- Black, Jeremy, and Anthony Green. _Gods, Demons and Symbols of Ancient Mesopotamia: An Illustrated Dictionary_. Illustrated by Tessa Rickards. London: British Museum Press; Austin: University of Texas Press, 1992.
- Mark, Joshua J. "The Mesopotamian Pantheon: The Ancient Gods and Goddesses of the Near East." World History Encyclopedia. Last modified May 3, 2026. Accessed October 6, 2026. https://www.worldhistory.org/article/221/the-mesopotamian-pantheon/.
- "Lilith." In _Encyclopaedia Judaica_, 2nd ed. (2007). Jewish Virtual Library. Accessed October 6, 2026. https://www.jewishvirtuallibrary.org/lilith.

Per-deity:

- **Lilith** (filed Akkadian and Babylonian, Jewish folklore in the description) — "Lilith," _Encyclopaedia Judaica_, above. It traces her to the Babylonian lilu and lilitu demons and to the Sumerian Gilgamesh material before describing the Jewish night demon who endangers newborns and women in childbirth, which supports both the Mesopotamian filing and the hedge.
- **Tammuz** (Akkadian name, Sumerian Dumuzi in the description) — Mark, "The Mesopotamian Pantheon," above, under "Tammuz/Dumuzi," god of fertility and shepherds and husband of Inanna. Oracc's list carries the entry under "Dumuzi," confirming which is the Sumerian form.

#### Canaanite and Phoenician

What the sources settle: Anat (Anath) as a war goddess bound to Baal; Asherah as El's consort and mother of the gods, Athirat at Ugarit, with the asherah poles and trees; Astarte as Phoenician and Canaanite goddess of love, war and the evening star with the spellings Ashtart and Ashtoreth; Baal as the Canaanite-Phoenician storm and rain god identified with Hadad.

- Mark, Joshua J. "Baal." World History Encyclopedia. Last modified October 6, 2026. Accessed October 6, 2026. https://www.worldhistory.org/baal/.
- Mark, Joshua J. "Astarte." World History Encyclopedia. Last modified October 5, 2026. Accessed October 6, 2026. https://www.worldhistory.org/astarte/.
- Downey, April Lynn. "Asherah." World History Encyclopedia. Last modified October 5, 2026. Accessed October 6, 2026. https://www.worldhistory.org/Asherah/.
- Pope, Marvin H. "Anath." In _Encyclopaedia Judaica_. Encyclopedia.com. Accessed October 6, 2026. https://www.encyclopedia.com/people/philosophy-and-religion/biblical-proper-names-biographies/anath.

Per-deity:

- **Anat** (spelled Anat, "also Anath") — Pope, "Anath," above. The _Encyclopaedia Judaica_ headword is Anath and the entry gives Anat as well, settling both spellings; it supports war, and Mark's "Baal" supports "sister of Baal."
- **Astarte** (filed Canaanite and Phoenician though she derives from Ishtar) — Mark, "Astarte," above. It states she developed from Inanna/Ishtar but became a Canaanite and Phoenician goddess in her own right, which supports the separate row and filing.

#### Persian

What the sources settle: Anahita as Aredvi Sura Anahita, the Zoroastrian yazata of the waters who bestows fertility and is prayed to for knowledge; Mithra as the god whose name is the common noun "contract, covenant," and the rising sun; and that the Roman mysteries of Mithras are a Western development, not the same cult.

- Boyce, Mary. "Anāhīd i. Ardwīsūr Anāhīd." _Encyclopaedia Iranica_, online edition. Published December 14, 1989; last updated August 7, 2018. Accessed October 6, 2026. https://www.iranicaonline.org/articles/anahid-i.
- Schmidt, Hanns-Peter. "Mithra i. Mitra in Old Indian and Mithra in Old Iranian." _Encyclopaedia Iranica_, online edition. Published August 15, 2006; last updated May 14, 2018. Accessed October 6, 2026. https://www.iranicaonline.org/articles/mithra-i.
- Mark, Joshua J. "Anahita." World History Encyclopedia. Last modified October 5, 2026. Accessed October 6, 2026. https://www.worldhistory.org/Anahita/.
- Mark, Joshua J. "Mithra." World History Encyclopedia. Last modified October 6, 2026. Accessed October 6, 2026. https://www.worldhistory.org/Mithra/.

Per-deity:

- **Mithra** (filed Persian, "and of the Roman mysteries as Mithras" in the description) — Beck, Roger. "Mithraism." _Encyclopaedia Iranica_, online edition. Published July 20, 2002; last updated November 15, 2012. Accessed October 6, 2026. https://www.iranicaonline.org/articles/mithraism. Beck defines Mithraism as "the cult of Mithra as it developed in the West" whose Iranian continuity is the open question, which supports one Persian row that names the Roman cult rather than a Roman filing; Mark's "Mithra" says the same more bluntly, that Roman Mithras was inspired by but distinct from the Persian god.
- **Anahita** ("also Aredvi Sura Anahita") — Boyce, above, which opens on Arədvī Sūrā Anāhitā as the Avestan name; Mark's "Anahita" adds Anahid, Anahit and Anaitis and the gloss "fertility, water, health and healing, and wisdom." Boyce supports waters, fertility and knowledge; healing is Mark's only.

#### Norse

What the sources settle: Odin, Thor, Loki, Freyja, Freyr, Njord, Baldr, Hel, Tyr, Idunn and Sif by name and function, with the spellings Freya/Freyja, Baldur/Baldr, Idun/Idunn; Frigg, Eir and Skadi through the _Prose Edda_ and the two dictionaries; the Aesir and Vanir filing.

- Lindow, John. _Norse Mythology: A Guide to the Gods, Heroes, Rituals, and Beliefs_. New York: Oxford University Press, 2002.
- Simek, Rudolf. _Dictionary of Northern Mythology_. Translated by Angela Hall. Cambridge: D. S. Brewer, 1993.
- Snorri Sturluson. _The Prose Edda: Norse Mythology_. Translated by Jesse L. Byock. London: Penguin Classics, 2005.
- Groeneveld, Emma. "Norse Mythology." World History Encyclopedia. Last modified February 4, 2025. Accessed October 6, 2026. https://www.worldhistory.org/Norse_Mythology/.
- Groeneveld, Emma. "Freyja." World History Encyclopedia. Last modified October 5, 2026. Accessed October 6, 2026. https://www.worldhistory.org/Freyja/.

Per-deity:

- **Freya** (spelled Freya, "also Freyja") — Groeneveld, "Freyja," above: love, beauty, fertility, seiðr magic and half the slain, under the Old Norse spelling, which supports the description's alternative; the table's headword is the anglicised form.
- **Eir** ("among Frigg's handmaidens") — Wikipedia, s.v. "Eir," last modified August 31, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Eir. It gives Gylfaginning's "extremely good physician" among the ásynjur and Simek's view that she may be a valkyrie, which supports "healing and medicine" and shows "handmaiden" is a gloss, not a source's word.
- **Skadi** ("giantess and goddess") — Groeneveld, "Freyja," above, which names Skadi as the giantess wife of Njord, supporting the double label.

#### Anglo-Saxon and Continental Germanic

What the sources settle: Eostre as a goddess known only from Bede's note on Eosturmonath, with Grimm's reconstructed Ostara; Nerthus as the earth-mother of Tacitus, _Germania_ 40, carried in a wagon and bringing peace; Berchta and Holda as figures of continental folklore of spinning, the Twelve Nights and the snow-making featherbed, with the names Perchta, Bertha, Holle and Hulda.

- Bede. _The Reckoning of Time_. Translated, with introduction, notes and commentary, by Faith Wallis. Translated Texts for Historians 29. Liverpool: Liverpool University Press, 1999.
- Grimm, Jacob. _Teutonic Mythology_. Translated by James Steven Stallybrass. 4 vols. London: George Bell and Sons, 1882–88. Vol. 1, chap. 13, "Goddesses: Erda — Isis — Holda, Berhta — Hrede — Ostara."
- Simek, Rudolf. _Dictionary of Northern Mythology_. Translated by Angela Hall. Cambridge: D. S. Brewer, 1993.
- Tacitus. _Germany and Its Tribes_. Translated by Alfred John Church and William Jackson Brodribb. New York: Random House, 1942. Chap. 40. Perseus Digital Library, Tufts University. Accessed October 6, 2026. http://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.02.0083:chapter=40.

Per-deity:

- **Eostre** ("named by Bede"; "also Ostara") — Grimm, _Teutonic Mythology_, vol. 1, chap. 13, above. Grimm quotes Bede's _De temporum ratione_ as the sole witness to Eástre and from it coins "Ostara, Eástre … the divinity of the radiant dawn," which supports both the hedge and the alternative name; Wallis's translation is the standard English text of the Bede passage (chap. 15).
- **Nerthus** ("as Tacitus tells") — Tacitus, chap. 40, above: "their common worship of … mother-Earth, and their belief that she interposes in human affairs, and visits the nations in her car," with weapons locked away while she travels. The Church–Brodribb translation prints the older reading "Ertha"; the name Nerthus is the modern text's and Simek's headword.
- **Berchta** ("Germanic and Alpine goddess of spinning, the Twelve Nights"; "also Perchta, Bertha") — Wikipedia, s.v. "Perchta," last modified July 19, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Perchta. It gives the Alpine range, the twelve days, the spinning quota and the three spellings, and names Grimm as the one who read her as a goddess, which is what the description's "goddess of continental folklore" hedge rests on; Grimm's chapter 13 is the primary.
- **Holda** ("who shakes snow from her bed"; "also Holle, Hulda") — Grimm, Jacob, and Wilhelm Grimm. "Frau Holle." _Kinder- und Hausmärchen_, 7th ed. (1857), no. 24. Translated by D. L. Ashliman. Folklore and Mythology Electronic Texts, University of Pittsburgh. Revised January 6, 2019. Accessed October 6, 2026. https://sites.pitt.edu/~dash/grimm024.html. The tale has "shake it diligently until the feathers fly, then it will snow in the world," and Ashliman's note records the Hessian saying that it snows when Frau Holle makes her bed; Wikipedia, s.v. "Frau Holle," last modified September 17, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Frau_Holle, carries the names Holla, Holda, Hulda and the link to Perchta.

#### Irish

What the sources settle: the Dagda (club, cauldron, "the good god"), Brigid, Aengus (Angus Óg), Boann (Boand), Lugh (Samildánach, Lughnasadh, Welsh Lleu, Gaulish Lugus), the Morrigan (Morrigu, "great queen," the crow), Dian Cecht, Miach, Airmed and the herbs from Miach's grave, Ogma; Áine's hill at Knockainey; Danu and Manannán through the two dictionaries.

- Green, Miranda J. _Dictionary of Celtic Myth and Legend_. London: Thames and Hudson, 1992.
- MacKillop, James. _Dictionary of Celtic Mythology_. Oxford: Oxford University Press, 1998.
- _Cath Maige Tuired: The Second Battle of Mag Tuired_. Translated by Elizabeth A. Gray. Irish Texts Society 52. Dublin: Irish Texts Society, 1982. CELT: Corpus of Electronic Texts, University College Cork. Accessed October 6, 2026. https://celt.ucc.ie/published/T300010.html.
- Cartwright, Mark. "The Dagda." World History Encyclopedia. Last modified October 6, 2026. Accessed October 6, 2026. https://www.worldhistory.org/The_Dagda/.
- Cartwright, Mark. "Lugh." World History Encyclopedia. Last modified October 5, 2026. Accessed October 6, 2026. https://www.worldhistory.org/Lugh/.
- Cartwright, Mark. "The Mórrigan." World History Encyclopedia. Last modified October 5, 2026. Accessed October 6, 2026. https://www.worldhistory.org/The_Morrigan/.

Per-deity:

- **Airmed** ("gathered the herbs that grew from her brother Miach's grave") — _Cath Maige Tuired_, trans. Gray, above: "three hundred and sixty-five herbs grew through the grave … Then Airmed spread her cloak and uprooted those herbs according to their properties." The medieval text, not a modern gloss, supports the description.
- **Lugh** ("Welsh Lleu, Gaulish Lugus") — Cartwright, "Lugh," above, which names Lleu Llaw Gyffes as the Welsh equivalent and Lugus/Lugos as the god the Romans knew, supporting the one Irish row that names the other two.
- **Aine** ("honoured at Knockainey") — Wikipedia, s.v. "Áine," last modified August 10, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/%C3%81ine. It gives summer, the sun, sovereignty and the hill of Knockainey (Cnoc Áine) in Limerick; love and fertility are not in its lead.

#### Welsh

What the sources settle: that Arianrhod, Blodeuwedd, Gwydion, Mabon and Rhiannon are figures of the _Mabinogi_ and _Culhwch and Olwen_, and Cerridwen (Ceridwen) of the _Tale of Gwion Bach_ and _Taliesin_; MacKillop's dictionary carries each as an entry and marks what is literary.

- Ford, Patrick K., ed. and trans. _The Mabinogi and Other Medieval Welsh Tales_. 2nd ed. Berkeley: University of California Press, 2019.
- MacKillop, James. _Dictionary of Celtic Mythology_. Oxford: Oxford University Press, 1998.

Per-deity:

- **Blodeuwedd, Gwydion, Arianrhod** ("figures of their literature honoured as gods today") — Ford, above, "Math son of Mathonwy": the three are characters of the fourth branch, where Blodeuwedd is made of flowers by Math and Gwydion and turned into an owl, which supports the hedge that these are literary figures first.
- **Cerridwen** ("Welsh enchantress and goddess of the cauldron"; "also Ceridwen") — Ford, above, "The Tale of Gwion Bach and the Tale of Taliesin," whose Ceridwen brews the cauldron of inspiration; the tale is late-medieval and the "goddess" reading is modern, so the row's "enchantress" is the source's word.
- **Mabon** ("rescued from captivity"; "namesake of the autumn equinox in modern practice") — Ford, above, "Culhwch and Olwen," for the rescue of Mabon son of Modron; for the equinox, Kelly, Aidan. "About Naming Ostara, Litha, and Mabon." Patheos (blog), May 3, 2017. Accessed October 6, 2026. https://www.patheos.com/blogs/aidankelly/2017/05/naming-ostara-litha-mabon/. Kelly, in his own account, says he chose the name from the Mabinogion story of Mabon ap Modron for a 1974 Pagan calendar, which settles that the equinox name is a modern coinage, not a Welsh festival. (A blog, cited because it is the coiner's first-person account.)

#### Gaulish and British

What the sources settle: Belenus (light, southern France, northern Italy, the eastern Alps), Taranis (sky and thunder, matched with Jupiter), Sulis (the healing spring at Bath, Sulis Minerva, the curse tablets), Epona (the horse goddess of Gaul whose cult the Roman army carried), Cernunnos (antlers, animals, fertility and prosperity, the Pillar of the Boatmen).

- Green, Miranda J. _Dictionary of Celtic Myth and Legend_. London: Thames and Hudson, 1992.
- Cartwright, Mark. "The Ancient Celtic Pantheon." World History Encyclopedia. Last modified October 6, 2026. Accessed October 6, 2026. https://www.worldhistory.org/article/1715/the-ancient-celtic-pantheon/.
- Cartwright, Mark. "Cernunnos: The Ancient Celtic Nature God." World History Encyclopedia. Last modified April 18, 2025. Accessed October 6, 2026. https://www.worldhistory.org/Cernunnos/.
- "Roman Curse Tablets." Roman Baths, Bath & North East Somerset Council. Accessed October 6, 2026. https://www.romanbaths.co.uk/roman-curse-tablets.

Per-deity:

- **Epona** ("Gaulish and Roman goddess of horses, mules, fertility and journeys") — "Epona." World History Encyclopedia. Last modified October 5, 2026. Accessed October 6, 2026. https://www.worldhistory.org/article/153/epona/. It places her in Gallic religion, with inscriptions across Gaul, Germany, the Danube and Rome signed by soldiers, which supports the Gaulish filing with Rome in the description; for mules, fertility and the December 18 Roman feast, Wikipedia, s.v. "Epona," last modified October 5, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Epona.
- **Sulis** ("British goddess of the hot springs at Bath … Sulis Minerva"; "curses") — "Roman Curse Tablets," above: 130 tablets "rolled up and thrown into the Spring where the spirit of the goddess Sulis Minerva dwelt," which supports the curses and the double name; Cartwright, "The Ancient Celtic Pantheon," supports the healing spring, Aquae Sulis.
- **Taranis** ("bearing a wheel") — Wikipedia, s.v. "Taranis," last modified September 3, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Taranis. It states that no inscription links Taranis with the wheel and that the "wheel god" identification is a scholarly inference, so the description's wheel is a reading, not an attestation; Cartwright supports thunder and sky.

#### Slavic

What the sources settle: Gimbutas's three _Encyclopedia of Religion_ entries (reprinted at Encyclopedia.com) give Perun (thunder, oak, foe of Veles), Veles/Volos (death, cattle, wealth, magic) and Mokosh (spinning, moisture, the one goddess of Vladimir's 980 pantheon), and place Baba Yaga as a folklore witch. The Internet Encyclopedia of Ukraine covers the same four plus Lada and Marena, and supplies the spelling _Makosh_. Dixon-Kennedy is the English reference book for the tradition as a whole. Morana rests on Wikipedia, with a contradiction noted below.

- Gimbutas, Marija. "Slavic Religion." _Encyclopedia of Religion_. Reprinted at Encyclopedia.com. Accessed October 6, 2026. https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/slavic-religion.
- Gimbutas, Marija. "Perun." _Encyclopedia of Religion_. Reprinted at Encyclopedia.com. Accessed October 6, 2026. https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/perun.
- Gimbutas, Marija. "Veles-Volos." _Encyclopedia of Religion_. Reprinted at Encyclopedia.com. Accessed October 6, 2026. https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/veles-volos.
- Kravtsiw, Bohdan, and Bohdan Medwidsky. "Mythology." _Internet Encyclopedia of Ukraine_. Canadian Institute of Ukrainian Studies. Originally published in _Encyclopedia of Ukraine_, vol. 3 (1993). Accessed October 6, 2026. https://www.encyclopediaofukraine.com/display.asp?linkpath=pages%5CM%5CY%5CMythology.htm.
- "Mokosh." _Internet Encyclopedia of Ukraine_. Canadian Institute of Ukrainian Studies. Accessed October 6, 2026. https://www.encyclopediaofukraine.com/display.asp?linkpath=pages%5CM%5CO%5CMokosh.htm.
- "Veles." _Internet Encyclopedia of Ukraine_. Canadian Institute of Ukrainian Studies. Accessed October 6, 2026. https://www.encyclopediaofukraine.com/display.asp?linkpath=pages%5CV%5CE%5CVeles.htm.
- Dixon-Kennedy, Mike. _Encyclopedia of Russian and Slavic Myth and Legend_. Santa Barbara, CA: ABC-CLIO, 1998. (Existence confirmed at Open Library, https://openlibrary.org/books/OL360283M/Encyclopedia_of_Russian_Slavic_myth_and_legend, and the Internet Archive catalogue record.)

Per-deity:

- **Baba Yaga** (filed Slavic, a folklore witch listed among gods) — Gimbutas, Marija. "Slavic Religion." _Encyclopedia of Religion_. Reprinted at Encyclopedia.com. Accessed October 6, 2026. https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/slavic-religion. Gimbutas treats her as a witch who devours humans yet has prophetic gifts and reads her as the survival of an older goddess of death and regeneration, which supports both the "devourer and giver of wisdom" gloss and listing a folklore figure beside the gods.
- **Lada** (filed Slavic, "as later folklore records her") — "Lada." _Internet Encyclopedia of Ukraine_. Canadian Institute of Ukrainian Studies. Accessed October 6, 2026. https://www.encyclopediaofukraine.com/display.asp?linkpath=pages%5CL%5CA%5CLada.htm. The entry dates the oldest references to fifteenth-century Polish church prohibitions and the 1674 _Sinopsis_, and records that some scholars read "lada" as a song refrain rather than a goddess, which is exactly the hedge; it calls her a deity of fertility and marriage. See also Wikipedia, s.v. "Lada (mythology)," last modified July 16, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Lada_(mythology), for the current scholarly consensus against her historicity.
- **Morana** (filed Slavic; "also Marzanna, Morena") — Wikipedia, s.v. "Morana (goddess)," last modified September 15, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Morana_(goddess). Gives winter and death, the spring-equinox drowning or burning of her effigy, the regional names Marzanna, Morena and Marena, and flags her historicity as dubious; no academic page that could be fetched covers her under this name (see Notes).
- **Mokosh** (filed Slavic; "also Makosh, Mokosz") — "Mokosh." _Internet Encyclopedia of Ukraine_. Accessed October 6, 2026. https://www.encyclopediaofukraine.com/display.asp?linkpath=pages%5CM%5CO%5CMokosh.htm. Confirms fertility, water and women, the spinning of thread, and the spelling _Makosh_; _Mokosz_ (the Polish form) appears in none of the fetched sources.

#### Baltic

What the sources settle: the two _Encyclopedia of Religion_ Baltic entries (Biezais and Ankrava; Kursīte) give Pērkons/Perkūns the thunderer and Laima the goddess of fate ("fortune") and the Latvian earth-mother Zeme; the Lithuanian national encyclopedia (VLE) gives Perkūnas (thunder, lightning, storm, rain; Latvian Pērkons), Laima (birth and fate; Lithuanian Laimė; appearing as a linden) and Žemyna (earth goddess of crops, fruits and livestock); Gimbutas's _The Balts_ is the standard survey. The Lithuanian Folk Culture Centre states the tradition line, "the last pagan state in Europe."

- Biezais, Haralds, and Sigma Ankrava. "Baltic Religion: An Overview." _Encyclopedia of Religion_. Reprinted at Encyclopedia.com. Accessed October 6, 2026. https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/baltic-religion-overview.
- Kursīte, Janīna. "Baltic Religion: History of Study." _Encyclopedia of Religion_. Reprinted at Encyclopedia.com. Accessed October 6, 2026. https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/baltic-religion-history-study.
- _Visuotinė lietuvių enciklopedija_, s.v. "Perkūnas." Vilnius: Mokslo ir enciklopedijų leidybos centras. Accessed October 6, 2026. https://www.vle.lt/straipsnis/perkunas/.
- _Visuotinė lietuvių enciklopedija_, s.v. "Laima." Vilnius: Mokslo ir enciklopedijų leidybos centras. Accessed October 6, 2026. https://www.vle.lt/straipsnis/laima/.
- _Visuotinė lietuvių enciklopedija_, s.v. "Žemyna." Vilnius: Mokslo ir enciklopedijų leidybos centras. Accessed October 6, 2026. https://www.vle.lt/straipsnis/zemyna/.
- Gimbutas, Marija. _The Balts_. Ancient Peoples and Places 33. London: Thames and Hudson, 1963. (Existence confirmed through the _Antiquity_ review record at Cambridge Core, https://www.cambridge.org/core/journals/antiquity/article/abs/balts-by-marija-gimbutas-vol-33-ancient-peoples-and-places-london-thames-and-hudson-1963-286-pp-40-pls-58-figs-30s/3AC643C4724810CC880846BB1C6763E6, and Open Library, https://openlibrary.org/works/OL278802W/The_Balts.)
- Ambrazevičius, Rytis, ed. "Baltic Religion." In _Lithuanian Roots_. Vilnius: Lithuanian Folk Culture Centre, 1996. Accessed October 6, 2026. https://www.lnkc.lt/eknygos/roots/node16.html.

Per-deity:

- **Laima** (filed Baltic; "Latvian and Lithuanian," "linked with the linden; also Laime") — _Visuotinė lietuvių enciklopedija_, s.v. "Laima." Accessed October 6, 2026. https://www.vle.lt/straipsnis/laima/. States that she is more prominent in Latvian folklore, that Lithuanian tradition has the comparable Laimė, that she rules birth and fate and protects pregnant women, and that she appears as a linden tree, settling the two-nation filing, the linden and the second spelling.
- **Perkunas** (filed Baltic; "Latvian Perkons," "the oak") — _Visuotinė lietuvių enciklopedija_, s.v. "Perkūnas." Accessed October 6, 2026. https://www.vle.lt/straipsnis/perkunas/. Gives thunder, lightning, storm and rain and the Latvian form Pērkons; the oak enters only through the etymology it offers (Latin _quercus_), while Gimbutas's "Perun" entry above ties the oak to the Perun/Perkunas pair directly.
- **Zemyna** (filed Baltic; "also Zemynele") — _Visuotinė lietuvių enciklopedija_, s.v. "Žemyna." Accessed October 6, 2026. https://www.vle.lt/straipsnis/zemyna/. Confirms the ancient Lithuanian earth goddess who protects crops, fruits, livestock and people, with offerings at sowing and harvest; the diminutive Žemynėlė is only in Wikipedia, s.v. "Žemyna," last modified December 21, 2025, accessed October 6, 2026, https://en.wikipedia.org/wiki/%C5%BDemyna.
- **Tradition line** ("whose old religion lasted longest in Europe") — Ambrazevičius, "Baltic Religion," _Lithuanian Roots_, https://www.lnkc.lt/eknygos/roots/node16.html. Calls Lithuania the last pagan state in Europe, with Žemaitija converting only from 1413; Biezais and Ankrava add that the Balts stayed relatively untouched by Christianity into the seventeenth century.

#### Finnish

What the sources settle: the Kalevala in Crawford's 1888 translation names both deities in the words the descriptions use — Ukko "Father of the heavens" who sends the rain for the barley (Rune II) and rules the storm-clouds (Rune XIV), Mielikki "Mistress of the woods," "Forest-mother," Tapio's consort (preface and Rune XIV). Siikala's _Encyclopedia of Religion_ entry gives Ukko's attestation before Lönnrot (medieval incantations; Agricola's 1551 list), and the Finnish Literature Society page confirms the epic's 1835 and 1849 publication.

- Lönnrot, Elias. _The Kalevala: The Epic Poem of Finland_. Translated by John Martin Crawford. 1888. Internet Sacred Text Archive. Accessed October 6, 2026. https://sacred-texts.com/neu/kveng/index.htm. (Preface: https://sacred-texts.com/neu/kveng/kvpref.htm; Rune II: https://sacred-texts.com/neu/kveng/kvrune02.htm; Rune XIV: https://sacred-texts.com/neu/kveng/kvrune14.htm.)
- Lönnrot, Elias. _The Kalevala: The Epic Poem of Finland_. Translated by John Martin Crawford. Project Gutenberg ebook 5186. Accessed October 6, 2026. https://www.gutenberg.org/files/5186/5186-h/5186-h.htm.
- Siikala, Anna-Leena. "Ukko." _Encyclopedia of Religion_. Reprinted at Encyclopedia.com. Accessed October 6, 2026. https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/ukko.
- Pentikäinen, Juha. "Finnish Religions." _Encyclopedia of Religion_. Reprinted at Encyclopedia.com. Accessed October 6, 2026. https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/finnish-religions.
- Finnish Literature Society. "Kalevala – European Heritage Label." Accessed October 6, 2026. https://www.finlit.fi/en/about-us/kalevala-european-heritage-label/.

Per-deity:

- **Ukko** (filed Finnish; a Kalevala figure) — Siikala, Anna-Leena. "Ukko." _Encyclopedia of Religion_. Reprinted at Encyclopedia.com. Accessed October 6, 2026. https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/ukko. Medieval incantations call on Ukko as god in heaven and Agricola's 1551 psalter preface records the toast drunk to him at spring sowing, so he is a god of thunder, rain and weather attested independently of the Kalevala, and the sowing toast is the "rain the harvest needs."
- **Mielikki** (filed Finnish; a Kalevala figure, "wife of Tapio," "healing") — Lönnrot, _The Kalevala_, trans. Crawford, preface, https://sacred-texts.com/neu/kveng/kvpref.htm, and Rune XIV, https://sacred-texts.com/neu/kveng/kvrune14.htm. The preface reads "His consort is Mielikki, 'The Honey-rich Mother of the Woodland,' 'The Hostess of the Glen and Forest,'" and Rune XIV has Lemminkäinen pray to "Mistress of the woods, Mielikki, / Forest-mother" for his hunt, settling forest, hunt and Tapio; the healing is supported only by Wikipedia, s.v. "Mielikki," last modified June 24, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Mielikki, which also gives her pre-Kalevala attestation (Ganander 1789, hunting charms).
- **Tradition line** ("many named in the Kalevala") — Pentikäinen, "Finnish Religions," https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/finnish-religions. Describes Lönnrot's 1849 _New Kalevala_ as a compiled and reinterpreted epic over the rune singers' older worldview, which is why the description says "named in" rather than "from."

#### Hindu

What the sources settle: Johnson's Oxford dictionary is the reference work for all fourteen names and their Sanskrit spellings; the _Encyclopedia of Religion_ entries at Encyclopedia.com settle Soma (drink, plant and god; later the Moon), Agni (the fire that carries offerings) and Durga (slayer of Mahiṣāsura); the Concise Oxford Dictionary of World Religions and the Wellcome Collection settle Dhanvantari; museum object records settle Surya's seven horses and Hanuman's mountain of herbs; Wikipedia's list supplies the one-line glosses and _Ganapati_.

- Johnson, W. J. _A Dictionary of Hinduism_. Oxford: Oxford University Press, 2009. (Existence confirmed through the Internet Archive catalogue record, https://archive.org/details/dictionaryofhind0000john, and Oxford University Press's product listing, https://global.oup.com/academic/product/a-dictionary-of-hinduism-9780198610250.)
- Brereton, Joel P. "Soma." _Encyclopedia of Religion_. Reprinted at Encyclopedia.com. Accessed October 6, 2026. https://www.encyclopedia.com/philosophy-and-religion/eastern-religions/hinduism/soma.
- Findly, Ellison Banks. "Agni." _Encyclopedia of Religion_. Reprinted at Encyclopedia.com. Accessed October 6, 2026. https://www.encyclopedia.com/philosophy-and-religion/eastern-religions/hinduism/agni.
- Lorenzen, David N. "Durgā: Hinduism." _Encyclopedia of Religion_. Reprinted at Encyclopedia.com. Accessed October 6, 2026. https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/durga-hinduism.
- "Dhanvantari." _The Concise Oxford Dictionary of World Religions_. Reprinted at Encyclopedia.com. Accessed October 6, 2026. https://www.encyclopedia.com/religion/dictionaries-thesauruses-pictures-and-press-releases/dhanvantari.
- Wikipedia, s.v. "List of Hindu deities," last modified December 12, 2023, accessed October 6, 2026, https://en.wikipedia.org/wiki/List_of_Hindu_deities.

Per-deity:

- **Soma** (filed Hindu as "Vedic"; "later identified with the Moon") — Brereton, Joel P. "Soma." _Encyclopedia of Religion_. Reprinted at Encyclopedia.com. Accessed October 6, 2026. https://www.encyclopedia.com/philosophy-and-religion/eastern-religions/hinduism/soma. Defines Soma as the drink offered to the gods, the plant pressed for it and the god of both, and quotes the later Veda on the Moon waxing as it fills with soma, settling both the Vedic filing and the hedge.
- **Dhanvantari** (filed Hindu; "god of Ayurveda") — "Dhanvantari." _The Concise Oxford Dictionary of World Religions_. Reprinted at Encyclopedia.com. https://www.encyclopedia.com/religion/dictionaries-thesauruses-pictures-and-press-releases/dhanvantari. Gives "the physician of the gods in Hinduism, who emerged from the Churning of the Ocean bearing the cup of amṛta"; the Ayurveda link is the Wellcome Collection's authority label "Dhanvantarī (Founder of Ayurveda)," accessed October 6, 2026, https://wellcomecollection.org/concepts/bzmtxvc4, and Wikipedia, s.v. "Dhanvantari," last modified August 9, 2026, https://en.wikipedia.org/wiki/Dhanvantari, which adds that he is counted an avatar of Vishnu.
- **Hanuman** ("who carried a mountain of healing herbs") — Cleveland Museum of Art. "Hanuman Brings the Mountain of Healing Plants; Rama Extracts the Arrow from Lakshmana as Hanuman and a Bear Prepare to Treat Him (recto)." Palm-leaf manuscript, Odisha, late 1700s. Accession 1979.21.a. Accessed October 6, 2026. https://www.clevelandart.org/art/1979.21.a. The object record names the episode as the table describes it.
- **Surya** ("riding a chariot drawn by seven horses") — Philadelphia Museum of Art. "Surya, The Sun God." Sculpture, c. 12th century. Object 41833. Accessed October 6, 2026. https://www.philamuseum.org/objects/41833. Reads "The god stands in a chariot pulled by seven horses. His charioteer Aruna (sunrise) guides the chariot across the sky."
- **Agni** ("who carries offerings to the gods") — Findly, "Agni," and, on the same Encyclopedia.com page, Knipe (_Encyclopedia of India_) and Bowker (_Concise Oxford Dictionary of World Religions_): "All offerings must pass through the sacred fire to reach their divine destinations."
- **Durga** ("slayer of the buffalo demon Mahishasura") — Lorenzen, "Durgā: Hinduism." Names the victory over Mahiṣāsura as her most important exploit and her as Śiva's śakti, sharing forms with Pārvatī and Kālī.
- **Krishna and Vishnu** ("an avatar of Vishnu"; "avatars such as Rama and Krishna") — Wikipedia, s.v. "List of Hindu deities," https://en.wikipedia.org/wiki/List_of_Hindu_deities. Lists Krishna as the eighth avatar of Vishnu and Vishnu as preserver and second of the Trimurti; Johnson's dictionary is the print authority.

#### Taoist

What the sources settle: Xi Wangmu as the Queen Mother of the West, Taoist goddess of immortality whose peaches confer long life; the spellings Xiwangmu / Xi-Wang-Mu beside the table's Xi Wangmu.

- Mark, Emily. "Most Popular Gods & Goddesses of Ancient China." World History Encyclopedia. April 25, 2016. Accessed October 6, 2026. https://www.worldhistory.org/article/894/most-popular-gods--goddesses-of-ancient-china/.
- Wikipedia, s.v. "Queen Mother of the West." Last modified December 13, 2024. Accessed October 6, 2026. https://en.wikipedia.org/wiki/Queen_Mother_of_the_West.
- Christie, Anthony. _Chinese Mythology_. Hamlyn's Mythology Series. Feltham: Hamlyn, 1968. (Existence confirmed through the _Journal of the Royal Asiatic Society_ review, https://www.cambridge.org/core/journals/journal-of-the-royal-asiatic-society/article/abs/chinese-mythology-by-anthony-christie-hamlyns-mythology-series-pp-141-feltham-hamlyn-publishing-group-1968-87p/B46788498D7288CA5A29D797E299B5A1.)

Per-deity:

- **Xi Wangmu** (filed Taoist; spelled Xi Wangmu, where the sources write Xiwangmu or Xi-Wang-Mu) — Mark, "Most Popular Gods & Goddesses of Ancient China." Names her "goddess of immortality" with an orchard whose peaches give immortality, and spells her "Xiwangmu or Xi-Wang-Mu"; the Wikipedia entry adds that she "became deeply integrated into Taoist tradition", which settles the Taoist filing.

#### Chinese Buddhist

What the sources settle: Kuan Yin as the Chinese form of the bodhisattva Avalokiteshvara, worshipped as a goddess of compassion and mercy; the spellings Kuan Yin, Kwan Yin, Guanyin and the Japanese Kannon; her veneration across East Asia.

- Nelson-Atkins Museum of Art. "Guanyin of the Southern Sea." Collection. Accessed October 6, 2026. https://art.nelson-atkins.org/objects/597/guanyin-of-the-southern-sea.
- Fitzwilliam Museum, University of Cambridge. "Look, Think, Do: Wooden Figure of Kwan Yin [Guanyin] God(dess) of Mercy." Accessed October 6, 2026. https://fitzmuseum.cam.ac.uk/learn-with-us/look-think-do/wooden-figure-of-kwan-yin-guanyin-goddess-of-mercy.
- Asian Art Museum, San Francisco. "The Bodhisattva Avalokiteshvara (Guanyin)." Collections. Accessed October 6, 2026. https://collections.asianart.org/collection/guanyin/.
- Wikipedia, s.v. "Guanyin." Last modified December 28, 2024. Accessed October 6, 2026. https://en.wikipedia.org/wiki/Guanyin.

Per-deity:

- **Kuan Yin** (filed Chinese Buddhist though honoured across East Asia; spelled Kuan Yin, with Guanyin, Kwan Yin, Kannon in the description) — Nelson-Atkins Museum of Art, "Guanyin of the Southern Sea." Labels the figure "Kuan-Yin of the southern seas" beside "Guanyin" and calls her the "Chinese Buddhist bodhisattva of compassion and mercy", which settles both the spelling and the filing; the Asian Art Museum page settles the "goddess" gloss (from the Yuan dynasty "a female form of the bodhisattva became popular" and was worshipped "as a protective goddess"), and the Wikipedia entry settles Kannon and the East Asian spread.

#### Chinese folk

What the sources settle: Shennong as the Divine Farmer / Divine Husbandman, originator of agriculture and herbal medicine, who is _said_ to have tasted the herbs; his standing as a deity of Chinese folk religion.

- National Library of Medicine. "Emperors and Physicians: Shen Nung." Chinese Traditional Medicine (online exhibition). Accessed October 6, 2026. https://www.nlm.nih.gov/hmd/topics/chinese-traditional/foundation-emperor_9203733-shennung-sm.html?imgid=3.
- Wellcome Collection. "Chinese Woodcut, Famous Medical Figures: Shen Nong." Accessed October 6, 2026. https://wellcomecollection.org/works/fevczv94.
- Daniel, Gillian. "The Legend of the Divine Farmer." _Public Domain Review_, November 3, 2015. Accessed October 6, 2026. https://publicdomainreview.org/essay/the-legend-of-the-divine-farmer/.
- Wikipedia, s.v. "Shennong." Last modified October 1, 2026. Accessed October 6, 2026. https://en.wikipedia.org/wiki/Shennong.

Per-deity:

- **Shennong** (filed Chinese folk; description hedges "said to have tasted every herb"; epithet "the Divine Husbandman") — National Library of Medicine, "Emperors and Physicians: Shen Nung." Writes "He is said to have tasted hundreds of herbs to test their medicinal value" and names the _Divine Husbandman's Materia Medica_, which settles the hedge and the epithet; the Wikipedia entry settles the folk filing ("a legendary Chinese ruler and deity in Chinese folk religion ... patron deity of farmers ... and practitioners of traditional Chinese medicine").

#### Japanese

What the sources settle: Amaterasu, Tsukuyomi and Inari as kami of the classical texts and of Shinto worship, Benzaiten as a Buddhist import from Hindu Sarasvatī; the spellings Tsukiyomi and Benten; Inari as rice, grain, fox and commerce deity.

- Mori, Mizue. "Amaterasu." _Encyclopedia of Shinto_, Kokugakuin University. Accessed October 6, 2026. https://d-museum.kokugakuin.ac.jp/eos/detail/?id=9440.
- Mori, Mizue. "Tsukuyomi." _Encyclopedia of Shinto_, Kokugakuin University. Accessed October 6, 2026. https://d-museum.kokugakuin.ac.jp/eos/detail/?id=9136.
- Kadoya, Atsushi. "Ukanomitama." _Encyclopedia of Shinto_, Kokugakuin University. Accessed October 6, 2026. https://d-museum.kokugakuin.ac.jp/eos/detail/?id=9742.
- Nogami, Takahiro. "Inari Shinkō." _Encyclopedia of Shinto_, Kokugakuin University. Accessed October 6, 2026. https://d-museum.kokugakuin.ac.jp/eos/detail/?id=9027.
- Iwai, Hiroshi. "Shichifukujin." _Encyclopedia of Shinto_, Kokugakuin University. Accessed October 6, 2026. https://d-museum.kokugakuin.ac.jp/eos/detail/?id=9974.
- Cartwright, Mark. "Amaterasu." World History Encyclopedia. December 17, 2012. Accessed October 6, 2026. https://www.worldhistory.org/Amaterasu/.
- Cartwright, Mark. "Inari." World History Encyclopedia. May 23, 2017. Accessed October 6, 2026. https://www.worldhistory.org/Inari/.
- Cartwright, Mark. "Seven Lucky Gods." World History Encyclopedia. June 24, 2013; last modified September 27, 2024. Accessed October 6, 2026. https://www.worldhistory.org/Shichifukujin/.
- Ashkenazi, Michael. _Handbook of Japanese Mythology_. Handbooks of World Mythology. Santa Barbara, CA: ABC-CLIO, 2003. (Existence confirmed through Google Books, https://books.google.com/books/about/Handbook_of_Japanese_Mythology.html?id=GGFrygAACAAJ, and the _Education About Asia_ review, https://www.asianstudies.org/publications/eaa/archives/handbook-of-japanese-mythology-2/.)

Per-deity:

- **Benzaiten** (filed Japanese though from Hindu Saraswati; also Benten) — Iwai, "Shichifukujin." States "Benzaiten was originally the Indian goddess of water, Sarasvatī, and is known in Japan as a patron tutelary of music and eloquence (wisdom)", which settles the derivation and the water, music, eloquence and knowledge domains; Cartwright, "Seven Lucky Gods," writes "Benten (or Benzaiten)" and adds wealth, settling the alternative spelling.
- **Tsukuyomi** (spelled Tsukuyomi over Tsukiyomi) — Mori, "Tsukuyomi." Heads the entry "Tsukuyomi" and calls him "usually considered a male kami with rule over the night", brother of Amaterasu; Cartwright, "Amaterasu," writes "Tsukiyomi-no-Mikoto", so the description's alternative is attested too.
- **Inari** (description says "deity", not god or goddess; names foxes, prosperity and sake) — Nogami, "Inari Shinkō." Gives Inari as an old man carrying rice, the fox as the kami's messenger, and the urban cult of "commercial prosperity", plus the fusion with the Buddhist Dakiniten; Kadoya, "Ukanomitama," identifies the rice spirit "most commonly known as the kami Inari". Neither names sake (see Notes).
- **Amaterasu** ("goddess of the Sun and the universe, ancestor of the imperial line") — Mori, "Amaterasu." "Kami of the Sun", ruler of the Plain of High Heaven, "ancestress of Japan's imperial line", which settles the Sun and the lineage; "universe" is the gloss's own word (see Notes).

#### Akan

What the sources settle: the _Encyclopedia of Religion_ entry fixes the high god and the earth as the two addressed in every prayer, Nyame's names and Asase Yaa's Thursday, and defines the abosom as the personal deities of lakes, rivers and rocks; the _Encyclopedia of African Religion_ carries entries under the spellings "Nyame" and "Asase Yaa"; the Wikipedia articles supply the three river and lake abosom, their parentage and the Fante spellings, which the encyclopedia entries do not name.

- Gilbert, Michelle. "Akan Religion." In _Encyclopedia of Religion_, via Encyclopedia.com. Accessed October 6, 2026. https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/akan-religion.
- Asante, Molefi Kete, and Ama Mazama, eds. _Encyclopedia of African Religion_. 2 vols. Thousand Oaks, CA: SAGE Publications, 2009. (Existence and the entries "Nyame" and "Asase Yaa" confirmed on the publisher's page, https://www.sagepub.com/en-us/nam/encyclopedia-of-african-religion/book228941, and the Open Library record; the entries themselves sit behind SAGE's sign-in and were not read.)
- Wikipedia, s.v. "Akan religion," last modified December 4, 2024, accessed October 6, 2026, https://en.wikipedia.org/wiki/Akan_religion.
- Wikipedia, s.v. "Tano (Ta Kora)," last modified August 19, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Tano_(Ta_Kora).
- Wikipedia, s.v. "Asase Ya/Afua," last modified September 25, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Asase_Ya/Afua.
- Wikipedia, s.v. "Nyankapon-Nyame-Odomankoma," last modified August 26, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Nyankapon-Nyame-Odomankoma.

Per-deity:

- **Anansi** (left out) — Wikipedia, s.v. "Akan religion," last modified December 4, 2024, accessed October 6, 2026, https://en.wikipedia.org/wiki/Akan_religion. The article calls Ananse a folk hero and trickster of the folktales, and the _Encyclopedia of Religion_ entry does not name him among the abosom at all; neither source calls him a deity, so by the list's own rule for Medea and Morgan le Fay he stays off it. "Anansi Kokuroko", the great designer, is an epithet of Nyame, not a second god.
- **Asase Yaa** (one row, not an Asante and a Fante one) — Wikipedia, s.v. "Asase Ya/Afua," last modified September 25, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Asase_Ya/Afua. The Asante name her Yaa for Thursday and the Fante Efua or Afua for Friday; the same earth goddess with a different day-name, so one row under the spelling the _Encyclopedia of Religion_ and the SAGE encyclopedia both use, with Afua in the description.
- **Tano** (Tano, not Ta Kora) — Wikipedia, s.v. "Tano (Ta Kora)," last modified August 19, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Tano_(Ta_Kora). The river's name is the one every source leads with; Ta Kora ("immense father") is a praise-name, and Tando the Fante form, so both go in the description.

#### Igbo

What the sources settle: the _Encyclopedia of Religion_ entry gives the high god's names, Ala as earth mother with the spelling Ani, the yam god under the spelling Ahiajioku, and Agwu as the spirit that possesses the herbalist; the Wikipedia articles supply Amadioha and Anyanwu, which the entry does not name, and the dialect spellings of Ala.

- Arinze, Francis A., and Ogbu Kalu. "Igbo Religion." In _Encyclopedia of Religion_, via Encyclopedia.com. Accessed October 6, 2026. https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/igbo-religion.
- Wikipedia, s.v. "Chukwu," last modified September 15, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Chukwu.
- Wikipedia, s.v. "Ala (odinani)," last modified August 22, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Ala_(odinani).
- Wikipedia, s.v. "Amadioha," last modified September 1, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Amadioha.
- Wikipedia, s.v. "Anyanwu," last modified September 12, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Anyanwu.
- Wikipedia, s.v. "Agwu Nsi," last modified September 20, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Agwu_Nsi.
- Wikipedia, s.v. "Njoku Ji," last modified July 11, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Njoku_Ji.
- Wikipedia, s.v. "Alusi," last modified August 20, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Alusi.

Per-deity:

- **Ala** (Ala, not Ani) — Arinze and Kalu, "Igbo Religion," _Encyclopedia of Religion_ via Encyclopedia.com, https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/igbo-religion. The entry writes "Ani/Ala"; Wikipedia's article title and the Encyclopedia.com "Deities of the Igbo Religion" piece lead with Ala, so Ala is the name and Ani (Achebe's spelling) the first alternate.
- **Agwu** (Agwu, not Agwu Nsi) — the same entry names the spirit "Agwu"; Wikipedia's article is "Agwu Nsi" and gives Agwu Nso as a variant. The shorter form is the one scholarship uses and the longer goes in the description.
- **Njoku Ji** (Njoku Ji, not Ahiajoku) — Wikipedia, s.v. "Alusi," last modified August 20, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Alusi, which lists "Njoku Ji (also Ahiajioku)". A judgement call: the _Encyclopedia of Religion_ entry uses Ahiajioku, the Owerri festival name. Njoku Ji is the deity's own name and Ahiajoku the festival's, so Njoku Ji leads and the three festival spellings follow. Note that the gloss names the yam, a crop, as Demeter's names grain; it names no herb.
- **Chukwu** (Chukwu, not Chineke) — Arinze and Kalu, "Igbo Religion," as above. The entry lists Chukwu first among the high god's names, and Wikipedia's article is titled Chukwu; Chineke, "the spirit that creates", is the next most typed.

#### Fon and Ewe

What the sources settle: the two _Encyclopedia of Religion_ entries fix the tradition as Fon and Ewe, Nana Buluku as the creator who bore Mawu and Lisa, Mawu as Moon and night and Lisa as Sun and day, Sagbata as earth and smallpox, Sogbo/Xevioso as thunder and sea-rain, and Legba as Mawu's youngest son and the trickster of the crossroads; Herskovits's _Dahomey_ is the English scholarship those entries rest on and its chapter titles carry the spellings Xevioso, Legba and Nana Buluku; Blier's _African Vodun_ fixes Benin and Togo and the link to Haiti; the Wikipedia articles supply Gu, Dan and Agbe and the diaspora spellings.

- Gilbert, Michelle. "Fon and Ewe Religion." In _Encyclopedia of Religion_, via Encyclopedia.com. Accessed October 6, 2026. https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/fon-and-ewe-religion.
- Thayer, James S. "Mawu-Lisa." In _Encyclopedia of Religion_, via Encyclopedia.com. Accessed October 6, 2026. https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/mawu-lisa.
- Herskovits, Melville J. _Dahomey: An Ancient West African Kingdom_. 2 vols. New York: J. J. Augustin, 1938. (Title page read in the Internet Archive's full text, https://archive.org/details/in.ernet.dli.2015.36395; Open Library and Yale's eHRAF record the Northwestern University Press reprint, Evanston, 1967.)
- Blier, Suzanne Preston. _African Vodun: Art, Psychology, and Power_. Chicago: University of Chicago Press, 1995. (Existence, place, year and ISBN 0-226-05858-1 confirmed on the Open Library record, https://openlibrary.org/books/OL1078882M/African_vodun; the text was not read.)
- Wikipedia, s.v. "West African Vodun," last modified January 19, 2025, accessed October 6, 2026, https://en.wikipedia.org/wiki/West_African_Vodun.
- Wikipedia, s.v. "Dahomean religion," last modified August 14, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Dahomean_religion.
- Wikipedia, s.v. "Xevioso," last modified August 8, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Xevioso.
- Wikipedia, s.v. "Nana Buluku," last modified September 7, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Nana_Buluku.
- Wikipedia, s.v. "Ayida-Weddo," last modified January 14, 2024, accessed October 6, 2026, https://en.wikipedia.org/wiki/Ayida-Weddo.
- Wikipedia, s.v. "Ogun," last modified October 1, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Ogun. (The page https://en.wikipedia.org/wiki/Gu_(vodun) redirects here; the section on the Fon names Gu and the Ewe Egu.)

Per-deity:

- **Legba** (filed Fon and Ewe, beside Yoruba's Elegba and Vodou's Papa Legba) — Gilbert, "Fon and Ewe Religion," _Encyclopedia of Religion_ via Encyclopedia.com, https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/fon-and-ewe-religion. The entry makes Legba the youngest son of Mawu whose worship is universal among the Fon and Ewe, which settles that he is a vodun in his own right and not only Haiti's lwa or the Yoruba Eshu under another name; three rows, three traditions, as the list's rule allows. Wikipedia's "Papa Legba" article says the lwa's origins lie "in Yoruba traditions in Dahomey", which is the diaspora view and does not unseat the entry.
- **Mawu-Lisa** (one row, not two) — Thayer, "Mawu-Lisa," _Encyclopedia of Religion_ via Encyclopedia.com, https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/mawu-lisa. The entry is titled for the pair and the companion entry says the two "are often merged together in everyday speech as though they were a single deity"; one row named as the scholarship names it, with Mawu and Lisa in the description so either typed alone matches.
- **Nana Buluku** (a row of her own above Mawu-Lisa) — Gilbert, "Fon and Ewe Religion," as above, which names Nana Buluku the creator, both male and female, who bore Mawu and Lisa. She is a distinct figure with her own Candomble cult, not an epithet of Mawu.
- **Sagbata** (Sagbata, not Sakpata) — Gilbert, "Fon and Ewe Religion," as above, which spells the earth vodun Sagbata, as does Wikipedia's "Dahomean religion". Sakpata is the spelling of Blier and of modern Benin, and Shapata of older English writing; both are in the description. The brief suggested Sakpata; see Notes.
- **Xevioso** (Xevioso, not Heviosso) — Herskovits, _Dahomey_, as above, whose chapter XXVI is "The chief-priest in charge of the Xevioso temple", and Gilbert's entry, which writes "Sogbo/Xevioso". The x is the Fon orthography's h-sound; Hevioso and Heviosso are in the description. The brief suggested Heviosso; see Notes.
- **Gu** (filed Fon and Ewe, beside Yoruba's Ogun) — Wikipedia, s.v. "Ogun," as above, and s.v. "Xevioso," which makes Gu Xevioso's twin. The Ogun article records Dahomean ritual calling Gu a deity of Nago (Yoruba) origin, so the two rows are honestly one god under two traditions, as Apollo is Greek and Roman; the Fon row carries the Ewe spelling Egu.
- **Dan** (filed Fon and Ewe, beside Vodou's Damballah) — Wikipedia, s.v. "West African Vodun," as above, which lists "Dan/Da" as the serpent vodun of riches and cool breezes, and s.v. "Ayida-Weddo," which gives the Fon spellings Aido Hwedo and Ayido Hwedo and the creation story of the serpent carrying Mawu-Lisa. The two articles settle that the Fon serpent is one figure with the rainbow, which the diaspora split into Damballah and Ayida Wedo; one Fon row, both Haitian names in its description. The _Encyclopedia of Religion_ entry names only "Dambada Hwedo", the vodun of forgotten ancestors, which is a different figure and is not listed.
- **Agbe** — Wikipedia, s.v. "West African Vodun" and s.v. "Dahomean religion," as above, both of which make Agbe the sea pantheon's head beside the earth and thunder pantheons. The only row resting on Wikipedia alone; drop it if the list wants seven.

#### Yoruba

What the sources settle: the nine orishas' domains and their Yoruba spellings (Shango, Oshun, Oya, Obatala, Ogun, Yemaya/Yemoja); the diaspora forms Elegua, Ogoun, Ochun, Oxum, Oxalá, Changó, Xangô, Iansã, Osain; Orunmila as the deity of Ifa; Osanyin as the orisha of leaves and healing; the carrying of the tradition into Santería and Candomblé.

- Mark, Joshua J. "Orisha." World History Encyclopedia. October 6, 2021; last modified October 7, 2022. Accessed October 6, 2026. https://www.worldhistory.org/Orisha/.
- Mark, Joshua J. "Oshun." World History Encyclopedia. October 1, 2021. Accessed October 6, 2026. https://www.worldhistory.org/Oshun/.
- UNESCO. "Ifa Divination System." Intangible Cultural Heritage, Representative List, inscribed 2008. Accessed October 6, 2026. https://ich.unesco.org/en/RL/ifa-divination-system-00146.
- Yale University Art Gallery. "Herbalist's Staff (Ọ̀pá Ọ̀sanyin)." Collections. Accessed October 6, 2026. https://artgallery.yale.edu/collections/objects/61022.
- Denver Art Museum. "Eshu Elegba Figure." Collection. Accessed October 6, 2026. https://www.denverartmuseum.org/en/object/1985.296.
- Edmonds, Jahsun. "A Vital Matters Perspective: Yemonja in the Diaspora." Vital Matters, Fowler Museum at UCLA. Accessed October 6, 2026. https://vitalmatters.fowler.ucla.edu/perspectives/v0406.
- Thompson, Robert Farris. _Flash of the Spirit: African and Afro-American Art and Philosophy_. New York: Vintage Books, 1984. (Existence confirmed through Penguin Random House, https://www.penguinrandomhouse.com/books/178308/flash-of-the-spirit-by-robert-farris-thompson/.)
- Karade, Baba Ifa. _The Handbook of Yoruba Religious Concepts_. Rev. ed. Weiser Classics. Newburyport, MA: Weiser Books, 2020. (Existence confirmed through Red Wheel/Weiser, https://redwheelweiser.com/book/the-handbook-of-yoruba-religious-concepts-9781578636679/.)
- Wikipedia, s.v. "Shango." Last modified October 5, 2026. Accessed October 6, 2026. https://en.wikipedia.org/wiki/Shango.
- Wikipedia, s.v. "Ọbatala." Last modified September 24, 2026. Accessed October 6, 2026. https://en.wikipedia.org/wiki/%E1%BB%8Cbatala.
- Wikipedia, s.v. "Ọya." Last modified September 24, 2026. Accessed October 6, 2026. https://en.wikipedia.org/wiki/%E1%BB%8Cya.
- Wikipedia, s.v. "Ọsanyìn." Last modified August 20, 2026. Accessed October 6, 2026. https://en.wikipedia.org/wiki/%E1%BB%8Csany%C3%ACn.

Per-deity:

- **Elegba** (filed Yoruba, with Papa Legba a separate Haitian Vodou row; spelled Elegba over Eshu / Elegua) — Denver Art Museum, "Eshu Elegba Figure." A museum label that pairs the two names and describes "a divine messenger who stands at the crossroads between this world and the next", which settles Elegba as a current English form; Mark, "Orisha," lists "Esu (also Eshu, Elegua)" among the Yoruba orishas, so the Yoruba row stands apart from the lwa.
- **Shango** (spelled Shango over Sango) — Mark, "Orisha." Uses "Shango" for the "god of lightning and thunder, fire, virility, war"; Wikipedia, "Shango," records Sango, Changó and Xangô as the other forms and adds drumming and justice.
- **Yemaya** (spelled Yemaya over Yemoja; "orisha of the sea") — Edmonds, "Yemonja in the Diaspora" (Fowler Museum). Explains that in Nigeria she is "a river divinity ... associated with motherhood, nurturing, and healing" and in the diaspora "a powerful ocean deity", which settles both the sea gloss and the plurality of spellings; Mark, "Orisha," writes "Yemaya (also Yemoja)".
- **Oshun** (also Ochun, Oxum) — Mark, "Oshun." Gives Oxum (Candomblé) and Ochun (Santería) as her diaspora names and fresh water, love, fertility as her domains.
- **Obatala** (also Oxala) — Wikipedia, "Ọbatala." Gives Oxalá as the Brazilian form and "King of White Cloth", purity and creation; Mark, "Orisha," supports "sky god of creation ... champion of purity".
- **Oya** (also Yansa, Iansa; "cemetery gates") — Wikipedia, "Ọya." Gives Yànsàn-án and Iansã and her rule over the spirits of the dead and cemeteries; Mark, "Orisha," supports "guardian of the dead".
- **Orunmila** ("witness of fate in Ifa") — UNESCO, "Ifa Divination System." "Ifa refers to the mystical figure Ifa or Orunmila, regarded by the Yoruba as the deity of wisdom and intellectual development", which settles the wisdom and divination filing; Karade's handbook names Orunmila "the prophet of Yoruba religion".
- **Osanyin** (also Osain, Ossaim) — Wikipedia, "Ọsanyìn." "The omniscient knowledge of leaf, herb and matter", with Osaín / Ossain / Ossaím as the Latin American spellings; the Yale label confirms herbalists "enlist the aid of ... Osanyin" against illness (but see Notes on its wording).

#### Kongo

What the sources settle: every reference work names one supreme being, Nzambi (Mpungu), and all of them say that ancestors, not gods, are the heart of Kongo religion; the female counterpart Nzambici, the simbi, Kalunga and Mbumba are attested in the scholarship and the encyclopaedias, but as a counterpart, a class of spirits, a force and a serpent respectively, and the rows say so. Palo's creator is the same Nzambi under Cuban spellings, which settles filing him once, as Kongo, with the Palo names in the description.

- Janzen, John M. "Kongo Religion." In _Encyclopedia of Religion_. Encyclopedia.com. Accessed October 6, 2026. https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/kongo-religion.
- Ogungbile, David. "God: African Supreme Beings." In _Encyclopedia of Religion_. Encyclopedia.com. Accessed October 6, 2026. https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/god-african-supreme-beings.
- MacGaffey, Wyatt. _Religion and Society in Central Africa: The BaKongo of Lower Zaire_. Chicago: University of Chicago Press, 1986. Existence confirmed at https://searchworks.stanford.edu/view/1215388 and in Louis Brenner's review, _Bulletin of SOAS_ 51, no. 2 (1988): 399, https://www.cambridge.org/core/services/aop-cambridge-core/content/view/S0041977X00115356; text not read (see Notes).
- Janzen, John M., and Wyatt MacGaffey. _An Anthology of Kongo Religion: Primary Texts from Lower Zaïre_. University of Kansas Publications in Anthropology 5. Lawrence: University of Kansas, 1974. Existence confirmed at https://opac.aua.ac.ke/cgi-bin/koha/opac-ISBDdetail.pl?biblionumber=7803; text not read.
- Thompson, Robert Farris. _Flash of the Spirit: African and Afro-American Art and Philosophy_. New York: Random House, 1983. Existence confirmed at https://archive.org/details/flashofspiritafr00thom_0; text not read.
- Fu-Kiau, Kimbwandende Kia Bunseki. _African Cosmology of the Bântu-Kôngo: Tying the Spiritual Knot, Principles of Life and Living_. 2nd ed. Athelia Henrietta Press, 2001. Existence confirmed at https://openlibrary.org/books/OL8714034M/African_Cosmology_of_the_Bantu-Kongo (the record gives no place of publication); text not read.
- Brown, Ras Michael. _African-Atlantic Cultures and the South Carolina Lowcountry_. Cambridge Studies on the American South. New York: Cambridge University Press, 2012. Existence confirmed in Gwendolyn Midlo Hall's review, _American Historical Review_ 119, no. 2 (2014): 530–31, https://academic.oup.com/ahr/article-abstract/119/2/530/44946; read through Wells, Alexis S. "Spirits of the Landscape Rediscovered: Ras Michael Brown's _African-Atlantic Cultures and the South Carolina Lowcountry_." _Southern Spaces_, August 26, 2013. https://southernspaces.org/2013/spirits-landscape-rediscovered-ras-michael-browns-african-atlantic-cultures-and-south-carolina-lowcountry/.
- Wikipedia, s.v. "Kongo religion," last modified December 19, 2024, accessed October 6, 2026, https://en.wikipedia.org/wiki/Kongo_religion.

Per-deity:

- **Nzambi Mpungu** (filed Kongo, with Palo's Nsambi in the description) — Janzen, John M. "Kongo Religion." In _Encyclopedia of Religion_. Encyclopedia.com. Accessed October 6, 2026. https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/kongo-religion. Janzen names "the belief in a supreme being, known as Nzambi Kalunga or Nzambi Mpungu Tulendo", omnipotent creator and "ultimate source of power", which settles the spelling _Nzambi Mpungu_ as the one the English-language scholarship uses (Ogungbile, above, agrees: "Nzambi (whose nickname is Mpungu) is the supreme being of the Bakongo people"). Wikipedia, s.v. "Nzambi Ampungu," last modified August 26, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Nzambi_Ampungu, gives the sky, the Sun and fire, the alternates Nzambi a Mpungu and Nzambi Ampungu, and the Cuban continuation ("In Afro-Cuban Palo religion, Nzambi created the universe"); Wikipedia, s.v. "Palo (religion)," last modified December 13, 2024, accessed October 6, 2026, https://en.wikipedia.org/wiki/Palo_(religion), says Palo "draws heavily upon the traditional Kongo religion of Central Africa" and calls its creator "Nsambi or Sambia". Together they settle filing him once, as Kongo, the way the list files Apollo once with his Roman name beside him.
- **Nzambici** (filed Kongo; goddess of the earth and the Moon) — Wikipedia, s.v. "Nzambici," last modified August 16, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Nzambici: "the eternal Goddess of Essence, as well as Moon, Earth and Sky Mother in Bakongo religion", "the female counterpart to Nzambi Ampungu", with "Nzambi becoming associated with the sun and Nzambici with the earth and moon"; the article rests on Fu-Kiau 2001, Harold Scheub's _A Dictionary of African Mythology_ (2000), Asante and Mazama 2009 and Brown 2012. Wikipedia, s.v. "Kongo religion" (above) says the pair "were perceived as the one Great Spirit" before colonisation. That settles her as a goddess in her own right and settles the earth, Moon and essence; the oldest English record is Dennett 1906 (see Notes). She has no reliably attested second spelling, so the description carries none.
- **Simbi** (filed Kongo; a class of spirits, included because the scholarship calls them nature deities) — Wells, Alexis S. "Spirits of the Landscape Rediscovered: Ras Michael Brown's _African-Atlantic Cultures and the South Carolina Lowcountry_." _Southern Spaces_, August 26, 2013. https://southernspaces.org/2013/spirits-landscape-rediscovered-ras-michael-browns-african-atlantic-cultures-and-south-carolina-lowcountry/. The Emory-published review relays Brown's account of the simbi as "nature deities" of the West-Central African landscape dwelling in "rocks and springs", possibly "primordial ancestors originating from the land of the dead", and the Cambridge University Press book behind it is the one monograph on them. That settles inclusion under the brief's rule: a class of spirits, but one the sources also call divine, and the row says "spirits ... honoured as nature deities". Wikipedia, s.v. "Simbi," last modified September 1, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Simbi, settles the spellings (Simbi, Cymbee, plural Bisimbi or Basimbi), the water and rock dwelling, the role as "intermediaries who travel the Kalûnga Line", the Haitian Vodou and Hoodoo continuations, and cites MacGaffey (that the bisimbi were "first inhabitants of the land before the arrival of human ancestors").
- **Kalunga** (filed Kongo; god, force and boundary — the sources use all three) — Wikipedia, s.v. "Kalûnga Line," last modified August 31, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Kalunga_Line. The article, resting on Fu-Kiau 2001 and MacGaffey 1974, states the lead sense in both halves, "Kalûnga as the Supreme God" and "the watery, energetic boundary separating the land of the living" from the ancestors, and gives the ocean and the fiery origin. Janzen (above) confirms the divine use from a peer-reviewed reference work by naming the supreme being "Nzambi Kalunga". That settles that Kalunga is a divine name and not only a cosmological line, and settles the row's three clauses. The name is given without the circumflex (plain ASCII, as the list requires); "Kalunga Line" in the description catches the typed form.
- **Mbumba** (filed Kongo; rainbow serpent) — Wikipedia, s.v. "Kongo religion," last modified December 19, 2024, accessed October 6, 2026, https://en.wikipedia.org/wiki/Kongo_religion, names Mbumba as "the rainbow and a water serpent who reached the sky by climbing trees" among the Kongo spirits, which is the whole of the row; Wikipedia, s.v. "Nzambi Ampungu" (above) lists Mbumba among the Kongo deities. The search record points to Janzen and MacGaffey 1974 for the rainbow-serpent cult of Mbumba Luangu (see Notes), but that text was not fetched, so the row carries no alternate name.

#### Zulu

What the sources settle: Zulu religion centres on the ancestral shades (amadlozi), and the reference works are careful to say so; above them they name a creator and first ancestor (uNkulunkulu / uMvelinqangi), a Lord of the Sky of thunder and lightning, and one figure every source calls a goddess outright, the princess of heaven Nomkhubulwane. Mamlambo is a river spirit in the dictionary and a river goddess in the mythology references; she is the weakest of the four and the one to drop if the owner wants only unambiguous deities.

- Preston-Whyte, Eleanor M. "Zulu Religion." In _Encyclopedia of Religion_. Encyclopedia.com. Accessed October 6, 2026. https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/zulu-religion.
- Thayer, James S. "Unkulunkulu." In _Encyclopedia of Religion_. Encyclopedia.com. Accessed October 6, 2026. https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/unkulunkulu.
- _Dictionary of South African English_, s.v. "umvelinqangi." Accessed October 6, 2026. https://dsae.co.za/entry/umvelinqangi/e07507.
- _Dictionary of South African English_, s.v. "mamlambo." Accessed October 6, 2026. https://dsae.co.za/entry/mamlambo/e04522.
- Callaway, Henry. _The Religious System of the Amazulu_. Springvale, Natal: J. A. Blair, 1870. Existence confirmed at https://openlibrary.org/books/OL7150829M/The_religious_system_of_the_Amazulu and https://archive.org/details/ReligiousSystemOfTheAmazulu; text not read (see Notes).
- Berglund, Axel-Ivar. _Zulu Thought-Patterns and Symbolism_. Studia Missionalia Upsaliensia 22. London: C. Hurst, 1976. Reprint, Bloomington: Indiana University Press, 1989. Existence confirmed at https://openlibrary.org/books/OL4588743M/Zulu_thought-patterns_and_symbolism and https://iupress.org/9780253212054/zulu-thought-patterns-and-symbolism/; text not read (see Notes).
- Wikipedia, s.v. "Zulu traditional religion," last modified October 4, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Zulu_traditional_religion.

Per-deity:

- **Unkulunkulu** (filed Zulu; creator and first ancestor) — Thayer, James S. "Unkulunkulu." In _Encyclopedia of Religion_. Encyclopedia.com. Accessed October 6, 2026. https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/unkulunkulu. Thayer calls him "the first man" who "came out of, or broke off from, a bed of reeds", created humanity and "gave them their social institutions, such as marriage and chieftainship", and says he "is called uMvelinqangi". That settles the row as creator _and_ first ancestor rather than a sky god, and settles that uMvelinqangi belongs in his description. Wikipedia, s.v. "Unkulunkulu," last modified August 26, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Unkulunkulu, adds the missionary history: the pre-Christian sense was "old-old one", the ancestor of a lineage, and the creator reading grew with the mid-1800s missions. Callaway 1870 is the primary record of that debate (Wikipedia, s.v. "The Religious System of the Amazulu," last modified March 25, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/The_Religious_System_of_the_Amazulu: "the old-old one, the great-great-grandfather", who taught hunting, fire-making and agriculture). The description says both, and a practitioner reading either way will find their reading there.
- **Umvelinqangi** (filed Zulu; supreme being and Lord of the Sky — a judgement call, see Notes) — _Dictionary of South African English_, s.v. "umvelinqangi," accessed October 6, 2026, https://dsae.co.za/entry/umvelinqangi/e07507. The dictionary defines it as "the original being, the first to appear; used among isiXhosa- and isiZulu-speakers as a praise-name or term of address for the traditional supreme being and for the Christian God", from _vela_ (come forth) and _-qangi_ (first), with citations from 1855 ("The First Comer-Out") to 1978 ("the-one-who-emerged-first ... The Creator of all things"), and records both views of the relation to uNkulunkulu: one citation says they are the same, another that uNkulunkulu "is regarded more as an ancestor than deity". That settles the name as a living praise-name for the supreme being, and settles the "often identified with Unkulunkulu" clause. For the sky, thunder and lightning: Preston-Whyte (above) names "the lord of the sky and personification of heaven", iNkosi yeZulu, as the power behind thunder and lightning, and Wikipedia, s.v. "Zulu traditional religion" (above), identifies Umvelinqangi as the "sky god, god of thunder and earthquake", "sometimes conflated with Unkulunkulu". Spelling: the dictionary heads the entry _umvelinqangi_ and lists mvelangqangi, mvelingqangi, umvelingqangi, umvelinqange; the row capitalises the head form as the list capitalises Unkulunkulu.
- **Nomkhubulwane** (filed Zulu; goddess of rain, the rainbow and the crops; Inkosazana folded into her description — a judgement call, see Notes) — Preston-Whyte, Eleanor M. "Zulu Religion." In _Encyclopedia of Religion_. Encyclopedia.com. Accessed October 6, 2026. https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/zulu-religion. Preston-Whyte names "iNkosazana (Princess of Heaven / Nomkhubulwana)" and writes that "this female deity is closely associated with abundance and sufficient (but not too much) rain. She bestows fertility on crops, cattle, and human beings." That is the one place a peer-reviewed reference work says "deity" of a Zulu figure without qualification, and it settles that Inkosazana and Nomkhubulwane are the same goddess under a title and a name. Wikipedia, s.v. "Zulu traditional religion" (above) gives the rainbow, agriculture, rain and the spring shapeshifting, and Wikipedia, s.v. "Inkosazana," last modified August 16, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Inkosazana, records the minority view that splits them (Inkosazana for growth and girls, Nomkhubulwane for harvest and mothers). The girls' planting rite is the Nomdede / Nomkhubulwana festival: Adeyemi, Sola. "Performing Myths, Ritualising Modernity: Dancing for Nomkhubulwana and the Reinvention of Zulu Tradition." In _A Gazelle of the Savannah: Sunday Ododo and the Framing of Techno-Cultural Performance in Nigeria_, edited by Osakue S. Omoera, Sola Adeyemi, and Benedict Binebai, 435–45. Rochester, UK: Alpha Crownes, 2012. Record at https://gala.gre.ac.uk/10255/, which calls it the "annual Nomkhubulwana (Nomdede) festival in celebration of the Virgin Queen"; and "Nomkhubulwane Zulu Goddess of Rain." _Ulwazi Programme_. Accessed October 6, 2026. https://www.ulwaziprogramme.org/nomkhubulwane-zulu-goddess-of-rain/ ("the Zulu Goddess of rain, nature, and fertility ... 'she who chooses the state of an animal'"), a KwaZulu-Natal community-heritage site, which supports the modern spelling.
- **Mamlambo** (filed Zulu; goddess and spirit of rivers — the sources differ, see Notes) — _Dictionary of South African English_, s.v. "mamlambo," accessed October 6, 2026, https://dsae.co.za/entry/mamlambo/e04522. The dictionary defines her as "a female water spirit, usually in the form of a snake or a woman requiring sacrifice, sometimes of human life, in return for her favour", from isiZulu _umamlambo_, "one of the river", with the variant Momlambo and a 1990 citation calling her "the goddess of the rivers of Natal". That settles the etymology, the serpent form and the "sought and feared" clause, and shows the word "goddess" is in the South African record, not only on mythology sites. Wikipedia, s.v. "Mamlambo," last modified April 25, 2025, accessed October 6, 2026, https://en.wikipedia.org/wiki/Mamlambo ("a deity in South African and Zulu mythology, the 'goddess of rivers'", citing Michael Jordan's _Dictionary of Gods and Goddesses_, 2nd ed., 2004) and Wikipedia, s.v. "Zulu traditional religion" (above; "Mamlambo (Nomhoyi) ... the goddess of rivers") support the filing as a goddess and the alternate Nomhoyi.

#### Haitian Vodou

What the sources settle: the five lwa and their roles; the Kreyòl spellings Danbala, Ezili, Bawon Samdi, Grann Brijit beside the French ones the table uses; Ezili as a family of spirits; Bawon Samdi as chief of the Gede and Grann Brijit as his wife; the Brigid behind Brigitte's name.

- Florida State College at Jacksonville. "What Is Vodou?" and "Death, Dying, and the Soul in Haitian Vodou." In _World Religions_. Lumen Learning / Pressbooks, hosted by the University of Nevada, Reno. CC BY 4.0. Accessed October 6, 2026. https://unr.pressbooks.pub/worldreligions/chapter/what-is-vodou/ and https://unr.pressbooks.pub/worldreligions/chapter/death-dying-and-the-soul-in-haitian-vodou/.
- Nwokocha, Eziaku Atuama. "An Equilibrist Vodou Goddess." _Harvard Divinity Bulletin_, Summer/Autumn 2013. Accessed October 6, 2026. https://bulletin.hds.harvard.edu/an-equilibrist-vodou-goddess/.
- Fowler Museum at UCLA. "Curator's Choice: A Vodou Drapo for Papa Gede." Accessed October 6, 2026. https://fowler.ucla.edu/curators-choice-a-vodou-drapo-for-papa-gede/.
- Fowler Museum at UCLA. "In Extremis: Death and Life in 21st-Century Haitian Art." Exhibition, September 16, 2012–January 20, 2013. Accessed October 6, 2026. https://fowler.ucla.edu/exhibitions/in-extremis-death-and-life-in-21st%E2%80%90century-haitian-art/.
- Michel, Claudine. "Vodun (Voodoo)." In _Contemporary American Religion_. Via Encyclopedia.com. Accessed October 6, 2026. https://www.encyclopedia.com/religion/legal-and-political-magazines/vodun-voodoo.
- Long, Carolyn Morrow. "Voudou." _64 Parishes_ (Louisiana Endowment for the Humanities). October 31, 2016; last updated February 9, 2021. Accessed October 6, 2026. https://64parishes.org/entry/voudou.
- Deren, Maya. _Divine Horsemen: The Living Gods of Haiti_. London: Thames and Hudson, 1953. Reprint, New Paltz, NY: McPherson, 1983. (Confirmed through McPherson & Company, https://www.mcphersonco.com/store/p45/Divine_Horsemen_The_Living_Gods_of_Haiti_by_Maya_Deren.html, and Open Library, https://openlibrary.org/books/OL3173920M/Divine_horsemen.)
- Desmangles, Leslie G. _The Faces of the Gods: Vodou and Roman Catholicism in Haiti_. Chapel Hill: University of North Carolina Press, 1992. (Confirmed through Open Library, https://openlibrary.org/works/OL4321480W.)
- Cosentino, Donald J., ed. _Sacred Arts of Haitian Vodou_. Los Angeles: UCLA Fowler Museum of Cultural History, 1995. (Confirmed through Open Library, https://openlibrary.org/books/OL792534M/Sacred_arts_of_Haitian_vodou.)
- Noonan, Kerry. "Gran Brijit: Haitian Vodou Guardian of the Cemetery." In _Goddesses in World Culture_, edited by Patricia Monaghan. Santa Barbara, CA: Praeger, 2010. (The set confirmed through Open Library, https://openlibrary.org/works/OL35706227W; the chapter's volume and pages were not verified, see Notes.)
- Wikipedia, s.v. "Papa Legba." Last modified October 3, 2026. Accessed October 6, 2026. https://en.wikipedia.org/wiki/Papa_Legba.
- Wikipedia, s.v. "Damballa." Last modified September 15, 2026. Accessed October 6, 2026. https://en.wikipedia.org/wiki/Damballa.
- Wikipedia, s.v. "Baron Samedi." Last modified September 25, 2026. Accessed October 6, 2026. https://en.wikipedia.org/wiki/Baron_Samedi.
- Wikipedia, s.v. "Maman Brigitte." Last modified August 18, 2026. Accessed October 6, 2026. https://en.wikipedia.org/wiki/Maman_Brigitte.

Per-deity:

- **Papa Legba** (filed Haitian Vodou as a row apart from Yoruba Elegba; also Legba; "opens every ceremony") — Florida State College at Jacksonville, "What Is Vodou?" "Papa Legba is the first lwa to be addressed at such ceremonies, as he is the gatekeeper", which settles the opening role and the lwa filing; Michel lists "Legba (Atibon Legba)" among the lwa, and Wikipedia, "Papa Legba," records Eṣu and Elegua as the related but distinct Yoruba figures.
- **Damballah** (spelled Damballah over Danbala) — Michel, "Vodun (Voodoo)." Writes "Damballah (Danbala)", attesting both forms; the Pressbooks chapter uses "Danbala" for "the serpent spirit of fertility and regeneration ... of waterfalls, rainbows" and reproduces Hyppolite's painting titled _Damballah the Torch_; Deren's chapter headings use "Damballah". Wikipedia, "Damballa," supports "creation" and "peaceful stability" (see Notes on "rain").
- **Erzulie** (described as a "family of lwa", naming Erzulie Freda and Erzulie Dantor; also Ezili) — Nwokocha, "An Equilibrist Vodou Goddess." Treats Ezili as a group — Ezili Freda, Ezili Dantò, La Sirenn, Gran Ezili, Ezili je wouj — and gives Freda love, luxury, vanity and jealousy, which settles the hedge, the two named members and the Ezili spelling; Michel names "Ezili Freda Daome" and "Ezili Danto".
- **Baron Samedi** ("head of the Gede"; "resurrection") — Fowler Museum, "A Vodou Drapo for Papa Gede." "Bawon Samdi ... serves as the chief of the Gede clan", which settles the headship; the "In Extremis" page has him preside "over key aspects of mortality, sexuality, and rebirth", and Wikipedia, "Baron Samedi," calls him "the loa of resurrection" and gives Bawon Samdi / Bawon Sanmdi as the other spellings.
- **Maman Brigitte** ("wife of Baron Samedi"; a lwa named from Irish Brigid; spelled Maman Brigitte over Grann Brijit) — Florida State College at Jacksonville, "Death, Dying, and the Soul in Haitian Vodou." "A female lwa named Grann Brijit (Old or Great Brigid), who is often called Manman Brijit (Mother Brigid)", sharing with Bawon the "passage between life and death", which settles the wife's role, the Brigid gloss on the name and the Kreyòl spellings; the Fowler drapo page calls her "Bawon Samdi's wife", and Wikipedia, "Maman Brigitte," gives the French spelling and the derivation "possibly deriving from Saint Brigid of Ireland", with Noonan's chapter as the scholarly treatment of the Irish link.

#### Aztec

What the sources settle: Mexicolore's UNAM-authored god list and its
teachers' resource give all five names, the name-glosses the descriptions use
(She with the Jade Skirt, Prince of Flowers, Quetzal-Flower) and each deity's
domain; World History Encyclopedia covers Tlaloc and Quetzalcoatl with
Kukulkan and the morning star; Miller and Taube is the dictionary both lean on.

- Olivier, Guilhem. "The Gods of the Mexica (2)." Mexicolore. August 28, 2011. Accessed October 6, 2026. https://www.mexicolore.co.uk/aztecs/gods/gods-of-the-mexica-2/1000. (Tláloc, "god of rain and lightning"; Chalchiuhtlicue, "'She with the jade skirt' – goddess of rivers and births"; Quetzalcoátl, creator god; Xochipilli, "'Prince of flowers' – god of flowers, nobles, music"; Xochiquétzal, "'Quetzal-flower' – mother goddess, patroness of weavers.")
- Hernández, Christine, and Gabrielle Vail. "A Comparison of Aztec/Central Mexican and Maya Deities (1)." Mexicolore. October 6, 2022. Accessed October 6, 2026. https://www.mexicolore.co.uk/maya/teachers/resource-comparison-of-aztec-central-mexican-and-maya-deities-1. (Tlaloc "lord of the rains, storms, and weather"; Chalchiuhtlicue "goddess of all bodies of water"; Xochiquetzal "Xochipilli's consort," flower goddess.)
- Cartwright, Mark. "Tlaloc." World History Encyclopedia. Last modified September 26, 2022. Accessed October 6, 2026. https://www.worldhistory.org/Tlaloc/.
- Cartwright, Mark. "Quetzalcóatl." World History Encyclopedia. Last modified March 29, 2023. Accessed October 6, 2026. https://www.worldhistory.org/Quetzalcoatl/. (Wind, learning, creation, "identified with the Morning Star Venus"; "known as Kukulkán to the Maya.")
- Miller, Mary, and Karl Taube. _The Gods and Symbols of Ancient Mexico and the Maya: An Illustrated Dictionary of Mesoamerican Religion_. London: Thames and Hudson, 1993. (Existence confirmed through the Cambridge Core record of Bruce Welsh's review, _Latin American Antiquity_ 5, no. 2 (1994): 185, and Google Books, ISBN 0500050686.)

Per-deity:

- **Xochipilli** (filed Aztec; "the visionary plants" in the description) — Mursell, Ian. "The Aztecs' Use of Hallucinogenic Drugs." Mexicolore. December 7, 2023. Accessed October 6, 2026. https://www.mexicolore.co.uk/aztecs/aztec-life/hallucinogens. The clause rests on the early-sixteenth-century Chalco statue, carved with teonanacatl mushrooms, morning glory, tobacco and sinicuiche, not on any textual epithet; the god's own domains in every list are flowers, song, music, dance and games.
- **Chalchiuhtlicue** ("birth and baptism") — Wikipedia, s.v. "Chalchiuhtlicue," last modified September 14, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Chalchiuhtlicue. The only fetched source that says baptism: it gives her as goddess of "water, seas, oceans, rivers, lakes, streams, rain, storms, and baptism" and describes the bathing and naming of the newborn on its fourth day, which the academic sources call "births" and "ceremonies related to birth" ("Chalchiuhtlicue," image caption, World History Encyclopedia, uploaded by Jordy Samuels, November 6, 2025, https://www.worldhistory.org/image/21257/chalchiuhtlicue/).
- **Quetzalcoatl** ("Maya Kukulkan") — Cartwright, "Quetzalcóatl," above, and Mark, "The Mayan Pantheon" (under Maya). Both name Kukulkan/Kukulcan as the Maya form of the same god, which settles filing him once, under Aztec, with the Maya name in the gloss.

#### Maya

What the sources settle: World History Encyclopedia's Maya pantheon covers
Ixchel's domains and the Kukulkan–Quetzalcoatl identity; Mexicolore, after
Miller and Taube, carries the scholarly caution on her moon; Wikipedia is the
one fetched page that writes both "Ixchel" and "Ix Chel".

- Mark, Joshua J. "The Mayan Pantheon: The Many Gods of the Maya." World History Encyclopedia. Last modified March 4, 2024. Accessed October 6, 2026. https://www.worldhistory.org/article/415/the-mayan-pantheon-the-many-gods-of-the-maya/. (Ixchel: childbirth, medicine, the moon, weaving; Kukulcan is Quetzalcoatl.)
- Hernández, Christine, and Gabrielle Vail. "A Comparison of Aztec/Central Mexican and Maya Deities (1)." Mexicolore. October 6, 2022. Accessed October 6, 2026. https://www.mexicolore.co.uk/maya/teachers/resource-comparison-of-aztec-central-mexican-and-maya-deities-1. (Writes her "Chak Chel": weaving, healing, childbirth.)
- Miller, Mary, and Karl Taube. _The Gods and Symbols of Ancient Mexico and the Maya: An Illustrated Dictionary of Mesoamerican Religion_. London: Thames and Hudson, 1993.

Per-deity:

- **Ixchel** ("goddess of the Moon"; "also Ix Chel") — Wikipedia, s.v. "Ixchel," last modified September 1, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Ixchel. It uses "Ixchel" and "Ix Chel" interchangeably, which settles the alternative spelling, and gives her as goddess of fertility, midwifery, medicine and water with a section "Confusion with the moon goddess." Mursell, Ian. "What Was the Ancient Maya Symbol for the Moon?" Mexicolore. n.d. Accessed October 6, 2026. https://www.mexicolore.co.uk/aztecs/ask-us/what-was-the-maya-moon-symbol, quoting Miller and Taube, agrees: the young moon goddess of Classic art "is not Ixchel, as is often alleged; Ixchel is an old goddess." The moon in the description is the popular attribution, not the scholarly one (see Notes).

#### Inca

What the sources settle: World History Encyclopedia covers Inti (sun, royal
descent, Inti Raymi) and names Pachamama "the earth goddess" of Inca
religion; the Smithsonian Folklife piece gives "Mother Earth" and the living
Andean cult.

- Cartwright, Mark. "Inti." World History Encyclopedia. Last modified February 21, 2025. Accessed October 6, 2026. https://www.worldhistory.org/Inti/. (Sun god and patron of empire; rulers from Manco Capac claimed descent; Inti Raymi at the June solstice, revived at Cuzco.)
- Cartwright, Mark. "Inca Religion." World History Encyclopedia. Last modified October 5, 2026. Accessed October 6, 2026. https://www.worldhistory.org/Inca_Religion/. (Inti "the god of the Sun"; Pachamama "the earth goddess," with field altars for the harvest.)
- Turpo, Rufino, as told to Roger Valencia. "An Offering to the Pachamama." Smithsonian Folklife Festival Blog, June 8, 2015. Accessed October 6, 2026. https://festival.si.edu/blog/2015/an-offering-to-pachamama/.

Per-deity:

- **Pachamama** (filed Inca as a goddess; "Andean goddess ... Mother Earth") — Turpo, "An Offering to the Pachamama," above. A Quechua practitioner's own account gives the name as "Mother Earth" in Quechua and Aymara, "mother of all living beings, sustainer of life," with offerings for fertility and protection: it settles that "Mother Earth" is the tradition's gloss, and that her cult is living and Andean, wider than the Inca state the row is filed under, which the description's "Andean" already says.

#### Hawaiian

What the sources settle: Beckwith has a chapter each for Lono, Kane, Pele and
Hina and treats Laka under the hula; the University of Hawaiʻi's Kahoʻiwai
akua list has an entry for all five with their domains and kinolau; the Bishop
Museum paper gives Pele as volcano goddess and the four great gods' domains.

- Beckwith, Martha. _Hawaiian Mythology_. Honolulu: University of Hawaii Press, 1970. First published 1940 by Yale University Press. (Record confirmed at Ulukau, https://www.ulukau.org/ulukau-books/?a=d&d=EBOOK-BECKWIT1&l=en, and the Internet Archive; chapters "The God Lono," "The Kane Worship," "The Pele Myth," "The Pele Sisters," "Pele Legends," "Hina Myths" from the table of contents at https://books.google.com/books/about/Hawaiian_Mythology.html?id=BqElGaH4DiIC; text read in the 1940 scan at https://archive.org/details/hawaiianmytholog00beck_0.)
- Dizon, Puaokamele, and Annemarie Paikai. "Akua Vocabulary List." Kahoʻiwai: Reclaiming Hawaiian Knowledge Sovereignty, University of Hawaiʻi. Accessed October 6, 2026. https://www.hawaii.edu/kawaihapai/akua-list/. Entries fetched: "Hina" (/hina/), "Kāne" (/kane/), "Laka" (/laka/), "Lono" (/lono/), "Pelehonuamea" (/pelehonuamea/). (Hina: "the moon is her bodily form," kapa making, female energies; Kāne: freshwater streams, pools and the life-giving waters, taro, ʻawa; Laka: "the akua of hula, maile lei making, ʻieʻie weaving, and healing"; Lono: agriculture, rain clouds, thunder, rain, rainbows, "Makahiki is a ceremony for Lono"; Pele: volcanic phenomena, "usually resides at Halemaʻumaʻu at Kīlauea.")
- Nimmo, H. Arlo. "The Cult of Pele in Traditional Hawaiʻi." _Bishop Museum Occasional Papers_ 30 (1990): 41–87. https://hbs.bishopmuseum.org/pubs-online/pdf/op30p41.pdf. (Listed in the series index at https://hbs.bishopmuseum.org/pubs-online/bmop.html. "Pele, volcano goddess of Hawaiʻi"; Lono "associated with agriculture, rain, and peace ... the central god in the Makahiki harvest festival"; Kane "the god of procreation"; Ku and Hina the male-female godhead.)

Per-deity:

- **Hina** (filed Hawaiian; "Hawaiian and Polynesian goddess of the Moon, tapa-making and women") — Beckwith, _Hawaiian Mythology_, chap. "Hina Myths" (p. 214 in the University of Hawaii Press printing). Its opening identifies Hina-hanaia-i-ka-malama, "the woman who worked in the moon," with "the Tahitian who beats out tapa in the moon," which settles the moon, the tapa and the hedge that she is Polynesian beyond Hawaiʻi; the Kahoʻiwai entry adds that she is "the god associated with female energies."
- **Kane** ("creation, life, sunlight and fresh water") — Wikipedia, s.v. "Kāne," last modified September 16, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/K%C4%81ne. The only fetched source for sunlight: "Kāne is the creator and gives life associated with dawn, sun, and sky"; creation, procreation and the water of life are Beckwith's ("The Kane Worship"), fresh water the Kahoʻiwai entry's.

#### Wicca

What the sources settle: Hutton is the academic history of the religion;
Malta-Król states, from inside British Traditional Wicca, what the Horned God
is and that the Green Man is one of his aspects.

- Hutton, Ronald. _The Triumph of the Moon: A History of Modern Pagan Witchcraft_. Oxford: Oxford University Press, 1999. (Confirmed through the Cambridge Core record of Alec Ryrie's review, _Journal of Ecclesiastical History_ 53, no. 2 (2002), and the Internet Archive, https://archive.org/details/triumphofmoonhis00hutt.)
- Malta-Król, Joanna. "The Horned God: Divine Male Principle in British Traditional Wicca." In _Manifestations of Male Image in the World's Cultures_, edited by Renata Iwicka, 157–78. Kraków: Jagiellonian University Press, 2021. Record at https://www.cambridge.org/core/books/abs/manifestations-of-male-image-in-the-worlds-cultures/horned-god-divine-male-principle-in-british-traditional-wicca/06791E7F8D0F4385DE388972509A5D3C.

Per-deity:

- **Horned God** (filed Wicca; "god of the wild, the hunt, fertility and the dying and returning year") — Malta-Król, "The Horned God," above. Its abstract gives him as "full of strength, vigour and sexuality, the one who fertilises the land, ruler of woodland and patron of animals," with the aspects Horned One, Lord of Death, Oak and Holly King and Green Man whose cycle follows the Wheel of the Year, which settles the wild, fertility and the dying-and-returning year as Wicca's own account; Hutton (above) is the history of the god's making.

#### English folklore

What the sources settle: Raglan's article is where the foliate head got its
name, Centerwall confirms the coinage, and Shakespeare is the earliest Herne;
Malta-Król and Wikipedia carry the two "honoured in modern practice" clauses.

- Raglan, Lady. "The 'Green Man' in Church Architecture." _Folklore_ 50, no. 1 (1939): 45–57. https://doi.org/10.1080/0015587X.1939.9718148. (Verified through its Crossref record.)
- Shakespeare, William. _The Merry Wives of Windsor_, act 4, scene 4. Folger Shakespeare Library. Accessed October 6, 2026. https://www.folger.edu/explore/shakespeares-works/the-merry-wives-of-windsor/read/4/4/.
- Hutton, Ronald. _The Triumph of the Moon: A History of Modern Pagan Witchcraft_. Oxford: Oxford University Press, 1999.

Per-deity:

- **Green Man** ("the leaf-masked face of European church carving, honoured in modern practice") — Raglan, above. The article that gave the foliate head its name settles that the figure is a carving first and a modern reading second; Centerwall, Brandon S. "The Name of the Green Man." _Folklore_ 108, no. 1–2 (1997): 25–33. https://doi.org/10.1080/0015587X.1997.9715933, settles that the name itself is Raglan's coinage; and Malta-Król (under Wicca) lists the Green Man among the Wiccan God's four aspects, which settles "honoured in modern practice."
- **Herne** ("English folklore's antlered hunter of Windsor Forest, honoured as a horned god in modern practice"; "Herne the Hunter") — Shakespeare, above. Mistress Page's "Herne the Hunter, / Sometime a keeper here in Windsor Forest, / Doth all the wintertime, at still midnight, / Walk round about an oak, with great ragged horns" settles the antlers, the forest, the oak and the name as folklore Shakespeare already found told. "Herne the Hunter," in _Encyclopaedia Britannica_, 11th ed., vol. 13 (1911), transcribed at Wikisource, https://en.wikisource.org/wiki/1911_Encyclop%C3%A6dia_Britannica/Herne_the_Hunter, settles the Windsor Great Park haunting, Herne's oak and the keeper story. Wikipedia, s.v. "Herne the Hunter," last modified October 5, 2026, accessed October 6, 2026, https://en.wikipedia.org/wiki/Herne_the_Hunter, settles the modern clause: Margaret Murray "identified Cernunnos with Herne in her 1933 book _The God of the Witches_," and "some modern Neopagans such as Wiccans accept Lowe Thompson's equation of Herne with Cernunnos"; it also confirms Shakespeare's 1597 play as the earliest mention.

#### Italian folk witchcraft

What the sources settle: Leland's own text is the figure's source, and
Magliocco is the folklorist's account of what lay behind it.

- Leland, Charles Godfrey. _Aradia; or, The Gospel of the Witches_. London: David Nutt, 1899. https://archive.org/details/aradiaorgospelof00lela.
- Magliocco, Sabina. "Who Was Aradia? The History and Development of a Legend." _The Pomegranate_ 18 (2002): 5–22. https://doi.org/10.1558/pome.v13i10.5. (Verified through its Crossref record.)
- Hutton, Ronald. _The Triumph of the Moon: A History of Modern Pagan Witchcraft_. Oxford: Oxford University Press, 1999.

Per-deity:

- **Aradia** (filed Italian folk witchcraft; "witch goddess of Leland's _Aradia_, daughter of Diana, who taught witchcraft") — Leland, above. Chapter I, "How Diana Gave Birth to Aradia (Herodias)," tells "how Diana sent Aradia on earth to relieve [mankind] by teaching resistance and Sorcery," which settles every clause of the description and that the figure is Leland's text's. Magliocco, above, supports the hedge "of Leland's _Aradia_" by tracing the legend's Italian folklore before and apart from Leland.

#### What the sources did not carry

Rows were reworded to what the sources say where a clause rested on nothing
fetched: Hyacinthus lost a spelling no source has (_Hiakinthos_); Anat's
hunting and love, Epona's journeys, Holda's elder tree, Eir's place among
Frigg's handmaidens, Mokosh's Polish spelling, Mielikki's healing, Inari's
sake, Damballah's rain, Shennong's "every herb", Obatala's fatherhood of the
orishas, Kane's sunlight and Ixchel's unhedged Moon went the same way, and
Morana's and Lada's rows now say what is rite and what is disputed. Taranis's
wheel is a scholar's reading, not an inscription, and the row says so. Still
unattested on a fetched page and left standing, since no source contradicts
them: Hygieia's cleanliness, Faunus's prophecy, Osiris and the grain's
rebirth, Athena's _Pallas Athene_, Anahita's healing (World History
Encyclopedia only), Zemyna's diminutive and Mamlambo's _Nomhoyi_ (Wikipedia
only), and the Yoruba tradition's _Lucumi_. Chalchiuhtlicue's "baptism",
Herne's modern cult and Baron Samedi's "resurrection" rest on Wikipedia
alone.

**Judgement calls the owner may want to revisit**, each argued above under
its deity: Umvelinqangi as a row beside Unkulunkulu rather than a name in his
description; Inkosazana folded into Nomkhubulwane; Mamlambo, whom the
_Dictionary of South African English_ calls a spirit and one source a
goddess; Simbi, a class of spirits the scholarship calls nature deities;
Kalunga, at once a god, a force and a boundary; Agbe and Mbumba, each on
Wikipedia alone; the spellings _Sagbata_ and _Xevioso_ over Sakpata and
Heviosso, the peer-reviewed reference's over Benin's; and Legba, Gu and Dan
as Fon and Ewe rows beside Yoruba's Elegba and Ogun and Vodou's Papa Legba
and Damballah, one god under several traditions as Apollo is Greek and
Roman.
