import type { Story } from '@ladle/react';
import {
  type ReactElement,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { type Control, FormProvider, useForm, useFormState, useWatch } from 'react-hook-form';
import type {
  DeitySuggestionsQuery,
  PickerCategoriesQuery,
  PlanetSuggestionsQuery,
  PossibleDuplicatesQuery,
  ZodiacSuggestionsQuery,
} from '../../../gql/graphql';
import { citationText } from '../../../lib/citation';
import { shortCitationText } from '../../../lib/short-citation';
import type { CitationFields } from '../../../lib/types';
import {
  NAMELESS_KIND,
  UNSETTLED_KIND,
} from '../../../modules/ingredients/schema/ingredient-enums';
import { ChevronIcon } from '../../Combobox/icons';
import { SelectField, TextField } from '../../Field';
import { CategoryField } from '../categories';
import { NameField, useDuplicateWarning } from '../duplicates';
import { ListField, MultiSelectField } from '../fields';
import { ELEMENT_OPTIONS, NOMENCLATURE_OPTIONS } from '../options';
import { ReferencesField } from '../references';
import { SubstituteForms } from '../substitute-forms';
import {
  LookupListField,
  useCommonNameSuggestions,
  useCompendiumSubstitutes,
  useDeitySuggestions,
  usePlanetSuggestions,
  useZodiacSuggestions,
} from '../suggestions';
import type { IngredientFormInput, IngredientFormValues, ListEntry } from '../types';
import { EMPTY_VALUES, EMPTY_VARIANT, compendiumResolver } from '../values';
import { VariantsField } from '../variants';
import '../index.scss';
import './proposals.scss';

// PROPOSAL, MB.115 (issue #572): the compendium ingredient form with each
// titled section a disclosure, folded to a one-line summary of what has been
// entered. Story-only, for the owner to look at before deciding: nothing in
// the app renders it, and the real form (../index.tsx) is untouched. The
// fields are the real ones, at their real places in the values, so they
// validate, err and focus as the form's do; only the layout around them, the
// summaries and Save (which validates and sends nothing) are drawn here. The
// real `Section` is not exported and has no open state, so its markup is
// copied below, a heading over a column of fields, with the toggle added.
//
// The toggle is a button inside the heading, with `aria-expanded` and
// `aria-controls`, rather than `<details>`/`<summary>`: a `<summary>` is a
// button, so a heading inside it stops being a heading a screen reader can
// move by; the open state has to be the form's, so Save can open a section
// holding an error in the same commit that draws it, which a `<details>`
// fights through its own `toggle` event; and it is the disclosure the variant
// cards already use. The fields stay in the page while closed, hidden, as a
// variant's do, so nothing typed is lost by folding a section.
//
// Sections are parted by a hairline rather than set on the card ground: the
// variant cards and reference rows inside already sit on the card ground,
// and a card inside a card reads as a nesting the form does not have.
//
// Decided by the owner: a new entry opens with every section expanded, so
// an empty form reads as the long form it is, and "Nothing yet" only ever
// shows on a section closed by hand.
//
// Open questions for the owner:
// 1. One section open at a time (an accordion), or several? A new entry
//    opening every section means several at least there. Drawn: several,
//    each opened and closed by itself; the variants stay one at a time.
// 2. Which open on an edit? Drawn: none, so the whole entry reads at a
//    glance and the admin opens the section the change is in.
// 3. Should Save open every section holding an error? Recommended yes, and
//    drawn so: a field hidden in a closed section cannot take the focus, so
//    without it the form's move to the first error goes nowhere. A section
//    closed again over an error keeps its flag.
// 4. How much a summary names: drawn, a list of one is named and two or more
//    counted ("Mercury", "2 colours"), categories always counted, the forms
//    always named; the description and safety notes their first words.
// 5. An "Open All" / "Close All" beside the first heading, for an admin who
//    wants the long form back? Not drawn.
// 6. The Variants heading's ⓘ sits in its fieldset's legend, hidden here with
//    the legend; built for real, it would move beside the disclosure's title.

export default {
  title: 'Forms / Ingredient / Proposal Collapsible Sections',
};

/** The form's sections, in page order. */
type SectionKey =
  'identity' | 'description' | 'correspondences' | 'relations' | 'safety' | 'sources' | 'variants';

/**
 * Which section an error's path lands in, by its first key, or a box's draft
 * by its list: `drafts.colors` is Correspondences'.
 */
const SECTION_OF: Record<string, SectionKey> = {
  name: 'identity',
  nomenclature: 'identity',
  canonicalName: 'identity',
  folkNames: 'identity',
  description: 'description',
  elements: 'correspondences',
  planets: 'correspondences',
  zodiacSigns: 'correspondences',
  colors: 'correspondences',
  deities: 'correspondences',
  categoryIds: 'relations',
  substitutes: 'relations',
  safetyNotes: 'safety',
  references: 'sources',
  referencePanelOpen: 'sources',
  variants: 'variants',
};

const SECTIONS: SectionKey[] = [
  'identity',
  'description',
  'correspondences',
  'relations',
  'safety',
  'sources',
  'variants',
];

/** The sections holding an error now. */
function erringSections(errors: object): Set<SectionKey> {
  const found = new Set<SectionKey>();
  for (const [key, value] of Object.entries(errors)) {
    if (key === 'drafts' && value && typeof value === 'object') {
      for (const list of Object.keys(value)) {
        const section = SECTION_OF[list];
        if (section) found.add(section);
      }
    } else if (SECTION_OF[key]) {
      found.add(SECTION_OF[key]);
    }
  }
  return found;
}

// ─── The summaries ──────────────────────────────────────────────────────────

const NOTHING = 'Nothing yet';

/** A list of one by its entry, of more by its count: "Mercury", "2 colours". */
function listPart(entries: readonly string[], many: string): string | null {
  if (entries.length === 0) return null;
  if (entries.length === 1) return entries[0];
  return `${entries.length} ${many}`;
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const texts = (entries: ListEntry[]) => entries.map((entry) => entry.value);
const capitalise = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);
const oneLine = (text: string) => text.trim().replace(/\s+/g, ' ');

/** Parts joined by a middle dot, each a string or a node (the formal name's italics). */
function joined(parts: ReactNode[]): ReactNode {
  const shown = parts.filter((part) => part !== null && part !== false && part !== '');
  if (shown.length === 0) return NOTHING;
  return shown.map((part, index) => (
    <span key={index}>
      {index > 0 && ' · '}
      {part}
    </span>
  ));
}

/** What each section's closed line says, from the values as they stand. */
function useSummaries(
  control: Control<IngredientFormValues, unknown, IngredientFormInput>,
): Record<SectionKey, ReactNode> {
  const values = useWatch({ control }) as IngredientFormValues;
  const kind = NOMENCLATURE_OPTIONS.find((option) => option.value === values.nomenclature)?.label;
  const formal = values.canonicalName.trim();
  const substitutes = values.substitutes.length;
  const categories = values.categoryIds.length;
  const relationsEmpty = substitutes === 0 && categories === 0;
  const forms = values.variants.map((variant) => variant.form.trim() || 'Unnamed form');
  return {
    identity: joined([
      values.name.trim(),
      kind,
      formal && <i key="formal">{formal}</i>,
      listPart(texts(values.folkNames), 'folk names'),
    ]),
    description: oneLine(values.description) || NOTHING,
    correspondences: joined([
      listPart(values.elements.map(capitalise), 'elements'),
      listPart(texts(values.planets), 'planets'),
      listPart(texts(values.zodiacSigns), 'zodiac signs'),
      listPart(texts(values.colors), 'colours'),
      listPart(texts(values.deities), 'deities'),
    ]),
    // Both always said once either is, since the pair is the section.
    relations: relationsEmpty
      ? NOTHING
      : joined([
          categories ? count(categories, 'category', 'categories') : 'No categories',
          substitutes === 1
            ? values.substitutes[0].value
            : substitutes
              ? count(substitutes, 'substitute', 'substitutes')
              : 'No substitutes',
        ]),
    safety: oneLine(values.safetyNotes) || NOTHING,
    sources: joined([
      listPart(
        values.references.map((row) => shortCitationText(row.link)),
        'references',
      ),
    ]),
    variants:
      forms.length === 0 ? NOTHING : `${count(forms.length, 'form', 'forms')}: ${forms.join(', ')}`,
  };
}

// ─── The disclosure ─────────────────────────────────────────────────────────

/**
 * One section as a disclosure: its heading the toggle, with the chevron at
 * the end; beneath it while closed, what has been entered, in one muted
 * line; and while it holds an error, a flag in the wax, open or closed.
 */
function Disclosure({
  title,
  summary,
  open,
  invalid,
  labelled = false,
  onToggle,
  children,
}: {
  title: string;
  summary: ReactNode;
  open: boolean;
  invalid: boolean;
  labelled?: boolean;
  onToggle: () => void;
  children: ReactNode;
}): ReactElement {
  const id = useId();
  const summaryId = `${id}-summary`;
  const flagId = `${id}-flag`;
  const fieldsId = `${id}-fields`;
  return (
    <section
      className={['ingredient-proposal__section', open && 'is-open', invalid && 'is-invalid']
        .filter(Boolean)
        .join(' ')}
    >
      <div className="ingredient-proposal__head">
        <h3 className="ingredient-form__section-title ingredient-proposal__title">
          <button
            type="button"
            className="ingredient-proposal__toggle"
            aria-expanded={open}
            aria-controls={fieldsId}
            aria-describedby={
              [!open && summaryId, invalid && flagId].filter(Boolean).join(' ') || undefined
            }
            onClick={onToggle}
          >
            <span>{title}</span>
            <span className="ingredient-proposal__chevron">
              <ChevronIcon />
            </span>
          </button>
        </h3>
        <p id={summaryId} className="ingredient-proposal__summary" hidden={open}>
          {summary}
        </p>
        {invalid && (
          <p id={flagId} className="ingredient-proposal__flag">
            Has an error to fix
          </p>
        )}
      </div>
      <div
        id={fieldsId}
        className={[
          'ingredient-form__section',
          'ingredient-proposal__fields',
          labelled && 'is-labelled',
        ]
          .filter(Boolean)
          .join(' ')}
        hidden={!open}
      >
        {children}
      </div>
    </section>
  );
}

// ─── The form ───────────────────────────────────────────────────────────────

interface ProposalProps {
  /** The entry an edit opens; absent, a new one. */
  entry?: IngredientFormValues;
  /** The sections open as the form is drawn. */
  initiallyOpen?: SectionKey[];
}

/** The compendium's ingredient form, laid out as collapsible sections. */
function CollapsibleIngredientForm({ entry, initiallyOpen = [] }: ProposalProps): ReactElement {
  const methods = useForm<IngredientFormValues, unknown, IngredientFormInput>({
    defaultValues: entry ?? EMPTY_VALUES,
    resolver: compendiumResolver,
    shouldFocusError: false,
  });
  const { control, handleSubmit, setValue } = methods;
  const { errors, submitCount } = useFormState({ control });
  const form = useRef<HTMLFormElement>(null);
  const createAnyway = useRef<HTMLButtonElement>(null);
  const duplicates = useDuplicateWarning(
    null,
    useWatch({ control, name: 'name' }),
    undefined,
    methods.formState.defaultValues?.name,
  );
  const kind = useWatch({ control, name: 'nomenclature' });

  const [open, setOpen] = useState<ReadonlySet<SectionKey>>(new Set(initiallyOpen));
  const toggle = (key: SectionKey) =>
    setOpen((now) => {
      const next = new Set(now);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const erring = erringSections(errors);
  // Save opens every section holding an error, set while rendering so the
  // section is open in the very commit that draws the error, which is when
  // the focus below moves to it, as the variants' Save does.
  const [seenSubmit, setSeenSubmit] = useState(submitCount);
  if (seenSubmit !== submitCount) {
    setSeenSubmit(submitCount);
    if ([...erring].some((key) => !open.has(key))) setOpen(new Set([...open, ...erring]));
  }
  useLayoutEffect(() => {
    if (submitCount > 0) form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [submitCount]);

  // The proposal's Save validates and sends nothing.
  const save = handleSubmit(() => undefined);

  const summaries = useSummaries(control);
  const section = (key: SectionKey) => ({
    summary: summaries[key],
    open: open.has(key),
    invalid: erring.has(key),
    onToggle: () => toggle(key),
  });

  return (
    <FormProvider {...methods}>
      <form
        ref={form}
        className="form ingredient-form ingredient-proposal"
        onSubmit={(event) => void save(event)}
        noValidate
      >
        <Disclosure title="Identity" {...section('identity')}>
          <NameField warning={duplicates} ref={createAnyway} />
          <SelectField<IngredientFormValues>
            name="nomenclature"
            label="Classification"
            hint='Botanical for a plant, mineral for a stone, and so on. "Unknown" if you are not sure which, with or without a formal name. "None" takes no formal name.'
            placeholder="Choose a classification"
            options={NOMENCLATURE_OPTIONS}
            required
            deps={['canonicalName']}
            onChange={(value) => {
              if (value === NAMELESS_KIND) setValue('canonicalName', '');
            }}
          />
          <TextField<IngredientFormValues>
            name="canonicalName"
            label="Formal Name"
            hint="Its name in the classification's own system: Lavandula angustifolia, Quartz var. amethyst, Sodium chloride."
            placeholder="Add formal name"
            note={kind === NAMELESS_KIND ? 'A "none" entry records no formal name.' : undefined}
            disabled={kind === NAMELESS_KIND}
            required={kind !== '' && kind !== NAMELESS_KIND && kind !== UNSETTLED_KIND}
          />
          <LookupListField
            workspaceId={null}
            useSuggestions={useCommonNameSuggestions}
            name="folkNames"
            legend="Folk Names"
            entry="Folk Name"
            hint="Other names it goes by. A search finds it by any of them."
            placeholder="Add a folk name"
          />
        </Disclosure>
        <Disclosure title="Description" labelled {...section('description')}>
          <TextField<IngredientFormValues>
            name="description"
            label="Description"
            placeholder="What it is, where it comes from and how it is used"
            multiline
            rows={10}
          />
        </Disclosure>
        <Disclosure title="Correspondences" {...section('correspondences')}>
          <MultiSelectField
            name="elements"
            label="Element"
            placeholder="Add an element"
            options={ELEMENT_OPTIONS}
          />
          <LookupListField
            workspaceId={null}
            useSuggestions={usePlanetSuggestions}
            name="planets"
            ordered
            pickOnly
            legend="Planets"
            entry="Planet"
            hint="The heavenly bodies it answers to: the planets, the Sun and the Moon."
            placeholder="Add a planet"
          />
          <LookupListField
            workspaceId={null}
            useSuggestions={useZodiacSuggestions}
            name="zodiacSigns"
            ordered
            pickOnly
            legend="Zodiac Signs"
            entry="Zodiac Sign"
            hint="The signs it answers to."
            placeholder="Add a sign"
          />
          <ListField
            name="colors"
            ordered
            legend="Colours"
            entry="Colour"
            hint="The colours it corresponds to in a working, not the colour it is."
            placeholder="Add a colour"
          />
          <LookupListField
            workspaceId={null}
            useSuggestions={useDeitySuggestions}
            name="deities"
            ordered
            pickOnly
            legend="Deities"
            entry="Deity"
            hint="The gods and spirits it is sacred to."
            placeholder="Add a deity"
          />
        </Disclosure>
        <Disclosure title="Relations" {...section('relations')}>
          <CategoryField />
          <LookupListField
            workspaceId={null}
            useSuggestions={useCompendiumSubstitutes}
            name="substitutes"
            legend="Substitute Ingredients"
            entry="Substitute Ingredient"
            hint="Other ingredients to use in its place when this one is not to hand."
            placeholder="Add a substitute"
          />
          <SubstituteForms name="substitutes" />
        </Disclosure>
        <Disclosure title="Safety" labelled {...section('safety')}>
          <TextField<IngredientFormValues>
            name="safetyNotes"
            label="Safety Notes"
            hint="Toxicity, allergies, and anything to take care over when handling or burning it."
            placeholder="Add safety notes"
            multiline
          />
        </Disclosure>
        <Disclosure title="Sources" {...section('sources')}>
          <ReferencesField workspaceId={null} />
        </Disclosure>
        <Disclosure title="Variants" {...section('variants')}>
          <VariantsField workspaceId={null} />
        </Disclosure>
        <div className="form__actions ingredient-proposal__actions">
          {/* Never off, unlike the real form's: here it only validates. */}
          <button type="submit" className="btn btn--solid">
            Save Ingredient
          </button>
          <button type="button" className="btn btn--quiet">
            Cancel
          </button>
          {entry && (
            <button type="button" className="btn btn--destructive form__aside">
              Delete Ingredient
            </button>
          )}
        </div>
      </form>
    </FormProvider>
  );
}

// ─── The workshop's stand-in API ────────────────────────────────────────────

// Invented rows, as the form's own stories use: the picker's categories, so a
// picked one draws as its chip, and the curated vocabularies a focused box
// lists. Everything else the form asks goes unanswered, which its lookups
// take as nothing found.
const CATEGORIES = [
  ['Protection & Defense', '#5d8ab1', '#286ba6', ['Testward', 'Fixture Shield']],
  ['Cleansing & Release', '#50a58e', '#1d755d', ['Rinse Trial', 'Mock Release']],
  ['Mind & Spirit', '#8e7bd1', '#6e4ce6', ['Test Sight', 'Stub Dream']],
].flatMap(([name, colorDark, colorLight, categories], group) =>
  (categories as string[]).map((category, index) => ({
    id: `00000000-0000-4000-8000-0000000006${group}${index}`,
    name: category,
    description: `An invented category under ${name as string}.`,
    group: {
      id: `00000000-0000-4000-8000-00000000050${group}`,
      name: name as string,
      colorDark: colorDark as string,
      colorLight: colorLight as string,
    },
  })),
);

const curated = (values: string[]) =>
  values.map((value) => ({ value, description: null, curated: true }));
const PLANETS = curated(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']);
const SIGNS = curated(['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo']);

const page = <N,>(nodes: N[]) => ({ edges: nodes.map((node) => ({ node })) });

function answer(operation: string, variables: Record<string, unknown>): object | undefined {
  const query = String(variables.query ?? '').toLowerCase();
  const matching = <R extends { value: string }>(rows: R[]) =>
    rows.filter((row) => row.value.toLowerCase().includes(query));
  switch (operation) {
    case 'PickerCategories':
      return { categories: page(CATEGORIES) } satisfies PickerCategoriesQuery;
    case 'PlanetSuggestions':
      return { planetSuggestions: page(matching(PLANETS)) } satisfies PlanetSuggestionsQuery;
    case 'ZodiacSuggestions':
      return { zodiacSuggestions: page(matching(SIGNS)) } satisfies ZodiacSuggestionsQuery;
    case 'DeitySuggestions':
      return { deitySuggestions: page([]) } satisfies DeitySuggestionsQuery;
    case 'PossibleDuplicates':
      return { possibleDuplicates: page([]) } satisfies PossibleDuplicatesQuery;
    default:
      return undefined;
  }
}

/** Answers the lookups above in place of `window.fetch` while the story is mounted. */
function useCannedApi(): void {
  useLayoutEffect(() => {
    const original = window.fetch;
    window.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href);
      if (url.pathname === '/api/graphql' && typeof init?.body === 'string') {
        const { operationName, variables = {} } = JSON.parse(init.body) as {
          operationName?: string;
          variables?: Record<string, unknown>;
        };
        const data = operationName ? answer(operationName, variables) : undefined;
        if (data) {
          return new Response(JSON.stringify({ data }), {
            headers: { 'content-type': 'application/json' },
          });
        }
      }
      return original(input, init);
    };
    return () => {
      window.fetch = original;
    };
  }, []);
}

// ─── The entry ──────────────────────────────────────────────────────────────

const source = (id: string, fields: CitationFields) => ({
  value: citationText(fields),
  link: {
    id,
    isGlobal: true,
    kind: fields.kind,
    authors: fields.authors ?? null,
    title: fields.title,
    container: fields.container ?? null,
  },
  locator: '',
});

/** An invented entry with something in every section but its substitutes. */
const ENTRY: IngredientFormValues = {
  ...EMPTY_VALUES,
  name: 'Testwort',
  nomenclature: 'botanical',
  canonicalName: 'Fixtura testalis',
  folkNames: [{ value: 'Hedge Fixture' }, { value: 'Fixture Bane' }],
  description:
    'A fixture herb, for the workshop: its leaves dried for sachets and its root shaved for washes, gathered at the waning moon and kept in a dark jar until it is needed.',
  elements: ['air'],
  planets: [{ value: 'Mercury' }],
  colors: [{ value: 'Green' }, { value: 'Silver' }],
  categoryIds: [CATEGORIES[0].id],
  safetyNotes: 'Keep the root shavings from children and pets; dry the leaves away from damp.',
  references: [
    {
      ...source('00000000-0000-4000-8000-000000000701', {
        kind: 'book',
        authors: 'Fixture, Ada',
        title: 'The Testwort Herbal',
        place: 'Mockford',
        publisher: 'Fixture Press',
        published: '1901',
      }),
      locator: 'p. 112',
    },
    source('00000000-0000-4000-8000-000000000702', {
      kind: 'web_page',
      title: 'Testwort',
      container: 'Fixture Wiki',
      url: 'https://fixture-wiki.example/wiki/Testwort',
      accessed: '2026-10-06',
    }),
  ],
  variants: [
    {
      ...EMPTY_VARIANT,
      variantId: '00000000-0000-4000-8000-000000000311',
      form: 'Dried leaf',
      formLink: {
        id: '00000000-0000-4000-8000-000000000103',
        name: 'Dried leaf',
        group: 'Plant part',
        description: null,
      },
      safetyNotes: 'Dry away from damp.',
    },
    {
      ...EMPTY_VARIANT,
      variantId: '00000000-0000-4000-8000-000000000312',
      form: 'Whole root',
      formLink: {
        id: '00000000-0000-4000-8000-000000000104',
        name: 'Whole root',
        group: 'Plant part',
        description: null,
      },
    },
  ],
};

/**
 * The entry with a substitute's name left typed in its box and never added,
 * which a save refuses beside the box: the error is Relations'.
 */
const ENTRY_WITH_ERROR: IngredientFormValues = {
  ...ENTRY,
  drafts: { ...ENTRY.drafts, substitutes: 'Mockleaf' },
};

// ─── The stories ────────────────────────────────────────────────────────────

/** An edit with every section folded: the whole entry at a glance. */
export const ProposalAllClosed: Story = () => {
  useCannedApi();
  return <CollapsibleIngredientForm entry={ENTRY} />;
};

/** The same entry with Correspondences open, the rest summarised. */
export const ProposalOneOpen: Story = () => {
  useCannedApi();
  return <CollapsibleIngredientForm entry={ENTRY} initiallyOpen={['correspondences']} />;
};

/** A new entry: every section open, the owner's call; each folds to "Nothing yet". */
export const ProposalNewEntry: Story = () => {
  useCannedApi();
  return <CollapsibleIngredientForm initiallyOpen={SECTIONS} />;
};

/**
 * Save pressed with an error in a closed section: Relations opens on it, its
 * flag beneath the heading, and the box in error takes the focus.
 */
export const ProposalWithError: Story = () => {
  useCannedApi();
  // Pressed once it is drawn, as a person would press it.
  useEffect(() => {
    document
      .querySelector<HTMLButtonElement>('.ingredient-proposal button[type="submit"]')
      ?.click();
  }, []);
  return <CollapsibleIngredientForm entry={ENTRY_WITH_ERROR} />;
};

// Each at a phone's width, in each theme.
export const ProposalAllClosedPhoneDark: Story = () => <ProposalAllClosed />;
ProposalAllClosedPhoneDark.meta = { theme: 'dark', width: 375 };
export const ProposalAllClosedPhoneLight: Story = () => <ProposalAllClosed />;
ProposalAllClosedPhoneLight.meta = { theme: 'light', width: 375 };

export const ProposalOneOpenPhoneDark: Story = () => <ProposalOneOpen />;
ProposalOneOpenPhoneDark.meta = { theme: 'dark', width: 375 };
export const ProposalOneOpenPhoneLight: Story = () => <ProposalOneOpen />;
ProposalOneOpenPhoneLight.meta = { theme: 'light', width: 375 };

export const ProposalNewEntryPhoneDark: Story = () => <ProposalNewEntry />;
ProposalNewEntryPhoneDark.meta = { theme: 'dark', width: 375 };
export const ProposalNewEntryPhoneLight: Story = () => <ProposalNewEntry />;
ProposalNewEntryPhoneLight.meta = { theme: 'light', width: 375 };

export const ProposalWithErrorPhoneDark: Story = () => <ProposalWithError />;
ProposalWithErrorPhoneDark.meta = { theme: 'dark', width: 375 };
export const ProposalWithErrorPhoneLight: Story = () => <ProposalWithError />;
ProposalWithErrorPhoneLight.meta = { theme: 'light', width: 375 };
