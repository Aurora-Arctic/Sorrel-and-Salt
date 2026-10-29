---
status: needs-review
nomenclature: botanical
canonicalName: Frangula alnus
toxic: true
safetyNotes: AHPA safety class 2b, 2c, 2d. Not for use in pregnancy or lactation except under the supervision of a qualified healthcare practitioner. Contraindicated with intestinal obstruction, abdominal pain of unknown origin, or any inflammatory condition of the intestines. Not for use beyond 8 consecutive days, nor in children under 12. Concomitant use is cautioned with antiarrhythmic drugs and with botanicals containing cardiac glycosides. Grieve says freshly stripped bark acts as an irritant poison on the gastro-intestinal canal, so only dried bark kept one to two years should be used; Wikipedia says fresh bark is violently purgative and that even dried bark can be dangerous in excess.
folkNames:
  - Black Dogwood
  - Black Alder
  - Glossy Buckthorn
  - Breaking Buckthorn
references:
  - source: grieve-buckthorn-alder
    nameBasis: resolved
    headedAs: Rhamnus Frangula (LINN.)
    resolvedBy: ahpa-safety
    supports:
      - canonicalName
      - description
      - folkNames
      - safetyNotes
      - toxic
  - source: ahpa-safety
    locator: pp. 375–376
    nameBasis: stated
    supports:
      - canonicalName
      - folkNames
      - safetyNotes
  - source: wikipedia-frangula-alnus
    nameBasis: stated
    supports:
      - canonicalName
      - folkNames
      - description
      - safetyNotes
variants:
  - form: Bark
    description: The dried bark of the young trunk and branches, kept at least a year, is the part used. Grieve describes it as papery quills, greyish or blackish-brown outside and crimson within, which colours the saliva yellow when chewed.
    safetyNotes: Fresh bark is violently purgative and acts as an irritant poison on the gastro-intestinal canal; it is aged for one to two years before use.
    toxic: true
    references:
      - source: grieve-buckthorn-alder
        nameBasis: resolved
        headedAs: Rhamnus Frangula (LINN.)
        resolvedBy: ahpa-safety
        supports:
          - form
          - description
          - safetyNotes
          - toxic
      - source: ahpa-safety
        locator: pp. 375–376
        nameBasis: stated
        supports:
          - form
          - safetyNotes
      - source: wikipedia-frangula-alnus
        nameBasis: stated
        supports:
          - safetyNotes
---

# Alder Buckthorn

Alder buckthorn is a tall deciduous shrub of woods and thickets, native to Europe, northern Africa and western Asia and rare in Ireland and Scotland. Unlike the common buckthorn it carries no thorns, and its larger leaves are smooth-edged and set alternately on the stem. Greenish flowers open in May and the berries ripen by September. Its bark and leaves give a yellow dye used in Russia, and the light charcoal made from its wood was preferred by gunpowder makers, which is why Grieve records the name Black Dogwood. The dried bark, sold as frangula, is a stimulant laxative that appears in the British and United States pharmacopoeias. It must be aged before use, because fresh bark is violently purgative.

#### Questions for the Curator

Grieve heads this section "Rhamnus Frangula (LINN.)", not _Frangula alnus_. Wikipedia (the cited revision) lists _Rhamnus frangula_ L. among the synonyms of _Frangula alnus_, and AHPA prints "syn: Rhamnus frangula L." under _Frangula alnus_ Mill. (pp. 375–376). The Grieve citation is therefore `resolved`, with AHPA as the authority.

GBIF (evidence only, not an authority): https://api.gbif.org/v1/species/match?name=Frangula%20alnus gives _Frangula alnus_ Mill., ACCEPTED, key 3039454. https://api.gbif.org/v1/species/match?name=Rhamnus%20frangula gives _Rhamnus frangula_ L., SYNONYM, accepted key 7273688, which is _Frangula alnus_ subsp. _alnus_, not the species.

Do you accept AHPA and Wikipedia as the authority that maps Grieve's name to _Frangula alnus_, and the subspecies reading from GBIF as no obstacle? My recommendation: yes, then set the file to approved.
