---
status: needs-review
nomenclature: botanical
canonicalName: Carapichea ipecacuanha
toxic: true
safetyNotes: Grieve says ipecacuanha powder acts as a powerful irritant on the skin, even to the extent of causing pustulations, and causes sneezing and a mild inflammation of the nasal membrane when inhaled. She says toxic doses cause gastro-enteritis, cardiac failure, dilation of the blood-vessels, severe bronchitis and pulmonary inflammation, and that the toxic action of emetine on the heart must be watched.
folkNames:
  - Ipecac plant
references:
  - source: grieve-ipecacuanha
    nameBasis: resolved
    headedAs: Psychotria Ipecacuanha (STOKES)
    resolvedBy: wikipedia-carapichea-ipecacuanha
    supports:
      - canonicalName
      - description
      - safetyNotes
      - toxic
  - source: wikipedia-carapichea-ipecacuanha
    nameBasis: stated
    supports:
      - canonicalName
      - description
      - folkNames
variants:
  - form: Root
    description: Grieve says the thickened rootlets alone are collected and dried, because the active constituents are in the bark. She names emetine, cephaeline and psychotrine as the chief alkaloids, and says the root is emetic in large doses and diaphoretic and expectorant in smaller ones. Wikipedia says the root was used to make syrup of ipecac.
    safetyNotes: Grieve says toxic doses cause gastro-enteritis and cardiac failure, and that the powder is a powerful skin irritant.
    toxic: true
    references:
      - source: grieve-ipecacuanha
        nameBasis: resolved
        headedAs: Psychotria Ipecacuanha (STOKES)
        resolvedBy: wikipedia-carapichea-ipecacuanha
        supports:
          - form
          - description
          - safetyNotes
          - toxic
      - source: wikipedia-carapichea-ipecacuanha
        nameBasis: stated
        supports:
          - form
          - description
---

# Ipecacuanha

Ipecacuanha is a slow-growing, small shrubby plant of the madder family, which Wikipedia says is native to Costa Rica, Nicaragua, Panama, Colombia and Brazil. Grieve describes a plant about a foot high growing in clumps in moist, shady Brazilian woods, with a slender stem partly underground and rootlets whose thickened bark is collected by the Indians in January and February. Its common name comes from a Tupi word, and Wikipedia says the roots were used to make syrup of ipecac, a powerful emetic, no longer approved for medical use in the West for lack of evidence of safety and efficacy. Grieve names emetine as the chief active alkaloid and says the root is emetic in large doses, and that emetine was used for amoebic dysentery. She also gives a hazard: toxic doses can cause cardiac failure.

#### Questions for the Curator

Grieve prints the botanical heading "Psychotria Ipecacuanha (STOKES)", with the caption "Cephaelis Ipecacuanha". The cited Wikipedia page for _Carapichea ipecacuanha_ lists _Psychotria ipecacuanha_ and _Cephaelis ipecacuanha_ as synonyms, so I cite Grieve as `resolved` via Wikipedia, which is not a nomenclatural authority such as POWO. Do you accept? My recommendation: yes. GBIF (evidence only, not an authority): https://api.gbif.org/v1/species/match?name=Psychotria%20ipecacuanha gives _Psychotria ipecacuanha_ (Brot.) Standl., SYNONYM, accepted key 2921359, which is _Carapichea ipecacuanha_ (Brot.) L.Andersson (ACCEPTED).

I set `toxic: true` on the entry and the Root form because Grieve writes "Toxic doses cause gastro-enteritis, cardiac failure" and "The toxic action of Emetine on the heart must be watched". Do you accept the flag? My recommendation: yes.
