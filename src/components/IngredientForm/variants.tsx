'use client';

import { formLabel } from '@/modules/ingredients/validation/form-label';

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
import FormIcon from '../FormIcon';
import { EditIcon, RemoveIcon } from './icons';
import {
  FieldError,
  TextField,
  errorShown,
  useEditedFieldsContext,
  useSettledWhilePressed,
} from '../Field';
import { ListField, MultiSelectField, ToggleField } from './fields';
import { ELEMENT_OPTIONS } from './options';
import { ReferencesField } from './references';
import { RemoveQuestion } from './remove-question';
import { CollapsibleSection, FoldFlag, useFoldIds } from '../CollapsibleSection';
import type { SectionFold } from '../CollapsibleSection/types';
import { SectionSummary, variantSectionSummary, variantSummary } from './summaries';
import {
  FormField,
  LookupListField,
  curatedOnly,
  useCompendiumSubstitutes,
  useFormSuggestions,
  useCelestialBodySuggestions,
  useSubstituteSuggestions,
  useZodiacSuggestions,
} from './suggestions';
import type {
  FormLink,
  FormOption,
  IngredientFormValues,
  ListOption,
  RestoredVariant,
  VariantFieldsetProps,
  VariantFoldList,
  VariantFolds,
  VariantSectionKey,
  VariantsFieldProps,
} from './types';
import {
  EMPTY_VARIANT,
  UNNAMED_FORM,
  VARIANT_SECTION_KEYS,
  fold as folded,
  formRows,
  rankForForm,
  repeatedForm,
  variantSectionsWithErrors,
} from './values';

// The Variants section: the forms an ingredient comes in, each a group of what that form adds to
// the ingredient, and the New Form box that adds one. Each variant is one summary line until its
// Edit opens it (claude-docs/components/ingredient-form.md, "Variant fields and their folds").

const BOX = 'drafts.variants';

/** No section open: what a variant the form has not yet seen opens with, as an edit's do. */
const NONE_OPEN: ReadonlySet<VariantSectionKey> = new Set();

/** `folds` with each place up to `length` filled, so a later removal keeps every place in step. */
const padded = (folds: VariantFoldList, length: number): ReadonlySet<VariantSectionKey>[] =>
  Array.from({ length: Math.max(folds.length, length) }, (_, at) => folds[at] ?? NONE_OPEN);

/** The same variant on both sides of a restore: by kept id, else by form, folded as the repeat check folds it. */
const sameVariant = (a: RestoredVariant, b: RestoredVariant): boolean =>
  a.variantId && b.variantId ? a.variantId === b.variantId : folded(a.form) === folded(b.form);

/**
 * Which of each variant's own sections are open, by place, kept in step as a form is added or
 * removed; a variant added here opens fully (claude-docs/components/ingredient-form.md, "Variant fields and their folds").
 */
export function useVariantFolds(): VariantFolds {
  const [folds, setFolds] = useState<VariantFoldList>([]);
  const [card, setCard] = useState<number | null>(null);
  return {
    card,
    setCard,
    isOpen: (index, section) => (folds[index] ?? NONE_OPEN).has(section),
    toggle: (index, section) =>
      setFolds((now) => {
        // An edit's variants are past the list's end until one is touched.
        const next = padded(now, index + 1);
        const sections = new Set(next[index]);
        if (!sections.delete(section)) sections.add(section);
        next[index] = sections;
        return next;
      }),
    added: () => setFolds((now) => [new Set(VARIANT_SECTION_KEYS), ...now]),
    removed: (index) => setFolds((now) => now.filter((_, at) => at !== index)),
    setAll: (open, count) =>
      setFolds(
        Array.from({ length: count }, () => (open ? new Set(VARIANT_SECTION_KEYS) : NONE_OPEN)),
      ),
    reveal: (index, sections) => {
      setCard(index);
      setFolds((now) => {
        const next = padded(now, index + 1);
        next[index] = new Set([...next[index], ...sections]);
        return next;
      });
    },
    reconcile: (from, to) => {
      // Each old row is matched at most once: two unsaved rows with the same
      // (or no) form text would otherwise both take the first one's folds.
      const used = new Set<number>();
      const matched = to.map((row) => {
        const at = from.findIndex((old, place) => !used.has(place) && sameVariant(old, row));
        if (at !== -1) used.add(at);
        return at;
      });
      const returning = matched.indexOf(-1);
      setFolds((now) =>
        matched.map((was) =>
          was === -1 ? new Set(VARIANT_SECTION_KEYS) : (now[was] ?? NONE_OPEN),
        ),
      );
      setCard((now) => {
        if (returning !== -1) return returning;
        const kept = now === null ? -1 : matched.indexOf(now);
        return kept === -1 ? null : kept;
      });
      return returning;
    },
    openErring: (erring) => {
      if (erring.size === 0) return;
      setFolds((now) =>
        padded(now, Math.max(...erring.keys()) + 1).map((sections, index) => {
          const adding = erring.get(index);
          return adding ? new Set([...sections, ...adding]) : sections;
        }),
      );
    },
  };
}

export function VariantsField({ workspaceId, fold, folds }: VariantsFieldProps): ReactElement {
  // The compendium holds curated forms alone: its box offers those
  // rows and no typed row, and a pick is the only way in.
  const compendium = workspaceId === null;
  const { control, getValues, setValue, setError, clearErrors, getFieldState, trigger } =
    useFormContext<IngredientFormValues>();
  const { fields, prepend, remove } = useFieldArray({ control, name: 'variants' });
  const { field } = useController({ control, name: BOX });
  const { errors, isSubmitted } = useFormState({ control, name: [BOX, 'variants'] });
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
  const { card: open, setCard: setOpen } = folds;
  const error: string | undefined = get(errors, BOX)?.message;
  // Shown while a compendium entry has no form: it saves, but as information
  // only, which nothing can stock or lay in a spell.
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
    // Cleared before the prepend, not after: the field array tells the form's history of its new
    // row in an effect, later, while setValue tells it at once, so clearing second would fold the
    // row into the clear's step and hide it from undo.
    setValue(BOX, '');
    // Not focused by the field array, which would take the new Form box: the
    // New Form box keeps it, ready for the next. The new variant goes first,
    // just beneath the box, and opens, closing whichever was.
    prepend({ ...EMPTY_VARIANT, form, formLink: link }, { shouldFocus: false });
    setOpen(0);
    // Every section open, as a new entry opens.
    folds.added();
    clearErrors(BOX);
    setAnnouncement(`Added ${formLabel(form)}`);
    if (isSubmitted) void trigger(BOX);
    focusBox();
  };
  const removeAt = (index: number) => {
    setAnnouncement(`Removed ${formLabel(getValues(`variants.${index}.form`))}`);
    remove(index);
    folds.removed(index);
    setOpen((current) => {
      if (current === null || current === index) return null;
      return current > index ? current - 1 : current;
    });
  };
  // The variant whose × asks, by its row id rather than its place, which an
  // add while asking would move. Until the answer it stays, open or closed.
  const [removing, setRemoving] = useState<string | null>(null);
  const removingAt = fields.findIndex((row) => row.id === removing);

  return (
    // The last of the ingredient's folding sections, its ⓘ beside the
    // heading. Inside, a group named by that heading alone, as a list's
    // fieldset is by its legend: the New Form box and the cards.
    <CollapsibleSection
      title="Variants"
      summary={<SectionSummary section="variants" />}
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
            // it is for, at the head of the section.
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
            onRemove={() => setRemoving(row.id)}
            folds={folds}
          />
        ))}
        <RemoveQuestion
          asked={removingAt !== -1}
          question={
            <>
              Remove &quot;
              {formLabel(removingAt === -1 ? '' : getValues(`variants.${removingAt}.form`)) ||
                UNNAMED_FORM}
              &quot;? What it holds goes with it once saved.
            </>
          }
          onRemove={() => {
            removeAt(removingAt);
            setRemoving(null);
          }}
          afterRemove={focusBox}
          onKeep={() => setRemoving(null)}
        />
        {/* Labelled, so that it is told from the box's own status region. */}
        <output className="visually-hidden" aria-label="Variants changes">
          {announcement}
        </output>
      </fieldset>
    </CollapsibleSection>
  );
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
  folds,
}: VariantFieldsetProps): ReactElement {
  const compendium = workspaceId === null;
  const at = `variants.${index}` as const;
  const { control } = useFormContext<IngredientFormValues>();
  const variant = useWatch({ control, name: at });
  const { errors, isSubmitted, touchedFields } = useFormState({ control, name: at });
  const edited = useEditedFieldsContext();
  const form = variant.form;
  const group = variant.formLink?.group ?? null;
  // Its form, as typed; a form emptied in its box still names the group.
  const legend = formLabel(form) || UNNAMED_FORM;
  // An ingredient in this form is the likeliest stand-in, then one in its
  // group; each is offered form by form, this variant itself left out.
  const own = variant.variantId;
  const rank = useCallback(
    (options: ListOption[]) => formRows(rankForForm(options, form, group), form, group, own),
    [form, group, own],
  );
  // What a substitute copy skipped, for the notice beneath the list.
  const { onSkip, copyButton, skipped, onDone } = useSkippedCopy(variant.substitutes);
  // Its own sections, each a disclosure as the ingredient's are, flagged while one holds an error
  // a field draws, and opened by a save that finds one. Standing still through a press, as the
  // fields' errors do.
  const erring = useSettledWhilePressed(
    variantSectionsWithErrors(
      get(errors, at),
      (path) => errorShown({ isSubmitted, touchedFields, edited }, path),
      `${at}.`,
    ),
  );
  const invalid = erring.size > 0;
  // Flagged only while closed: open, the fields' own errors say it.
  const { id, summaryId, flagId, fieldsId, className, describedBy } = useFoldIds({
    block: 'fieldset ingredient-form__variant',
    open,
    invalid,
    flagged: invalid && !open,
  });
  const legendId = `${id}-legend`;
  const fold = (section: VariantSectionKey): SectionFold => ({
    open: folds.isOpen(index, section),
    invalid: erring.has(section),
    onToggle: () => folds.toggle(index, section),
  });
  const summary = (section: VariantSectionKey) => variantSectionSummary(section, variant);
  const editButton = useRef<HTMLButtonElement>(null);
  const fieldsElement = useRef<HTMLDivElement>(null);
  // Edit takes the focus into the opened fields, to the first: the Form box
  // while Identity is open, else Identity's heading, closed, as an edit's
  // sections open. Done takes it back to Edit.
  const focusOnOpen = useRef(false);
  useEffect(() => {
    if (!open || !focusOnOpen.current) return;
    focusOnOpen.current = false;
    fieldsElement.current
      ?.querySelector<HTMLElement>('[aria-expanded="false"], input, textarea')
      ?.focus();
  }, [open]);
  const done = () => {
    onToggle(false);
    editButton.current?.focus();
  };

  return (
    <fieldset className={className} aria-labelledby={legendId}>
      <div className="ingredient-form__variant-head">
        <div className="ingredient-form__variant-title">
          {/* The form as the box reads it, its group after it in the muted ink. */}
          <span className="ingredient-form__variant-form">
            <FormIcon name={variant.formLink?.icon ?? null} />
            <span id={legendId}>{legend}</span>
            {group && <span className="ingredient-form__variant-group"> ({group})</span>}
          </span>
          {/* What it carries, while closed; open, its fields say it. */}
          <span id={summaryId} className="ingredient-form__variant-summary" hidden={open}>
            {variantSummary(variant)}
          </span>
          <FoldFlag
            id={flagId}
            className="ingredient-form__variant-flag"
            shown={invalid && !open}
          />
        </div>
        <div className="ingredient-form__variant-actions">
          {/* The reference rows' pencil and ×,
            each named for its form, as a list entry's × is for its entry. */}
          <IconTip tip="Edit">
            <button
              ref={editButton}
              type="button"
              className="ingredient-form__icon-button ingredient-form__edit"
              aria-label={`Edit ${legend}`}
              aria-expanded={open}
              aria-controls={fieldsId}
              aria-describedby={describedBy}
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
            onClick={onRemove}
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
        {/* The ingredient's sections, in its order and under its names as far as a form's fields
          go, a level beneath the Variants heading, each folding as the ingredient's do. */}
        <div className="collapsible-sections">
          <CollapsibleSection
            title="Identity"
            level={4}
            fold={fold('identity')}
            summary={summary('identity')}
          >
            {/* On the compendium the form must be a pick. */}
            <FormField workspaceId={workspaceId} at={at} pickOnly={compendium} />
          </CollapsibleSection>
          <CollapsibleSection
            title="Details & Care"
            level={4}
            fold={fold('details')}
            summary={summary('details')}
          >
            <TextField<IngredientFormValues>
              name={`${at}.description`}
              label="Description"
              placeholder="What sets this form apart"
              action={<CopyFromIngredient at={at} field="description" />}
              multiline
              // Seven lines, matching the ingredient's Description.
              rows={7}
            />
            <TextField<IngredientFormValues>
              name={`${at}.safetyNotes`}
              label="Safety Notes"
              placeholder="Add safety notes"
              action={<CopyFromIngredient at={at} field="safetyNotes" />}
              multiline
            />
            {/* Its own flag, never copied from the ingredient's: the one exception to the union rule. */}
            <ToggleField name={`${at}.toxic`} label="Toxic" />
          </CollapsibleSection>
          <CollapsibleSection
            title="Correspondences"
            level={4}
            fold={fold('correspondences')}
            summary={summary('correspondences')}
          >
            <MultiSelectField
              name={`${at}.elements`}
              label="Element"
              placeholder="Add an element"
              options={ELEMENT_OPTIONS}
              action={<CopyFromIngredient at={at} field="elements" />}
            />
            <LookupListField
              workspaceId={workspaceId}
              useSuggestions={useCelestialBodySuggestions}
              name={`${at}.celestialBodies`}
              ordered
              pickOnly={compendium}
              legend="Celestial Bodies"
              entry="Celestial Body"
              placeholder="Add a body"
              action={(announce) => (
                <CopyFromIngredient at={at} field="celestialBodies" announce={announce} />
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
              action={(announce) => (
                <CopyFromIngredient at={at} field="colors" announce={announce} />
              )}
            />
          </CollapsibleSection>
          <CollapsibleSection
            title="Relations"
            level={4}
            fold={fold('relations')}
            summary={summary('relations')}
          >
            <CategoryField
              at={at}
              action={(announce) => (
                <CopyFromIngredient at={at} field="categoryIds" announce={announce} />
              )}
            />
            {/* A form of any ingredient may stand in for a form, those in this form or its group offered
            first; a pick names the form at once, so a link always names one. A copy that skips the
            ingredient's substitutes in no such form says so beneath, with Copy Anyway. */}
            <LookupListField
              workspaceId={workspaceId}
              // Fixed for the form's life, since its tier is, so the hook called is always the
              // same.
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
          </CollapsibleSection>
          <CollapsibleSection
            title="Sources"
            level={4}
            fold={fold('sources')}
            summary={summary('sources')}
          >
            <ReferencesField
              workspaceId={workspaceId}
              at={at}
              action={(announce) => (
                <CopyFromIngredient at={at} field="references" announce={announce} />
              )}
            />
          </CollapsibleSection>
        </div>
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
