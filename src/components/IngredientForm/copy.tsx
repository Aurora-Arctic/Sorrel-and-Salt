'use client';

import { type ReactElement, useState } from 'react';
import { type FieldPath, useFormContext, useFormState, useWatch } from 'react-hook-form';
import type {
  CopiedField,
  CopyFromIngredientProps,
  IngredientFormValues,
  SubstituteListEntry,
  VariantFormValues,
} from './types';

// A variant's Copy From Ingredient (MB.115, the owner's call): a small quiet
// button at the right end of a field's label row that brings the
// ingredient's own value for that field into the variant's, so a form that
// shares most of what its ingredient says need not have it typed twice. It
// adds and never takes away: a list gains the ingredient's entries it lacks,
// after its own, and a text gains the ingredient's after a blank line. Shut
// while the ingredient's field, as the form holds it now, is empty
// (claude-docs/components/ingredient-form.md, "Copying from the ingredient").

/** An entry's key, as the schema folds a list's text: trimmed, its case set aside. */
const fold = (text: string): string => text.trim().toLowerCase();

/** What a field is called in its button's name and in what the copy says. */
const NAMES: Record<CopiedField, { label: string; one: string; many: string }> = {
  description: { label: 'Description', one: 'description', many: 'description' },
  safetyNotes: { label: 'Safety Notes', one: 'safety notes', many: 'safety notes' },
  elements: { label: 'Element', one: 'element', many: 'elements' },
  planets: { label: 'Planets', one: 'planet', many: 'planets' },
  zodiacSigns: { label: 'Zodiac Signs', one: 'zodiac sign', many: 'zodiac signs' },
  colors: { label: 'Colours', one: 'colour', many: 'colours' },
  categoryIds: { label: 'Categories', one: 'category', many: 'categories' },
  substitutes: { label: 'Substitute Ingredients', one: 'substitute', many: 'substitutes' },
  references: { label: 'References', one: 'reference', many: 'references' },
};

/** The text `own` takes from `theirs`: theirs into an empty box, else after a blank line, once. */
function copiedText(own: string, theirs: string): string {
  const taken = theirs.trim();
  if (taken === '' || own.includes(taken)) return own;
  return own.trim() === '' ? taken : `${own.trimEnd()}\n\n${taken}`;
}

/** `own`, then each of `theirs` whose key `own` lacks, in their order, once each. */
function copiedEntries<T>(
  own: readonly T[],
  theirs: readonly T[],
  keyOf: (entry: T) => string,
): T[] {
  const held = new Set(own.map(keyOf));
  const added = theirs.filter((entry) => {
    const key = keyOf(entry);
    if (held.has(key)) return false;
    held.add(key);
    return true;
  });
  return [...own, ...added];
}

/** A substitute's key, as the save's: its link by id, a name by its folded text. */
const substituteKey = ({ link, value }: SubstituteListEntry): string =>
  link ? `link:${link.id}` : `name:${fold(value)}`;

/**
 * The ingredient's substitute as this variant's, "the same form": a link
 * names the linked ingredient's form that folds alike to `form`, or, where
 * it comes in none such, the ingredient alone, in any form; a name stays a
 * name.
 */
function sameForm(entry: SubstituteListEntry, form: string): SubstituteListEntry {
  if (!entry.link) return { value: entry.value };
  const match = entry.link.variants?.find((variant) => fold(variant.form) === fold(form));
  return match
    ? { value: entry.value, link: entry.link, variantId: match.id }
    : { value: entry.value, link: entry.link };
}

/** The variant's value for `field` with the ingredient's copied in, and how many entries were added. */
function merged(
  field: CopiedField,
  own: VariantFormValues,
  theirs: IngredientFormValues,
): { next: unknown; added: number } {
  switch (field) {
    case 'description':
    case 'safetyNotes': {
      const next = copiedText(own[field], theirs[field]);
      return { next, added: next === own[field] ? 0 : 1 };
    }
    case 'planets':
    case 'zodiacSigns':
    case 'colors': {
      const next = copiedEntries(own[field], theirs[field], ({ value }) => fold(value));
      return { next, added: next.length - own[field].length };
    }
    case 'elements':
    case 'categoryIds': {
      const next = copiedEntries<string>(own[field], theirs[field], (id) => id);
      return { next, added: next.length - own[field].length };
    }
    case 'references': {
      const next = copiedEntries(own.references, theirs.references, ({ link }) => link.id);
      return { next, added: next.length - own.references.length };
    }
    case 'substitutes': {
      const next = copiedEntries(
        own.substitutes,
        theirs.substitutes.map((entry) => sameForm(entry, own.form)),
        substituteKey,
      );
      return { next, added: next.length - own.substitutes.length };
    }
  }
}

/** What a copy says, for a screen reader: "Copied 3 planets from the ingredient". */
function said(field: CopiedField, added: number): string {
  if (added === 0) return 'Nothing new to copy from the ingredient';
  const { one, many } = NAMES[field];
  if (field === 'description' || field === 'safetyNotes')
    return `Copied the ${one} from the ingredient`;
  return `Copied ${added} ${added === 1 ? one : many} from the ingredient`;
}

/**
 * The button: shut while the ingredient's `field` is empty, and on a press
 * the copy, marked dirty, revalidated once a save has been tried, and said
 * through `announce`, the list's own live region, or else one of its own.
 * The focus stays on it.
 */
export function CopyFromIngredient({ at, field, announce }: CopyFromIngredientProps): ReactElement {
  const { control, getValues, setValue } = useFormContext<IngredientFormValues>();
  const path = `${at}.${field}` as FieldPath<IngredientFormValues>;
  const theirs: unknown = useWatch({ control, name: field });
  const { isSubmitted } = useFormState({ control, name: path });
  const [news, setNews] = useState('');
  const empty =
    typeof theirs === 'string' ? theirs.trim() === '' : (theirs as unknown[]).length === 0;
  const copy = () => {
    const { next, added } = merged(field, getValues(at), getValues());
    if (added > 0)
      setValue(path, next as never, { shouldDirty: true, shouldValidate: isSubmitted });
    (announce ?? setNews)(said(field, added));
  };
  return (
    <>
      {/* Named for its field, the visible words first, so the eight in an
        open variant are told apart. A button, never the form's submit. */}
      <button
        type="button"
        className="btn btn--small btn--quiet ingredient-form__copy"
        aria-label={`Copy From Ingredient: ${NAMES[field].label}`}
        disabled={empty}
        onClick={copy}
      >
        Copy From Ingredient
      </button>
      {announce === undefined && (
        <output className="visually-hidden" aria-label={`${NAMES[field].label} copy`}>
          {news}
        </output>
      )}
    </>
  );
}
