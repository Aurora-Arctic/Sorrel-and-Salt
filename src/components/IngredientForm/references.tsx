'use client';

import { useQueryClient } from '@tanstack/react-query';
import { type FocusEvent, type ReactElement, useId, useMemo, useRef, useState } from 'react';
import {
  get,
  useController,
  useFieldArray,
  useFormContext,
  useFormState,
  useWatch,
} from 'react-hook-form';
import { formatLocator } from '@/modules/ingredients/validation/reference-format';
import { graphql } from '../../gql';
import type { ReferenceSuggestionsQuery } from '../../gql/graphql';
import Combobox from '../Combobox';
import InfoTip from '../InfoTip';
import { FieldError } from './fields';
import ReferencePanel from './reference-panel';
import { useLookup } from './suggestions';
import type {
  IngredientFormValues,
  LookupFieldProps,
  ReferenceLink,
  ReferenceOption,
  SavedReference,
} from './types';
import { sourceTierOf } from './values';

// The References field (MB.154): a search over the compendium's sources and
// this coven's, each picked becoming a row beneath the box — the citation
// whole, as a bibliography reads, its tier, and a locator — and a panel for a
// source not yet written. Typed text is a search and never an entry, so where
// a list has Add this has New Reference, and its list's first row is "Add a
// reference" rather than what was typed. Only each source's id and locator
// are sent (claude-docs/components/ingredient-form.md, "The references").

export const ReferenceSuggestionsDocument = graphql(`
  query ReferenceSuggestions($workspaceId: ID!, $query: String, $first: Int) {
    referenceSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {
      edges {
        node {
          id
          citation
          isGlobal
        }
      }
    }
  }
`);

/** Each source by its citation, whose it is beneath, in the search's ranked order. */
const referenceOptions = (data: ReferenceSuggestionsQuery): ReferenceOption[] =>
  data.referenceSuggestions.edges.map(({ node }) => {
    const link = { id: node.id, isGlobal: node.isGlobal };
    return { value: node.citation, note: sourceTierOf(link), key: node.id, link };
  });

/** The sources the search offers for `text`, once it has settled, while `active`. */
const useReferenceSuggestions = (workspaceId: string, text: string, active: boolean) =>
  useLookup(ReferenceSuggestionsDocument, workspaceId, text, active, referenceOptions);

/** What a locator is, behind the tip beside each row's Locator. */
const LOCATOR_HINT =
  'Where in the source this ingredient is written about, so a reader can turn to it: a page, p. 112; pages, pp. 12–19; a chapter, chap. 13; an entry, s.v. Hecate. Cited in several places? Give them all here: pp. 12–19, 40; chap. 3. Leave it empty to cite the whole work.';

/** Enter with nothing picked adds nothing: a search is not a source. */
const IGNORE_ENTER = () => {};

export function ReferencesField({ workspaceId }: LookupFieldProps): ReactElement {
  const { control, register, setValue, trigger } = useFormContext<IngredientFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'references' });
  const { field } = useController({ control, name: 'drafts.references' });
  const panelOpen = useWatch({ control, name: 'referencePanelOpen' });
  const { errors, isSubmitted } = useFormState({
    control,
    name: ['references', 'drafts.references'],
  });
  const queryClient = useQueryClient();
  const id = useId();
  const legendId = `${id}-legend`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const panelId = `${id}-panel`;
  const boxElement = useRef<HTMLInputElement | null>(null);
  // The box and its button together, which an open list spans (MB.154).
  // Held as state, through its callback ref, so the box is told once it exists.
  const [boxRow, setBoxRow] = useState<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);
  // What the last add or removal did, for a screen reader, as a list's says.
  const [announcement, setAnnouncement] = useState('');
  const focusBox = () => boxElement.current?.focus();

  // A source already listed is not offered again: listing it twice is refused.
  const found = useReferenceSuggestions(workspaceId, field.value, active);
  // Keyed by the ids as one string, which changes only when the list does.
  const listed = fields.map((row) => row.link.id).join(' ');
  const suggestions = useMemo(() => {
    const ids = new Set(listed.split(' '));
    return { ...found, options: found.options.filter((option) => !ids.has(option.link.id)) };
  }, [found, listed]);

  const rowErrors = fields.map(
    (_, index): string | undefined =>
      [
        get(errors, `references.${index}.value`)?.message,
        get(errors, `references.${index}.locator`)?.message,
      ]
        .filter(Boolean)
        .join(' ') || undefined,
  );
  const boxError: string | undefined = get(errors, 'drafts.references')?.message;
  const message = [
    ...fields.flatMap((row, index) =>
      rowErrors[index] ? [`${row.value}: ${rowErrors[index]}`] : [],
    ),
    boxError,
  ]
    .filter(Boolean)
    .join(' ');
  const describedBy = [hintId, message && errorId].filter(Boolean).join(' ');

  // Once a submit has shown errors, a change revalidates the list and its box.
  const revalidate = () => {
    if (isSubmitted) void trigger(['references', 'drafts.references']);
  };
  const add = (citation: string, link: ReferenceLink) => {
    // Not focused by the field array, which would take its locator: the box keeps it.
    append({ value: citation, link, locator: '' }, { shouldFocus: false });
    setAnnouncement(`Added ${citation}`);
  };
  const pick = (_value: string, option: ReferenceOption | null) => {
    // The list has no typed row, so every pick is a source.
    if (!option) return;
    add(option.value, option.link);
    setValue('drafts.references', '');
    revalidate();
    focusBox();
  };
  const removeAt = (index: number) => {
    setAnnouncement(`Removed ${fields[index].value}`);
    remove(index);
    revalidate();
  };

  // Counted, so a request while the panel is open still takes you to it.
  const [summons, setSummons] = useState(0);
  const openPanel = () => {
    setValue('referencePanelOpen', true);
    setSummons((count) => count + 1);
    revalidate();
  };
  const closePanel = () => {
    setValue('referencePanelOpen', false);
    revalidate();
    focusBox();
  };
  const saved = ({ id: savedId, citation, isGlobal }: SavedReference) => {
    add(citation, { id: savedId, isGlobal });
    closePanel();
    // The new source is one the search can now find.
    void queryClient.invalidateQueries({ queryKey: ['ReferenceSuggestions'] });
  };

  return (
    // Named by the legend's text alone, as a list's fieldset is.
    <fieldset className="fieldset ingredient-form__list" aria-labelledby={legendId}>
      <legend className="fieldset__legend ingredient-form__label-row">
        <span id={legendId}>References</span>
        <InfoTip id={hintId} label="References">
          Where what this entry says comes from: a book, an article, a web page. Search for one
          already recorded, or add a new one, and give a locator to point within it: p. 112, chap.
          13.
        </InfoTip>
      </legend>
      <div ref={setBoxRow} className="ingredient-form__row">
        <Combobox<ReferenceOption>
          id={`${id}-box`}
          label="Reference"
          value={field.value}
          onChange={field.onChange}
          onFocus={() => setActive(true)}
          onBlur={field.onBlur}
          onPick={pick}
          onCommit={IGNORE_ENTER}
          onRemoveLast={() => {
            if (fields.length > 0) removeAt(fields.length - 1);
          }}
          suggestions={suggestions}
          listAnchor={boxRow}
          create={{ label: 'Add a reference', onCreate: openPanel }}
          inputRef={(element) => {
            field.ref(element);
            boxElement.current = element;
          }}
          name={field.name}
          aria-invalid={message ? true : undefined}
          aria-describedby={describedBy}
        />
        {/* Where a list has Add: opens the panel, as the list's first row does. */}
        <button
          type="button"
          className="btn"
          aria-expanded={panelOpen}
          aria-controls={panelOpen ? panelId : undefined}
          onClick={openPanel}
        >
          New Reference
        </button>
      </div>
      {fields.length > 0 && (
        <ul className="ingredient-form__references">
          {fields.map((row, index) => {
            const citationId = `${id}-${row.id}`;
            const locatorId = `${citationId}-locator`;
            const locatorHintId = `${locatorId}-hint`;
            const invalid = rowErrors[index] !== undefined;
            return (
              <li
                key={row.id}
                className={
                  invalid ? 'ingredient-form__reference is-invalid' : 'ingredient-form__reference'
                }
              >
                <div className="ingredient-form__source">
                  <span id={citationId} className="ingredient-form__citation">
                    {row.value}
                  </span>
                  <span className="ingredient-form__tier">{sourceTierOf(row.link)}</span>
                </div>
                {/* Read with the source it locates, then what a locator is: a
                    column of bare "Locator"s is no help to a screen reader. The
                    tip beside the label, as every field's is. */}
                <div className="ingredient-form__locator ingredient-form__label-row">
                  <label className="field__label" htmlFor={locatorId}>
                    Locator
                  </label>
                  <InfoTip id={locatorHintId} label="Locator">
                    {LOCATOR_HINT}
                  </InfoTip>
                  <input
                    id={locatorId}
                    className="input"
                    aria-describedby={[citationId, locatorHintId, invalid && errorId]
                      .filter(Boolean)
                      .join(' ')}
                    aria-invalid={invalid || undefined}
                    {...register(`references.${index}.locator`, {
                      // Tidied as it is left, as the server will store it.
                      onBlur: (event: FocusEvent<HTMLInputElement>) => {
                        const text = event.target.value;
                        const formatted = formatLocator(text);
                        if (formatted !== text) {
                          setValue(`references.${index}.locator`, formatted, { shouldDirty: true });
                        }
                      },
                    })}
                  />
                </div>
                {/* Named for its source, as a list entry's × is, and the
                    focus goes back to the box, since the pressed × goes. */}
                <button
                  type="button"
                  className="combobox__entry-remove ingredient-form__remove"
                  aria-label={`Remove ${row.value}`}
                  aria-describedby={invalid ? errorId : undefined}
                  onClick={() => {
                    removeAt(index);
                    focusBox();
                  }}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <FieldError id={errorId} message={message} />
      {panelOpen && (
        <div id={panelId}>
          <ReferencePanel
            workspaceId={workspaceId}
            summons={summons}
            onSaved={saved}
            onCancel={closePanel}
          />
        </div>
      )}
      {/* Labelled, so that it is told from the box's own status region. */}
      <output className="visually-hidden" aria-label="References changes">
        {announcement}
      </output>
    </fieldset>
  );
}
