import type { ReactElement, ReactNode } from 'react';
import NewTabHint from '@/components/LinkHint/new-tab-hint';
import { Fragment } from 'react';
import { citationText, byCitation, renderCitation } from '../../lib/citation';
import { renderShortCitation } from '../../lib/short-citation';
import type { CitationPart } from '../../lib/types';
import type { CitedReference, IngredientDetail } from '@/modules/ingredients';

type ReferenceRow = CitedReference['reference'];

// The entry's sources in Chicago's notes-and-bibliography form: note numbers at the end of each
// section they support, the notes and the full bibliography in the References section at the foot
// (claude-docs/components/ingredient-entry.md, "Structure").

/** One note: a source cited by one section, with the locator it was cited at. */
interface Note {
  number: number;
  /** The section's key, which its numbers are found by. */
  section: string;
  /** What the note's way back says: "Details", or the form's name. */
  sectionLabel: string;
  reference: ReferenceRow;
  locator: string | null;
}

/** A source in the bibliography, and the notes that cite it. */
interface Entry {
  reference: ReferenceRow;
  notes: number[];
}

export interface ReferenceNotes {
  notes: Note[];
  /** Every source once, alphabetical. */
  bibliography: Entry[];
  /** The numbers a section ends with. */
  numbersOf: (section: string) => number[];
}

/** The key of the ingredient's own section; a form's is its anchor. */
export const DETAILS = 'details';

/** The notes of a page: the ingredient's links first, then each form's in page order; `anchors` and `labels` follow `detail.variants`. */
export function referenceNotes(
  detail: Pick<IngredientDetail, 'references' | 'variants'>,
  anchors: readonly string[],
  labels: readonly string[],
): ReferenceNotes {
  const notes: Note[] = [];
  const add = (section: string, sectionLabel: string, cited: readonly CitedReference[]) => {
    for (const { reference, locator } of cited) {
      notes.push({ number: notes.length + 1, section, sectionLabel, reference, locator });
    }
  };
  add(DETAILS, 'Details', detail.references);
  detail.variants.forEach(({ references }, at) => add(anchors[at]!, labels[at]!, references));

  const entries = new Map<string, Entry>();
  for (const note of notes) {
    const entry = entries.get(note.reference.id) ?? { reference: note.reference, notes: [] };
    entry.notes.push(note.number);
    entries.set(note.reference.id, entry);
  }
  const bibliography = [...entries.values()].sort((a, b) =>
    byCitation(citationText(a.reference), citationText(b.reference)),
  );
  return {
    notes,
    bibliography,
    numbersOf: (section) => notes.filter((n) => n.section === section).map((n) => n.number),
  };
}

const italicised = (parts: readonly CitationPart[]): ReactNode[] =>
  parts.map((part, at) => (part.italic ? <cite key={at}>{part.text}</cite> : part.text));

/** A short form's close: Chicago ends a note with a period, inside a quoted title's quotation marks, and none after "?" or "!". */
function closed(parts: CitationPart[]): CitationPart[] {
  const last = parts[parts.length - 1];
  if (!last) return parts;
  if (last.text.endsWith('"')) {
    const text = last.text.slice(0, -1);
    return [
      ...parts.slice(0, -1),
      { ...last, text: /[?!.]$/.test(text) ? last.text : `${text}."` },
    ];
  }
  return /[?!.]$/.test(last.text) ? parts : [...parts, { text: '.', italic: false }];
}

/** A locator closing a note: the period Chicago ends a note with, unless it has one. */
const endNote = (text: string): string => (/[?!.]$/.test(text) ? text : `${text}.`);

/** The id of a number's link, which its note's way back targets. */
const markId = (number: number) => `note-ref-${number}`;
const noteId = (number: number) => `note-${number}`;
/** The two blocks of the References section, as bare words so no prefixed id can equal them (claude-docs/components/ingredient-entry.md, "Structure"). */
export const NOTES_ID = 'notes';
export const BIBLIOGRAPHY_ID = 'bibliography';

const entryId = (reference: ReferenceRow) => `ref-${reference.id}`;

/** A section's note numbers on a line of their own under a small "References" label (not a heading), each a superscript link; `section` keeps the label's id unique. */
export function NoteMarks({
  section,
  numbers,
}: {
  section: string;
  numbers: readonly number[];
}): ReactElement | null {
  if (numbers.length === 0) return null;
  const labelId = `${section}-marks`;
  return (
    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a fieldset or details would add a legend or a disclosure; this is a plain labelled group
    <div className="ingredient-entry__marks" role="group" aria-labelledby={labelId}>
      <p id={labelId} className="eyebrow">
        References
      </p>
      <p>
        <sup>
          {numbers.map((number) => (
            <a
              key={number}
              id={markId(number)}
              href={`#${noteId(number)}`}
              aria-label={`Note ${number}`}
            >
              #{number}
            </a>
          ))}
        </sup>
      </p>
    </div>
  );
}

function NoteItem({ note }: { note: Note }): ReactElement {
  const { number, reference, locator, sectionLabel } = note;
  const located = (locator ?? '').trim() !== '';
  const short = renderShortCitation(reference, located);
  return (
    <li id={noteId(number)} className="ingredient-entry__note">
      <a href={`#${entryId(reference)}`}>{italicised(located ? short : closed(short))}</a>
      {located && ` ${endNote(locator!.trim())}`}
      {/* No space before the arrow: its margin spaces it, and `<wbr>` keeps
          the break a space would give, so a long citation still wraps here. */}
      <wbr />
      <a
        className="ingredient-entry__return"
        href={`#${markId(number)}`}
        aria-label={`Back to ${sectionLabel}`}
      >
        <span aria-hidden="true">↩</span>
      </a>
    </li>
  );
}

function BibliographyItem({ entry }: { entry: Entry }): ReactElement {
  const { reference, notes } = entry;
  return (
    <li id={entryId(reference)} className="ingredient-entry__reference">
      {italicised(renderCitation(reference))}
      {reference.url && (
        <>
          {' '}
          {/* `noopener` keeps the opened page from reaching back; the hidden hint
              tells a screen reader the link leaves this tab, as IngredientForm's duplicates.tsx does. */}
          <a href={reference.url} target="_blank" rel="noopener">
            Open the Source
            <NewTabHint />
          </a>
        </>
      )}
      {/* As in a note: each arrow's margin spaces it, and `<wbr>` keeps the break. */}
      {notes.map((number) => (
        <Fragment key={number}>
          <wbr />
          <a
            className="ingredient-entry__return"
            href={`#${noteId(number)}`}
            aria-label={`Back to Note ${number}`}
          >
            <span aria-hidden="true">↩</span>
            <sup>{number}</sup>
          </a>
        </Fragment>
      ))}
    </li>
  );
}

/** The foot of the page: the notes, then the bibliography, or the say-so that there are none. */
export function ReferencesSection({ model }: { model: ReferenceNotes }): ReactElement {
  const { notes, bibliography } = model;
  return (
    <section
      id="references"
      className="ingredient-entry__references"
      aria-labelledby="references-heading"
    >
      <h2 id="references-heading">References</h2>
      {notes.length === 0 ? (
        <p className="ingredient-entry__empty">No sources recorded.</p>
      ) : (
        <>
          <div id={NOTES_ID} className="ingredient-entry__block">
            <h3 id="notes-heading">Notes</h3>
            <ol className="ingredient-entry__notes" aria-labelledby="notes-heading">
              {notes.map((note) => (
                <NoteItem key={note.number} note={note} />
              ))}
            </ol>
          </div>
          <div id={BIBLIOGRAPHY_ID} className="ingredient-entry__block">
            <h3 id="bibliography-heading">Bibliography</h3>
            <ul className="ingredient-entry__list" aria-labelledby="bibliography-heading">
              {bibliography.map((entry) => (
                <BibliographyItem key={entry.reference.id} entry={entry} />
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
