// The name a list card's controls read after their verb, "Edit Testwort, Formalis testis": the
// card's name with its formal name when it has one, since two entries can share a name. One
// function for the cards, the admin table and the Quick Look window, so the window's icons are
// named as the card's are (the owner's call, 2026-10-20).

export const cardName = (name: string, canonicalName: string | null | undefined): string =>
  canonicalName ? `${name}, ${canonicalName}` : name;
