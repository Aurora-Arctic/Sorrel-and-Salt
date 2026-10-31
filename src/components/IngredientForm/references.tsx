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
  type FieldError as FormFieldError,
} from 'react-hook-form';
import { renderShortCitation, shortCitationText } from '@/lib/short-citation';
import { formatLocator } from '@/modules/ingredients/validation/reference-format';
import { graphql } from '../../gql';
import type { ReferenceSuggestionsQuery } from '../../gql/graphql';
import Combobox from '../Combobox';
import IconTip from '../IconTip';
import InfoTip from '../InfoTip';
import { FieldError, FieldShell, fieldDescription } from '../Field';
import { EditIcon, RemoveIcon, SourceEditIcon } from './icons';
import ReferencePanel from './reference-panel';
import { RemoveQuestion } from './remove-question';
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

// The References field: one search over the compendium's sources and this coven's, each pick a
// one-line row beneath the box (claude-docs/components/ingredient-form.md, "The references"). Typed
// text is a search and never an entry: the last row, "New Reference", opens the panel.

/**
 * What the form holds of a source: its id and tier, its full citation, and the fields its short
 * form is made from. One fragment for the search and the panel's two saves. Defined before its
 * first use, as codegen reads the documents in order. Called bare: codegen reads the text, and the
 * queries spread it by name.
 */
graphql(`
  fragment ReferenceRow on Reference {
    id
    citation
    isGlobal
    kind
    authors
    title
    container
  }
`);

export const ReferenceSuggestionsDocument = graphql(`
  query ReferenceSuggestions($workspaceId: ID, $query: String, $first: Int) {
    referenceSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {
      edges {
        node {
          ...ReferenceRow
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
  'Where in the source this ingredient is written about, so a reader can turn to it: a page, p. 112; pages, pp. 12–19; a chapter, chap. 13; an entry, under "Hecate". Cited in several places? Give them all here: pp. 12–19, 40; chap. 3. Leave it empty to cite the whole work.';

/** Enter with nothing picked adds nothing: a search is not a source. */
const IGNORE_ENTER = () => {};

/**
 * The ingredient's references, or at `at` a variant's own, citing that form
 * alone.
 */
export function ReferencesField({
  workspaceId,
  at,
  action,
}: LookupFieldProps & SharedFieldProps): ReactElement {
  const { control, register, setValue, getValues, trigger } =
    useFormContext<IngredientFormValues>();
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
  const editSourceId = (row: string) => `${id}-${row}-edit-source`;
  const boxElement = useRef<HTMLInputElement | null>(null);
  // The box and its button together, which an open list spans.
  // Held as state, through its callback ref, so the box is told once it exists.
  const [boxRow, setBoxRow] = useState<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);
  // What the last add or removal did, for a screen reader, as a list's says.
  const [announcement, setAnnouncement] = useState('');
  // The row open to change, by its field-array key: one at a time, the rest
  // a line each. Its Locator takes the focus as it opens.
  const [openRow, setOpenRow] = useState<string | null>(null);
  const focusLocator = useRef(false);
  useEffect(() => {
    if (openRow === null || !focusLocator.current) return;
    focusLocator.current = false;
    document.getElementById(`${id}-${openRow}-locator-control`)?.focus();
  }, [openRow, id]);
  const focusBox = () => boxElement.current?.focus();
  // The source the panel is editing, and the row it was opened from, whose
  // Edit Source takes the focus back once the panel closes; null, the panel
  // writes a new source.
  const [editing, setEditing] = useState<{ row: string; link: ReferenceLink } | null>(null);
  const focusAfterPanel = useRef<string | null>(null);
  useEffect(() => {
    if (panelOpen || focusAfterPanel.current === null) return;
    document.getElementById(focusAfterPanel.current)?.focus();
    focusAfterPanel.current = null;
  }, [panelOpen, openRow]);
  // A source just added opens at once, its Locator focused. The field array keys the new row on a
  // later render, so the add says how many rows to wait for and the render that has them opens the
  // last: state adjusted during render rather than set from an effect.
  const [opensAt, setOpensAt] = useState<number | null>(null);
  if (opensAt !== null && fields.length === opensAt) {
    setOpensAt(null);
    setOpenRow(fields[opensAt - 1].id);
  }

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
        get<unknown, FormFieldError | undefined>(errors, `${list}.${index}.value`)?.message,
        get<unknown, FormFieldError | undefined>(errors, `${list}.${index}.locator`)?.message,
      ]
        .filter(Boolean)
        .join(' ') || undefined,
  );
  const boxError: string | undefined = get<unknown, FormFieldError | undefined>(
    errors,
    box,
  )?.message;
  const message = [
    ...fields.flatMap((row, index) =>
      rowErrors[index]
        ? [`${shortCitationText((rowValues[index] ?? row).link)}: ${rowErrors[index]}`]
        : [],
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
    // Not focused by the field array: the row opens, and its Locator takes the focus.
    append({ value: citation, link, locator: '' }, { shouldFocus: false });
    focusLocator.current = true;
    setOpensAt(fields.length + 1);
    setAnnouncement(`Added ${shortCitationText(link)}`);
  };
  const pick = (_value: string, option: ReferenceOption | null) => {
    // The list has no typed row, so every pick is a source.
    if (!option) return;
    // Cleared before the append, not after: the field array tells the form's
    // history of its new row in an effect, later, while setValue tells it at
    // once, so clearing second would hide the row from undo.
    setValue(box, '');
    add(option.value, option.link);
    revalidate();
  };
  const removeAt = (index: number) => {
    setAnnouncement(`Removed ${shortCitationText((rowValues[index] ?? fields[index]).link)}`);
    remove(index);
    revalidate();
  };
  // The row whose × asks, by its id rather than its place, which a pick
  // while asking would move.
  const [removing, setRemoving] = useState<string | null>(null);
  const removingAt = fields.findIndex((row) => row.id === removing);
  const removingLink =
    removingAt === -1 ? null : (rowValues[removingAt] ?? fields[removingAt]).link;

  // Counted, so a request while the panel is open still takes you to it.
  const [summons, setSummons] = useState(0);
  const openPanel = () => {
    setEditing(null);
    setValue(panel, true);
    setSummons((count) => count + 1);
    revalidate();
  };
  const closePanel = () => {
    setValue(panel, false);
    revalidate();
    // An edit cancelled goes back to the row it was opened from.
    if (editing) {
      focusAfterPanel.current = editSourceId(editing.row);
      setOpenRow(editing.row);
    } else focusBox();
  };
  const editSource = (row: string, link: ReferenceLink) => {
    setEditing({ row, link });
    setValue(panel, true);
    setSummons((count) => count + 1);
    revalidate();
  };
  /**
   * The edited source's new text on every row citing it, the ingredient's
   * and each variant's. Not marked as a change to the ingredient: the source
   * is saved already, and the links the form sends are as they were.
   */
  const rewriteRows = (citation: string, link: ReferenceLink) => {
    const lists: (`variants.${number}.references` | 'references')[] = [
      'references',
      ...getValues('variants').map((_, index) => `variants.${index}.references` as const),
    ];
    for (const name of lists) {
      getValues(name).forEach((entry, index) => {
        if (entry.link.id !== link.id) return;
        setValue(`${name}.${index}.value`, citation);
        setValue(`${name}.${index}.link`, link);
      });
    }
  };
  const saved = ({ citation, ...link }: SavedReference) => {
    if (editing) {
      rewriteRows(citation, link);
      setAnnouncement(`Saved ${shortCitationText(link)}`);
      focusAfterPanel.current = editSourceId(editing.row);
      setOpenRow(editing.row);
    } else add(citation, link);
    // Closed without handing the focus back to the box: the new row takes it.
    setValue(panel, false);
    revalidate();
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
        {action?.((said) => {
          setAnnouncement(said);
          revalidate();
        })}
      </legend>
      <div ref={setBoxRow} className="ingredient-form__row">
        <Combobox<ReferenceOption>
          id={`${id}-box`}
          label="Reference"
          placeholder="Search references"
          value={field.value as string}
          onChange={field.onChange}
          onFocus={() => setActive(true)}
          onBlur={field.onBlur}
          onPick={pick}
          onCommit={IGNORE_ENTER}
          // No onRemoveLast: Backspace and Delete in the empty box take no
          // row, unlike the chip lists; only a row's ×, which asks.
          suggestions={suggestions}
          listAnchor={boxRow}
          action={{ label: 'New Reference', onSelect: openPanel }}
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
            const { aria: _aria, ...locatorField } = fieldDescription({
              id: `${citationId}-locator`,
              hint: LOCATOR_HINT,
            });
            const detailId = `${citationId}-detail`;
            const invalid = rowErrors[index] !== undefined;
            const open = openRow === row.id || locatorErrors[index];
            const locator = rowValues[index]?.locator.trim() ?? '';
            // Read through the values, which an edited source rewrites in place.
            const entry = rowValues[index] ?? row;
            const name = shortCitationText(entry.link);
            // A coven's form edits its own sources; the compendium's are
            // the admins', and a compendium form's are all the compendium's.
            const editable = workspaceId === null || !entry.link.isGlobal;
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
                  <span className="ingredient-form__citation" title={entry.value}>
                    {open
                      ? entry.value
                      : renderShortCitation(entry.link, locator !== '').map((part, at) =>
                          part.italic ? <i key={at}>{part.text}</i> : part.text,
                        )}
                  </span>
                  <span id={citationId} hidden>
                    {entry.value}
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
                <IconTip tip="Edit">
                  <button
                    type="button"
                    className="ingredient-form__icon-button ingredient-form__edit"
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
                </IconTip>
                {/* It asks first; once removed, the focus goes back to
                    the box, since the pressed × goes with its row. */}
                <button
                  type="button"
                  className="ingredient-form__icon-button ingredient-form__remove"
                  aria-label={`Remove ${name}`}
                  aria-describedby={[citationId, invalid && errorId].filter(Boolean).join(' ')}
                  onClick={() => setRemoving(row.id)}
                >
                  <RemoveIcon />
                </button>
                <div id={detailId} className="ingredient-form__reference-detail" hidden={!open}>
                  {/* Its tier, and beside it the edit of the source itself:
                      a page with a pencil, not the row's own pencil, since
                      it changes the source for every entry citing it where
                      the pencil opens this row. Named for the
                      source, as the pencil is. Absent where the source is
                      not this form's to change, which the tier line then
                      says. */}
                  <div className="ingredient-form__tier-row">
                    <span className="ingredient-form__tier">
                      {sourceTierOf(entry.link)}
                      {!editable && '. Only the site’s admins can edit it.'}
                    </span>
                    {editable && (
                      <IconTip tip="Edit Source">
                        <button
                          type="button"
                          id={editSourceId(row.id)}
                          className="ingredient-form__icon-button ingredient-form__edit"
                          aria-label={`Edit Source ${name}`}
                          aria-describedby={citationId}
                          onClick={() => editSource(row.id, entry.link)}
                        >
                          <SourceEditIcon />
                        </button>
                      </IconTip>
                    )}
                  </div>
                  {/* Read with the source it locates, then what a locator is:
                      a column of bare "Locator"s is no help to a screen
                      reader. The tip beside the label, as every field's is. */}
                  <FieldShell
                    label="Locator"
                    hint={LOCATOR_HINT}
                    {...locatorField}
                    className="ingredient-form__locator"
                  >
                    <input
                      id={locatorField.controlId}
                      className="input"
                      placeholder="Add a locator"
                      aria-describedby={[citationId, locatorField.hintId, invalid && errorId]
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
                  </FieldShell>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <FieldError id={errorId} message={message} />
      {panelOpen && (
        <ReferencePanel
          // A fresh panel for each source edited, and for a new one.
          key={editing?.link.id ?? 'new'}
          workspaceId={workspaceId}
          editing={editing?.link}
          summons={summons}
          onSaved={saved}
          onCancel={closePanel}
        />
      )}
      <RemoveQuestion
        asked={removingLink !== null}
        question={
          <>
            Remove{' '}
            {removingLink &&
              renderShortCitation(removingLink, false).map((part, at) =>
                part.italic ? <i key={at}>{part.text}</i> : part.text,
              )}
            ? The source stays, to cite again; only this citation goes, once saved.
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
      <output className="visually-hidden" aria-label="References changes">
        {announcement}
      </output>
    </fieldset>
  );
}
