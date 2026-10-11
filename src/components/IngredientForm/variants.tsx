'use client';

import { type ReactElement, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  get,
  useController,
  useFieldArray,
  useFormContext,
  useFormState,
  useWatch,
} from 'react-hook-form';
import Combobox from '../Combobox';
import IconTip from '../IconTip';
import InfoTip from '../InfoTip';
import { CategoryField } from './categories';
import { CopyFromIngredient, SkippedNotice, useSkippedCopy } from './copy';
import { EditIcon, RemoveIcon } from './icons';
import { FieldError, TextField } from '../Field';
import { ListField, MultiSelectField } from './fields';
import { ELEMENT_OPTIONS } from './options';
import { ReferencesField } from './references';
import { CollapsibleSection, Section } from './section';
import {
  FormField,
  LookupListField,
  curatedOnly,
  useCompendiumSubstitutes,
  useFormSuggestions,
  usePlanetSuggestions,
  useSubstituteSuggestions,
  useZodiacSuggestions,
} from './suggestions';
import type {
  FormLink,
  FormOption,
  IngredientFormValues,
  ListOption,
  VariantFieldsetProps,
  VariantFormValues,
  VariantsFieldProps,
} from './types';
import { EMPTY_VARIANT, formRows, rankForForm, repeatedForm } from './values';

// The Variants section (MB.221): the forms an ingredient comes in, each a
// group of what that form adds to the ingredient — never overrides
// (MB.215) — and the New Form box that adds one. A form is added from the
// box as a list's entry is, refused there when the ingredient already comes
// in it, and taken out by its own Remove. Each variant is one summary line
// until its Edit opens it, one at a time (MB.115, the owner's call): its
// fields stay in the page while closed, hidden, so nothing typed in them,
// an open reference panel included, is lost by closing it. They are the
// ingredient's own field components at its place in the values,
// `variants.1.planets`, so they validate, err and focus as the ingredient's
// do (claude-docs/components/ingredient-form.md, "The variants").

const BOX = 'drafts.variants';

export function VariantsField({ workspaceId, fold }: VariantsFieldProps): ReactElement {
  // The compendium holds curated forms alone (MB.162): its box offers those
  // rows and no typed row, and a pick is the only way in.
  const compendium = workspaceId === null;
  const { control, getValues, setValue, setError, clearErrors, getFieldState, trigger } =
    useFormContext<IngredientFormValues>();
  const { fields, prepend, remove } = useFieldArray({ control, name: 'variants' });
  const { field } = useController({ control, name: BOX });
  const { errors, isSubmitted, submitCount } = useFormState({ control, name: [BOX, 'variants'] });
  const listed = useWatch({ control, name: 'variants' });
  const [active, setActive] = useState(false);
  const found = curatedOnly(useFormSuggestions(workspaceId, field.value, active), compendium);
  // A form the ingredient already comes in is not offered again.
  const suggestions = useMemo(
    () => ({
      ...found,
      options: found.options.filter((option) => !repeatedForm(listed, option.value)),
    }),
    [found, listed],
  );
  const id = useId();
  const legendId = `${id}-legend`;
  const hintId = `${id}-hint`;
  const promptId = `${id}-prompt`;
  const errorId = `${id}-error`;
  const boxElement = useRef<HTMLInputElement | null>(null);
  // The box and its Add together, which the open list spans, as a list's row is.
  const [boxRow, setBoxRow] = useState<HTMLDivElement | null>(null);
  // What the last add or removal did, for a screen reader: a fieldset
  // appearing or going is otherwise unannounced.
  const [announcement, setAnnouncement] = useState('');
  const focusBox = () => boxElement.current?.focus();

  // The one variant open, by its place in the list; the rest are a line each.
  const [open, setOpen] = useState<number | null>(null);
  const erring = (index: number) => get(errors, `variants.${index}`) !== undefined;
  // A save that finds an error in a closed variant opens it, the first such,
  // unless the one open errs too, so the form's focus on the first field
  // marked invalid can reach it. Set while rendering, so the variant is open
  // in the very commit that draws the error, which is when that focus runs.
  const [seenSubmit, setSeenSubmit] = useState(submitCount);
  if (seenSubmit !== submitCount) {
    setSeenSubmit(submitCount);
    const first = fields.findIndex((_, index) => erring(index));
    if (first !== -1 && (open === null || !erring(open))) setOpen(first);
  }

  const error: string | undefined = get(errors, BOX)?.message;
  // Shown while a compendium entry has no form: it saves, but as information
  // only, which nothing can stock or lay in a spell (MB.215).
  const prompting = compendium && fields.length === 0;
  const describedBy = [hintId, prompting && promptId, error && errorId].filter(Boolean).join(' ');

  // Refused at the box, as a list refuses a repeat: the text stays, to be
  // put right, and the error element says why.
  const refuse = (type: 'repeat' | 'unpicked', message: string) => {
    setError(BOX, { type, message });
    setAnnouncement(message);
    focusBox();
  };
  // Gone once the text it judged is changed.
  const clearRefusal = () => {
    const type = getFieldState(BOX).error?.type;
    if (type === 'repeat' || type === 'unpicked') clearErrors(BOX);
  };
  const addForm = (text: string, link: FormLink | null) => {
    const form = text.trim();
    if (form === '') return;
    const why = repeatedForm(getValues('variants'), form);
    if (why) {
      refuse('repeat', why);
      return;
    }
    // Not focused by the field array, which would take the new Form box: the
    // New Form box keeps it, ready for the next. The new variant goes first,
    // just beneath the box, and opens, the owner's call, closing whichever was.
    prepend({ ...EMPTY_VARIANT, form, formLink: link }, { shouldFocus: false });
    setOpen(0);
    setValue(BOX, '');
    clearErrors(BOX);
    setAnnouncement(`Added ${form}`);
    if (isSubmitted) void trigger(BOX);
    focusBox();
  };
  const removeAt = (index: number) => {
    setAnnouncement(`Removed ${getValues(`variants.${index}.form`)}`);
    remove(index);
    setOpen((current) => {
      if (current === null || current === index) return null;
      return current > index ? current - 1 : current;
    });
    focusBox();
  };

  return (
    // The last of the ingredient's folding sections, its ⓘ beside the
    // heading. Inside, a group named by that heading alone, as a list's
    // fieldset is by its legend: the New Form box and the cards.
    <CollapsibleSection
      title="Variants"
      section="variants"
      fold={fold}
      titleId={legendId}
      info={
        <InfoTip id={hintId} label="Variants">
          The forms it comes in: dried leaf, oil, whole root. Each adds its own description, safety
          notes and lists to the ingredient&rsquo;s, and never takes any away.
        </InfoTip>
      }
    >
      <fieldset className="fieldset ingredient-form__variants" aria-labelledby={legendId}>
        {prompting && (
          <p className="field__hint" id={promptId}>
            Add a form so covens can stock it.
          </p>
        )}
        <div ref={setBoxRow} className="ingredient-form__row">
          <Combobox<FormOption>
            id={`${id}-box`}
            label="New Form"
            // Its label is hidden, as a list box's is: the placeholder says what
            // it is for, at the head of the section (MB.115).
            placeholder="Add a form"
            value={field.value}
            onChange={(typed) => {
              clearRefusal();
              field.onChange(typed);
            }}
            onFocus={() => setActive(true)}
            onBlur={field.onBlur}
            onPick={(value, option) => addForm(value, option?.link ?? null)}
            onCommit={
              compendium
                ? (typed) => {
                    if (typed.trim() !== '')
                      refuse('unpicked', `Pick "${typed.trim()}" from the list`);
                  }
                : (typed) => addForm(typed, null)
            }
            suggestions={suggestions}
            offerTyped={!compendium && !repeatedForm(listed, field.value)}
            listAnchor={boxRow}
            inputRef={(element) => {
              field.ref(element);
              boxElement.current = element;
            }}
            name={field.name}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
          />
          {!compendium && (
            <button
              type="button"
              className="btn"
              aria-label="Add Variant"
              onClick={() => addForm(getValues(BOX), null)}
            >
              Add
            </button>
          )}
        </div>
        <FieldError id={errorId} message={error} />
        {/* The newest first, beneath the box that added it. */}
        {fields.map((row, index) => (
          <VariantFieldset
            key={row.id}
            index={index}
            workspaceId={workspaceId}
            open={open === index}
            onToggle={(opening) => setOpen(opening ? index : null)}
            onRemove={removeAt}
          />
        ))}
        {/* Labelled, so that it is told from the box's own status region. */}
        <output className="visually-hidden" aria-label="Variants changes">
          {announcement}
        </output>
      </fieldset>
    </CollapsibleSection>
  );
}

/** What a variant's summary line counts between its description and safety note, in its fields' order: a word, and its plural. */
const COUNTED = [
  ['elements', 'element', 'elements'],
  ['planets', 'planet', 'planets'],
  ['zodiacSigns', 'zodiac sign', 'zodiac signs'],
  ['colors', 'colour', 'colours'],
  ['categoryIds', 'category', 'categories'],
  ['substitutes', 'substitute', 'substitutes'],
] as const;

/** A count of `variant`'s entries in `key`, "2 planets", or false for none. */
const counted = (
  variant: VariantFormValues,
  [key, one, many]: readonly [(typeof COUNTED)[number][0] | 'references', string, string],
): string | false => {
  const count = variant[key].length;
  return count > 0 && `${count} ${count === 1 ? one : many}`;
};

/** A variant's summary: what it carries, in its sections' order, "1 planet · 2 categories · Safety note", or that it carries nothing. */
export function variantSummary(variant: VariantFormValues): string {
  const parts = [
    variant.description.trim() !== '' && 'description',
    ...COUNTED.map((entry) => counted(variant, entry)),
    variant.safetyNotes.trim() !== '' && 'safety note',
    counted(variant, ['references', 'reference', 'references']),
  ].filter(Boolean);
  if (parts.length === 0) return 'No details yet';
  // A line of its own, so it opens on a capital: "1 planet · Safety note".
  const line = parts.join(' · ');
  return line.charAt(0).toUpperCase() + line.slice(1);
}

/**
 * One variant: a group named by its form, its summary line with Edit and
 * Remove, and beneath it, while open, the fields that form adds, in the
 * order the ingredient's own run, closed again by Done.
 */
function VariantFieldset({
  workspaceId,
  index,
  open,
  onToggle,
  onRemove,
}: VariantFieldsetProps): ReactElement {
  const compendium = workspaceId === null;
  const at = `variants.${index}` as const;
  const { control } = useFormContext<IngredientFormValues>();
  const variant = useWatch({ control, name: at });
  const { errors } = useFormState({ control, name: at });
  const form = variant.form;
  const group = variant.formLink?.group ?? null;
  // Its form, as typed; a form emptied in its box still names the group.
  const legend = form.trim() || 'Unnamed Form';
  // An ingredient in this form is the likeliest stand-in, then one in its
  // group; each is offered form by form, this variant itself left out.
  const own = variant.variantId;
  const rank = useCallback(
    (options: ListOption[]) => formRows(rankForForm(options, form, group), form, group, own),
    [form, group, own],
  );
  // What a substitute copy skipped, for the notice beneath the list.
  const { onSkip, copyButton, skipped, onDone } = useSkippedCopy(variant.substitutes);
  const id = useId();
  const legendId = `${id}-legend`;
  const summaryId = `${id}-summary`;
  const flagId = `${id}-flag`;
  const fieldsId = `${id}-fields`;
  const invalid = get(errors, at) !== undefined;
  const editButton = useRef<HTMLButtonElement>(null);
  const fieldsElement = useRef<HTMLDivElement>(null);
  // Edit takes the focus into the opened fields, to the first; Done back to Edit.
  const focusOnOpen = useRef(false);
  useEffect(() => {
    if (!open || !focusOnOpen.current) return;
    focusOnOpen.current = false;
    fieldsElement.current?.querySelector<HTMLElement>('input, textarea')?.focus();
  }, [open]);
  const done = () => {
    onToggle(false);
    editButton.current?.focus();
  };

  return (
    <fieldset
      className={['fieldset ingredient-form__variant', open && 'is-open', invalid && 'is-invalid']
        .filter(Boolean)
        .join(' ')}
      aria-labelledby={legendId}
    >
      <div className="ingredient-form__variant-head">
        <div className="ingredient-form__variant-title">
          {/* The form as the box reads it, its group after it in the muted ink. */}
          <span className="ingredient-form__variant-form">
            <span id={legendId}>{legend}</span>
            {group && <span className="ingredient-form__variant-group"> ({group})</span>}
          </span>
          {/* What it carries, while closed; open, its fields say it. */}
          <span id={summaryId} className="ingredient-form__variant-summary" hidden={open}>
            {variantSummary(variant)}
          </span>
          {invalid && !open && (
            <span id={flagId} className="ingredient-form__variant-flag">
              Has an error to fix
            </span>
          )}
        </div>
        <div className="ingredient-form__variant-actions">
          {/* The reference rows' pencil and × (MB.115, the owner's call),
            each named for its form, as a list entry's × is for its entry. */}
          <IconTip tip="Edit">
            <button
              ref={editButton}
              type="button"
              className="ingredient-form__icon-button ingredient-form__edit"
              aria-label={`Edit ${legend}`}
              aria-expanded={open}
              aria-controls={fieldsId}
              aria-describedby={
                [!open && summaryId, invalid && !open && flagId].filter(Boolean).join(' ') ||
                undefined
              }
              onClick={() => {
                focusOnOpen.current = !open;
                onToggle(!open);
              }}
            >
              <EditIcon />
            </button>
          </IconTip>
          <button
            type="button"
            className="ingredient-form__icon-button ingredient-form__remove"
            aria-label={`Remove ${legend}`}
            onClick={() => onRemove(index)}
          >
            <RemoveIcon />
          </button>
        </div>
      </div>
      <div
        ref={fieldsElement}
        id={fieldsId}
        className="ingredient-form__variant-fields"
        hidden={!open}
      >
        {/* The ingredient's sections, in its order and under its names, as
          far as a form's fields go (MB.115, the owner's call): its Form is
          its identity. A level beneath the Variants heading. */}
        <Section title="Identity" level={4}>
          {/* On the compendium the form must be a pick (MB.162). */}
          <FormField workspaceId={workspaceId} at={at} pickOnly={compendium} />
        </Section>
        <Section title="Description" level={4} labelled>
          <TextField<IngredientFormValues>
            name={`${at}.description`}
            label="Description"
            hint="What is particular to this form. What every form shares is the ingredient's description."
            placeholder="What sets this form apart"
            action={<CopyFromIngredient at={at} field="description" />}
            multiline
            // Seven lines, matching the ingredient's Description (MB.115).
            rows={7}
          />
        </Section>
        <Section title="Correspondences" level={4}>
          <MultiSelectField
            name={`${at}.elements`}
            label="Element"
            placeholder="Add an element"
            options={ELEMENT_OPTIONS}
            action={<CopyFromIngredient at={at} field="elements" />}
          />
          <LookupListField
            workspaceId={workspaceId}
            useSuggestions={usePlanetSuggestions}
            name={`${at}.planets`}
            ordered
            pickOnly={compendium}
            legend="Planets"
            entry="Planet"
            placeholder="Add a planet"
            action={(announce) => (
              <CopyFromIngredient at={at} field="planets" announce={announce} />
            )}
          />
          <LookupListField
            workspaceId={workspaceId}
            useSuggestions={useZodiacSuggestions}
            name={`${at}.zodiacSigns`}
            ordered
            pickOnly={compendium}
            legend="Zodiac Signs"
            entry="Zodiac Sign"
            placeholder="Add a sign"
            action={(announce) => (
              <CopyFromIngredient at={at} field="zodiacSigns" announce={announce} />
            )}
          />
          <ListField
            name={`${at}.colors`}
            ordered
            legend="Colours"
            entry="Colour"
            placeholder="Add a colour"
            action={(announce) => <CopyFromIngredient at={at} field="colors" announce={announce} />}
          />
        </Section>
        <Section title="Relations" level={4}>
          <CategoryField
            at={at}
            action={(announce) => (
              <CopyFromIngredient at={at} field="categoryIds" announce={announce} />
            )}
          />
          {/* A form of any ingredient may stand in for a form, this one's
            other forms included; those in this form, or in its group, are
            offered first (MB.215). Each row is one form of an ingredient, so
            a pick names the form at once and needs no second picker, and a
            link always names one (MB.115, the owner's call). A copy that
            skips the ingredient's substitutes in no such form says so
            beneath the list, with Copy Anyway. */}
          <LookupListField
            workspaceId={workspaceId}
            // Fixed for the form's life, since its tier is, so the hook called is always the same.
            useSuggestions={compendium ? useCompendiumSubstitutes : useSubstituteSuggestions}
            rank={rank}
            name={`${at}.substitutes`}
            legend="Substitute Ingredients"
            entry="Substitute Ingredient"
            placeholder="Add a substitute"
            action={(announce) => (
              <CopyFromIngredient
                at={at}
                field="substitutes"
                announce={announce}
                onSkip={onSkip}
                buttonRef={copyButton}
              />
            )}
            after={
              <SkippedNotice at={at} skipped={skipped} onDone={onDone} copyButton={copyButton} />
            }
          />
        </Section>
        <Section title="Safety" level={4}>
          <TextField<IngredientFormValues>
            name={`${at}.safetyNotes`}
            label="Safety Notes"
            hint="What to take care over with this form in particular: an oil diluted, a resin burned."
            placeholder="Add safety notes"
            action={<CopyFromIngredient at={at} field="safetyNotes" />}
            multiline
          />
        </Section>
        <Section title="Sources" level={4}>
          <ReferencesField
            workspaceId={workspaceId}
            at={at}
            action={(announce) => (
              <CopyFromIngredient at={at} field="references" announce={announce} />
            )}
          />
        </Section>
        <div className="ingredient-form__variant-done">
          <button
            type="button"
            className="btn btn--small"
            aria-label={`Done with ${legend}`}
            onClick={done}
          >
            Done
          </button>
        </div>
      </div>
    </fieldset>
  );
}
