import { beginSeedTransaction } from './idempotent';
import { deities, deityTraditions } from '../../modules/vocabulary/schema/deities';
import { seedTwoTierVocabulary } from './two-tier-vocabulary';
import type { SeedDatabase, SeedDeity, SeedDeityTradition, SeedTransaction } from './types';

// MB.127's deity vocabulary: thirty-five traditions and the deities filed
// under them, a starting set an admin may edit. Reference data, not a
// scenario — migrate.yml seeds it alone, so it inserts the bootstrap user
// itself. Transcribed from the seed doc's two tables, which deities.test.ts
// parses and compares row by row; the doc, not this file, is where a row is
// argued and sourced. Names are copied as written, never title-cased
// (`Manannan mac Lir`), and no slug is written down
// (claude-docs/db/deity-vocabulary-seed.md, "The deity vocabulary seed").

/** The doc's traditions, in its order, which nothing reads — traditions list alphabetically. */
export const DEITY_TRADITIONS: SeedDeityTradition[] = [
  {
    name: 'Greek',
    description:
      'The gods of ancient Greece: the Olympians, the Titans, the primordial powers, and the heroes and enchantresses honoured as gods.',
  },
  {
    name: 'Roman',
    description:
      'The gods of ancient Rome, many identified with Greek counterparts, beside the native Italic powers of field, door and hearth.',
  },
  {
    name: 'Anatolian',
    description:
      "The gods of Phrygia and ancient Anatolia, whose Great Mother's cult spread to Greece and Rome.",
  },
  {
    name: 'Egyptian',
    description:
      'The gods of ancient Egypt, of the Sun, the Nile, the dead and the order of the world.',
  },
  {
    name: 'Sumerian',
    description:
      'The gods of Sumer, the oldest Mesopotamian record, whose names the later cities carried into their own.',
  },
  {
    name: 'Akkadian and Babylonian',
    description:
      'The gods of Akkad, Babylon and Assyria, many of them the Sumerian gods under Akkadian names.',
  },
  {
    name: 'Canaanite and Phoenician',
    description: 'The gods of Canaan, Ugarit and the Phoenician cities of the Levant.',
  },
  {
    name: 'Persian',
    description:
      'The gods of ancient Iran, the yazatas of the Zoroastrian tradition and those before it.',
  },
  {
    name: 'Norse',
    description:
      'The gods of the Norse, the Aesir and the Vanir, as the Eddas and the sagas record them.',
  },
  {
    name: 'Anglo-Saxon and Continental Germanic',
    description:
      'The gods and goddesses of the Anglo-Saxons and the continental Germanic peoples, known from Bede, Tacitus and later folklore.',
  },
  {
    name: 'Irish',
    description:
      'The gods of Ireland, the Tuatha De Danann and the figures of Irish literature honoured as gods today.',
  },
  {
    name: 'Welsh',
    description:
      'The gods of Wales, the figures of the Mabinogi and Welsh literature honoured as gods today.',
  },
  {
    name: 'Gaulish and British',
    description:
      'The gods of Gaul and Roman Britain, known from altars, inscriptions and the Romans who named them.',
  },
  {
    name: 'Slavic',
    description: 'The gods of the Slavic peoples and the figures of their folklore.',
  },
  {
    name: 'Baltic',
    description:
      'The gods of the Lithuanians and Latvians, whose old religion lasted longest in Europe.',
  },
  {
    name: 'Finnish',
    description:
      'The gods and forest spirits of Finnish and Karelian tradition, many named in the Kalevala.',
  },
  { name: 'Hindu', description: 'The gods of Hinduism, from the Vedic hymns to living worship.' },
  { name: 'Taoist', description: 'The gods and immortals of religious Taoism.' },
  {
    name: 'Chinese Buddhist',
    description:
      'The buddhas and bodhisattvas as Chinese Buddhism honours them, and as folk religion honours them beside it.',
  },
  {
    name: 'Chinese folk',
    description:
      'The gods of Chinese folk religion: culture heroes, city and household gods, and the deified dead.',
  },
  {
    name: 'Japanese',
    description: 'The kami of Shinto, and the gods Japanese Buddhism brought with it.',
  },
  {
    name: 'Akan',
    description:
      'The abosom of the Akan peoples of Ghana and Ivory Coast, the Asante, Fante and Bono among them, beneath the sky god Nyame and the earth Asase Yaa.',
  },
  {
    name: 'Igbo',
    description:
      'The alusi of the Igbo people of south-eastern Nigeria, the spirits the creator Chukwu set over the earth, the sky, the river and the farm.',
  },
  {
    name: 'Fon and Ewe',
    description:
      'The vodun of the Fon and Ewe peoples of Benin and Togo, the Vodun of the old kingdom of Dahomey from which Haitian Vodou grew.',
  },
  {
    name: 'Yoruba',
    description:
      'The orishas of the Yoruba religion and of the traditions it carried to the Americas: Lucumi, Santeria and Candomble.',
  },
  {
    name: 'Kongo',
    description:
      'The gods and nature spirits of the Bakongo of central Africa, whose religion also underlies Palo in Cuba.',
  },
  {
    name: 'Zulu',
    description:
      'The gods and the Lord of the Sky of the Zulu people of southern Africa, honoured beside the ancestral shades.',
  },
  {
    name: 'Haitian Vodou',
    description:
      'The lwa of Haitian Vodou, grown from the vodun of Dahomey and the religions of the Kongo and the Yoruba.',
  },
  { name: 'Aztec', description: 'The gods of the Mexica and the Nahua peoples of central Mexico.' },
  {
    name: 'Maya',
    description: 'The gods of the Maya peoples of Yucatan, Guatemala and the highlands.',
  },
  {
    name: 'Inca',
    description:
      'The gods of the Inca and of the Quechua and Aymara peoples of the Andes, honoured there still.',
  },
  {
    name: 'Hawaiian',
    description: 'The akua of Hawaiian religion, and their kin across Polynesia.',
  },
  {
    name: 'Wicca',
    description:
      'The god and goddess of Wicca and of the modern pagan witchcraft that grew from it.',
  },
  {
    name: 'English folklore',
    description:
      'Figures of English folklore and church carving honoured as gods in modern practice.',
  },
  {
    name: 'Italian folk witchcraft',
    description:
      'Figures of Italian folk witchcraft as Charles Leland recorded it, honoured in Stregheria and modern practice.',
  },
];

/** The doc's deities, in its order: each tradition's run in the traditions' order. */
export const DEITIES: SeedDeity[] = [
  // Greek
  {
    name: 'Adonis',
    tradition: 'Greek',
    description:
      "Greek god of beauty and desire, who dies and returns with the year's vegetation; Aphrodite's beloved.",
  },
  {
    name: 'Aphrodite',
    tradition: 'Greek',
    description:
      'Greek goddess of love, beauty, desire and the sea foam she rose from; Roman Venus.',
  },
  {
    name: 'Apollo',
    tradition: 'Greek',
    description:
      'Greek and Roman god of light, music, poetry, prophecy and healing; Phoebus, lord of the laurel.',
  },
  {
    name: 'Ares',
    tradition: 'Greek',
    description: 'Greek god of war, courage and raw force; Roman Mars.',
  },
  {
    name: 'Artemis',
    tradition: 'Greek',
    description:
      'Greek goddess of the hunt, the wild, childbirth and the Moon, for whom the artemisias are named; Roman Diana.',
  },
  {
    name: 'Asclepius',
    tradition: 'Greek',
    description:
      'Greek god of medicine and healing, whose staff bears a serpent; also Asklepios, Roman Aesculapius.',
  },
  {
    name: 'Athena',
    tradition: 'Greek',
    description:
      'Greek goddess of wisdom, craft, strategy and the olive; Pallas Athene, Roman Minerva.',
  },
  {
    name: 'Circe',
    tradition: 'Greek',
    description:
      'Greek goddess and enchantress of Aeaea, mistress of herbs and transforming potions.',
  },
  {
    name: 'Demeter',
    tradition: 'Greek',
    description:
      'Greek goddess of grain, harvest and the fertile earth, mother of Persephone; Roman Ceres.',
  },
  {
    name: 'Dionysus',
    tradition: 'Greek',
    description:
      'Greek god of wine, the vine, ivy, ecstasy and theatre; also Dionysos, Roman Bacchus.',
  },
  {
    name: 'Eros',
    tradition: 'Greek',
    description: 'Greek god of love and desire, son of Aphrodite; Roman Cupid.',
  },
  {
    name: 'Gaia',
    tradition: 'Greek',
    description: 'Greek primordial goddess of the Earth, mother of all; also Gaea, Ge.',
  },
  {
    name: 'Hades',
    tradition: 'Greek',
    description:
      'Greek god of the underworld, the dead and the riches beneath the earth; Roman Pluto.',
  },
  {
    name: 'Hecate',
    tradition: 'Greek',
    description:
      'Greek goddess of witchcraft, crossroads, keys, the night and the dead; also Hekate, Trivia.',
  },
  {
    name: 'Helios',
    tradition: 'Greek',
    description:
      'Greek god and personification of the Sun, driving its chariot across the sky; Roman Sol.',
  },
  {
    name: 'Hephaestus',
    tradition: 'Greek',
    description:
      'Greek god of the forge, fire, smiths and metalwork; also Hephaistos, Roman Vulcan.',
  },
  {
    name: 'Hera',
    tradition: 'Greek',
    description: 'Greek queen of the gods, goddess of marriage, women and family; Roman Juno.',
  },
  {
    name: 'Hermes',
    tradition: 'Greek',
    description:
      'Greek messenger god of travel, trade, thieves and boundaries, guide of souls; Roman Mercury.',
  },
  {
    name: 'Hestia',
    tradition: 'Greek',
    description: 'Greek goddess of the hearth, the home and its fire; Roman Vesta.',
  },
  {
    name: 'Hyacinthus',
    tradition: 'Greek',
    description:
      'Greek divine youth beloved of Apollo, from whose blood the hyacinth sprang, honoured as a hero at Amyclae; also Hyakinthos.',
  },
  {
    name: 'Hygieia',
    tradition: 'Greek',
    description:
      'Greek goddess of health, cleanliness and the prevention of illness, daughter of Asclepius; also Hygeia, Roman Salus.',
  },
  {
    name: 'Hypnos',
    tradition: 'Greek',
    description: 'Greek god of sleep, crowned with poppies; Roman Somnus.',
  },
  {
    name: 'Iris',
    tradition: 'Greek',
    description:
      'Greek goddess of the rainbow and messenger of the gods, for whom the iris flower is named.',
  },
  {
    name: 'Nyx',
    tradition: 'Greek',
    description: 'Greek primordial goddess of the night, mother of sleep and death; Roman Nox.',
  },
  {
    name: 'Pan',
    tradition: 'Greek',
    description:
      'Greek goat-legged god of the wild, shepherds, flocks and rustic music; Roman Faunus.',
  },
  {
    name: 'Persephone',
    tradition: 'Greek',
    description:
      'Greek queen of the underworld and maiden of spring, daughter of Demeter, bound by the pomegranate; also Kore, Roman Proserpina.',
  },
  {
    name: 'Poseidon',
    tradition: 'Greek',
    description: 'Greek god of the sea, earthquakes and horses; Roman Neptune.',
  },
  {
    name: 'Rhea',
    tradition: 'Greek',
    description:
      'Greek Titan mother of the gods, goddess of fertility and the mountain earth, linked with Cybele.',
  },
  {
    name: 'Selene',
    tradition: 'Greek',
    description:
      'Greek goddess and personification of the Moon, driving its chariot by night; Roman Luna.',
  },
  {
    name: 'Zeus',
    tradition: 'Greek',
    description:
      'Greek king of the gods, god of the sky, thunder, justice and the oak; Roman Jupiter.',
  },

  // Roman
  {
    name: 'Bacchus',
    tradition: 'Roman',
    description: 'Roman god of wine, revelry and the grape harvest; also Liber, Greek Dionysus.',
  },
  {
    name: 'Cardea',
    tradition: 'Roman',
    description:
      "Roman goddess of hinges, thresholds and the door's guarding, who turns harm away with the hawthorn.",
  },
  {
    name: 'Ceres',
    tradition: 'Roman',
    description:
      'Roman goddess of grain, agriculture and the harvest, from whose name comes cereal; Greek Demeter.',
  },
  {
    name: 'Cupid',
    tradition: 'Roman',
    description: 'Roman god of love and desire, with bow and arrows; also Amor, Greek Eros.',
  },
  {
    name: 'Diana',
    tradition: 'Roman',
    description:
      'Roman goddess of the hunt, woodland, the Moon and childbirth, queen of witches in folk tradition; Greek Artemis.',
  },
  {
    name: 'Faunus',
    tradition: 'Roman',
    description: 'Roman god of forests, fields, flocks and prophecy; Greek Pan.',
  },
  {
    name: 'Flora',
    tradition: 'Roman',
    description:
      'Roman goddess of flowers, blossoming plants and spring, honoured at the Floralia.',
  },
  {
    name: 'Fortuna',
    tradition: 'Roman',
    description: 'Roman goddess of luck, chance and fortune, turning her wheel; Greek Tyche.',
  },
  {
    name: 'Janus',
    tradition: 'Roman',
    description: 'Roman two-faced god of doors, gates, beginnings, endings and passages.',
  },
  {
    name: 'Juno',
    tradition: 'Roman',
    description:
      'Roman queen of the gods, protector of women, marriage and childbirth; Greek Hera.',
  },
  {
    name: 'Jupiter',
    tradition: 'Roman',
    description:
      'Roman king of the gods, god of the sky, thunder, oaths and the oak; also Jove, Greek Zeus.',
  },
  {
    name: 'Mars',
    tradition: 'Roman',
    description: 'Roman god of war and, earlier, of fields and their guarding; Greek Ares.',
  },
  {
    name: 'Mercury',
    tradition: 'Roman',
    description: 'Roman god of messages, commerce, travel and eloquence; Greek Hermes.',
  },
  {
    name: 'Minerva',
    tradition: 'Roman',
    description: 'Roman goddess of wisdom, crafts, medicine and strategy; Greek Athena.',
  },
  {
    name: 'Neptune',
    tradition: 'Roman',
    description: 'Roman god of the sea and of fresh water; Greek Poseidon.',
  },
  {
    name: 'Pluto',
    tradition: 'Roman',
    description: 'Roman god of the underworld and its wealth; also Dis Pater, Greek Hades.',
  },
  {
    name: 'Pomona',
    tradition: 'Roman',
    description: 'Roman goddess of fruit trees, orchards and their tending.',
  },
  {
    name: 'Saturn',
    tradition: 'Roman',
    description:
      'Roman god of sowing, agriculture, wealth and time, honoured at the Saturnalia; Greek Cronus.',
  },
  {
    name: 'Silvanus',
    tradition: 'Roman',
    description: 'Roman god of woods, uncultivated land and the boundaries of fields.',
  },
  {
    name: 'Venus',
    tradition: 'Roman',
    description: 'Roman goddess of love, beauty, desire and gardens; Greek Aphrodite.',
  },
  {
    name: 'Vesta',
    tradition: 'Roman',
    description:
      'Roman goddess of the hearth, its sacred fire and the home, tended by the Vestal Virgins; Greek Hestia.',
  },
  {
    name: 'Vulcan',
    tradition: 'Roman',
    description: 'Roman god of fire, volcanoes and the forge; Greek Hephaestus.',
  },

  // Anatolian
  {
    name: 'Attis',
    tradition: 'Anatolian',
    description:
      'Phrygian god of vegetation, death and rebirth, consort of Cybele, linked with the pine.',
  },
  {
    name: 'Cybele',
    tradition: 'Anatolian',
    description:
      'Phrygian Great Mother of the gods, goddess of mountains, wild nature and fertility; Magna Mater.',
  },

  // Egyptian
  {
    name: 'Amun',
    tradition: 'Egyptian',
    description:
      'Egyptian king of the gods, the hidden one, joined with the Sun as Amun-Ra; also Amon, Amen.',
  },
  {
    name: 'Anubis',
    tradition: 'Egyptian',
    description:
      'Egyptian jackal-headed god of embalming, cemeteries and the guiding of souls; also Anpu, Inpu.',
  },
  {
    name: 'Bastet',
    tradition: 'Egyptian',
    description: 'Egyptian cat goddess of the home, protection, joy, women and perfume; also Bast.',
  },
  {
    name: 'Bes',
    tradition: 'Egyptian',
    description:
      'Egyptian dwarf god guarding households, mothers, children and childbirth against harm.',
  },
  {
    name: 'Geb',
    tradition: 'Egyptian',
    description: 'Egyptian god of the earth, its crops and what grows from it, husband of Nut.',
  },
  {
    name: 'Hathor',
    tradition: 'Egyptian',
    description:
      'Egyptian goddess of love, music, dance, joy and motherhood, the cow-horned Lady of the West.',
  },
  {
    name: 'Horus',
    tradition: 'Egyptian',
    description:
      'Egyptian falcon-headed god of the sky and kingship, son of Isis and Osiris; as a child, Harpocrates.',
  },
  {
    name: 'Isis',
    tradition: 'Egyptian',
    description:
      'Egyptian goddess of magic, healing, motherhood and the throne, wife of Osiris; also Aset.',
  },
  {
    name: 'Maat',
    tradition: 'Egyptian',
    description:
      "Egyptian goddess of truth, justice, balance and cosmic order, whose feather weighs the heart; also Ma'at.",
  },
  {
    name: 'Min',
    tradition: 'Egyptian',
    description:
      'Egyptian god of fertility, the harvest and the desert roads, linked with the lettuce.',
  },
  {
    name: 'Nephthys',
    tradition: 'Egyptian',
    description:
      'Egyptian goddess of mourning, night, the dead and protection, sister of Isis; also Nebet-Het.',
  },
  {
    name: 'Nut',
    tradition: 'Egyptian',
    description:
      'Egyptian goddess of the sky, whose body arches over the earth and swallows the Sun each night.',
  },
  {
    name: 'Osiris',
    tradition: 'Egyptian',
    description:
      "Egyptian god of the dead, the afterlife, resurrection and the grain's rebirth, husband of Isis.",
  },
  {
    name: 'Ptah',
    tradition: 'Egyptian',
    description: 'Egyptian creator god of craftsmen, builders and artisans, worshipped at Memphis.',
  },
  {
    name: 'Ra',
    tradition: 'Egyptian',
    description:
      'Egyptian god of the Sun and creation, sailing his barque across the sky; also Re.',
  },
  {
    name: 'Sekhmet',
    tradition: 'Egyptian',
    description:
      'Egyptian lioness goddess of war, plague and healing, the Eye of Ra; also Sakhmet.',
  },
  {
    name: 'Set',
    tradition: 'Egyptian',
    description:
      'Egyptian god of storms, the desert, chaos and foreigners, slayer of Osiris; also Seth, Sutekh.',
  },
  {
    name: 'Thoth',
    tradition: 'Egyptian',
    description:
      'Egyptian ibis-headed god of writing, knowledge, magic, the Moon and the reckoning of time; also Djehuty.',
  },

  // Sumerian
  {
    name: 'Enki',
    tradition: 'Sumerian',
    description: 'Sumerian god of fresh water, wisdom, craft, magic and healing; Akkadian Ea.',
  },
  {
    name: 'Ereshkigal',
    tradition: 'Sumerian',
    description:
      'Sumerian queen of the underworld, sister of Inanna, whose realm Akkadian texts call Irkalla.',
  },
  {
    name: 'Inanna',
    tradition: 'Sumerian',
    description:
      'Sumerian goddess of love, war, fertility and the morning and evening star, who descended to the underworld; Queen of Heaven.',
  },

  // Akkadian and Babylonian
  {
    name: 'Ishtar',
    tradition: 'Akkadian and Babylonian',
    description:
      "Akkadian and Babylonian goddess of love, war, fertility and the evening star, Inanna's Akkadian name.",
  },
  {
    name: 'Lilith',
    tradition: 'Akkadian and Babylonian',
    description:
      'Akkadian and Babylonian night spirit of storms and childbirth, carried into Jewish folklore and honoured as a goddess in modern practice; also Lilitu.',
  },
  {
    name: 'Tammuz',
    tradition: 'Akkadian and Babylonian',
    description:
      'Akkadian and Babylonian shepherd god of vegetation and its yearly death, consort of Ishtar; Sumerian Dumuzi, consort of Inanna.',
  },

  // Canaanite and Phoenician
  {
    name: 'Anat',
    tradition: 'Canaanite and Phoenician',
    description:
      'Canaanite goddess of war and fierce protection, sister and consort of Baal; also Anath.',
  },
  {
    name: 'Asherah',
    tradition: 'Canaanite and Phoenician',
    description:
      'Canaanite mother goddess and consort of El, worshipped at sacred trees and poles; also Athirat.',
  },
  {
    name: 'Astarte',
    tradition: 'Canaanite and Phoenician',
    description:
      'Phoenician and Canaanite goddess of love, fertility, war and the evening star; also Ashtoreth, Ashtart.',
  },
  {
    name: 'Baal',
    tradition: 'Canaanite and Phoenician',
    description: 'Canaanite god of storms, rain and the fertility they bring; also Hadad.',
  },

  // Persian
  {
    name: 'Anahita',
    tradition: 'Persian',
    description:
      'Persian goddess of the waters, fertility, healing and wisdom; also Aredvi Sura Anahita.',
  },
  {
    name: 'Mithra',
    tradition: 'Persian',
    description:
      'Persian god of covenants, light and the rising sun, and of the Roman mysteries as Mithras.',
  },

  // Norse
  {
    name: 'Baldur',
    tradition: 'Norse',
    description:
      'Norse god of light, beauty and goodness, slain by a mistletoe dart; also Balder, Baldr.',
  },
  {
    name: 'Eir',
    tradition: 'Norse',
    description: 'Norse goddess of healing and medicine, the physician among the goddesses.',
  },
  {
    name: 'Freya',
    tradition: 'Norse',
    description: 'Norse goddess of love, beauty, fertility, war and seidr magic; also Freyja.',
  },
  {
    name: 'Freyr',
    tradition: 'Norse',
    description:
      "Norse god of fertility, sunshine, rain and the harvest's plenty, brother of Freya; also Frey, Yngvi.",
  },
  {
    name: 'Frigg',
    tradition: 'Norse',
    description:
      'Norse queen of the gods, goddess of marriage, the home and foresight, wife of Odin; also Frigga.',
  },
  {
    name: 'Hel',
    tradition: 'Norse',
    description:
      'Norse goddess ruling the realm of the dead that bears her name, daughter of Loki.',
  },
  {
    name: 'Idun',
    tradition: 'Norse',
    description:
      'Norse goddess of youth and spring, keeper of the apples that keep the gods young; also Idunn, Iduna.',
  },
  {
    name: 'Loki',
    tradition: 'Norse',
    description: 'Norse trickster god of cunning, change and fire, father of Hel.',
  },
  {
    name: 'Njord',
    tradition: 'Norse',
    description:
      'Norse god of the sea, seafaring, wind and wealth, father of Freya and Freyr; also Njordr.',
  },
  {
    name: 'Odin',
    tradition: 'Norse',
    description:
      'Norse all-father, god of wisdom, poetry, the runes, magic, war and death; also Woden, Wotan.',
  },
  {
    name: 'Sif',
    tradition: 'Norse',
    description:
      'Norse goddess of golden hair, linked with grain and the fertile earth, wife of Thor.',
  },
  {
    name: 'Skadi',
    tradition: 'Norse',
    description: 'Norse giantess and goddess of winter, mountains, skiing and the hunt.',
  },
  {
    name: 'Thor',
    tradition: 'Norse',
    description:
      'Norse god of thunder, storms, strength and the protection of people, wielding the hammer Mjolnir; also Donar, Thunor.',
  },
  {
    name: 'Tyr',
    tradition: 'Norse',
    description:
      'Norse god of law, justice, oaths and war, who gave his hand to bind Fenrir; also Tiw.',
  },

  // Anglo-Saxon and Continental Germanic
  {
    name: 'Berchta',
    tradition: 'Anglo-Saxon and Continental Germanic',
    description:
      "Continental Germanic and Alpine goddess of spinning, the Twelve Nights and the household's order; also Perchta, Bertha.",
  },
  {
    name: 'Eostre',
    tradition: 'Anglo-Saxon and Continental Germanic',
    description:
      'Anglo-Saxon goddess of spring and the dawn, named by Bede, whom Easter recalls; also Ostara.',
  },
  {
    name: 'Holda',
    tradition: 'Anglo-Saxon and Continental Germanic',
    description:
      'Continental Germanic goddess of winter, spinning and the hearth, who shakes snow from her featherbed; also Holle, Hulda.',
  },
  {
    name: 'Nerthus',
    tradition: 'Anglo-Saxon and Continental Germanic',
    description:
      'Continental Germanic earth goddess of fertility and peace, carried among her people in a wagon, as Tacitus tells.',
  },

  // Irish
  {
    name: 'Aengus',
    tradition: 'Irish',
    description:
      'Irish god of love, youth and poetic inspiration, son of the Dagda; also Angus, Oengus.',
  },
  {
    name: 'Aine',
    tradition: 'Irish',
    description:
      'Irish goddess of summer, the Sun, wealth and sovereignty, honoured at Knockainey.',
  },
  {
    name: 'Airmed',
    tradition: 'Irish',
    description:
      "Irish goddess of healing and herbalism, who gathered the herbs that grew from her brother Miach's grave; also Airmid.",
  },
  {
    name: 'Boann',
    tradition: 'Irish',
    description:
      'Irish goddess of the river Boyne, of poetry, fertility and knowledge; also Boand.',
  },
  {
    name: 'Brigid',
    tradition: 'Irish',
    description:
      'Irish goddess of poetry, healing, smithcraft, fire and holy wells, honoured at Imbolc; also Brighid, Brigit, Bride.',
  },
  {
    name: 'Dagda',
    tradition: 'Irish',
    description:
      'Irish father god of plenty, the seasons, life and death, with his cauldron and club; the Good God.',
  },
  {
    name: 'Danu',
    tradition: 'Irish',
    description: 'Irish mother goddess of the Tuatha De Danann; also Anu, Dana.',
  },
  {
    name: 'Dian Cecht',
    tradition: 'Irish',
    description:
      'Irish god of healing and physician to the Tuatha De Danann, father of Airmed; also Diancecht.',
  },
  {
    name: 'Lugh',
    tradition: 'Irish',
    description:
      'Irish god of skill in every art, light, the harvest and oaths, honoured at Lughnasadh; Welsh Lleu, Gaulish Lugus.',
  },
  {
    name: 'Manannan mac Lir',
    tradition: 'Irish',
    description:
      'Irish god of the sea, mists and the Otherworld and its crossings, son of Lir; Manx Mannan.',
  },
  {
    name: 'Morrigan',
    tradition: 'Irish',
    description:
      'Irish goddess of war, fate, sovereignty and prophecy, appearing as a crow; the Morrigan, Morrigu, the Great Queen.',
  },
  {
    name: 'Ogma',
    tradition: 'Irish',
    description:
      'Irish god of eloquence, strength and writing, said to have made the ogham alphabet; also Oghma.',
  },

  // Welsh
  {
    name: 'Arianrhod',
    tradition: 'Welsh',
    description: 'Welsh goddess of the silver wheel, the stars, fate and the Moon, mother of Lleu.',
  },
  {
    name: 'Blodeuwedd',
    tradition: 'Welsh',
    description:
      'Welsh woman made of flowers by Math and Gwydion and turned into an owl, honoured as a goddess of flowers and owls.',
  },
  {
    name: 'Cerridwen',
    tradition: 'Welsh',
    description:
      'Welsh enchantress and goddess of the cauldron, transformation, inspiration and herbal brewing; also Ceridwen, Kerridwen.',
  },
  {
    name: 'Gwydion',
    tradition: 'Welsh',
    description: 'Welsh magician god of enchantment, trickery, poetry and learning, son of Don.',
  },
  {
    name: 'Mabon',
    tradition: 'Welsh',
    description:
      'Welsh divine youth and hunter, son of Modron, rescued from captivity; namesake of the autumn equinox in modern practice.',
  },
  {
    name: 'Rhiannon',
    tradition: 'Welsh',
    description:
      'Welsh goddess of horses, birds, sovereignty and the Otherworld, whose birds wake the dead and lull the living.',
  },

  // Gaulish and British
  {
    name: 'Belenus',
    tradition: 'Gaulish and British',
    description:
      'Gaulish and British god of light, the Sun and healing springs; also Belenos, Bel.',
  },
  {
    name: 'Cernunnos',
    tradition: 'Gaulish and British',
    description: 'Gaulish horned god of animals, the wild, fertility and wealth; also Kernunnos.',
  },
  {
    name: 'Epona',
    tradition: 'Gaulish and British',
    description:
      'Gaulish goddess of horses, mules and fertility, whose cult Roman soldiers carried across the empire.',
  },
  {
    name: 'Sulis',
    tradition: 'Gaulish and British',
    description:
      'British goddess of the hot springs at Bath, of healing and of curses; Sulis Minerva.',
  },
  {
    name: 'Taranis',
    tradition: 'Gaulish and British',
    description:
      'Gaulish god of thunder and the sky, matched with Jupiter by the Romans and read by scholars as the wheel god.',
  },

  // Slavic
  {
    name: 'Baba Yaga',
    tradition: 'Slavic',
    description:
      "Slavic forest witch of folklore, living in a hut on hen's legs, both devourer and giver of wisdom.",
  },
  {
    name: 'Lada',
    tradition: 'Slavic',
    description:
      'Slavic goddess of fertility, marriage and spring, as later folklore has it, her very existence disputed.',
  },
  {
    name: 'Mokosh',
    tradition: 'Slavic',
    description:
      "Slavic goddess of women, spinning, moist earth and fertility, the one goddess of Vladimir's pantheon; also Makosh.",
  },
  {
    name: 'Morana',
    tradition: 'Slavic',
    description:
      'Slavic goddess of winter and death in Polish, Czech and Slovak rite, whose effigy is drowned in spring, and of spring and the waters in Ukrainian; also Marzanna, Morena, Marena.',
  },
  {
    name: 'Perun',
    tradition: 'Slavic',
    description: 'Slavic god of thunder, lightning, the sky and the oak, foe of Veles.',
  },
  {
    name: 'Veles',
    tradition: 'Slavic',
    description: 'Slavic god of the underworld, cattle, wealth, waters and magic; also Volos.',
  },

  // Baltic
  {
    name: 'Laima',
    tradition: 'Baltic',
    description:
      'Latvian and Lithuanian goddess of fate, birth and luck, linked with the linden; also Laime.',
  },
  {
    name: 'Perkunas',
    tradition: 'Baltic',
    description: 'Lithuanian god of thunder, rain and the oak; Latvian Perkons.',
  },
  {
    name: 'Zemyna',
    tradition: 'Baltic',
    description:
      'Lithuanian goddess of the earth and everything that grows from it; also Zemynele.',
  },

  // Finnish
  {
    name: 'Mielikki',
    tradition: 'Finnish',
    description:
      'Finnish goddess of forests and the hunt, wife of Tapio; the Forest-mother, Mistress of the woods.',
  },
  {
    name: 'Ukko',
    tradition: 'Finnish',
    description: 'Finnish god of the sky, weather, thunder and the rain the harvest needs.',
  },

  // Hindu
  {
    name: 'Agni',
    tradition: 'Hindu',
    description:
      'Hindu god of fire, the sacrificial flame and the hearth, who carries offerings to the gods.',
  },
  {
    name: 'Dhanvantari',
    tradition: 'Hindu',
    description:
      'Hindu physician of the gods and god of Ayurveda, who rose from the ocean bearing the nectar of immortality.',
  },
  {
    name: 'Durga',
    tradition: 'Hindu',
    description:
      'Hindu warrior goddess, the invincible mother, slayer of the buffalo demon Mahishasura.',
  },
  {
    name: 'Ganesha',
    tradition: 'Hindu',
    description:
      'Hindu elephant-headed god of beginnings, wisdom and the removal of obstacles; also Ganapati.',
  },
  {
    name: 'Hanuman',
    tradition: 'Hindu',
    description:
      'Hindu monkey god of devotion, strength and courage, who carried a mountain of healing herbs.',
  },
  {
    name: 'Kali',
    tradition: 'Hindu',
    description: 'Hindu goddess of time, death, destruction and liberation, the dark mother.',
  },
  {
    name: 'Krishna',
    tradition: 'Hindu',
    description: 'Hindu god of love, compassion and divine play, an avatar of Vishnu.',
  },
  {
    name: 'Lakshmi',
    tradition: 'Hindu',
    description:
      'Hindu goddess of wealth, fortune, prosperity and beauty, wife of Vishnu, honoured at Diwali; also Laxmi.',
  },
  {
    name: 'Parvati',
    tradition: 'Hindu',
    description: 'Hindu goddess of devotion, fertility, marriage and power, wife of Shiva.',
  },
  {
    name: 'Saraswati',
    tradition: 'Hindu',
    description: 'Hindu goddess of knowledge, music, art, speech and learning; also Sarasvati.',
  },
  {
    name: 'Shiva',
    tradition: 'Hindu',
    description:
      'Hindu god of destruction, transformation, yoga and meditation, the auspicious one; also Siva, Mahadeva.',
  },
  {
    name: 'Soma',
    tradition: 'Hindu',
    description:
      'Vedic god of the sacred ritual drink pressed from a plant, later identified with the Moon.',
  },
  {
    name: 'Surya',
    tradition: 'Hindu',
    description: 'Hindu god of the Sun, light and health, riding a chariot drawn by seven horses.',
  },
  {
    name: 'Vishnu',
    tradition: 'Hindu',
    description:
      'Hindu god who preserves the universe, returning as avatars such as Rama and Krishna.',
  },

  // Taoist
  {
    name: 'Xi Wangmu',
    tradition: 'Taoist',
    description:
      'Taoist Queen Mother of the West, goddess of immortality and keeper of the peaches of long life; also Xiwangmu, Hsi Wang Mu.',
  },

  // Chinese Buddhist
  {
    name: 'Kuan Yin',
    tradition: 'Chinese Buddhist',
    description:
      'Chinese Buddhist bodhisattva of compassion and mercy, honoured as a goddess in folk religion across East Asia; also Guanyin, Kwan Yin, Kannon.',
  },

  // Chinese folk
  {
    name: 'Shennong',
    tradition: 'Chinese folk',
    description:
      "Chinese folk religion's divine farmer, god of agriculture and herbal medicine, said to have tasted hundreds of herbs; the Divine Husbandman, Shen Nong.",
  },

  // Japanese
  {
    name: 'Amaterasu',
    tradition: 'Japanese',
    description:
      'Japanese Shinto goddess of the Sun and the Plain of High Heaven, ancestor of the imperial line; also Amaterasu Omikami.',
  },
  {
    name: 'Benzaiten',
    tradition: 'Japanese',
    description:
      'Japanese goddess of water, music, eloquence, wealth and knowledge, come from Saraswati; also Benten.',
  },
  {
    name: 'Inari',
    tradition: 'Japanese',
    description:
      'Japanese Shinto deity of rice, grain, agriculture, foxes and prosperity, whose shrines are kept by fox messengers; also Oinari.',
  },
  {
    name: 'Tsukuyomi',
    tradition: 'Japanese',
    description:
      'Japanese Shinto god of the Moon and the night, brother of Amaterasu; also Tsukiyomi.',
  },

  // Akan
  {
    name: 'Nyame',
    tradition: 'Akan',
    description:
      'Akan supreme god of the sky, creator of the world and giver of rain and sunshine, born on Saturday; also Onyame, Nyankopon, Onyankopon, Odomankoma.',
  },
  {
    name: 'Asase Yaa',
    tradition: 'Akan',
    description:
      'Akan goddess of the earth, fertility and truth, second only to Nyame, whose Thursday no one tills; also Asase Ya, Asaase Yaa, Aberewa, Mother Earth, Fante Asase Efua.',
  },
  {
    name: 'Tano',
    tradition: 'Akan',
    description:
      'Akan obosom of the Tano river and head of the river gods, god of thunder and of war among the Asante, son of Nyame and Asase Yaa; also Ta Kora, Tano Kora, Fante Tando.',
  },
  {
    name: 'Bia',
    tradition: 'Akan',
    description:
      'Akan obosom of the Bia river and of the wilderness and barren land, elder twin of Tano.',
  },
  {
    name: 'Bosomtwe',
    tradition: 'Akan',
    description:
      'Akan obosom of Lake Bosomtwe, son of Nyame and Asase Yaa, honoured in the form of an antelope; also Bosomtwi, Bosumtwi.',
  },

  // Igbo
  {
    name: 'Chukwu',
    tradition: 'Igbo',
    description:
      'Igbo supreme god and creator, who made the alusi and gives every person a chi; also Chineke, Chi Ukwu, Chukwu Okike, Obasi.',
  },
  {
    name: 'Ala',
    tradition: 'Igbo',
    description:
      'Igbo alusi of the earth, fertility, morality and the dead, who holds the ancestors in her womb and judges by custom, honoured in mbari houses; also Ani, Ana, Ale, Ali.',
  },
  {
    name: 'Amadioha',
    tradition: 'Igbo',
    description:
      'Igbo alusi of thunder, lightning and justice, who strikes the oppressor, shown as a white ram; also Amadiora, Kamalu, Kalu.',
  },
  {
    name: 'Anyanwu',
    tradition: 'Igbo',
    description:
      'Igbo alusi of the Sun, good fortune, knowledge and wisdom, whose name is the eye of the sun.',
  },
  {
    name: 'Agwu',
    tradition: 'Igbo',
    description:
      'Igbo alusi of divination and medicine, patron of the dibia, who possesses the healer to show the cure; also Agwu Nsi.',
  },
  {
    name: 'Njoku Ji',
    tradition: 'Igbo',
    description:
      'Igbo alusi of the yam and its farming, guardian of the farm, honoured at the planting festival; also Ahiajoku, Ahiajioku, Ifejioku.',
  },

  // Fon and Ewe
  {
    name: 'Nana Buluku',
    tradition: 'Fon and Ewe',
    description:
      "Fon and Ewe creator of the world, mother of Mawu and Lisa, who made all things and withdrew; also Nana Buruku, Nana Buku, Nanan-bouclou, Candomble's Nana.",
  },
  {
    name: 'Mawu-Lisa',
    tradition: 'Fon and Ewe',
    description:
      'Fon and Ewe twin creator vodun, Mawu of the Moon, night and gentleness and Lisa of the Sun, day and strength, spoken of as one; also Mawu, Lisa, Mahu.',
  },
  {
    name: 'Sagbata',
    tradition: 'Fon and Ewe',
    description:
      'Fon and Ewe vodun of the earth and of smallpox, who watches over fields and waters and punishes with disease, head of the earth pantheon; also Sakpata, Shapata, Yoruba Sopona.',
  },
  {
    name: 'Xevioso',
    tradition: 'Fon and Ewe',
    description:
      'Fon and Ewe vodun of thunder, lightning and rain, who sends the fertilising rains and strikes liars and thieves with the thunderbolt, shown as a ram with a double axe; also Hevioso, Heviosso, Sogbo, So.',
  },
  {
    name: 'Gu',
    tradition: 'Fon and Ewe',
    description:
      'Fon and Ewe vodun of iron, metalwork, tools and war, twin of Xevioso and counterpart of Yoruba Ogun; also Egu, Gou.',
  },
  {
    name: 'Legba',
    tradition: 'Fon and Ewe',
    description:
      "Fon and Ewe vodun of the crossroads and the gate, messenger between the vodun and the living and divine trickster, youngest child of Mawu-Lisa; Haitian Vodou's Papa Legba, Yoruba Elegba.",
  },
  {
    name: 'Dan',
    tradition: 'Fon and Ewe',
    description:
      'Fon and Ewe serpent vodun of the rainbow, riches and cool breezes, who carried Mawu-Lisa at the creation and coils beneath the earth; also Da, Dan Ayido Hwedo, Aido Hwedo, Haitian Damballah and Ayida Wedo.',
  },
  {
    name: 'Agbe',
    tradition: 'Fon and Ewe',
    description:
      "Fon and Ewe vodun of the sea and head of its pantheon, beside Sagbata's earth and Xevioso's thunder.",
  },

  // Yoruba
  {
    name: 'Elegba',
    tradition: 'Yoruba',
    description:
      'Yoruba and Lucumi orisha of crossroads, roads and doorways, who opens the way; also Eleggua, Eshu, Exu.',
  },
  {
    name: 'Obatala',
    tradition: 'Yoruba',
    description:
      'Yoruba orisha of purity, wisdom, peace and creation, eldest of the orishas and sculptor of humankind; also Oxala.',
  },
  {
    name: 'Ogun',
    tradition: 'Yoruba',
    description:
      'Yoruba orisha of iron, metalwork, labour, war and the clearing of paths; also Ogoun, Ogum.',
  },
  {
    name: 'Orunmila',
    tradition: 'Yoruba',
    description: 'Yoruba orisha of wisdom, divination and destiny, the witness of fate in Ifa.',
  },
  {
    name: 'Osanyin',
    tradition: 'Yoruba',
    description:
      'Yoruba orisha of herbs, leaves, medicine and healing, who holds the knowledge of every plant; also Osain, Ossaim.',
  },
  {
    name: 'Oshun',
    tradition: 'Yoruba',
    description:
      'Yoruba orisha of rivers, fresh water, love, beauty, sweetness and fertility; also Ochun, Oxum.',
  },
  {
    name: 'Oya',
    tradition: 'Yoruba',
    description:
      'Yoruba orisha of winds, storms, transformation and the cemetery gates; also Yansa, Iansa.',
  },
  {
    name: 'Shango',
    tradition: 'Yoruba',
    description:
      'Yoruba orisha of thunder, lightning, fire, drumming and justice; also Chango, Xango.',
  },
  {
    name: 'Yemaya',
    tradition: 'Yoruba',
    description: 'Yoruba orisha of the sea, motherhood and protection; also Yemoja, Iemanja.',
  },

  // Kongo
  {
    name: 'Nzambi Mpungu',
    tradition: 'Kongo',
    description:
      "Kongo supreme god and creator, lord of the sky and the Sun's fire, who made the world and withdrew above it; also Nzambi a Mpungu, Nzambi Ampungu, Nzambi, and Palo's Nsambi, Sambia.",
  },
  {
    name: 'Nzambici',
    tradition: 'Kongo',
    description:
      "Kongo goddess of the earth and the Moon, mother of all living things, the essence beside Nzambi Mpungu's sky and Sun, his consort and counterpart.",
  },
  {
    name: 'Simbi',
    tradition: 'Kongo',
    description:
      'Kongo spirits of water and the wild honoured as nature deities, the bisimbi of springs, pools and rocks who held the land before people came and guide the dead across the water; also bisimbi, basimbi, cymbee, the Simbi lwa of Haitian Vodou.',
  },
  {
    name: 'Kalunga',
    tradition: 'Kongo',
    description:
      'Kongo god and force of the beginning, the fire from which the world came, the ocean, and the watery line between the living and the dead; also Kalunga Line, Nzambi Kalunga.',
  },
  {
    name: 'Mbumba',
    tradition: 'Kongo',
    description:
      'Kongo rainbow serpent of the waters and the rain, who climbs from the rivers to the sky.',
  },

  // Zulu
  {
    name: 'Unkulunkulu',
    tradition: 'Zulu',
    description:
      'Zulu creator and first ancestor, the old, old one who came forth at the beginning and gave the first people fire, cattle and marriage; also uNkulunkulu, Nkulunkulu.',
  },
  {
    name: 'Umvelinqangi',
    tradition: 'Zulu',
    description:
      'Zulu supreme being and Lord of the Sky, the first to come forth, god of thunder, lightning and the heavens, often identified with Unkulunkulu; also uMvelinqangi, Mvelinqangi, iNkosi yeZulu.',
  },
  {
    name: 'Nomkhubulwane',
    tradition: 'Zulu',
    description:
      'Zulu princess of heaven, goddess of rain, the rainbow, spring, fertility and the crops, honoured by girls at her planting rite; also Nomkhubulwana, Nomkubulwana, Inkosazana, iNkosazana yeZulu.',
  },
  {
    name: 'Mamlambo',
    tradition: 'Zulu',
    description:
      'Zulu goddess of rivers, a great water serpent of the deep pools whose favour is both sought and feared; also uMamlambo, Momlambo, Nomhoyi.',
  },

  // Haitian Vodou
  {
    name: 'Baron Samedi',
    tradition: 'Haitian Vodou',
    description: 'Haitian Vodou lwa of the dead, the cemetery and resurrection, head of the Gede.',
  },
  {
    name: 'Damballah',
    tradition: 'Haitian Vodou',
    description:
      'Haitian Vodou serpent lwa of creation, wisdom, springs, waterfalls and peace; also Danbala, Damballa, from the Fon serpent Dan.',
  },
  {
    name: 'Erzulie',
    tradition: 'Haitian Vodou',
    description:
      'Haitian Vodou family of lwa of love, beauty, jealousy and motherhood, among them Erzulie Freda and Erzulie Dantor; also Ezili.',
  },
  {
    name: 'Maman Brigitte',
    tradition: 'Haitian Vodou',
    description: 'Haitian Vodou lwa of the dead and the cemetery, wife of Baron Samedi.',
  },
  {
    name: 'Papa Legba',
    tradition: 'Haitian Vodou',
    description:
      'Haitian Vodou lwa of the crossroads, gatekeeper between the living and the lwa, who opens every ceremony; also Legba.',
  },

  // Aztec
  {
    name: 'Chalchiuhtlicue',
    tradition: 'Aztec',
    description:
      "Aztec goddess of rivers, lakes, streams and birth, and of the newborn's bathing rite; She of the Jade Skirt.",
  },
  {
    name: 'Quetzalcoatl',
    tradition: 'Aztec',
    description:
      'Aztec feathered serpent god of wind, learning, the morning star and creation; Maya Kukulkan.',
  },
  {
    name: 'Tlaloc',
    tradition: 'Aztec',
    description: 'Aztec god of rain, storms, water and the fertility of the fields.',
  },
  {
    name: 'Xochipilli',
    tradition: 'Aztec',
    description:
      'Aztec god of flowers, art, song, dance and the visionary plants; the Flower Prince.',
  },
  {
    name: 'Xochiquetzal',
    tradition: 'Aztec',
    description: 'Aztec goddess of flowers, love, beauty, fertility and weaving.',
  },

  // Maya
  {
    name: 'Ixchel',
    tradition: 'Maya',
    description:
      'Maya goddess of midwifery, medicine, weaving and fertility, the Moon in popular account; also Ix Chel, Chak Chel.',
  },

  // Inca
  {
    name: 'Inti',
    tradition: 'Inca',
    description: 'Inca god of the Sun, ancestor of the emperors, honoured at Inti Raymi.',
  },
  {
    name: 'Pachamama',
    tradition: 'Inca',
    description:
      'Inca goddess of the earth, fertility, planting and harvest, honoured across the Andes still; Mother Earth.',
  },

  // Hawaiian
  {
    name: 'Hina',
    tradition: 'Hawaiian',
    description: 'Hawaiian and Polynesian goddess of the Moon, tapa-making and women.',
  },
  {
    name: 'Kane',
    tradition: 'Hawaiian',
    description: 'Hawaiian god of creation, life, procreation and fresh water, the water of life.',
  },
  {
    name: 'Laka',
    tradition: 'Hawaiian',
    description: 'Hawaiian goddess of the hula and of the forest and its wild plants.',
  },
  {
    name: 'Lono',
    tradition: 'Hawaiian',
    description:
      'Hawaiian god of agriculture, rain, peace and fertility, honoured at the Makahiki.',
  },
  {
    name: 'Pele',
    tradition: 'Hawaiian',
    description: 'Hawaiian goddess of volcanoes and fire, who dwells at Kilauea.',
  },

  // Wicca
  {
    name: 'Horned God',
    tradition: 'Wicca',
    description:
      'Wiccan and modern pagan god of the wild, the hunt, fertility and the dying and returning year.',
  },

  // English folklore
  {
    name: 'Green Man',
    tradition: 'English folklore',
    description:
      "English folklore's leaf-masked face of church carving, honoured in modern practice as a spirit of vegetation and the greenwood.",
  },
  {
    name: 'Herne',
    tradition: 'English folklore',
    description:
      "English folklore's antlered hunter of Windsor Forest, honoured as a horned god in modern practice; Herne the Hunter.",
  },

  // Italian folk witchcraft
  {
    name: 'Aradia',
    tradition: 'Italian folk witchcraft',
    description:
      "Italian witch goddess of Leland's Aradia, or the Gospel of the Witches, daughter of Diana, who taught witchcraft to the oppressed.",
  },
];

/**
 * Seeds the traditions, then the deities, in a transaction of its own. Writes
 * go through the handle the caller gives, not `withAudit` — see minimal.ts.
 */
export async function seedDeities(db: SeedDatabase): Promise<void> {
  await beginSeedTransaction(db, seedDeityVocabulary);
}

/**
 * The same seed inside a transaction the caller opened, since `standard`
 * writes every reference vocabulary in its own. Assumes the GUC is published
 * and the bootstrap user exists.
 */
export async function seedDeityVocabulary(tx: SeedTransaction): Promise<void> {
  await seedTwoTierVocabulary(tx, {
    groupTable: deityTraditions,
    itemTable: deities,
    groups: DEITY_TRADITIONS,
    items: DEITIES,
    groupOf: (deity) => deity.tradition,
    toItemRow: (row, traditionId) => ({ ...row, traditionId }),
    itemNoun: 'Deity',
  });
}
