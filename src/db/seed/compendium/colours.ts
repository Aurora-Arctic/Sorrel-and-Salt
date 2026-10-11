// The colours a compendium entry or form may list: lower-case, British, and
// closed for the seed alone. The column is free text with no vocabulary, the
// owner's call (DESIGN.md §5), so an admin may write any colour; the seed's
// list is closed so six research lanes spell one colour one way. A colour a
// source gives that is not here is left out and named in the shard doc's
// "What is left out, and why" (claude-docs/db/compendium-seed/README.md).
export const COLOURS = [
  'black',
  'blue',
  'brown',
  'colourless',
  'gold',
  'green',
  'grey',
  'indigo',
  'orange',
  'pink',
  'purple',
  'red',
  'silver',
  'turquoise',
  'violet',
  'white',
  'yellow',
] as const;
