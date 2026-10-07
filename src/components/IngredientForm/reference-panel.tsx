'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import {
  type KeyboardEvent,
  type ReactElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
} from 'react';
import { FormProvider, type Resolver, useForm, useWatch } from 'react-hook-form';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { REFERENCE_KINDS, type ReferenceKind } from '@/modules/ingredients/schema/ingredient-enums';
import { ReferenceInput } from '@/modules/ingredients/validation/reference';
import { FORMAT_OF } from '@/modules/ingredients/validation/reference-format';
import { SelectField, TextField } from './fields';
import type {
  ReferenceFieldName,
  ReferenceFieldSpec,
  ReferenceFormValues,
  ReferencePanelProps,
  ReferenceSendInput,
} from './types';
import { issuesOf } from './values';

// The citation sub-form (MB.154): a new source written to this coven without
// leaving the ingredient form. Inline beneath the References field rather
// than a dialog, since M8.16 puts the whole form in a modal. It cannot be a
// <form> of its own, nested in the ingredient's, so it is a fieldset running
// its own react-hook-form, its fields the ingredient form's own, and Enter in
// one of them saves the source rather than the ingredient
// (claude-docs/components/ingredient-form.md, "The new reference panel").

export const CreateReferenceDocument = graphql(`
  mutation CreateReference($workspaceId: ID, $input: ReferenceInput!) {
    createReference(workspaceId: $workspaceId, input: $input) {
      id
      citation
      isGlobal
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
});
const container = (label: string, required: boolean, hint: string): ReferenceFieldSpec => ({
  name: 'container',
  label,
  required,
  hint: `${hint} ${ITALICS}`,
});
const AUTHORS: ReferenceFieldSpec = {
  name: 'authors',
  label: 'Authors',
  hint: 'As printed, the first name inverted: Shelley, Mary.',
};
const CONTRIBUTORS: ReferenceFieldSpec = {
  name: 'contributors',
  label: 'Contributors',
  hint: 'Translators and editors, as a sentence: Translated by Angela Hall.',
};
const EDITION: ReferenceFieldSpec = {
  name: 'edition',
  label: 'Edition',
  hint: 'As printed: 2nd ed.',
};
const VOLUMES: ReferenceFieldSpec = {
  name: 'volume',
  label: 'Volume',
  hint: 'As printed: Vol. 2, or 4 vols.',
};
const SERIES: ReferenceFieldSpec = { name: 'series', label: 'Series' };
const PLACE: ReferenceFieldSpec = {
  name: 'place',
  label: 'Place',
  hint: 'The city it was published in: London.',
};
const PUBLISHER: ReferenceFieldSpec = { name: 'publisher', label: 'Publisher' };
const published = (required = false): ReferenceFieldSpec => ({
  name: 'published',
  label: 'Published',
  required,
  hint: 'As precise as the source gives it: 1985, November 1950, 1882–88.',
});
const PAGES: ReferenceFieldSpec = { name: 'pages', label: 'Pages', hint: 'Its pages: 112–30.' };
const HOST: ReferenceFieldSpec = {
  name: 'host',
  label: 'Read Through',
  hint: 'The library or archive a printed work was read through online: Perseus Digital Library.',
};
const url = (required = false): ReferenceFieldSpec => ({
  name: 'url',
  label: 'Address',
  required,
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
    container('Book', true, 'The book this chapter is in.'),
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
    container('Journal', true, 'The journal this article is in.'),
    AUTHORS,
    { name: 'volume', label: 'Volume' },
    { name: 'issue', label: 'Issue' },
    published(),
    PAGES,
    ...ONLINE,
  ],
  entry: [
    title('Entry'),
    container('Reference Work', true, 'The encyclopedia or dictionary the entry is in.'),
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
    container('Site', false, 'The website it is on.'),
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

const validate = zodResolver(ReferenceInput, undefined, { raw: true });

/** The shared schema as the panel's resolver, over the values as `toReferenceInput` sends them. */
const referenceResolver: Resolver<ReferenceFormValues, unknown, ReferenceSendInput> = (
  values,
  context,
  options,
) => validate(toReferenceInput(values), context, options as never);

export default function ReferencePanel({
  workspaceId,
  summons,
  onSaved,
  onCancel,
}: ReferencePanelProps): ReactElement {
  const methods = useForm<ReferenceFormValues, unknown, ReferenceSendInput>({
    defaultValues: EMPTY_REFERENCE,
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
  const panel = useRef<HTMLFieldSetElement>(null);
  const legendId = useId();
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

  const mutation = useMutation({
    mutationFn: (input: ReferenceSendInput) =>
      graphqlRequest(CreateReferenceDocument, { workspaceId, input }),
  });

  const save = async (input: ReferenceSendInput): Promise<void> => {
    try {
      const { createReference } = await mutation.mutateAsync(input);
      onSaved(createReference);
    } catch (error) {
      // A field error beside the field it names, if this kind shows it;
      // anything else above the fields.
      const visible = shownFor(kind);
      const unplaced: string[] = [];
      for (const { path, message } of issuesOf(error)) {
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

  return (
    <FormProvider {...methods}>
      {/* A group, named by its legend, holding its own save: a save with
          nothing chosen asks for the kind first. Its keydown is the fields'
          Enter, heard as it bubbles, not a control of its own. */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <fieldset
        ref={panel}
        className="fieldset ingredient-form__panel"
        aria-labelledby={legendId}
        onKeyDown={onKeyDown}
      >
        <legend className="fieldset__legend" id={legendId}>
          New Reference
        </legend>
        {errors.root && (
          <p className="notice notice--error" role="alert">
            {errors.root.message}
          </p>
        )}
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
            Reference is off until something is entered, and Cancel is quiet,
            the owner's rules for every form (M5.6). */}
        <div className="form__actions">
          <button
            type="button"
            className="btn btn--solid"
            onClick={submit}
            disabled={!isDirty || isSubmitting}
            aria-busy={isSubmitting || undefined}
          >
            {isSubmitting && <span className="spinner" aria-hidden="true" />}
            {isSubmitting ? 'Saving Reference' : 'Save Reference'}
          </button>
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
