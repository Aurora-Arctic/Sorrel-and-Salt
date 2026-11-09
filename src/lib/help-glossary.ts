import 'server-only';
import { readHelpGlossary } from '@/modules/help';
import type { HelpTermSource } from './help-marks';
import { HELP_PAGE_LIMIT } from './help-pages';

/** The glossary a help body's marks are matched against: the public finder's cached read, so a page reads it once however many terms it marks. */
export async function readGlossaryTerms(): Promise<HelpTermSource[]> {
  const entries = await readHelpGlossary({ limit: HELP_PAGE_LIMIT, inverted: false });
  return entries.map(({ node }) => ({ slug: node.slug, title: node.title, body: node.body }));
}
