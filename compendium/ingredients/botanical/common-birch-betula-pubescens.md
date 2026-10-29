---
status: needs-review
nomenclature: botanical
canonicalName: Betula pubescens
celestialBodies:
  - Venus
folkNames:
  - White Birch
  - Downy Birch
  - Moor Birch
  - Hairy Birch
  - Bouleau
  - Berke
  - Bereza
references:
  - source: grieve-birch-common
    nameBasis: resolved
    headedAs: Betula alba (LINN.)
    resolvedBy: ahpa-safety
    supports:
      - canonicalName
      - description
      - folkNames
  - source: ahpa-safety
    locator: p. 134
    nameBasis: stated
    supports:
      - canonicalName
      - folkNames
  - source: culpeper-herbal
    locator: under "THE BIRCH TREE"
    nameBasis: unresolved
    supports:
      - celestialBodies
  - source: wikipedia-betula-pubescens
    nameBasis: stated
    supports:
      - canonicalName
      - description
      - folkNames
variants:
  - form: Bark
    description: Grieve names the bark and leaves as the parts used. The white outer layer separates into thin sheets, and distilling it yields birch tar oil. AHPA gives bark and leaf as the parts.
    references:
      - source: grieve-birch-common
        nameBasis: resolved
        headedAs: Betula alba (LINN.)
        resolvedBy: ahpa-safety
        supports:
          - form
          - description
      - source: ahpa-safety
        locator: p. 134
        nameBasis: stated
        supports:
          - form
  - form: Leaf
    description: Grieve names the leaves among the parts used, and says the young leaves, or the water from the tree, were taken to break the stone.
    references:
      - source: grieve-birch-common
        nameBasis: resolved
        headedAs: Betula alba (LINN.)
        resolvedBy: ahpa-safety
        supports:
          - form
          - description
      - source: ahpa-safety
        locator: p. 134
        nameBasis: stated
        supports:
          - form
  - form: Sap
    description: Grieve says 16 to 18 gallons of sap may be drawn from one large tree and that a moderate tapping does no harm. Wikipedia says the rising sap in spring makes drinks, wines and ales.
    references:
      - source: grieve-birch-common
        nameBasis: resolved
        headedAs: Betula alba (LINN.)
        resolvedBy: ahpa-safety
        supports:
          - form
          - description
      - source: wikipedia-betula-pubescens
        nameBasis: stated
        supports:
          - description
---

# Common Birch

The downy birch is a deciduous tree native and abundant across northern Europe and northern Asia, growing further north than any other broadleaf tree. Wikipedia says it is often confused with the silver birch, but grows in wetter places with heavier soils. Grieve calls the birch remarkable for its lightness, grace and elegance, with a fragrant smell after rain. Its soft wood is cheap and used for bobbins, barrel staves and broom handles, and the twigs for thatching and brooms. The white bark peels in thin layers and yields birch tar oil, which gives Russia leather its smell. Grieve names the bark and leaves as the medicinal parts. Wikipedia says the inner bark was ground into bread in famine and the spring sap made into drinks.

#### Questions for the Curator

Grieve heads the page "Betula alba (LINN.)". The cited AHPA handbook (p. 134) lists _Betula alba_ L. as a synonym of _Betula pubescens_ Ehrh. only, so I cite the Grieve page as `resolved` via AHPA. But Grieve's page also discusses _B. verrucosa_ (silver birch, AHPA's _B. pendula_) and lists both as synonyms of her subject. GBIF (evidence only, not an authority): https://api.gbif.org/v1/species/match?name=Betula%20alba gives _Betula alba_ L., SYNONYM, accepted key 7226602, which is _Betula pubescens_ var. _pubescens_ (ACCEPTED)..

Culpeper prints only the English heading "THE BIRCH TREE" and no Latin name, so his page is cited with `nameBasis: unresolved`. The roster ties it to _Betula pubescens_; no authority I read maps Culpeper's heading to that formal name. Culpeper gives the planet: "a tree of Venus". His description does not name a species. Do you accept Culpeper's "THE BIRCH TREE" as _Betula pubescens_? My recommendation: accept it only if you are content to rest the Culpeper-sourced fields on the common name; otherwise drop the Culpeper citation and the fields that rest on it.

Does the Grieve page belong to this entry? My recommendation: yes for the bark, leaf and sap uses, and accept the Culpeper planet only with the species doubt noted.
