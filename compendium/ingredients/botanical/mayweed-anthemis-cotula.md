---
status: needs-review
nomenclature: botanical
canonicalName: Anthemis cotula
toxic: true
safetyNotes: Wikipedia says the plant is potentially toxic to dogs, cats, horses and guinea pigs, with contact dermatitis, vomiting, diarrhoea, anorexia and allergic reactions, that long-term use can lead to bleeding tendencies, and that the foliage may cause skin irritation. Grieve says a strong decoction can cause sweating and vomiting.
folkNames:
  - Stinking Chamomile
  - Maroute
  - Dog Chamomile
  - Wild Chamomile
  - Dog's Fennel
  - Maithes
  - Maithen
  - Mathor
  - Manzanilla loca
  - Camomille puante
  - Foetid Chamomile
references:
  - source: grieve-mayweed
    nameBasis: stated
    supports:
      - canonicalName
      - description
      - folkNames
      - safetyNotes
  - source: wikipedia-anthemis-cotula
    nameBasis: stated
    supports:
      - canonicalName
      - description
      - folkNames
      - safetyNotes
      - toxic
variants:
  - form: Flower
    description: Grieve says the flowers are preferred for internal use, being slightly less disagreeable than the leaves, as an antispasmodic and emmenagogue in hysteria. She says the fresh bruised herb applied to the skin is a vesicant, and gives the infusion dose as 1 to 4 fluid ounces.
    safetyNotes: A strong decoction can cause sweating and vomiting.
    references:
      - source: grieve-mayweed
        nameBasis: stated
        supports:
          - form
          - description
          - safetyNotes
  - form: Leaf
    description: Grieve lists the leaves among the parts used, as less pleasant than the flowers. Wikipedia says the foliage may cause skin irritation.
    safetyNotes: Wikipedia says the foliage may cause skin irritation.
    toxic: true
    references:
      - source: grieve-mayweed
        nameBasis: stated
        supports:
          - form
          - description
      - source: wikipedia-anthemis-cotula
        nameBasis: stated
        supports:
          - form
          - description
          - safetyNotes
          - toxic
---

# Mayweed

Mayweed, or stinking chamomile, is an annual plant of Europe with a strong, unpleasant smell, growing to 30 to 60 cm with white-petalled, chamomile-like flower heads. Grieve says it grows freely in waste places, resembles true chamomile but lacks the membranous scales at the base of the florets, and is distinguished by its foetid odour. She records it as an antispasmodic and emmenagogue in hysteria in Europe, a poultice for piles, and a sleep aid in asthma. Wikipedia says it is potentially toxic to dogs, cats, horses and guinea pigs, and that the foliage may cause skin irritation, and lists many common names for it.

#### Questions for the Curator

Wikipedia says "Anthemis cotula is potentially toxic to dogs, cats, horses, and guinea pigs" and "The foliage may also cause skin irritation." I set `toxic: true` on the entry and the Leaf form. The statement names animals and is hedged with "potentially". Do you accept the flag? My recommendation: yes, because a cited source calls the plant toxic.

Grieve calls the fresh bruised herb applied to the skin "a safe vesicant" (a blistering agent). I did not copy "safe" into the caution. Do you want the vesicant action recorded as a hazard? My recommendation: no, because Wikipedia already records skin irritation.
