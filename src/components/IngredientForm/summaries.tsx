'use client';

import type { ReactElement, ReactNode } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { shortCitationText } from '@/lib/short-citation';
import { NOMENCLATURE_OPTIONS } from './options';
import type { IngredientFormValues, ListEntry, SectionKey } from './types';

// What a folded section's line says (MB.115, the owner's call as drawn): what
// has been entered in it, in its fields' order, parts joined by a middle dot.
// A list of one is named and a longer one counted, "Mercury · 2 colours";
// categories are always counted, since their names are another query's; the
// forms are always named, being what the section is for; the description and
// the safety notes are their own first words, cut by the line's ellipsis. An
// empty section says so. Each section's summary is a component of its own
// watching its own fields, so a keystroke re-renders one line, not the form
// (claude-docs/components/ingredient-form.md, "Sections").

const NOTHING = 'Nothing yet';

/** A list of one by its entry, of more by its count: "Mercury", "2 colours"; none, nothing. */
function listPart(entries: readonly string[], many: string): string | null {
  if (entries.length === 0) return null;
  if (entries.length === 1) return entries[0];
  return `${entries.length} ${many}`;
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const texts = (entries: readonly ListEntry[]) => entries.map((entry) => entry.value);
const capitalise = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);
/** A text field's words on one line: its line breaks and runs of spaces are one space. */
const oneLine = (text: string) => text.trim().replace(/\s+/g, ' ');

/** Parts joined by a middle dot, an absent one dropped; none at all is "Nothing yet". */
function joined(parts: ReactNode[]): ReactNode {
  const shown = parts.filter((part) => part !== null && part !== false && part !== '');
  if (shown.length === 0) return NOTHING;
  return shown.map((part, index) => (
    <span key={index}>
      {index > 0 && ' · '}
      {part}
    </span>
  ));
}

function IdentitySummary(): ReactNode {
  const { control } = useFormContext<IngredientFormValues>();
  const [name, nomenclature, canonicalName, folkNames] = useWatch({
    control,
    name: ['name', 'nomenclature', 'canonicalName', 'folkNames'],
  });
  const kind = NOMENCLATURE_OPTIONS.find((option) => option.value === nomenclature)?.label;
  const formal = canonicalName.trim();
  return joined([
    name.trim(),
    kind,
    // In italics, as a formal name is printed.
    formal && <i key="formal">{formal}</i>,
    listPart(texts(folkNames), 'folk names'),
  ]);
}

function TextSummary({ name }: { name: 'description' | 'safetyNotes' }): ReactNode {
  const { control } = useFormContext<IngredientFormValues>();
  return oneLine(useWatch({ control, name })) || NOTHING;
}

function CorrespondencesSummary(): ReactNode {
  const { control } = useFormContext<IngredientFormValues>();
  const [elements, planets, zodiacSigns, colors, deities] = useWatch({
    control,
    name: ['elements', 'planets', 'zodiacSigns', 'colors', 'deities'],
  });
  return joined([
    listPart(elements.map(capitalise), 'elements'),
    listPart(texts(planets), 'planets'),
    listPart(texts(zodiacSigns), 'zodiac signs'),
    listPart(texts(colors), 'colours'),
    listPart(texts(deities), 'deities'),
  ]);
}

function RelationsSummary(): ReactNode {
  const { control } = useFormContext<IngredientFormValues>();
  const [categoryIds, substitutes] = useWatch({ control, name: ['categoryIds', 'substitutes'] });
  if (categoryIds.length === 0 && substitutes.length === 0) return NOTHING;
  // Both said once either is: the pair is the section.
  return joined([
    categoryIds.length > 0 ? count(categoryIds.length, 'category', 'categories') : 'No categories',
    listPart(texts(substitutes), 'substitutes') ?? 'No substitutes',
  ]);
}

function SourcesSummary(): ReactNode {
  const { control } = useFormContext<IngredientFormValues>();
  const references = useWatch({ control, name: 'references' });
  return joined([
    listPart(
      references.map((row) => shortCitationText(row.link)),
      'references',
    ),
  ]);
}

function VariantsSummary(): ReactNode {
  const { control } = useFormContext<IngredientFormValues>();
  const variants = useWatch({ control, name: 'variants' });
  if (variants.length === 0) return NOTHING;
  const forms = variants.map((variant) => variant.form.trim() || 'Unnamed form');
  return `${count(forms.length, 'form', 'forms')}: ${forms.join(', ')}`;
}

/** The closed line of the ingredient's section `section`. */
export function SectionSummary({ section }: { section: SectionKey }): ReactElement {
  switch (section) {
    case 'identity':
      return <IdentitySummary />;
    case 'description':
      return <TextSummary name="description" />;
    case 'correspondences':
      return <CorrespondencesSummary />;
    case 'relations':
      return <RelationsSummary />;
    case 'safety':
      return <TextSummary name="safetyNotes" />;
    case 'sources':
      return <SourcesSummary />;
    case 'variants':
      return <VariantsSummary />;
  }
}
