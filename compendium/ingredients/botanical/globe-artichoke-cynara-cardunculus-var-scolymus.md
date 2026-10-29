---
status: needs-review
nomenclature: botanical
canonicalName: Cynara cardunculus var. scolymus
celestialBodies:
  - Venus
folkNames:
  - Artichoke
  - Globe Artichoke
references:
  - source: wikipedia-artichoke
    nameBasis: stated
    supports:
      - canonicalName
      - description
      - folkNames
  - source: grieve-artichoke-globe
    nameBasis: unresolved
    supports:
      - description
      - folkNames
  - source: culpeper-herbal
    locator: under "ARTICHOKES"
    nameBasis: unresolved
    supports:
      - celestialBodies
variants:
  - form: Flower
    description: 'Wikipedia says the edible part is the flower bud before it opens: the fleshy lower parts of the bracts and the base, called the heart. Grieve says the large flower-buds are the edible portion, and in Italy the dried receptacles are used in soups.'
    references:
      - source: wikipedia-artichoke
        nameBasis: stated
        supports:
          - form
          - description
      - source: grieve-artichoke-globe
        nameBasis: unresolved
        supports:
          - description
---

# Globe Artichoke

The globe artichoke is a thistle cultivated for its flower buds, native to the Mediterranean region. Wikipedia says it grows 1.4 to 2 metres tall, with arching, deeply lobed, silvery green leaves and a bud 8 to 15 centimetres across, the edible part being the fleshy lower bracts and the base, called the heart. Grieve calls it one of the oldest cultivated vegetables, grown by the Greeks and Romans and brought to England in the early sixteenth century. She says the whole plant has a peculiar smell and a strong bitter taste, and that it was reputed to be aperient. Culpeper puts artichokes under Venus and says a decoction of the root boiled in wine purges exceedingly by urine.

#### Questions for the Curator

Grieve prints "Cynara Scolymus, Linn.", not the roster name _Cynara cardunculus_ var. _scolymus_, which the cited Wikipedia page prints and is cited as `stated`. The Wikipedia text I read does not list _Cynara scolymus_ as a synonym, so I cite Grieve as `unresolved`. GBIF (evidence only, not an authority): https://api.gbif.org/v1/species/match?name=Cynara%20scolymus gives _Cynara scolymus_ L., ACCEPTED; for the roster name it gives _Cynara cardunculus_ var. _scolymus_ (L.) Benth., SYNONYM, accepted key 3112361, which is _Cynara scolymus_ L.. Should the entry stay under the Wikipedia name _Cynara cardunculus_ var. _scolymus_, or move to _Cynara scolymus_? My recommendation: keep the roster name and, once POWO can be read, check whether it accepts the variety.

Culpeper prints only the English heading "ARTICHOKES" and no Latin name, so his page is cited with `nameBasis: unresolved`. The roster ties it to _Cynara cardunculus var. scolymus_; no authority I read maps Culpeper's heading to that formal name. He gives the planet: "under the dominion of Venus". His page names "Cinera" and "Artichocus" and no Latin binomial. Do you accept Culpeper's "ARTICHOKES" as _Cynara cardunculus var. scolymus_? My recommendation: accept it only if you are content to rest the Culpeper-sourced fields on the common name; otherwise drop the Culpeper citation and the fields that rest on it.
