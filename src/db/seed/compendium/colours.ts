// The colours a compendium entry or form may list: lower-case, British, and
// closed for the seed alone. The column is free text with no vocabulary
// (DESIGN.md §5), so an admin may write any colour; the seed's
// list is closed so six research lanes spell one colour one way. A colour a
// source gives that is not here is left out and named in the content task's
// pull request body (claude-docs/db/compendium-seed/README.md, "What a source
// is recorded in").
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
