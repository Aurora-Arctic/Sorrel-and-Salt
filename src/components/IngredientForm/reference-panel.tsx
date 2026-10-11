'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  type KeyboardEvent,
  type ReactElement,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import { FormProvider, type Resolver, useForm, useWatch } from 'react-hook-form';
import { graphql } from '../../gql';
import { graphqlQuery, graphqlRequest } from '../../lib/graphql-client';
import BusyButton from '../BusyButton';
import Notice from '../Notice';
import { REFERENCE_KINDS, type ReferenceKind } from '@/modules/ingredients/schema/ingredient-enums';
import { ReferenceInput } from '@/modules/ingredients/validation/reference';
import { FORMAT_OF } from '@/modules/ingredients/validation/reference-format';
import { SelectField, TextField } from '../Field';
import type { ReferenceQuery } from '../../gql/graphql';
import type {
  ReferenceFieldName,
  ReferenceFieldSpec,
  ReferenceFormValues,
  ReferencePanelProps,
  ReferenceSendInput,
  SavedReference,
} from './types';
import { useReportPanelChanges } from './panel-changes';
import { readGraphqlIssues } from '../../lib/graphql-failure';

// The citation sub-form (MB.154): a new source written to this coven without
// leaving the ingredient form. Inline beneath the References field rather
// than a dialog, since M8.16 puts the whole form in a modal. It cannot be a
// <form> of its own, nested in the ingredient's, so it is a fieldset running
// its own react-hook-form, its fields the ingredient form's own, and Enter in
// one of them saves the source rather than the ingredient
// (claude-docs/components/ingredient-form.md, "The new reference panel").
// Opened on a source already recorded, it edits that one instead, prefilled
// with every field it has, and the change reaches every row citing it
// (MB.115; the same doc, "Editing a source").

export const CreateReferenceDocument = graphql(`
  mutation CreateReference($workspaceId: ID, $input: ReferenceInput!) {
    createReference(workspaceId: $workspaceId, input: $input) {
      id
      citation
      isGlobal
      kind
      authors
      title
      container
    }
  }
`);

export const UpdateReferenceDocument = graphql(`
  mutation UpdateReference($workspaceId: ID, $id: ID!, $input: ReferenceInput!) {
    updateReference(workspaceId: $workspaceId, id: $id, input: $input) {
      id
      citation
      isGlobal
      kind
      authors
      title
      container
    }
  }
`);

/** A source whole, which the edit opens on: a row carries only its short form's fields. */
export const ReferenceDocument = graphql(`
  query Reference($workspaceId: ID, $id: ID!) {
    reference(workspaceId: $workspaceId, id: $id) {
      id
      kind
      title
      authors
      container
      contributors
      edition
      volume
      issue
      series
      place
      publisher
      published
      pages
      host
      url
      modified
      accessed
      note
    }
  }
`);

export const EMPTY_REFERENCE: ReferenceFormValues = {
  kind: '',
  title: '',
  authors: '',
  container: '',
  contributors: '',
  edition: '',
  volume: '',
  issue: '',
  series: '',
  place: '',
  publisher: '',
  published: '',
  pages: '',
  host: '',
  url: '',
  modified: '',
  accessed: '',
  note: '',
};

/** The kinds as a reader would name them, in the enum's order. */
const KIND_LABELS: Record<ReferenceKind, string> = {
  book: 'Book',
  chapter: 'Chapter in a Book',
  article: 'Journal Article',
  entry: 'Reference-Work Entry',
  web_page: 'Web Page',
};

const KIND_OPTIONS = REFERENCE_KINDS.map((kind) => ({ value: kind, label: KIND_LABELS[kind] }));

// The fields, each with what it is told. A title, a container and a note may
// mark a title inside them in italics (MB.151), so their hint says how.
const ITALICS = 'Wrap a title inside it in underscores to italicise it: _Hamlet_.';
const title = (label: string): ReferenceFieldSpec => ({
  name: 'title',
  label,
  required: true,
  hint: ITALICS,
  placeholder: 'Add a title',
});
const container = (
  label: string,
  required: boolean,
  hint: string,
  placeholder: string,
): ReferenceFieldSpec => ({
  name: 'container',
  label,
  required,
  hint: `${hint} ${ITALICS}`,
  placeholder,
});
const AUTHORS: ReferenceFieldSpec = {
  name: 'authors',
  label: 'Authors',
  placeholder: 'Add authors',
  hint: 'As printed, the first name inverted: Shelley, Mary.',
};
const CONTRIBUTORS: ReferenceFieldSpec = {
  name: 'contributors',
  label: 'Contributors',
  placeholder: 'Add contributors',
  hint: 'Translators and editors, as a sentence: Translated by Angela Hall.',
};
const EDITION: ReferenceFieldSpec = {
  name: 'edition',
  label: 'Edition',
  placeholder: 'Add an edition',
  hint: 'As printed: 2nd ed.',
};
const VOLUMES: ReferenceFieldSpec = {
  name: 'volume',
  label: 'Volume',
  placeholder: 'Add a volume',
  hint: 'As printed: Vol. 2, or 4 vols.',
};
const SERIES: ReferenceFieldSpec = {
  name: 'series',
  label: 'Series',
  placeholder: 'Add a series',
};
const PLACE: ReferenceFieldSpec = {
  name: 'place',
  label: 'Place',
  placeholder: 'Add a place',
  hint: 'The city it was published in: London.',
};
const PUBLISHER: ReferenceFieldSpec = {
  name: 'publisher',
  label: 'Publisher',
  placeholder: 'Add a publisher',
};
const published = (required = false): ReferenceFieldSpec => ({
  name: 'published',
  label: 'Published',
  required,
  placeholder: 'Add a date',
  hint: 'As precise as the source gives it: 1985, November 1950, 1882–88.',
});
const PAGES: ReferenceFieldSpec = {
  name: 'pages',
  label: 'Pages',
  hint: 'Its pages: 112–30.',
  placeholder: 'Add pages',
};
const HOST: ReferenceFieldSpec = {
  name: 'host',
  label: 'Read Through',
  placeholder: 'Name the library',
  hint: 'The library or archive a printed work was read through online: Perseus Digital Library.',
};
const url = (required = false): ReferenceFieldSpec => ({
  name: 'url',
  label: 'Address',
  required,
  placeholder: 'Add an address',
  type: 'url',
  hint: 'The full web address, starting https://',
});
const MODIFIED: ReferenceFieldSpec = { name: 'modified', label: 'Last Modified', type: 'date' };
const accessed = (required = false): ReferenceFieldSpec => ({
  name: 'accessed',
  label: 'Accessed',
  required,
  type: 'date',
  hint: 'The day it was read online.',
});
const NOTE: ReferenceFieldSpec = {
  name: 'note',
  label: 'Note',
  placeholder: 'Add a note',
  hint: `A short note, shown after the citation in brackets. ${ITALICS}`,
};

/** Where a printed work was read online, after its publication. */
const ONLINE = [HOST, url(), MODIFIED, accessed(), NOTE];

/**
 * Each kind's fields, in the order the citation prints them: what
 * `renderCitation` reads for it (`src/lib/citation.ts`), so the panel offers
 * nothing the citation would drop, and requires what the schema refuses.
 */
export const FIELDS_OF: Record<ReferenceKind, readonly ReferenceFieldSpec[]> = {
  book: [
    title('Title'),
    AUTHORS,
    CONTRIBUTORS,
    EDITION,
    VOLUMES,
    SERIES,
    PLACE,
    PUBLISHER,
    published(true),
    ...ONLINE,
  ],
  chapter: [
    title('Chapter Title'),
    container('Book', true, 'The book this chapter is in.', 'Name the book'),
    AUTHORS,
    CONTRIBUTORS,
    PAGES,
    EDITION,
    VOLUMES,
    SERIES,
    PLACE,
    PUBLISHER,
    published(),
    ...ONLINE,
  ],
  article: [
    title('Article Title'),
    container('Journal', true, 'The journal this article is in.', 'Name the journal'),
    AUTHORS,
    { name: 'volume', label: 'Volume', placeholder: 'Add a volume' },
    { name: 'issue', label: 'Issue', placeholder: 'Add an issue' },
    published(),
    PAGES,
    ...ONLINE,
  ],
  entry: [
    title('Entry'),
    container(
      'Reference Work',
      true,
      'The encyclopedia or dictionary the entry is in.',
      'Name the work',
    ),
    AUTHORS,
    EDITION,
    CONTRIBUTORS,
    PLACE,
    PUBLISHER,
    published(),
    ...ONLINE,
  ],
  web_page: [
    title('Page Title'),
    container('Site', false, 'The website it is on.', 'Name the site'),
    AUTHORS,
    PUBLISHER,
    published(),
    MODIFIED,
    url(true),
    accessed(true),
    NOTE,
  ],
};

const FIELD_NAMES = Object.keys(EMPTY_REFERENCE).filter(
  (name): name is ReferenceFieldName => name !== 'kind',
);

/** The fields the chosen kind shows; the title alone before one is chosen. */
const shownFor = (kind: ReferenceKind | ''): ReadonlySet<ReferenceFieldName> =>
  new Set(kind === '' ? ['title'] : FIELDS_OF[kind].map(({ name }) => name));

/**
 * The values as the mutation takes them: the chosen kind's fields as typed —
 * the schema trims and drops a blank — and every other field null, so a
 * field another kind took is left behind. A day goes as null when blank,
 * since `LocalDate` takes no empty text.
 */
export function toReferenceInput(values: ReferenceFormValues): ReferenceSendInput {
  const shown = shownFor(values.kind);
  const input: Record<string, string | null> = {};
  for (const name of FIELD_NAMES) {
    const blankDay = (name === 'modified' || name === 'accessed') && values[name] === '';
    input[name] = shown.has(name) && !blankDay ? values[name] : null;
  }
  return { ...input, kind: values.kind as ReferenceKind, title: values.title };
}

/** A source as the panel edits it: each field as stored, an empty one blank. */
export function referenceValuesOf(source: ReferenceQuery['reference']): ReferenceFormValues {
  const values: ReferenceFormValues = { ...EMPTY_REFERENCE, kind: source.kind };
  for (const name of FIELD_NAMES) values[name] = source[name] ?? '';
  return values;
}

const validate = zodResolver(ReferenceInput, undefined, { raw: true });

/** The shared schema as the panel's resolver, over the values as `toReferenceInput` sends them. */
const referenceResolver: Resolver<ReferenceFormValues, unknown, ReferenceSendInput> = (
  values,
  context,
  options,
) => validate(toReferenceInput(values), context, options as never);

/**
 * The panel: a new source, or with `editing`, that source, read whole by id
 * before its fields are shown, since a row carries only its short form's.
 */
export default function ReferencePanel(props: ReferencePanelProps): ReactElement {
  return props.editing ? (
    <EditSourcePanel {...props} editing={props.editing} />
  ) : (
    <PanelForm {...props} defaults={EMPTY_REFERENCE} />
  );
}

/**
 * The edit's read, then the panel prefilled with it. Kept for no longer than
 * the panel is open, so an edit opened again reads the source as it now is.
 * The tier is the source's own: a coven's under its coven, the compendium's
 * without one, as `updateReference` will write it.
 */
function EditSourcePanel({
  editing,
  ...props
}: ReferencePanelProps & { editing: NonNullable<ReferencePanelProps['editing']> }): ReactElement {
  const legendId = useId();
  const { data, isError } = useQuery({
    ...graphqlQuery(ReferenceDocument, {
      workspaceId: editing.isGlobal ? null : props.workspaceId,
      id: editing.id,
    }),
    gcTime: 0,
    throwOnError: false,
  });
  // Values made once per read, so the form is not handed new defaults each render.
  const defaults = useMemo(() => data && referenceValuesOf(data.reference), [data]);

  if (defaults) return <PanelForm {...props} editing={editing} defaults={defaults} />;
  return (
    <fieldset className="fieldset ingredient-form__panel" aria-labelledby={legendId}>
      <legend className="fieldset__legend" id={legendId}>
        Edit Source
      </legend>
      {isError ? (
        <Notice kind="error">This source could not be loaded. Cancel, and try again.</Notice>
      ) : (
        <output className="ingredient-form__panel-note">Loading the source…</output>
      )}
      <div className="form__actions">
        <button type="button" className="btn btn--quiet" onClick={props.onCancel}>
          Cancel
        </button>
      </div>
    </fieldset>
  );
}

function PanelForm({
  workspaceId,
  editing,
  defaults,
  summons,
  onSaved,
  onCancel,
}: ReferencePanelProps & { defaults: ReferenceFormValues }): ReactElement {
  const methods = useForm<ReferenceFormValues, unknown, ReferenceSendInput>({
    defaultValues: defaults,
    resolver: referenceResolver,
    // As the ingredient form's: the first field marked invalid is focused
    // once every error is drawn, below.
    shouldFocusError: false,
  });
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty, submitCount },
  } = methods;
  // Told to the ingredient form, so closing its modal over them asks first.
  useReportPanelChanges(isDirty);
  const panel = useRef<HTMLFieldSetElement>(null);
  const legendId = useId();
  const noteId = useId();
  const kind = useWatch({ control, name: 'kind' });
  const shown = kind === '' ? [] : FIELDS_OF[kind];

  // Opened to be filled in, so the kind, which decides the rest, takes the
  // focus: its box, the panel's one combobox, found in the page at once, as
  // the ingredient form finds Name. `setFocus` waits a tick, and would take
  // the focus back from whatever a quick save had focused meanwhile. Asked
  // for again while open, it does the same, the owner's call: New Reference
  // or "Add a reference" always takes you to the panel, its top in view.
  useEffect(() => {
    panel.current?.scrollIntoView?.({ block: 'start' });
    panel.current?.querySelector<HTMLElement>('[role="combobox"]')?.focus({ preventScroll: true });
  }, [summons]);
  useLayoutEffect(() => {
    if (submitCount > 0)
      panel.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [submitCount]);

  // A new source is written to this coven, or the compendium; an edited one
  // in its own tier, which in a coven's form is the coven's, since only its
  // own sources offer the edit.
  const mutation = useMutation({
    mutationFn: async (input: ReferenceSendInput): Promise<SavedReference> =>
      editing
        ? (
            await graphqlRequest(UpdateReferenceDocument, {
              workspaceId: editing.isGlobal ? null : workspaceId,
              id: editing.id,
              input,
            })
          ).updateReference
        : (await graphqlRequest(CreateReferenceDocument, { workspaceId, input })).createReference,
  });

  const save = async (input: ReferenceSendInput): Promise<void> => {
    try {
      onSaved(await mutation.mutateAsync(input));
    } catch (error) {
      // A field error beside the field it names, if this kind shows it;
      // anything else above the fields.
      const visible = shownFor(kind);
      const unplaced: string[] = [];
      for (const { path, message } of readGraphqlIssues(error)) {
        const [field, ...rest] = path;
        if (field === 'kind' && rest.length === 0) setError('kind', { type: 'server', message });
        else if (rest.length === 0 && visible.has(field as ReferenceFieldName)) {
          setError(field as ReferenceFieldName, { type: 'server', message });
        } else unplaced.push(message);
      }
      if (unplaced.length > 0) setError('root', { type: 'server', message: unplaced.join(' ') });
    }
  };
  const submit = () => void handleSubmit(save)();

  // Enter in a field would submit the ingredient form around the panel; here
  // it saves the source, as Enter in a form of its own would.
  const onKeyDown = (event: KeyboardEvent<HTMLFieldSetElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    if (!(event.target instanceof HTMLInputElement)) return;
    event.preventDefault();
    submit();
  };

  const noun = editing ? 'Source' : 'Reference';
  return (
    <FormProvider {...methods}>
      {/* A group, named by its legend, holding its own save: a save with
          nothing chosen asks for the kind first. Its keydown is the fields'
          Enter, heard as it bubbles, not a control of its own. An edit is
          described by what it will reach. */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <fieldset
        ref={panel}
        className="fieldset ingredient-form__panel"
        aria-labelledby={legendId}
        aria-describedby={editing ? noteId : undefined}
        onKeyDown={onKeyDown}
      >
        <legend className="fieldset__legend" id={legendId}>
          {editing ? 'Edit Source' : 'New Reference'}
        </legend>
        {editing && (
          <p className="ingredient-form__panel-note" id={noteId}>
            A change here reaches every entry citing this source.
          </p>
        )}
        {errors.root && <Notice kind="error">{errors.root.message}</Notice>}
        <SelectField<ReferenceFormValues>
          name="kind"
          label="Kind"
          placeholder="Choose a kind"
          options={KIND_OPTIONS}
          required
          // A kind decides which fields are refused, so a change revalidates them.
          deps={FIELD_NAMES}
        />
        {shown.map((spec) => (
          <TextField<ReferenceFormValues> key={spec.name} {...spec} format={FORMAT_OF[spec.name]} />
        ))}
        {/* Held down from the press to the answer, as the ingredient's saves
            are: Save Reference says so with the same spinner, and Cancel
            waits, so a source being written is never left half-added. Save
            is off until something is entered or changed, and Cancel is quiet,
            the owner's rules for every form (M5.6). */}
        <div className="form__actions">
          <BusyButton
            className="btn btn--solid"
            onClick={submit}
            disabled={!isDirty || isSubmitting}
            busy={isSubmitting}
            busyLabel={`Saving ${noun}`}
          >
            {`Save ${noun}`}
          </BusyButton>
          <button
            type="button"
            className="btn btn--quiet"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        </div>
      </fieldset>
    </FormProvider>
  );
}
