'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  type FocusEvent,
  type ReactElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  get,
  useController,
  useFieldArray,
  useFormContext,
  useFormState,
  useWatch,
} from 'react-hook-form';
import { renderShortCitation, shortCitationText } from '@/lib/short-citation';
import { formatLocator } from '@/modules/ingredients/validation/reference-format';
import { graphql } from '../../gql';
import type { ReferenceSuggestionsQuery } from '../../gql/graphql';
import Combobox from '../Combobox';
import InfoTip from '../InfoTip';
import { FieldError } from '../Field';
import { EditIcon, RemoveIcon } from './icons';
import ReferencePanel from './reference-panel';
import { useLookup } from './suggestions';
import type {
  IngredientFormValues,
  LookupFieldProps,
  ReferenceLink,
  ReferenceOption,
  SavedReference,
  SharedFieldProps,
} from './types';
import { draftOf, sourceTierOf } from './values';

// The References field (MB.154): one search over the compendium's sources and
// this coven's, each picked becoming a one-line row beneath the box — its
// Chicago short form and its locator, described by its whole citation —
// which its edit opens to the citation whole, its tier and the Locator box; and a panel for a source not
// yet written. Typed text is a search and never an entry, so the list's last
// row is "New Reference…", which opens the panel, rather than what was typed
// (MB.115, the owner's call). Only each source's id and locator are sent
// (claude-docs/components/ingredient-form.md, "The references").

export const ReferenceSuggestionsDocument = graphql(`
  query ReferenceSuggestions($workspaceId: ID, $query: String, $first: Int) {
    referenceSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {
      edges {
        node {
          id
          citation
          isGlobal
          kind
          authors
          title
          container
        }
      }
    }
  }
`);

/** Each source by its citation, whose it is beneath, in the search's ranked order. */
const referenceOptions = (data: ReferenceSuggestionsQuery): ReferenceOption[] =>
  data.referenceSuggestions.edges.map(({ node: { citation, ...link } }) => ({
    value: citation,
    note: sourceTierOf(link),
    key: link.id,
    link,
  }));

/** The sources the search offers for `text`, once it has settled, while `active`. */
const useReferenceSuggestions = (workspaceId: string | null, text: string, active: boolean) =>
  useLookup(ReferenceSuggestionsDocument, { workspaceId }, text, active, referenceOptions);

/** What a locator is, behind the tip beside each row's Locator. */
const LOCATOR_HINT =
  'Where in the source this ingredient is written about, so a reader can turn to it: a page, p. 112; pages, pp. 12–19; a chapter, chap. 13; an entry, s.v. Hecate. Cited in several places? Give them all here: pp. 12–19, 40; chap. 3. Leave it empty to cite the whole work.';

/** Enter with nothing picked adds nothing: a search is not a source. */
const IGNORE_ENTER = () => {};

/**
 * The ingredient's references, or at `at` a variant's own, citing that form
 * alone (MB.215).
 */
export function ReferencesField({
  workspaceId,
  at,
}: LookupFieldProps & SharedFieldProps): ReactElement {
  const { control, register, setValue, trigger } = useFormContext<IngredientFormValues>();
  const list = at ? (`${at}.references` as const) : 'references';
  const box = draftOf(list);
  const panel = at ? (`${at}.referencePanelOpen` as const) : 'referencePanelOpen';
  const { fields, append, remove } = useFieldArray({ control, name: list });
  const { field } = useController({ control, name: box });
  const panelOpen = useWatch({ control, name: panel });
  // Each row's locator as typed, for its one-line summary.
  const rowValues = useWatch({ control, name: list });
  const { errors, isSubmitted } = useFormState({ control, name: [list, box] });
  const queryClient = useQueryClient();
  const id = useId();
  const legendId = `${id}-legend`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const boxElement = useRef<HTMLInputElement | null>(null);
  // The box and its button together, which an open list spans (MB.154).
  // Held as state, through its callback ref, so the box is told once it exists.
  const [boxRow, setBoxRow] = useState<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);
  // What the last add or removal did, for a screen reader, as a list's says.
  const [announcement, setAnnouncement] = useState('');
  // The row open to change, by its field-array key: one at a time, the rest
  // a line each (MB.115). Its Locator takes the focus as it opens.
  const [openRow, setOpenRow] = useState<string | null>(null);
  const focusLocator = useRef(false);
  useEffect(() => {
    if (openRow === null || !focusLocator.current) return;
    focusLocator.current = false;
    document.getElementById(`${id}-${openRow}-locator`)?.focus();
  }, [openRow, id]);
  const focusBox = () => boxElement.current?.focus();

  // A source already listed is not offered again: listing it twice is refused.
  const found = useReferenceSuggestions(workspaceId, field.value, active);
  // Keyed by the ids as one string, which changes only when the list does.
  const listed = fields.map((row) => row.link.id).join(' ');
  const suggestions = useMemo(() => {
    const ids = new Set(listed.split(' '));
    return { ...found, options: found.options.filter((option) => !ids.has(option.link.id)) };
  }, [found, listed]);

  // A locator in error is shown, open or not, so its box can take the focus.
  const locatorErrors = fields.map(
    (_, index): boolean => get(errors, `${list}.${index}.locator`) !== undefined,
  );
  const rowErrors = fields.map(
    (_, index): string | undefined =>
      [
        get(errors, `${list}.${index}.value`)?.message,
        get(errors, `${list}.${index}.locator`)?.message,
      ]
        .filter(Boolean)
        .join(' ') || undefined,
  );
  const boxError: string | undefined = get(errors, box)?.message;
  const message = [
    ...fields.flatMap((row, index) =>
      rowErrors[index] ? [`${shortCitationText(row.link)}: ${rowErrors[index]}`] : [],
    ),
    boxError,
  ]
    .filter(Boolean)
    .join(' ');
  const describedBy = [hintId, message && errorId].filter(Boolean).join(' ');

  // Once a submit has shown errors, a change revalidates the list and its box.
  const revalidate = () => {
    if (isSubmitted) void trigger([list, box]);
  };
  const add = (citation: string, link: ReferenceLink) => {
    // Not focused by the field array, which would take its locator: the box keeps it.
    append({ value: citation, link, locator: '' }, { shouldFocus: false });
    setAnnouncement(`Added ${shortCitationText(link)}`);
  };
  const pick = (_value: string, option: ReferenceOption | null) => {
    // The list has no typed row, so every pick is a source.
    if (!option) return;
    add(option.value, option.link);
    setValue(box, '');
    revalidate();
    focusBox();
  };
  const removeAt = (index: number) => {
    setAnnouncement(`Removed ${shortCitationText(fields[index].link)}`);
    remove(index);
    revalidate();
  };

  // Counted, so a request while the panel is open still takes you to it.
  const [summons, setSummons] = useState(0);
  const openPanel = () => {
    setValue(panel, true);
    setSummons((count) => count + 1);
    revalidate();
  };
  const closePanel = () => {
    setValue(panel, false);
    revalidate();
    focusBox();
  };
  const saved = ({ citation, ...link }: SavedReference) => {
    add(citation, link);
    closePanel();
    // The new source is one the search can now find.
    void queryClient.invalidateQueries({ queryKey: ['ReferenceSuggestions'] });
  };

  return (
    // Named by the legend's text alone, as a list's fieldset is.
    <fieldset className="fieldset ingredient-form__list" aria-labelledby={legendId}>
      <legend className="fieldset__legend field__label-row">
        <span id={legendId}>References</span>
        <InfoTip id={hintId} label="References">
          Where what this entry says comes from: a book, an article, a web page. Search for one
          already recorded, or choose New Reference at the end of the list to write one, and give a
          locator to point within it: p. 112, chap. 13.
        </InfoTip>
      </legend>
      <div ref={setBoxRow} className="ingredient-form__row">
        <Combobox<ReferenceOption>
          id={`${id}-box`}
          label="Reference"
          value={field.value as string}
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
          create={{ label: 'New Reference…', onCreate: openPanel }}
          inputRef={(element) => {
            field.ref(element);
            boxElement.current = element;
          }}
          name={field.name}
          aria-invalid={message ? true : undefined}
          aria-describedby={describedBy}
        />
      </div>
      {fields.length > 0 && (
        <ul className="ingredient-form__references">
          {fields.map((row, index) => {
            const citationId = `${id}-${row.id}`;
            const locatorId = `${citationId}-locator`;
            const locatorHintId = `${locatorId}-hint`;
            const detailId = `${citationId}-detail`;
            const invalid = rowErrors[index] !== undefined;
            const open = openRow === row.id || locatorErrors[index];
            const locator = rowValues[index]?.locator.trim() ?? '';
            const name = shortCitationText(row.link);
            return (
              <li
                key={row.id}
                className={[
                  'ingredient-form__reference',
                  open && 'is-open',
                  invalid && 'is-invalid',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {/* One line: the source's short form, its italics real,
                    the whole citation the pointer's tooltip and its
                    buttons' description, then where in it, if anywhere.
                    Open, the citation reads whole. */}
                <div className="ingredient-form__source">
                  <span className="ingredient-form__citation" title={row.value}>
                    {open
                      ? row.value
                      : renderShortCitation(row.link, locator !== '').map((part, at) =>
                          part.italic ? <i key={at}>{part.text}</i> : part.text,
                        )}
                  </span>
                  <span id={citationId} hidden>
                    {row.value}
                  </span>
                  {/* The space is the text's, "Fixture, Herbal, p. 112"; the
                      flex row draws the gap and drops the space. */}
                  {!open && locator !== '' && (
                    <>
                      {' '}
                      <span className="ingredient-form__locator-text">{locator}</span>
                    </>
                  )}
                </div>
                {/* Named for its source by its short form, as its × is: a
                    column of bare "Edit"s is no help to a screen reader.
                    Each is described by the citation whole. */}
                <button
                  type="button"
                  className="ingredient-form__icon-button"
                  aria-label={`Edit ${name}`}
                  aria-describedby={citationId}
                  aria-expanded={open}
                  aria-controls={detailId}
                  onClick={() => {
                    focusLocator.current = !open;
                    setOpenRow(open ? null : row.id);
                  }}
                >
                  <EditIcon />
                </button>
                {/* The focus goes back to the box, since the pressed × goes. */}
                <button
                  type="button"
                  className="ingredient-form__icon-button ingredient-form__remove"
                  aria-label={`Remove ${name}`}
                  aria-describedby={[citationId, invalid && errorId].filter(Boolean).join(' ')}
                  onClick={() => {
                    removeAt(index);
                    focusBox();
                  }}
                >
                  <RemoveIcon />
                </button>
                <div id={detailId} className="ingredient-form__reference-detail" hidden={!open}>
                  <span className="ingredient-form__tier">{sourceTierOf(row.link)}</span>
                  {/* Read with the source it locates, then what a locator is:
                      a column of bare "Locator"s is no help to a screen
                      reader. The tip beside the label, as every field's is. */}
                  <div className="ingredient-form__locator field__label-row">
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
                      {...register(`${list}.${index}.locator`, {
                        // Tidied as it is left, as the server will store it.
                        onBlur: (event: FocusEvent<HTMLInputElement>) => {
                          const text = event.target.value;
                          const formatted = formatLocator(text);
                          if (formatted !== text) {
                            setValue(`${list}.${index}.locator`, formatted, {
                              shouldDirty: true,
                            });
                          }
                        },
                      })}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <FieldError id={errorId} message={message} />
      {panelOpen && (
        <ReferencePanel
          workspaceId={workspaceId}
          summons={summons}
          onSaved={saved}
          onCancel={closePanel}
        />
      )}
      {/* Labelled, so that it is told from the box's own status region. */}
      <output className="visually-hidden" aria-label="References changes">
        {announcement}
      </output>
    </fieldset>
  );
}
