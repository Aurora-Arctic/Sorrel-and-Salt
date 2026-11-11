'use client';

import { formLabel } from '@/modules/ingredients/validation/form-label';

import type { ReactElement, ReactNode } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { shortCitationText } from '@/lib/short-citation';
import { capitalise, plural } from '@/lib/text';
import { NOMENCLATURE_OPTIONS } from './options';
import { labelOf } from '@/lib/options';
import type {
  FieldNoun,
  IngredientElement,
  IngredientFormValues,
  ListEntry,
  ReferenceListEntry,
  SectionSummaryProps,
  VariantFormValues,
  VariantSectionKey,
} from './types';
import { FIELD_NOUNS, UNNAMED_FORM, texts } from './values';

// What a folded section's line says: what has been entered in it, in its fields' order, joined by a
// middle dot. Each summary watches its own fields; a variant's card line uses the same parts
// (claude-docs/components/ingredient-form.md, "Sections fold").

const NOTHING = 'Nothing yet';

function listPart(entries: readonly string[], { many }: FieldNoun): string | null {
  if (entries.length === 0) return null;
  if (entries.length === 1) return entries[0];
  return `${entries.length} ${many}`;
}

const count = (n: number, { one, many }: Pick<FieldNoun, 'one' | 'many'>) =>
  `${n} ${plural(n, one, many)}`;
const oneLine = (text: string) => text.trim().replace(/\s+/g, ' ');

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
  const formal = canonicalName.trim();
  return joined([
    name.trim(),
    labelOf(NOMENCLATURE_OPTIONS, nomenclature),
    formal && <i key="formal">{formal}</i>,
    listPart(texts(folkNames), FIELD_NOUNS.folkNames),
  ]);
}

const detailsLine = (description: string, safetyNotes: string, toxic: boolean): ReactNode =>
  joined([oneLine(description), oneLine(safetyNotes), toxic && 'Toxic']);

function correspondencesLine(
  elements: readonly IngredientElement[],
  celestialBodies: readonly ListEntry[],
  zodiacSigns: readonly ListEntry[],
  colors: readonly ListEntry[],
  deities: readonly ListEntry[] = [],
): ReactNode {
  return joined([
    listPart(elements.map(capitalise), FIELD_NOUNS.elements),
    listPart(texts(celestialBodies), FIELD_NOUNS.celestialBodies),
    listPart(texts(zodiacSigns), FIELD_NOUNS.zodiacSigns),
    listPart(texts(colors), FIELD_NOUNS.colors),
    listPart(texts(deities), FIELD_NOUNS.deities),
  ]);
}

function relationsLine(
  categoryIds: readonly string[],
  substitutes: readonly ListEntry[],
): ReactNode {
  if (categoryIds.length === 0 && substitutes.length === 0) return NOTHING;
  return joined([
    categoryIds.length > 0 ? count(categoryIds.length, FIELD_NOUNS.categoryIds) : 'No categories',
    listPart(texts(substitutes), FIELD_NOUNS.substitutes) ?? 'No substitutes',
  ]);
}

const sourcesLine = (references: readonly ReferenceListEntry[]): ReactNode =>
  joined([
    listPart(
      references.map((row) => shortCitationText(row.link)),
      FIELD_NOUNS.references,
    ),
  ]);

const CARD_COUNTED = [
  'elements',
  'celestialBodies',
  'zodiacSigns',
  'colors',
  'categoryIds',
  'substitutes',
] as const;

function countedIn(
  variant: VariantFormValues,
  field: (typeof CARD_COUNTED)[number] | 'references',
): string | null {
  const { length } = variant[field];
  return length > 0 ? count(length, FIELD_NOUNS[field]) : null;
}

export function variantSummary(variant: VariantFormValues): ReactNode {
  const parts = [
    variant.description.trim() !== '' && 'description',
    ...CARD_COUNTED.map((field) => countedIn(variant, field)),
    variant.safetyNotes.trim() !== '' && 'safety note',
    variant.toxic && 'toxic',
    countedIn(variant, 'references'),
  ].filter((part): part is string => typeof part === 'string');
  // A line of its own, so it opens on a capital: "1 celestial body · Safety note".
  return joined(parts.map((part, at) => (at === 0 ? capitalise(part) : part)));
}

function DetailsSummary(): ReactNode {
  const { control } = useFormContext<IngredientFormValues>();
  const [description, safetyNotes, toxic] = useWatch({
    control,
    name: ['description', 'safetyNotes', 'toxic'],
  });
  return detailsLine(description, safetyNotes, toxic);
}

function CorrespondencesSummary(): ReactNode {
  const { control } = useFormContext<IngredientFormValues>();
  const [elements, celestialBodies, zodiacSigns, colors, deities] = useWatch({
    control,
    name: ['elements', 'celestialBodies', 'zodiacSigns', 'colors', 'deities'],
  });
  return correspondencesLine(elements, celestialBodies, zodiacSigns, colors, deities);
}

function RelationsSummary(): ReactNode {
  const { control } = useFormContext<IngredientFormValues>();
  const [categoryIds, substitutes] = useWatch({ control, name: ['categoryIds', 'substitutes'] });
  return relationsLine(categoryIds, substitutes);
}

function SourcesSummary(): ReactNode {
  const { control } = useFormContext<IngredientFormValues>();
  return sourcesLine(useWatch({ control, name: 'references' }));
}

function VariantsSummary(): ReactNode {
  const { control } = useFormContext<IngredientFormValues>();
  const variants = useWatch({ control, name: 'variants' });
  if (variants.length === 0) return NOTHING;
  const forms = variants.map((variant) => formLabel(variant.form) || UNNAMED_FORM);
  return `${count(forms.length, FIELD_NOUNS.variants)}: ${forms.join(', ')}`;
}

export function SectionSummary({ section }: SectionSummaryProps): ReactElement {
  switch (section) {
    case 'identity':
      return <IdentitySummary />;
    case 'details':
      return <DetailsSummary />;
    case 'correspondences':
      return <CorrespondencesSummary />;
    case 'relations':
      return <RelationsSummary />;
    case 'sources':
      return <SourcesSummary />;
    case 'variants':
      return <VariantsSummary />;
  }
}

export function variantSectionSummary(
  section: VariantSectionKey,
  variant: VariantFormValues,
): ReactNode {
  switch (section) {
    case 'identity': {
      const group = variant.formLink?.group;
      if (formLabel(variant.form) === '') return NOTHING;
      return group ? `${formLabel(variant.form)} (${group})` : formLabel(variant.form);
    }
    case 'details':
      return detailsLine(variant.description, variant.safetyNotes, variant.toxic);
    case 'correspondences':
      return correspondencesLine(
        variant.elements,
        variant.celestialBodies,
        variant.zodiacSigns,
        variant.colors,
      );
    case 'relations':
      return relationsLine(variant.categoryIds, variant.substitutes);
    case 'sources':
      return sourcesLine(variant.references);
  }
}
