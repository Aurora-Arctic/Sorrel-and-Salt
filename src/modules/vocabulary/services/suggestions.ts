import 'server-only';
import {
  type SuggestingVocabulary,
  type VocabularySuggestion,
  findVocabularySuggestions,
} from '../../../db/repository';
import type { PageEntry, PageRequest } from '../../../lib/pagination';
import type { Session } from '../../../lib/session';
import { assertMembership } from '@/modules/coven';
import { planets, zodiacSigns } from '../schema/astrology';

export type { VocabularySuggestion };

/**
 * Asks only `ingredient: ['read']`: the curated rows are global, and every
 * in-use value is one a reader of this workspace could already list.
 */
async function suggest(
  vocabulary: SuggestingVocabulary,
  session: Session,
  workspaceId: string,
  term: string,
  page: PageRequest,
): Promise<PageEntry<VocabularySuggestion>[]> {
  const membership = await assertMembership(session, workspaceId, { ingredient: ['read'] });
  return findVocabularySuggestions(membership, vocabulary, term.trim(), page);
}

/**
 * What the `planet` field offers as `term` is typed: the curated bodies first,
 * a name match before a description match, then values already written in the
 * compendium or this workspace that no body curates. A blank term offers all.
 *
 * @throws {Forbidden} the caller may not read this workspace's ingredients.
 */
export function suggestPlanets(
  session: Session,
  workspaceId: string,
  term: string,
  page: PageRequest,
): Promise<PageEntry<VocabularySuggestion>[]> {
  return suggest(planets, session, workspaceId, term, page);
}

/**
 * The same for the `zodiac` field, over the signs.
 *
 * @throws {Forbidden} the caller may not read this workspace's ingredients.
 */
export function suggestZodiacSigns(
  session: Session,
  workspaceId: string,
  term: string,
  page: PageRequest,
): Promise<PageEntry<VocabularySuggestion>[]> {
  return suggest(zodiacSigns, session, workspaceId, term, page);
}
