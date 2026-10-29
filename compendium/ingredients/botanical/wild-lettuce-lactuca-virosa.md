---
status: needs-review
nomenclature: botanical
canonicalName: Lactuca virosa
toxic: true
safetyNotes: Grieve says the milky juice is narcotic, that her species name virosa means poisonous, and that moderate doses given to lower animals act as a narcotic poison, with an injection having caused death. AHPA reports a case series of nine patients who ate the plant with mydriasis, dizziness, anxiety, urinary retention and sympathetic overactivity, and intravenous use of an extract with fevers, chills, abdominal and back pain and abnormal liver function.
folkNames:
  - Bitter Lettuce
  - Opium Lettuce
  - Lettuce Opium
  - Poisonous Lettuce
  - Tall Lettuce
  - Great Lettuce
  - Strong-scented Lettuce
  - Green Endive
  - Acrid Lettuce
  - Laitue Vireuse
references:
  - source: grieve-lettuce-wild
    nameBasis: stated
    supports:
      - canonicalName
      - description
      - folkNames
      - toxic
      - safetyNotes
  - source: wikipedia-lactuca-virosa
    nameBasis: stated
    supports:
      - canonicalName
      - description
      - folkNames
  - source: ahpa-safety
    locator: p. 493, in the entry for Lactuca spp.
    nameBasis: stated
    supports:
      - safetyNotes
variants:
  - form: Sap
    description: Grieve gives the dried milk-juice, lactucarium, as a part used. She says the drug resembles a feeble opium without its tendency to upset the digestive system, is used to a small extent as a sedative and narcotic, and that dissolved in wine it is said to be a good anodyne. She gives a dose of 5 to 20 grains.
    safetyNotes: Grieve says moderate doses given to lower animals act as a narcotic poison.
    references:
      - source: grieve-lettuce-wild
        nameBasis: stated
        supports:
          - form
          - description
          - safetyNotes
  - form: Leaf
    description: Grieve gives the leaves as a part used. She says the fresh leaves boiled in water are sometimes used as a cataplasm, and that a fluid extract of the leaves is dosed at one quarter to one drachm.
    references:
      - source: grieve-lettuce-wild
        nameBasis: stated
        supports:
          - form
          - description
---

# Wild Lettuce

Wild lettuce, also called bitter lettuce or opium lettuce, is a tall biennial of the daisy family found on banks and waste places in western and southern Europe, including coastal Britain. Grieve describes an erect, pale green stem up to six feet high, large leaves clasping the stem, pale yellow strap-shaped florets and a rough black fruit with a white beak, and says the whole plant is rich in a bitter, narcotic-smelling milky juice. When dried this hardens into lactucarium, which she says was used as a feeble substitute for opium. Wikipedia says it is ingested for mild analgesic and sedative effects. Both sources record hazards, set out in the safety note.

#### Questions for the Curator

Toxic flag: Grieve says the species name _virosa_ means "poisonous" and that moderate doses given to lower animals "act as a narcotic poison". No source I read says the plant is poisonous to people, and AHPA gives it safety class 1 with no contraindications. I set `toxic: true` on the strength of Grieve. Do you accept the flag? My recommendation: yes, because her statement is about the plant's juice and the flag errs towards caution.
