import { NOUNS } from './rules';
import type { HelpFormKind } from './types';

/** The page's heading for a row: "Edit Article" over its title, or "Add Article" for a new one. */
export function helpFormHeading(kind: HelpFormKind, editing: boolean): string {
  return `${editing ? 'Edit' : 'Add'} ${NOUNS[kind]}`;
}
