---
status: needs-review
nomenclature: botanical
canonicalName: Cruciata laevipes
celestialBodies:
  - Saturn
folkNames:
  - Smooth Bedstraw
  - Luc na Croise
references:
  - source: grieve-crosswort
    nameBasis: resolved
    headedAs: Galium cruciata, Scopoli
    resolvedBy: wikipedia-cruciata-laevipes
    supports:
      - canonicalName
      - description
  - source: culpeper-herbal
    locator: under "CROSSWORT"
    nameBasis: unresolved
    supports:
      - celestialBodies
  - source: wikipedia-cruciata-laevipes
    nameBasis: stated
    supports:
      - canonicalName
      - description
      - folkNames
variants:
  - form: Herb
    description: Grieve names the herb and leaves as the parts used. A decoction of the leaves in wine was taken for obstructions of the stomach or bowels, and the plant was a wound herb for inward and outward wounds.
    references:
      - source: grieve-crosswort
        nameBasis: resolved
        headedAs: Galium cruciata, Scopoli
        resolvedBy: wikipedia-cruciata-laevipes
        supports:
          - form
          - description
---

# Crosswort

Crosswort is a perennial, sprawling plant of meadows, road verges, riverbanks and scrub across most of Europe, Turkey, Iran, the Caucasus and the western Himalayas. Wikipedia says it grows 15 to 70 cm tall, spreads by seeds and stolons, and, unusually for its group, has honey-scented yellow flowers; of each whorl of four leaves, only two are true leaves and two are stipules. The common name translates the Latin cruciata planta, cross plant, for the cross-like leaf arrangement. Grieve describes dull pale yellow flower clusters and four-leaved whorls, and says the herb, now little used, was held a very good wound herb. A decoction of the leaves in wine was used for stomach obstructions and to stimulate appetite. Culpeper places it under Saturn.

#### Questions for the Curator

Grieve heads the page "Galium cruciata, Scopoli", not the roster name. The cited Wikipedia page for _Cruciata laevipes_ lists _Galium cruciata_ (L.) Scop. as a synonym, so I cite Grieve as `resolved` via Wikipedia. GBIF (evidence only, not an authority): https://api.gbif.org/v1/species/match?name=Galium%20cruciata gives _Galium cruciata_ (L.) Scop., SYNONYM, accepted key 5338920, which is _Cruciata laevipes_ Opiz (ACCEPTED). Wikipedia is not a nomenclatural authority such as POWO. Do you accept the mapping? My recommendation: yes.

Culpeper prints only the English heading "CROSSWORT" and no Latin name, so his page is cited with `nameBasis: unresolved`. The roster ties it to _Cruciata laevipes_; no authority I read maps Culpeper's heading to that formal name. He gives the planet: "under the dominion of Saturn". His page names no Latin binomial. Do you accept Culpeper's "CROSSWORT" as _Cruciata laevipes_? My recommendation: accept it only if you are content to rest the Culpeper-sourced fields on the common name; otherwise drop the Culpeper citation and the fields that rest on it.
