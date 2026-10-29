'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
} from 'react';
import { FormProvider, type Resolver, useForm, useWatch } from 'react-hook-form';
import { graphql } from '../../gql';
import { graphqlQuery, graphqlRequest } from '../../lib/graphql-client';

import IconTip from '../IconTip';
import InfoTip from '../InfoTip';
import Notice from '../Notice';
import { RemoveIcon } from './icons';
import { REFERENCE_KINDS, type ReferenceKind } from '@/modules/ingredients/schema/ingredient-enums';
import { ReferenceInput } from '@/modules/ingredients/validation/reference';
import { FORMAT_OF } from '@/modules/ingredients/validation/reference-format';
import {
  FormActions,
  FormHistoryButtons,
  FormHistoryContext,
  SelectField,
  TextField,
  useFormHistory,
} from '../Field';
import { HeaderSlotContext } from '../Modal';
import type { ReferenceQuery } from '../../gql/graphql';
import type {
  EditSourcePanelProps,
  PanelFormProps,
  ReferenceFieldName,
  ReferenceFieldSpec,
  ReferenceFormValues,
  ReferencePanelProps,
  ReferenceSendInput,
  SavedReference,
} from './types';
import { useFocusFirstInvalid } from './on-submit';
import { useReportPanelChanges } from './panel-changes';
import { placeServerIssues } from '../../lib/graphql-failure';

// The citation sub-form: a new source written to this coven without leaving the ingredient form.
// A fieldset running its own react-hook-form, as a <form> cannot nest in the ingredient's; opened
// on a recorded source it edits that one (claude-docs/components/ingredient-form.md, "The new reference panel").

export const CreateReferenceDocument = graphql(`
  mutation CreateReference($workspaceId: ID, $input: ReferenceInput!) {
    createReference(workspaceId: $workspaceId, input: $input) {
      ...ReferenceRow
    }
  }
`);

export const UpdateReferenceDocument = graphql(`
  mutation UpdateReference($workspaceId: ID, $id: ID!, $input: ReferenceInput!) {
    updateReference(workspaceId: $workspaceId, id: $id, input: $input) {
      ...ReferenceRow
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

// The fields. No field carries a hint: how to cite is one How to Cite tip
// at the panel's head, and a field whose format matters shows an example
// as its placeholder (info-tip.md).
const title = (label: string): ReferenceFieldSpec => ({
  name: 'title',
  label,
  required: true,
  placeholder: 'Add a title',
});
const container = (label: string, required: boolean, placeholder: string): ReferenceFieldSpec => ({
  name: 'container',
  label,
  required,
  placeholder,
});
const AUTHORS: ReferenceFieldSpec = {
  name: 'authors',
  label: 'Authors',
  placeholder: 'Shelley, Mary',
};
const CONTRIBUTORS: ReferenceFieldSpec = {
  name: 'contributors',
  label: 'Contributors',
  placeholder: 'Add contributors',
};
const EDITION: ReferenceFieldSpec = {
  name: 'edition',
  label: 'Edition',
  placeholder: '2nd ed.',
};
const VOLUMES: ReferenceFieldSpec = {
  name: 'volume',
  label: 'Volume',
  placeholder: 'Vol. 2',
};
const SERIES: ReferenceFieldSpec = {
  name: 'series',
  label: 'Series',
  placeholder: 'Add a series',
};
const PLACE: ReferenceFieldSpec = {
  name: 'place',
  label: 'Place',
  placeholder: 'London',
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
  placeholder: '1985',
});
const PAGES: ReferenceFieldSpec = {
  name: 'pages',
  label: 'Pages',
  placeholder: '112–30',
};
const HOST: ReferenceFieldSpec = {
  name: 'host',
  label: 'Read Through',
  placeholder: 'Perseus Digital Library',
};
const url = (required = false): ReferenceFieldSpec => ({
  name: 'url',
  label: 'Address',
  required,
  placeholder: 'https://',
  type: 'url',
});
const MODIFIED: ReferenceFieldSpec = { name: 'modified', label: 'Last Modified', type: 'date' };
const accessed = (required = false): ReferenceFieldSpec => ({
  name: 'accessed',
  label: 'Accessed',
  required,
  type: 'date',
});
const NOTE: ReferenceFieldSpec = {
  name: 'note',
  label: 'Note',
  placeholder: 'Add a note',
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
    container('Book', true, 'Name the book'),
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
    container('Journal', true, 'Name the journal'),
    AUTHORS,
    { name: 'volume', label: 'Volume', placeholder: 'Add a volume' },
    { name: 'issue', label: 'Issue', placeholder: 'Add an issue' },
    published(),
    PAGES,
    ...ONLINE,
  ],
  entry: [
    title('Entry'),
    container('Reference Work', true, 'Name the work'),
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
    container('Site', false, 'Name the site'),
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
 * The values as the mutation takes them: the chosen kind's fields as typed and every other field
 * null; a blank day goes as null, since `LocalDate` takes no empty text.
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
 * The panel's head, one line: its title, then at the end edge its Undo and Redo, any tip, and a ×
 * that closes it as Cancel does (claude-docs/components/ingredient-form.md, "Notes behind the code").
 */
function PanelHead({
  legend,
  held = false,
  onClose,
  tip,
  history,
  children,
}: {
  legend: string;
  held?: boolean;
  onClose: () => void;
  tip?: ReactNode;
  history?: ReactNode;
  children?: ReactNode;
}): ReactElement {
  return (
    <div className="ingredient-form__panel-head">
      {children}
      <div className="ingredient-form__panel-end">
        {history}
        {tip}
        <IconTip tip="Close">
          <button
            type="button"
            className="ingredient-form__icon-button"
            aria-label={`Close ${legend}`}
            disabled={held}
            onClick={onClose}
          >
            <RemoveIcon />
          </button>
        </IconTip>
      </div>
    </div>
  );
}

/**
 * How to cite, said once for the whole panel and named by its `aria-describedby`, one rule to a
 * line (claude-docs/components/ingredient-form.md, "Notes behind the code").
 */
const CITE_RULES = [
  'Names as printed, the first author inverted (Shelley, Mary).',
  'Edition and volume as printed (2nd ed., Vol. 2).',
  'Contributors as a sentence (Translated by Angela Hall).',
  'A date as precise as the source gives it.',
  'Underscores round a title inside a title italicise it (_Hamlet_).',
  'A note prints after the citation, in brackets.',
];

function HowToCite({ id }: { id: string }): ReactElement {
  return (
    <InfoTip id={id} label="How to Cite">
      {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- these sit in a tooltip bubble as phrasing content; a ul would break the paragraph around it */}
      <span role="list" className="ingredient-form__cite-rules">
        {CITE_RULES.map((rule) => (
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- these sit in a tooltip bubble as phrasing content; an li would break the paragraph around it
          <span key={rule} role="listitem" className="ingredient-form__cite-rule">
            {rule}
          </span>
        ))}
      </span>
    </InfoTip>
  );
}

/**
 * The edit's read, then the panel prefilled with it, kept only while the panel is open. The tier
 * is the source's own, as `updateReference` will write it.
 */
function EditSourcePanel({ editing, ...props }: EditSourcePanelProps): ReactElement {
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
      <PanelHead legend="Edit Source" onClose={props.onCancel}>
        {!isError && <output className="ingredient-form__panel-note">Loading the source…</output>}
      </PanelHead>
      {isError && (
        <Notice kind="error">This source could not be loaded. Cancel, and try again.</Notice>
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
}: PanelFormProps): ReactElement {
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
  // The panel saves itself, so it keeps a history of its own; the ingredient
  // form's ignores keys pressed in here.
  const history = useFormHistory(methods, { root: panel });
  const legendId = useId();
  const noteId = useId();
  const citeId = useId();
  const kind = useWatch({ control, name: 'kind' });
  const shown = kind === '' ? [] : FIELDS_OF[kind];

  // Opened to be filled in, so the kind, which decides the rest, takes the focus; `setFocus` waits
  // a tick, and asked for again while open it does the same, with the panel's top in view.
  useEffect(() => {
    panel.current?.scrollIntoView?.({ block: 'start' });
    panel.current?.querySelector<HTMLElement>('[role="combobox"]')?.focus({ preventScroll: true });
  }, [summons]);
  useFocusFirstInvalid(panel, submitCount);

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
      placeServerIssues(error, setError, ({ path: [field, ...rest] }) => {
        if (rest.length > 0) return undefined;
        if (field === 'kind') return 'kind';
        return visible.has(field as ReferenceFieldName) ? (field as ReferenceFieldName) : undefined;
      });
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
  const legend = editing ? 'Edit Source' : 'New Reference';
  return (
    <FormProvider {...methods}>
      <FormHistoryContext.Provider value={history}>
        {/* A group, named by its legend, holding its own save: a save with
          nothing chosen asks for the kind first. Its keydown is the fields'
          Enter, heard as it bubbles, not a control of its own. An edit is
          described by what it will reach. */}
        {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
        <fieldset
          ref={panel}
          className="fieldset ingredient-form__panel"
          aria-labelledby={legendId}
          aria-describedby={editing ? `${noteId} ${citeId}` : citeId}
          onKeyDown={onKeyDown}
        >
          <legend className="fieldset__legend" id={legendId}>
            {legend}
          </legend>
          <PanelHead
            legend={legend}
            held={isSubmitting}
            onClose={onCancel}
            tip={<HowToCite id={citeId} />}
            history={
              // Never the modal's header: that is the ingredient form's history.
              <HeaderSlotContext.Provider value={null}>
                <FormHistoryButtons />
              </HeaderSlotContext.Provider>
            }
          >
            {editing && (
              <p className="ingredient-form__panel-note" id={noteId}>
                A change here reaches every entry citing this source.
              </p>
            )}
          </PanelHead>
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
            <TextField<ReferenceFormValues>
              key={spec.name}
              {...spec}
              format={FORMAT_OF[spec.name]}
            />
          ))}
          {/* Held down from the press to the answer, as the ingredient's saves are, so a source
            being written is never left half-added; Save is off until something is entered or
            changed, and Cancel is quiet. */}
          <FormActions
            noun={noun}
            dirty={isDirty}
            submitting={isSubmitting}
            onSave={submit}
            onCancel={onCancel}
            holdCancel
          />
        </fieldset>
      </FormHistoryContext.Provider>
    </FormProvider>
  );
}
