# Endangered species: the removal list

Gathered for M14.29. **Nothing has been deleted.** The owner's rule: "No endangered species in the compendium please." This file is the list the owner approves under M14.13; main applies it afterwards.

## The rule applied

1. Remove an entry whose species is globally IUCN Endangered (EN) or Critically Endangered (CR), or is in CITES Appendix I.
2. Only global listings count. A national, state or regional status never removes an entry (see "Not removed: regional only").
3. Keep the entry when a source says its trade supply is cultivated. The owner approves each of these.
4. The formal-name rule applies: a listing counts only if the list prints this entry's formal name, or an authority maps its name to exactly that one. Doubt goes to "Uncertain".

Each line: the entry's path under `compendium/ingredients/`, the listing and its value, the source handle and locator. A file's full record is at `compendium/ethics/<same path>.yaml`.

Absence from this file means no EN, CR or Appendix I listing was recorded, not that the entry is safe. The CITES check ran over every entry on the branch at the time of writing; IUCN values are the ones the ethics files record (from each Wikipedia taxobox).

## Remove (8)

- `botanical/agarwood-aquilaria-malaccensis`: IUCN CR, scope global. Source `wikipedia-iucn-aquilaria-malaccensis`, taxobox (Harvey-Brown 2018, 10.2305/IUCN.UK.2018-1.RLTS.T32056A2810130.en). The file is `needs-review` for other reasons.
- `botanical/himalayan-yew-taxus-wallichiana`: IUCN Endangered, scope global. Source `wikipedia-taxus-wallichiana`, taxobox "Conservation status". Also CITES Appendix II (`cites-appendices`).
- `botanical/indian-atees-aconitum-heterophyllum`: IUCN Endangered, scope global. Source `wikipedia-aconitum-heterophyllum`, taxobox "Conservation status".
- `botanical/red-sandalwood-pterocarpus-santalinus`: IUCN EN, scope global. Source `wikipedia-iucn-pterocarpus-santalinus`, taxobox (Ahmedullah 2021, 10.2305/IUCN.UK.2021-1.RLTS.T32104A187622484.en).
- `botanical/spikenard-nardostachys-jatamansi`: IUCN CR, scope global. Source `wikipedia-iucn-nardostachys-jatamansi`, taxobox (Chauhan 2021, 10.2305/IUCN.UK.2021-3.RLTS.T50126627A88304158.en).
- `botanical/storax-liquidambar-orientalis`: IUCN EN, scope global. Source `wikipedia-iucn-liquidambar-orientalis`, taxobox (Kavak 2018, 10.2305/IUCN.UK.2018-1.RLTS.T62556A42326468.en).
- `botanical/pepper-bark-tree-warburgia-salutaris`: IUCN Endangered (IUCN 2.3, an older edition of the Red List), scope global. Source `wikipedia-warburgia-salutaris`, taxobox "Conservation status".
- `zoological/grey-parrot-psittacus-erithacus`: IUCN Endangered (IUCN 3.1) and CITES Appendix I, scope global. Sources `wikipedia-grey-parrot` (taxobox) and `cites-appendices` (p. 34, Appendix I column, class AVES, order PSITTACIFORMES: "Psittacus erithacus", no annotation).

## Keep: cultivated exception (5)

The owner approves each under M14.13. Each is listed EN or CR globally, and its source says the supply is cultivated.

- `botanical/coffee-coffea-arabica`: IUCN Endangered, global. Listing source `wikipedia-coffea-arabica`, taxobox (Moat et al. 2020). Cultivation: same page, "the first species of coffee to have been cultivated and is the dominant cultivar, representing about 60% of global production".
- `botanical/vanilla-vanilla-planifolia`: IUCN EN, global. Listing source `wikipedia-iucn-vanilla-planifolia`, taxobox (Vega 2020). Cultivation: same page, "by the 20th century had become a widely cultivated crop across the world".
- `botanical/houpu-magnolia-magnolia-officinalis`: IUCN Endangered (IUCN 3.1), global. Source `wikipedia-magnolia-officinalis`, infobox. Cultivation: same page, "is now primarily sourced from cultivated plants".
- `botanical/sweet-pea-lathyrus-odoratus`: IUCN CR, global. Source `wikipedia-iucn-lathyrus-odoratus`, taxobox (Rowe et al. 2019). Cultivation: same page, section "Cultivation and uses" (a garden plant sold by nurserymen since 1730).
- `botanical/guggul-commiphora-wightii`: IUCN CR, global (also CITES Appendix II). Source `wikipedia-iucn-commiphora-wightii`, taxobox (Ved 2015). Cultivation: same page, "In India and Pakistan, guggul is cultivated commercially."

Caution for the owner: Vanilla's and Sweet pea's sentences say the plant is a cultivated crop, not in so many words that the trade supply is cultivated. Coffee's says it is the dominant cultivar. I judged all five to meet the exception; say if you disagree with any.

## Uncertain (5)

- `botanical/costus-dolomiaea-costus`: CITES Appendix I, but under the name "Saussurea costus" (p. 66, Appendix I column, source `cites-appendices`). The Appendices do not print Dolomiaea costus. The entry's own cited page (`wikipedia-dolomiaea-costus`, in `compendium/sources/`) says the plant is "formerly Saussurea costus" and "has been placed on Appendix I of CITES". Recommendation: treat that page as the authority mapping the two names, record the listing as `nameBasis: resolved`, and remove the entry. The entry's own description says costus is "grown as a medicinal crop" in Himachal Pradesh and Kashmir; if you count that as a cultivated supply, it moves to the cultivated exception instead.
- `botanical/african-ginger-siphonochilus-aethiopicus`: Wikipedia prose says "critically endangered due to over-harvesting" with no assessor (source `wikipedia-siphonochilus-aethiopicus`, lead), so the scope is `unknown`. CITES lists it (Appendix II, limited to four countries' populations, p. 80). Recommendation: find the actual assessment; until then do not remove.
- `botanical/ferula-aucheri-ferula-aucheri`: Wikipedia prose says "endangered in local provinces", no assessor, scope `unknown` (source `wikipedia-ferula-aucheri`, lead). Recommendation: do not remove on this; it reads as local.
- `botanical/snow-lotus-saussurea`: the entry is the genus Saussurea. Prose "endangered by collections" names no species and no assessor (source `wikipedia-saussurea`). CITES Appendix I lists one species, Saussurea costus, not the genus. Recommendation: do not remove the genus entry; see Dolomiaea costus above.
- `botanical/fir-abies`: the entry is the genus Abies. CITES Appendix I lists one species, "Abies guatemalensis" (p. 76, Appendix I column, source `cites-appendices`). Recommendation: do not remove the genus entry.

## Not removed: regional only

These carry an EN or CR status whose scope is a place, not the world, so the rule leaves them in. Scope is the `scope` key in each file.

- `botanical/mandrake-mandragora-officinarum`: IUCN EN, scope Europe (`wikipedia-iucn-mandragora-officinarum`, status_ref "Europe assessment", Bilz 2011).
- `botanical/tree-turmeric-coscinium-fenestratum`: IUCN Critically Endangered (1997, 2010, 2016), scope India (`wikipedia-coscinium-fenestratum`: "India: Critically endangered ... and Vietnam: Vulnerable").
- `botanical/american-ginseng-panax-quinquefolius`: Endangered (E), scope Canada, from the Committee on the Status of Endangered Wildlife in Canada (`wikipedia-panax-quinquefolius-conservation`, section "Status"). It is also on CITES Appendix II.
- `botanical/merbau-intsia-bijuga`: Critically endangered in the Northern Territory (`wikipedia-intsia-bijuga`, Conservation) and in Singapore (same locator).
- `botanical/navajo-tea-thelesperma-megapotamicum`: Critically Imperiled (S1), scope Utah (`wikipedia-thelesperma-megapotamicum`, Conservation).
- `botanical/balsam-fir-abies-balsamea`: Endangered (native populations only), scope Connecticut (`wikipedia-abies-balsamea`, "Conservation status").
- `botanical/skunk-cabbage-symplocarpus-foetidus`: endangered, scope Tennessee (`wikipedia-symplocarpus-foetidus-conservation`).
- `botanical/virginia-snakeroot-aristolochia-serpentaria`: endangered, scope New York (`wikipedia-aristolochia-serpentaria-conservation`, "Protection").
- `fungal/chinese-caterpillar-fungus-ophiocordyceps-sinensis`: "endangered species in China", scope China, no assessor named (`wikipedia-ophiocordyceps-sinensis`). The file is `needs-review`.

United Plant Savers "Critical" rows (source `ups-species-at-risk`). That list is neither IUCN nor CITES, so the rule does not apply to it: `botanical/fairy-wand-chamaelirium-luteum` (scope global), `botanical/ladys-slipper-cypripedium-parviflorum` (scope global) and `botanical/sandalwood-santalum-album` (scope Hawaii, "Santalum spp. (Hawaii only)"; its IUCN row is Vulnerable, which does not count). I recommend the UPS list not count. Nothing for you to do unless you disagree.
