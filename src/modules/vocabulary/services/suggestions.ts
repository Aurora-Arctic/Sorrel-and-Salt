import 'server-only';
import {
  type Claimant,
  type DeitySuggestion,
  type FormSuggestion,
  type VocabularySuggestion,
  findVocabularySuggestions,
} from '../../../db/repository';
import type { Session } from '../../../lib/session';
import { type Membership, assertMembership } from '@/modules/coven';
import { planets, zodiacSigns } from '../schema/astrology';
import { deities } from '../schema/deities';
import { ingredientForms } from '../schema/ingredient-forms';
import type { PageEntry, PageRequest } from '../../../lib/types';

export type { Claimant, DeitySuggestion, FormSuggestion, VocabularySuggestion };

/**
 * The proofs a lookup reads under: the coven's, or none for the compendium
 * alone, as `getIngredient` builds them. Asks only `ingredient: ['read']`:
 * the curated rows are global, and every in-use value is one a reader of
 * this workspace could already list.
 */
async function readerOf(
  session: Session,
  workspaceId: string | null | undefined,
): Promise<Membership[]> {
  const memberships: Membership[] = [];
  if (workspaceId != null) {
    memberships.push(await assertMembership(session, workspaceId, { ingredient: ['read'] }));
  }
  return memberships;
}

async function suggest(
  vocabulary: typeof planets | typeof zodiacSigns,
  session: Session,
  workspaceId: string | null | undefined,
  query: string,
  page: PageRequest,
): Promise<PageEntry<VocabularySuggestion>[]> {
  return findVocabularySuggestions(
    await readerOf(session, workspaceId),
    vocabulary,
    query.trim(),
    page,
  );
}

/**
 * What a `planets` entry offers as `query` is typed: the curated bodies first,
 * a name match before a description match, then values already written in the
 * compendium or this workspace that no body curates. A blank query offers all.
 * Without a workspace, the values written in the compendium alone.
 *
 * @throws {Forbidden} a workspace is named and the caller may not read its
 * ingredients.
 */
export function suggestPlanets(
  session: Session,
  workspaceId: string | null | undefined,
  query: string,
  page: PageRequest,
): Promise<PageEntry<VocabularySuggestion>[]> {
  return suggest(planets, session, workspaceId, query, page);
}

/**
 * The same for a `zodiacSigns` entry, over the signs.
 *
 * @throws {Forbidden} a workspace is named and the caller may not read its
 * ingredients.
 */
export function suggestZodiacSigns(
  session: Session,
  workspaceId: string | null | undefined,
  query: string,
  page: PageRequest,
): Promise<PageEntry<VocabularySuggestion>[]> {
  return suggest(zodiacSigns, session, workspaceId, query, page);
}

/**
 * What the `form` field offers as `query` is typed: the curated forms first,
 * each with its group, a name match before a description match, then values
 * already written in the compendium or this workspace that no live form
 * curates. Each names the in-scope ingredients already claiming it. Without a
 * workspace, the compendium alone is in scope.
 *
 * @throws {Forbidden} a workspace is named and the caller may not read its
 * ingredients.
 */
export async function suggestForms(
  session: Session,
  workspaceId: string | null | undefined,
  query: string,
  page: PageRequest,
): Promise<PageEntry<FormSuggestion>[]> {
  return findVocabularySuggestions(
    await readerOf(session, workspaceId),
    ingredientForms,
    query.trim(),
    page,
  );
}

/**
 * What a `deities` entry offers as `query` is typed: the curated deities
 * first, each with its tradition, a name match before a description match,
 * then values already written in the compendium or this workspace that no
 * live deity curates. Without a workspace, the compendium alone is in scope.
 *
 * @throws {Forbidden} a workspace is named and the caller may not read its
 * ingredients.
 */
export async function suggestDeities(
  session: Session,
  workspaceId: string | null | undefined,
  query: string,
  page: PageRequest,
): Promise<PageEntry<DeitySuggestion>[]> {
  return findVocabularySuggestions(
    await readerOf(session, workspaceId),
    deities,
    query.trim(),
    page,
  );
}
