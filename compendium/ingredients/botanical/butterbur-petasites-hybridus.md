---
status: needs-review
nomenclature: botanical
canonicalName: Petasites hybridus
toxic: true
safetyNotes: Wikipedia says the plant contains senecionine and other toxic pyrrolizidine alkaloids in its leaves and roots, that butterbur extracts have been found at retail to contain hepatotoxic pyrrolizidine alkaloids, and that clinical neurology associations do not recommend it for migraine because of possible liver toxicity. Extracts are not recommended in pregnancy or breastfeeding.
celestialBodies:
  - Sun
folkNames:
  - Langwort
  - Umbrella Plant
  - Bog Rhubarb
  - Flapperdock
  - Blatterdock
  - Capdockin
  - Bogshorns
  - Butter-Dock
references:
  - source: grieve-butterbur
    nameBasis: resolved
    headedAs: Petasites vulgaris (DESF.)
    resolvedBy: wikipedia-petasites-hybridus
    supports:
      - canonicalName
      - description
      - folkNames
  - source: culpeper-herbal
    locator: under "THE BUTTER-BUR, OR PETASITIS"
    nameBasis: unresolved
    supports:
      - celestialBodies
  - source: wikipedia-petasites-hybridus
    nameBasis: stated
    supports:
      - canonicalName
      - description
      - safetyNotes
      - toxic
variants:
  - form: Root
    description: Grieve names the rhizome or root-stock, blackish outside and whitish within, with a bitter, unpleasant taste, as the part used.
    safetyNotes: Wikipedia says the roots contain toxic pyrrolizidine alkaloids.
    toxic: true
    references:
      - source: grieve-butterbur
        nameBasis: resolved
        headedAs: Petasites vulgaris (DESF.)
        resolvedBy: wikipedia-petasites-hybridus
        supports:
          - form
          - description
      - source: wikipedia-petasites-hybridus
        nameBasis: stated
        supports:
          - safetyNotes
          - toxic
  - form: Leaf
    description: Wikipedia says the leaves were used in Austrian and Czech traditional medicine, as tea or maceration inside and as compresses outside.
    safetyNotes: Wikipedia says the leaves contain toxic pyrrolizidine alkaloids.
    toxic: true
    references:
      - source: wikipedia-petasites-hybridus
        nameBasis: stated
        supports:
          - form
          - description
          - safetyNotes
          - toxic
---

# Butterbur

Butterbur is a herbaceous perennial of wet ground, marshy meadows and riversides, native to Europe and northern Asia and closely related to coltsfoot. A fleshy, creeping root-stock sends up the flower spikes before the leaves, in late February or March, on thick purplish stalks. Male and female flowers usually grow on separate spikes, pale reddish-purple, the female spikes denser and longer. The very large rounded leaves come afterwards, and old writers said they could shelter a person from the sun or rain, which gives the names Umbrella Plant and Bog Rhubarb. Grieve lists the Latin name Petasites, from the Greek for a broad-brimmed hat. The plant contains pyrrolizidine alkaloids that can damage the liver.

#### Questions for the Curator

Grieve prints "Petasites vulgaris (DESF.)". Wikipedia (the cited revision) lists _Petasites vulgaris_ Desf. among the synonyms of _Petasites hybridus_, so the Grieve citation is `resolved` via Wikipedia, but no other authority is cited. GBIF (evidence only, not an authority): https://api.gbif.org/v1/species/match?name=Petasites%20vulgaris gives _Petasites_ L., ACCEPTED (genus-level match only), so GBIF gives no species answer..

Culpeper prints only the English heading "THE BUTTER-BUR, OR PETASITIS" and no Latin name, so his page is cited with `nameBasis: unresolved`. The roster ties it to _Petasites hybridus_; no authority I read maps Culpeper's heading to that formal name. Culpeper gives the planet: "under the dominion of the Sun". Do you accept Culpeper's "THE BUTTER-BUR, OR PETASITIS" as _Petasites hybridus_? My recommendation: accept it only if you are content to rest the Culpeper-sourced fields on the common name; otherwise drop the Culpeper citation and the fields that rest on it.

Do you accept Wikipedia as the authority for Grieve's synonym? My recommendation: yes, then drop the Culpeper citation or accept it as above.
