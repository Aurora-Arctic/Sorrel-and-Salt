'use client';

import { formLabel } from '@/modules/ingredients/validation/form-label';

import { type ReactElement, useId, useRef, useState } from 'react';
import { type FieldPath, useFormContext, useFormState, useWatch } from 'react-hook-form';
import { plural } from '@/lib/text';
import IconTip, { CopyIcon } from '../IconTip';
import Notice from '../Notice';
import { RemoveIcon } from './icons';
import { FIELD_NOUNS, entryText, fold } from './values';
import type {
  CopiedField,
  CopyFromIngredientProps,
  IngredientFormValues,
  MergedCopy,
  SkippedCopy,
  SkippedNoticeProps,
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
 * names the linked ingredient's form that folds alike to `form`, Oil for
 * Oil, and is undefined where it comes in none such, since a variant's link
 * names a form, never the whole ingredient (MB.115, the owner's call); a name
 * stays a name.
 */
function sameForm(entry: SubstituteListEntry, form: string): SubstituteListEntry | undefined {
  if (!entry.link) return { value: entry.value };
  const match = entry.link.variants?.find((variant) => fold(variant.form) === fold(form));
  return match && { value: entry.value, link: entry.link, variantId: match.id };
}

/** A substitute list as its entries and the form each links: what a copy left it as. */
const listKeyOf = (entries: readonly SubstituteListEntry[]): string =>
  entries.map((entry) => `${substituteKey(entry)}/${entry.variantId ?? ''}`).join('|');

/**
 * The ingredient's linked substitutes a variant's copy cannot bring, in no
 * form like `own`'s, less those `own` already lists: linked in another
 * form, or as a name from an earlier Copy Anyway.
 */
function skippedFrom(own: VariantFormValues, theirs: IngredientFormValues): SubstituteListEntry[] {
  const held = new Set(own.substitutes.map(substituteKey));
  return theirs.substitutes.filter(
    (entry) =>
      entry.link !== undefined &&
      sameForm(entry, own.form) === undefined &&
      !held.has(substituteKey(entry)) &&
      !held.has(substituteKey({ value: entry.value })),
  );
}

/** The variant's value for `field` with the ingredient's copied in, and how many entries were added. */
function merged(
  field: CopiedField,
  own: VariantFormValues,
  theirs: IngredientFormValues,
): MergedCopy {
  switch (field) {
    case 'description':
    case 'safetyNotes': {
      const next = copiedText(own[field], theirs[field]);
      return { next, added: next === own[field] ? 0 : 1 };
    }
    case 'celestialBodies':
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
        theirs.substitutes.flatMap((entry) => sameForm(entry, own.form) ?? []),
        substituteKey,
      );
      return { next, added: next.length - own.substitutes.length };
    }
  }
}

/**
 * What a copy says, for a screen reader: "Copied 3 celestial bodies from the
 * ingredient", and, for a variant's substitutes, how many it skipped for
 * having no form like the variant's, "Skipped 1 with no Oil form".
 */
function said(field: CopiedField, added: number, skipped = 0, form = ''): string {
  if (skipped > 0) {
    const none = form.trim() === '' ? 'no form like this one' : `no ${formLabel(form)} form`;
    const why = `Skipped ${skipped} with ${none}`;
    return added === 0 ? why : `${said(field, added)}. ${why}`;
  }
  if (added === 0) return 'Nothing new to copy from the ingredient';
  const { one, many } = FIELD_NOUNS[field];
  if (field === 'description' || field === 'safetyNotes')
    return `Copied the ${one} from the ingredient`;
  return `Copied ${added} ${plural(added, one, many)} from the ingredient`;
}

/**
 * The button: shut while the ingredient's `field` is empty, and on a press
 * the copy, marked dirty, revalidated once a save has been tried, and said
 * through `announce`, the list's own live region, or else one of its own.
 * The focus stays on it. A variant's substitutes tell `onSkip` what the copy
 * skipped, for the notice beneath the list.
 */
export function CopyFromIngredient({
  at,
  field,
  announce,
  onSkip,
  buttonRef,
}: CopyFromIngredientProps): ReactElement {
  const { control, getValues, setValue } = useFormContext<IngredientFormValues>();
  const path = `${at}.${field}` as FieldPath<IngredientFormValues>;
  const theirs: unknown = useWatch({ control, name: field });
  const { isSubmitted } = useFormState({ control, name: path });
  const [news, setNews] = useState('');
  const empty =
    typeof theirs === 'string' ? theirs.trim() === '' : (theirs as unknown[]).length === 0;
  const copy = () => {
    const own = getValues(at);
    const { next, added } = merged(field, own, getValues());
    if (added > 0)
      setValue(path, next as never, { shouldDirty: true, shouldValidate: isSubmitted });
    const tell = announce ?? setNews;
    const skipped = field === 'substitutes' ? skippedFrom(own, getValues()) : [];
    if (skipped.length > 0) {
      onSkip?.({
        entries: skipped,
        form: own.form.trim(),
        listKey: listKeyOf(next as SubstituteListEntry[]),
        announce: tell,
      });
    }
    tell(said(field, added, skipped.length, own.form));
  };
  return (
    <>
      {/* Named for its field, the visible words first, so the eight in an
        open variant are told apart. A button, never the form's submit. */}
      <IconTip tip="Copy From Ingredient" placement="below">
        <button
          ref={buttonRef}
          type="button"
          className="field__label-action"
          aria-label={`Copy From Ingredient: ${FIELD_NOUNS[field].label}`}
          disabled={empty}
          onClick={copy}
        >
          <CopyIcon />
        </button>
      </IconTip>
      {announce === undefined && (
        <output className="visually-hidden" aria-label={`${FIELD_NOUNS[field].label} copy`}>
          {news}
        </output>
      )}
    </>
  );
}

/**
 * The notice of what a variant's substitute copy skipped, and its own state:
 * `onSkip` for the variant's Copy From Ingredient, `copyButton` for its
 * `buttonRef`, and the props for the `SkippedNotice` beneath the list.
 * Once the list changes other than by its Copy Anyway, the notice goes: what
 * it named may be listed now, or removed on purpose.
 */
export function useSkippedCopy(listed: readonly SubstituteListEntry[]) {
  const [skipped, setSkipped] = useState<SkippedCopy | null>(null);
  const copyButton = useRef<HTMLButtonElement>(null);
  // Cleared as it renders rather than in an effect, React's pattern for state
  // that follows a value, so the stale notice never paints.
  if (skipped !== null && listKeyOf(listed) !== skipped.listKey) setSkipped(null);
  return {
    onSkip: setSkipped,
    copyButton,
    skipped,
    onDone: () => setSkipped(null),
  };
}

/**
 * Beneath a variant's substitutes, after a copy that skipped some (MB.115,
 * the owner's call): which of the ingredient's substitutes were left out for
 * having no form like the variant's, with Copy Anyway, which adds them as
 * names only, since a variant's link must name a form, and a × to dismiss
 * it. Either takes the focus back to Copy From Ingredient, since the pressed
 * button goes with the notice. The region is always in the page, as a live
 * region must be to be heard, as the duplicate warning's is.
 */
export function SkippedNotice({
  at,
  skipped,
  onDone,
  copyButton,
}: SkippedNoticeProps): ReactElement {
  const { getValues, setValue } = useFormContext<IngredientFormValues>();
  const textId = useId();
  const named = skipped ? formLabel(skipped.form) : '';
  const path = `${at}.substitutes` as const;
  const close = () => {
    onDone();
    copyButton.current?.focus();
  };
  const copyAnyway = () => {
    if (!skipped) return;
    const own = getValues(path);
    const names = skipped.entries.map(({ value }) => ({ value }));
    const next = copiedEntries(own, names, substituteKey);
    const added = next.length - own.length;
    setValue(path, next, { shouldDirty: true });
    const { one, many } = FIELD_NOUNS.substitutes;
    skipped.announce(`Copied ${added} ${plural(added, one, many)} as names only`);
    close();
  };
  return (
    // A status written out, where an `<output>` would hold phrasing content
    // alone; the notice inside takes no role, so it is announced once.
    <div
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- this live region holds block content, which an output element would restyle
      role="status"
      className="ingredient-form__copy-skipped"
      aria-label="Substitute Ingredients skipped"
    >
      {skipped && (
        <Notice kind="warn" block inRegion>
          <p id={textId}>
            {named ? `No ${named} form to link` : 'No form like this one to link'}, so not copied:{' '}
            {skipped.entries.map(entryText).join(', ')}.
          </p>
          <div className="ingredient-form__copy-skipped-actions">
            <button
              type="button"
              className="btn btn--small btn--quiet"
              aria-describedby={textId}
              onClick={copyAnyway}
            >
              Copy Anyway
            </button>
            <button
              type="button"
              className="ingredient-form__icon-button"
              aria-label="Dismiss"
              onClick={close}
            >
              <RemoveIcon />
            </button>
          </div>
        </Notice>
      )}
    </div>
  );
}
