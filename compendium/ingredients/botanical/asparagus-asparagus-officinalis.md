---
status: needs-review
nomenclature: botanical
canonicalName: Asparagus officinalis
toxic: true
safetyNotes: Wikipedia states that the red berry is toxic to humans. AHPA safety class 1, but it records occupational allergic contact dermatitis from the above-ground parts and allergic reactions, including anaphylactic reactions, after eating the above-ground parts; it found no relevance of these to the root.
references:
  - source: grieve-asparagus
    nameBasis: stated
    supports:
      - canonicalName
      - description
  - source: ahpa-safety
    locator: p. 105
    nameBasis: stated
    supports:
      - canonicalName
      - safetyNotes
  - source: culpeper-herbal
    locator: under "ASPARAGUS, SPARAGUS, OR SPERAGE"
    nameBasis: unresolved
    supports:
      - description
  - source: wikipedia-asparagus
    nameBasis: stated
    supports:
      - canonicalName
      - description
      - safetyNotes
      - toxic
variants:
  - form: Root
    description: AHPA names the rhizome as the part and notes it as a diuretic. Culpeper boiled the root in wine, took it to clear the sight and held it in the mouth to ease toothache.
    references:
      - source: ahpa-safety
        locator: p. 105
        nameBasis: stated
        supports:
          - form
          - description
      - source: culpeper-herbal
        locator: under "ASPARAGUS, SPARAGUS, OR SPERAGE"
        nameBasis: unresolved
        supports:
          - form
          - description
  - form: Berry
    description: The fruit is a small red berry, 6 to 10 millimetres across.
    safetyNotes: Wikipedia states the berry is toxic to humans.
    toxic: true
    references:
      - source: wikipedia-asparagus
        nameBasis: stated
        supports:
          - form
          - description
          - safetyNotes
          - toxic
---

# Asparagus

Asparagus is a perennial of Eurasia, grown across the world for its young spring shoots. It is herbaceous, usually 100 to 150 centimetres tall, with stout stems, feathery foliage of needle-like cladodes, and a fibrous crown below ground. Grieve says it grows wild on the coast of south-west England, in Anglesey, and over the steppes of southern Russia and Poland, and that the Greeks and Romans prized it; Cato is said to have grown it two centuries before Christ, and forced asparagus reached London markets in 1670. It was valued as a diuretic and laxative, and its fresh juice was taken for gravel and dropsy. Culpeper boiled the root in wine to clear the sight and ease toothache. Its small red berry is toxic to humans.

#### Questions for the Curator

Culpeper prints only the English heading "ASPARAGUS, SPARAGUS, OR SPERAGE" and no Latin name, so his page is cited with `nameBasis: unresolved`. The roster ties it to _Asparagus officinalis_; no authority I read maps Culpeper's heading to that formal name. The heading is the common name for the vegetable. Do you accept Culpeper's "ASPARAGUS, SPARAGUS, OR SPERAGE" as _Asparagus officinalis_? My recommendation: accept it only if you are content to rest the Culpeper-sourced fields on the common name; otherwise drop the Culpeper citation and the fields that rest on it.

The Wikipedia page cited is titled "Asparagus" (the roster reached it from "Asparagus officinalis") and its lead states "Asparagus (Asparagus officinalis)", so the name is `stated`.
