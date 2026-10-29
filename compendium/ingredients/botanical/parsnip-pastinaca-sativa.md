---
status: needs-review
nomenclature: botanical
canonicalName: Pastinaca sativa
toxic: true
safetyNotes: Wikipedia says all parts of the plant contain furanocoumarins that can sensitise tissue to sunlight and cause photodermatitis, a skin rash or blisters, that contact with the eyes can potentially blind them, and that the sap of the shoots and leaves is phototoxic and causes blisters on skin exposed to sunlight.
folkNames:
  - Wild Parsnip
  - Le Panais
  - Die Pastinake
references:
  - source: grieve-parsnip
    nameBasis: stated
    supports:
      - canonicalName
      - description
      - folkNames
  - source: wikipedia-pastinaca-sativa
    nameBasis: stated
    supports:
      - canonicalName
      - description
      - safetyNotes
      - toxic
variants:
  - form: Root
    description: Grieve gives the root as the part used. She says it was cultivated by the ancients, that its food value exceeds that of any other vegetable but the potato, and that it was made into soups, beer, marmalade and wine. She quotes Culpepper that the wild root is more medicinal, provoking urine and easing pains in the sides.
    safetyNotes: Wikipedia says all parts of the plant contain furanocoumarins that can cause photodermatitis.
    toxic: true
    references:
      - source: grieve-parsnip
        nameBasis: stated
        supports:
          - form
          - description
      - source: wikipedia-pastinaca-sativa
        nameBasis: stated
        supports:
          - safetyNotes
          - toxic
  - form: Leaf
    description: Wikipedia says the shoots and leaves must be handled with care, because their sap contains phototoxic furanocoumarins that cause blisters on skin exposed to sunlight.
    safetyNotes: The sap contains furanocoumarins that cause blisters on skin exposed to sunlight.
    toxic: true
    references:
      - source: wikipedia-pastinaca-sativa
        nameBasis: stated
        supports:
          - form
          - description
          - safetyNotes
          - toxic
---

# Parsnip

Parsnip is a biennial of the carrot family, native to Eurasia, grown for its long, cream-coloured taproot, which turns sweeter after winter frost. Wikipedia says it has been a vegetable since antiquity, was cultivated by the Romans, and served as a sweetener before cane sugar, and that it is a common weed in North America. Grieve says the wild plant grows by wayside and field borders on chalky soils, and that the roots were boiled in Ireland to make beer and in other places made into marmalade and wine. She quotes Culpepper that the wild root is the more medicinal, provoking urine and easing wind. Wikipedia warns that every part contains furanocoumarins, which can blister skin in sunlight.

#### Questions for the Curator

Wikipedia says "all its parts contain furanocoumarins that can sensitize mammalian tissue to sunlight and so cause photodermatitis" and speaks of "the plant's toxicity". I set `toxic: true` on the entry, the Root and the Leaf. The Root is flagged because of "all its parts", although Wikipedia's blister warning names the shoots, leaves and sap. Do you accept the flag on the Root? My recommendation: yes, because a cited source says every part carries the compounds.

Grieve's page gives the Latin name Pastinaca sativa with no authority string, and prints it exactly, so it is `stated`. Culpeper's only parsnip entry I found is a Latin-name list ("Pastinatæ, Sativæ, and silvestris") and gives no planet for it, so I did not cite him.
