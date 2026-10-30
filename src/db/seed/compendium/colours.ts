// The colours a compendium entry or form may list: lower-case, British, and closed for the seed alone, so research lanes spell one colour one way
// (the column itself is free text). A source's colour not here is left out and named in the content task's PR body (claude-docs/db/compendium-seed/README.md, "What a source is recorded in").
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
