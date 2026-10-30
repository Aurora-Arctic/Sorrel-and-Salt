---
status: needs-review
nomenclature: botanical
canonicalName: Lilium candidum
toxic: true
safetyNotes: Wikipedia says cats are extremely sensitive to the toxicity of the plant and that ingestion is often fatal, including from pollen groomed off the coat; suspected cases need urgent veterinary attention.
celestialBodies:
  - Moon
folkNames:
  - White Lily
references:
  - source: grieve-lily-madonna
    nameBasis: stated
    supports:
      - canonicalName
      - description
      - folkNames
  - source: wikipedia-lilium-candidum
    nameBasis: stated
    supports:
      - canonicalName
      - description
      - safetyNotes
      - toxic
  - source: culpeper-herbal
    locator: under "WHITE LILIES"
    nameBasis: unresolved
    supports:
      - celestialBodies
variants:
  - form: Bulb
    description: Grieve says only the bulb is now used medicinally, for its highly demulcent and somewhat astringent properties, chiefly boiled in milk or water as an emollient poultice for tumours, ulcers and external inflammation. She says the acrid principle is lost by drying, roasting or boiling.
    safetyNotes: Wikipedia says the plant is highly toxic to cats.
    toxic: true
    references:
      - source: grieve-lily-madonna
        nameBasis: stated
        supports:
          - form
          - description
      - source: wikipedia-lilium-candidum
        nameBasis: stated
        supports:
          - safetyNotes
          - toxic
---

# Madonna Lily

The Madonna lily is a bulbous lily of the Mediterranean, long grown in European gardens for its pure white, strongly fragrant flowers. Wikipedia says it forms bulbs at ground level and, unlike other lilies, sends up a rosette of leaves in winter that dies back the next summer, with a leafy stem of about 1.2 metres bearing several flowers in summer, white and tinted yellow in the throat. Grieve says the church dedicated it to the Madonna for its whiteness, that the flowers were once thought anti-epileptic, and that only the bulb is now used medicinally, as a demulcent poultice. Wikipedia warns that the plant is highly toxic to cats. Culpeper puts the white lilies under the Moon.

#### Questions for the Curator

Wikipedia's "Toxicity in pets" section says "Cats are extremely sensitive to the toxicity of the plant and ingestion is often fatal." It names cats only. I set `toxic: true` on the entry and on the Bulb form because the source calls the plant toxic. Do you accept the flag on a cats-only statement? My recommendation: yes, because the source says "the toxicity of the plant" without limiting it to one part. Note that the Bulb form is the one Grieve uses and she says nothing about toxicity.

Culpeper prints only the English heading "WHITE LILIES" and no Latin name, so his page is cited with `nameBasis: unresolved`. The roster ties it to _Lilium candidum_; no authority I read maps Culpeper's heading to that formal name. He says "They are under the dominion of the Moon." The heading is plural and he says it is "so commonly known in every one's garden" without describing it. Do you accept Culpeper's "WHITE LILIES" as _Lilium candidum_? My recommendation: accept it only if you are content to rest the Culpeper-sourced fields on the common name; otherwise drop the Culpeper citation and the fields that rest on it.
