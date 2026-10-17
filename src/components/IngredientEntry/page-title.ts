import type { EditableEntry } from './types';

// The browser tab's title: the name, then the formal name in brackets when the
// entry has one that says something more. Plain text, as a title carries no
// italics. "Equal" folds case as `identity_key` does, so a label that only
// repeats the formal name is not shown twice.
export const pageTitleOf = ({
  name,
  canonicalName,
}: Pick<EditableEntry, 'name' | 'canonicalName'>): string =>
  canonicalName && canonicalName.toLowerCase() !== name.toLowerCase()
    ? `${name} (${canonicalName})`
    : name;
