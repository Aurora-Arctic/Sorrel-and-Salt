import type { EditableEntry } from './types';

// The browser tab's title: the name, then the formal name in brackets when it says something more.
// Plain text, and "equal" folds case as `identity_key` does, so a label that only repeats the
// formal name is not shown twice.
export const pageTitleOf = ({
  name,
  canonicalName,
}: Pick<EditableEntry, 'name' | 'canonicalName'>): string =>
  canonicalName && canonicalName.toLowerCase() !== name.toLowerCase()
    ? `${name} (${canonicalName})`
    : name;
