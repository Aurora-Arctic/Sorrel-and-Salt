---
status: needs-review
nomenclature: botanical
canonicalName: Umbilicus rupestris
celestialBodies:
  - Venus
zodiacSigns:
  - Libra
folkNames:
  - Wall Pennywort
  - Penny Pies
  - Wall Pennyroyal
  - Navelwort
  - Hipwort
references:
  - source: grieve-kidneywort
    nameBasis: resolved
    headedAs: Cotyledon Umbilicus
    resolvedBy: wikipedia-wall-pennywort
    supports:
      - canonicalName
      - description
      - folkNames
  - source: wikipedia-wall-pennywort
    nameBasis: stated
    supports:
      - canonicalName
      - description
      - folkNames
  - source: culpeper-herbal
    locator: under "KIDNEYWORT, OR WALL PENNYROYAL"
    nameBasis: unresolved
    supports:
      - celestialBodies
      - zodiacSigns
variants:
  - form: Leaf
    description: Grieve says the leaves, bruised to a pulp and applied as a poultice, are said to cure piles and are recommended for slight burns or scalds, and that a decoction of the leaves is considered cooling and diuretic. Wikipedia says the leaf is applied to scratches after removing the lower cuticle.
    references:
      - source: grieve-kidneywort
        nameBasis: resolved
        headedAs: Cotyledon Umbilicus
        resolvedBy: wikipedia-wall-pennywort
        supports:
          - form
          - description
      - source: wikipedia-wall-pennywort
        nameBasis: stated
        supports:
          - form
          - description
---

# Kidneywort

Kidneywort, also called wall pennywort or navelwort, is a fleshy, perennial, edible succulent of the stonecrop family, found in southern and western Europe on shady walls and in damp rock crevices. Wikipedia says it grows to about 25 cm, with bell-shaped greenish-pink flowers from May, and takes its names from its round leaves, which have a navel-like dip. Grieve calls it a remarkably succulent plant of moist rocks and walls in the west of England, pale bright green and smooth, springing from a small roundish tuber, with flowering stems of 6 to 18 inches. She says its juice had an old reputation for epilepsy, that it is applied by the Welsh peasantry to the eyes, and that bruised leaves are used as a poultice for piles and burns. Culpeper says Venus challenges it under Libra.

#### Questions for the Curator

Grieve prints the botanical heading "Cotyledon Umbilicus" with no authority. The cited Wikipedia page for _Umbilicus rupestris_ lists _Cotyledon umbilicus_ Britten, among others, as a synonym. I cite Grieve as `resolved` via Wikipedia, which is not a nomenclatural authority such as POWO, and I cannot tell which author Grieve meant. GBIF (evidence only, not an authority): https://api.gbif.org/v1/species/match?name=Cotyledon%20umbilicus gives _Cotyledon umbilicata_ Lam., SYNONYM, accepted key 7334368, which is _Umbilicus rupestris_ (Salisb.) Dandy (ACCEPTED). Do you accept? My recommendation: yes, with the Wikipedia mapping as the authority.

Culpeper prints only the English heading "KIDNEYWORT, OR WALL PENNYROYAL" and no Latin name, so his page is cited with `nameBasis: unresolved`. The roster ties it to _Umbilicus rupestris_; no authority I read maps Culpeper's heading to that formal name. He gives the planet and sign: "Venus challenges the herb under Libra." The Wikipedia page cited here says navelwort is "assumed" to be Culpeper's Kidneywort, "although it may actually refer to the unrelated Anemone hepatica", so Wikipedia itself doubts it. Do you accept Culpeper's "KIDNEYWORT, OR WALL PENNYROYAL" as _Umbilicus rupestris_? My recommendation: accept it only if you are content to rest the Culpeper-sourced fields on the common name; otherwise drop the Culpeper citation and the fields that rest on it.
