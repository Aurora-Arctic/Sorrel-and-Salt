export const cardName = (name: string, canonicalName: string | null | undefined): string =>
  canonicalName ? `${name}, ${canonicalName}` : name;
