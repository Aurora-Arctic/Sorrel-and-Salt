import 'server-only';
import {
  BEST_SOURCE,
  CURATOR_REVIEWED,
  FORM_CITES_NOTHING,
  isWikipedia,
  NAME_BACKED,
  NO_LOCATOR,
  NOMENCLATURE_UNKNOWN,
  SAFETY_UNSOURCED,
  SOURCES,
} from '../schema/sourcing-weights';
import { NAMELESS_KIND, UNSETTLED_KIND, type ReferenceKind } from '../schema/ingredient-enums';
import type { CitedReference, SourcingFact, SourcingInput, SourcingScore } from '../types';

type ReferenceRow = CitedReference['reference'];

const KIND_LABELS: Record<ReferenceKind, string> = {
  book: 'Book',
  chapter: 'Chapter',
  entry: 'Reference Entry',
  article: 'Article',
  web_page: 'Web Page',
};

const hasText = (text: string | null) => Boolean(text?.trim());

/** A positive count's points at `each` apiece, stopped at `cap`; caps below zero stop from beneath. */
function capped(count: number, each: number, cap: number): number {
  if (count === 0) return 0; // zero times a negative weight is -0, which would print as such
  const points = count * each;
  return cap < 0 ? Math.max(points, cap) : Math.min(points, cap);
}

function sourceWorth(reference: ReferenceRow): number {
  return reference.scholarly ? BEST_SOURCE.scholarly : BEST_SOURCE.kinds[reference.kind];
}

function sourceLabel(reference: ReferenceRow): string {
  if (reference.scholarly) return 'Scholarly Work';
  return isWikipedia(reference) ? 'Wikipedia' : KIND_LABELS[reference.kind];
}

function bestSource(works: ReferenceRow[]): SourcingFact {
  const top = Math.max(0, ...works.map(sourceWorth));
  const atTop = works.filter((work) => sourceWorth(work) === top);
  // A plain web page names the tier better than Wikipedia, which only shares it.
  const best = atTop.find((work) => !isWikipedia(work)) ?? atTop[0];
  return {
    fact: 'bestSource',
    label: `Best Source: ${best ? sourceLabel(best) : 'None'}`,
    points: top,
  };
}

function nameBacked(input: SourcingInput, citations: CitedReference[]): SourcingFact {
  if (input.entry.nomenclature === NAMELESS_KIND) {
    return {
      fact: 'nameBacked',
      label: 'Formal Name Backed: No Formal Name to Resolve',
      points: NAME_BACKED.full,
    };
  }
  const backing: readonly (string | null)[] = NAME_BACKED.backing;
  const backed = citations.filter((citation) => backing.includes(citation.nameBasis)).length;
  return {
    fact: 'nameBacked',
    label: `Formal Name Backed: ${backed} of ${citations.length}`,
    points: citations.length === 0 ? 0 : Math.round((NAME_BACKED.full * backed) / citations.length),
  };
}

function safety(input: SourcingInput, citations: CitedReference[]): SourcingFact {
  const noted =
    hasText(input.entry.safetyNotes) || input.forms.some((form) => hasText(form.safetyNotes));
  const sourced = citations.some((citation) => citation.supports?.includes(SAFETY_UNSOURCED.field));
  const state = !noted ? 'None' : sourced ? 'Sourced' : 'Unsourced';
  return {
    fact: 'safetyUnsourced',
    label: `Safety Note: ${state}`,
    points: state === 'Unsourced' ? SAFETY_UNSOURCED.points : 0,
  };
}

/**
 * A compendium entry's sourcing score with every fact behind it, each capped on its own so the list sums to the
 * score; null for a coven's own ingredient, which is never scored. The weights are `sourcing-weights.ts`'s.
 */
export function sourcingScore(input: SourcingInput): SourcingScore | null {
  if (input.entry.workspaceId !== null) return null;
  const citations = [...input.references, ...input.forms.flatMap((form) => form.references)];
  const works = [...new Map(citations.map(({ reference }) => [reference.id, reference])).values()];
  const printKinds: readonly ReferenceKind[] = NO_LOCATOR.kinds;
  const unlocated = citations.filter(
    (citation) => printKinds.includes(citation.reference.kind) && !hasText(citation.locator),
  ).length;
  const bareForms = input.forms.filter((form) => form.references.length === 0).length;
  const reviewed = input.entry.reviewed;
  const unknown = input.entry.nomenclature === UNSETTLED_KIND;

  const facts: SourcingFact[] = [
    {
      fact: 'sources',
      label: `${works.length} ${works.length === 1 ? 'Source' : 'Sources'}`,
      points: capped(works.length, SOURCES.each, SOURCES.cap),
    },
    bestSource(works),
    nameBacked(input, citations),
    {
      fact: 'curatorReviewed',
      label: `Curator Review: ${reviewed ? 'Done' : 'Not Yet'}`,
      points: reviewed ? CURATOR_REVIEWED : 0,
    },
    {
      fact: 'nomenclatureUnknown',
      label: `Nomenclature: ${unknown ? 'Unknown' : 'Settled'}`,
      points: unknown ? NOMENCLATURE_UNKNOWN : 0,
    },
    {
      fact: 'noLocator',
      label: `Citations with No Locator: ${unlocated}`,
      points: capped(unlocated, NO_LOCATOR.each, NO_LOCATOR.cap),
    },
    safety(input, citations),
    {
      fact: 'formCitesNothing',
      label: `Forms Citing Nothing: ${bareForms}`,
      points: capped(bareForms, FORM_CITES_NOTHING.each, FORM_CITES_NOTHING.cap),
    },
  ];
  return { score: facts.reduce((sum, each) => sum + each.points, 0), facts };
}
