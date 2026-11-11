type FormalName = string | null | undefined;

/** An ingredient as a card or heading names it: its name, then its formal name after a comma, e.g. `Rose, Rosa gallica`. */
export const cardName = (name: string, canonicalName: FormalName): string =>
  canonicalName ? `${name}, ${canonicalName}` : name;

/** An ingredient as a list or sentence tells it apart: its name, then its formal name in brackets, e.g. `Rose (Rosa gallica)`. */
export const bracketedName = (name: string, canonicalName: FormalName): string =>
  canonicalName ? `${name} (${canonicalName})` : name;
