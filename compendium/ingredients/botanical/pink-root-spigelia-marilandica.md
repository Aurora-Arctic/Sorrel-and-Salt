---
status: needs-review
nomenclature: botanical
canonicalName: Spigelia marilandica
toxic: true
safetyNotes: Grieve says the root contains a poisonous alkaloid, spigeline, that large doses can cause convulsions and death in children, and that the drug should be followed by a saline aperient. Wikipedia says the root is toxic and that overdose can cause increased heart action, vertigo, convulsions and death. AHPA classes it 2b and 2d and says it is not for use in pregnancy except under the supervision of a qualified healthcare practitioner, not for long-term use, and not to be taken above the recommended dose.
folkNames:
  - Indian Pink
  - Maryland Pink
  - Wormgrass
  - American Wormgrass
  - Woodland Pinkroot
  - Starbloom
  - Wormroot
references:
  - source: grieve-pink-root
    nameBasis: unresolved
    supports:
      - description
      - folkNames
      - safetyNotes
      - toxic
  - source: wikipedia-spigelia-marilandica
    nameBasis: stated
    supports:
      - canonicalName
      - description
      - safetyNotes
      - toxic
  - source: ahpa-safety
    locator: p. 823
    nameBasis: stated
    supports:
      - canonicalName
      - folkNames
      - safetyNotes
variants:
  - form: Root
    description: Grieve gives the dried rhizome and rootlets as the part used, as a vermifuge for tapeworm and round worm, always followed by a saline aperient. She says the Indians used it for worms before America was discovered. AHPA gives the root as the part.
    safetyNotes: Grieve says the root contains a poisonous alkaloid and that large doses have caused death from convulsions in children.
    toxic: true
    references:
      - source: grieve-pink-root
        nameBasis: unresolved
        supports:
          - form
          - description
          - safetyNotes
          - toxic
      - source: wikipedia-spigelia-marilandica
        nameBasis: stated
        supports:
          - toxic
      - source: ahpa-safety
        locator: p. 823
        nameBasis: stated
        supports:
          - form
---

# Pink Root

Pink root, or Indian pink, is an upright herbaceous perennial of the south-eastern and midwestern United States, 30 to 60 cm tall, with red tubular flowers that are yellow inside. Wikipedia says it is also a popular ornamental in Britain and Europe. Grieve says the dried rhizome and rootlets were used as a vermifuge, known to the Indians before the discovery of America, and warns of a poisonous alkaloid, spigeline. She says large doses have caused convulsions and death in children, and that the drug is often adulterated. Wikipedia says the roots are toxic and a narcotic hallucinogen, followed in use by a saline aperient to expel the root with the worms.

#### Questions for the Curator

Grieve's page prints "Spigelia marylandica (LINN.)". Wikipedia and AHPA print _Spigelia marilandica_. The two epithets differ by one letter, and no authority I read says they are the same name, so I cite Grieve as `unresolved`. GBIF (evidence only, not an authority): matching "Spigelia marylandica" returns Spigelia marilandica (L.) L., ACCEPTED. Do you accept Grieve's "marylandica" as a spelling of _Spigelia marilandica_? My recommendation: yes, but only if you confirm in POWO that it is an orthographic variant.

Wikipedia calls the root "toxic" and Grieve calls the alkaloid "poisonous", so I set `toxic: true` on the entry and the Root. Do you accept? My recommendation: yes.
