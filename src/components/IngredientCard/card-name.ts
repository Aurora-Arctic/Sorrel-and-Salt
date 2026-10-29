// The name a list card's controls read after their verb, "Edit Testwort, Formalis testis": the card's
// name with its formal name when it has one, as two entries can share a name. One function for cards,
// the admin table and Quick Look.

export const cardName = (name: string, canonicalName: string | null | undefined): string =>
  canonicalName ? `${name}, ${canonicalName}` : name;
