import 'server-only';
import { findHelpGlossaryPage } from '@/db/repository';
import { fieldRefusal } from '@/lib/errors';
import { helpTerms, marksInMarkdown } from '@/lib/help-marks';
import { HELP_WIDGETS, unknownWidgets } from '@/lib/help-widgets';
import { plural } from '@/lib/text';

// Wide enough for every glossary term the help centre will hold.
const TERMS_LIMIT = 2001;

/**
 * Refuses a body that marks a term (`[[Term]]`, `[[Term|text]]`) the glossary does not hold, naming each. A term being
 * saved counts as in the glossary for its own body.
 *
 * @throws {ValidationError} refused at `body`.
 */
export async function assertMarksExist(
  body: string,
  own: { kind: string; title: string; slug: string },
): Promise<void> {
  const marked = marksInMarkdown(body);
  if (marked.length === 0) return;
  // A hidden term still counts, so hiding one never makes a body that marks it unsaveable; a reader sees such a mark as plain text.
  const entries = await findHelpGlossaryPage(
    { limit: TERMS_LIMIT, inverted: false },
    { hidden: true },
  );
  const sources = entries.map(({ node }) => ({ slug: node.slug, title: node.title, body: '' }));
  if (own.kind === 'term') sources.push({ slug: own.slug, title: own.title, body: '' });
  const terms = helpTerms(sources);
  const missing = [...new Set(marked.filter((name) => !terms.find(name)))];
  if (missing.length === 0) return;
  throw fieldRefusal(
    'body',
    `The body marks ${missing.map((name) => `“${name}”`).join(', ')}, which ${plural(missing.length, 'is', 'are')} not in the glossary. Add the term first, or write the word without [[ ]].`,
  );
}

/**
 * Refuses a body whose `::widget[name]` tag names no widget in {@link HELP_WIDGETS}, naming each.
 *
 * @throws {ValidationError} refused at `body`.
 */
export function assertWidgetsKnown(body: string): void {
  const unknown = unknownWidgets(body);
  if (unknown.length === 0) return;
  throw fieldRefusal(
    'body',
    `The body places ${unknown.map((name) => `“${name}”`).join(', ')}, which ${plural(unknown.length, 'is not a widget', 'are not widgets')}. The widgets are ${HELP_WIDGETS.join(', ')}.`,
  );
}
