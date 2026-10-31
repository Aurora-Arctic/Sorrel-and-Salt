'use client';

import { useMutation } from '@tanstack/react-query';
import { type ReactElement, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useFocusFirstInvalid, useOnEachSubmit } from './on-submit';
import { createPortal, flushSync } from 'react-dom';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { graphql } from '../../gql';
import type {
  CompendiumIngredientInput,
  CompendiumIngredientUpdateInput,
  IngredientUpdateInput,
} from '../../gql/graphql';
import { graphqlRequest } from '../../lib/graphql-client';
import { placeServerIssues, readGraphqlFailure } from '../../lib/graphql-failure';
import BusyButton from '../BusyButton';
import { BinButton } from '../IconTip';
import { ConfirmQuestion, useModalHeaderNote } from '../Modal';
import {
  type MirrorEntry,
  type SaveContext,
  type SaveResult,
  clearMirror,
  mirrorKey,
  readMirror,
  useAutosave,
} from '../../lib/autosave';
import { GraphQLClientError, StaleWriteError } from '../../lib/graphql-client-error';
import { useViewerId } from '../../lib/viewer-id';
import SaveStatus, { RecoveryNotice } from '../SaveStatus';
import { useSaveOnClose } from '../SpellBuilder/save-on-close';
import { PanelChangesContext, usePanelChanges } from './panel-changes';
import {
  PromoteFolkNameQuestion,
  usePromoteFolkName,
  type PromotedIngredient,
  type PromotedName,
} from './promote';
import { PromoteIcon } from './icons';
import { DeleteUsers } from './delete-users';
import Notice from '../Notice';
import { SetCompendiumEntryReviewedDocument } from '../IngredientEntry/review-mark';
import { COMPENDIUM_EDIT_NOTICE } from './compendium-notice';
import { NAMELESS_KIND, UNSETTLED_KIND } from '@/modules/ingredients/schema/ingredient-enums';
import { CategoryField } from './categories';
import { NameField, useDuplicateWarning } from './duplicates';
import { ReferencesField } from './references';
import { CollapsibleSection, FoldAll } from '../CollapsibleSection';
import type { SectionFold } from '../CollapsibleSection/types';
import { SectionSummary } from './summaries';
import { SubstituteForms } from './substitute-forms';
import { EntryHrefContext } from './substitute-summary';
import {
  FormActions,
  FormHistoryButtons,
  FormHistoryContext,
  SelectField,
  TextField,
  EditedFieldsContext,
  errorShown,
  useEditedFields,
  useFormHistory,
  useSettledWhilePressed,
} from '../Field';
import { ListField, MultiSelectField, ToggleField } from './fields';
import { ELEMENT_OPTIONS, NOMENCLATURE_OPTIONS } from './options';
import {
  LookupListField,
  useCommonNameSuggestions,
  useCompendiumSubstitutes,
  useDeitySuggestions,
  useCelestialBodySuggestions,
  useSubstituteSuggestions,
  useZodiacSuggestions,
} from './suggestions';
import type {
  AfterSave,
  Duplicate,
  IngredientFormInput,
  IngredientFormProps,
  IngredientFormValues,
  IngredientSend,
  RedirectQuestion,
  RestoredVariant,
  SavedIngredient,
  SectionKey,
} from './types';
import {
  EMPTY_VALUES,
  SECTION_KEYS,
  compendiumResolver,
  fieldNameOf,
  heldBack,
  ingredientResolver,
  openingValues,
  toInput,
  listBoxOf,
  sectionsRestored,
  sectionsWithErrors,
  variantsWithErrors,
} from './values';
import { VariantsField, useVariantFolds } from './variants';
import './index.scss';
import ReviewRow from '../IngredientEntry/review-row';
import ShownToggle, { SetCompendiumEntryShownDocument } from '../IngredientEntry/shown-toggle';

// Every property of an ingredient, validated by the shared schema before the mutation is sent and by
// the service after; an error lands beside the field its path names, or above them all. A coven's
// ingredient or a compendium entry, new or edited (claude-docs/components/ingredient-form.md).

const CreateWorkspaceIngredientDocument = graphql(`
  mutation CreateWorkspaceIngredient($workspaceId: ID!, $input: IngredientInput!) {
    createWorkspaceIngredient(workspaceId: $workspaceId, input: $input) {
      id
      name
      slug
      revision
      stock(workspaceId: $workspaceId) {
        quantityOnHand
        unit
        variant {
          form
        }
      }
    }
  }
`);

// A coven's own entry saved over. The update takes every field and reads back what the create does
// but the jars.
const UpdateWorkspaceIngredientDocument = graphql(`
  mutation UpdateWorkspaceIngredient(
    $workspaceId: ID!
    $id: ID!
    $input: IngredientUpdateInput!
    $expectedRevision: Int
  ) {
    updateIngredient(
      workspaceId: $workspaceId
      id: $id
      input: $input
      expectedRevision: $expectedRevision
    ) {
      id
      name
      slug
      revision
    }
  }
`);

// A match's +: the compendium entry goes into the cupboard, no jar with it.
const AddCupboardEntryDocument = graphql(`
  mutation AddCupboardEntryFromForm(
    $workspaceId: ID!
    $ingredientId: ID!
    $input: CupboardEntryInput
  ) {
    addCupboardEntry(workspaceId: $workspaceId, ingredientId: $ingredientId, input: $input) {
      id
    }
  }
`);

const CreateCompendiumIngredientDocument = graphql(`
  mutation CreateCompendiumIngredient($input: CompendiumIngredientInput!, $endRedirect: Boolean) {
    createCompendiumIngredient(input: $input, endRedirect: $endRedirect) {
      id
      name
      slug
      revision
    }
  }
`);

const UpdateCompendiumIngredientDocument = graphql(`
  mutation UpdateCompendiumIngredient(
    $id: ID!
    $input: CompendiumIngredientUpdateInput!
    $endRedirect: Boolean
    $expectedRevision: Int
  ) {
    updateCompendiumIngredient(
      id: $id
      input: $input
      endRedirect: $endRedirect
      expectedRevision: $expectedRevision
    ) {
      id
      name
      slug
      revision
    }
  }
`);

const DeleteCompendiumIngredientDocument = graphql(`
  mutation DeleteCompendiumIngredient($id: ID!) {
    deleteCompendiumIngredient(id: $id)
  }
`);

// A coven's own entry is deleted from its edit dialog too: from this coven alone, a spell holding
// it still reaching it.
const DeleteWorkspaceIngredientDocument = graphql(`
  mutation DeleteWorkspaceIngredient($id: ID!, $workspaceId: ID!) {
    deleteIngredient(id: $id, workspaceId: $workspaceId)
  }
`);

/** Keys pressed inside a reference panel are its own history's. */
const inReferencePanel = (target: HTMLElement): boolean =>
  target.closest('.ingredient-form__panel') !== null;

/** A panel opening or closing is interface state among the values, not an edit to undo. */
const isPanelState = (name: string): boolean => /(^|\.)referencePanelOpen$/.test(name);

/** The error path of the refusal when a write would end another entry's redirect. */
const END_REDIRECT = 'endRedirect';

const FIX_FIELDS = 'Some fields need fixing before this can be saved.';

/** What the autosave throws when the form is not yet fit to save: the fields say why. */
const fieldsRefused = (): GraphQLClientError =>
  new GraphQLClientError({
    status: 400,
    errors: [{ message: FIX_FIELDS, extensions: { code: 'VALIDATION' } }],
  });

/** What the autosave sends and the mirror keeps: the form's values and the review switch. */
interface AutosaveValue {
  fields: IngredientFormValues;
  reviewed: boolean;
  shown: boolean;
}

const IngredientForm = ({
  workspaceId,
  workspaceName,
  entry,
  onSaved,
  onDeleted,
  duplicateHref,
  quickLookOf,
  entryHref,
  mayPromote = false,
  review,
  onCreated,
  onAutosaved,
  onReload,
}: IngredientFormProps): ReactElement => {
  // A null coven is the compendium: the classification answered, the
  // vocabulary boxes picked from the curated rows, and every lookup asking
  // about the compendium alone.
  const compendium = workspaceId === null;
  const methods = useForm<IngredientFormValues, unknown, IngredientFormInput>({
    defaultValues: entry ? openingValues(entry.values) : EMPTY_VALUES,
    resolver: compendium ? compendiumResolver : ingredientResolver,
    // react-hook-form focuses in registration order and only a registered
    // field; a list entry is neither, so the effect below does it instead.
    shouldFocusError: false,
    // A field is checked when it is first left, and on every change after, so
    // an untouched one stays quiet until submit. Not the default (submit, then
    // change): the error appears beside the field as the person moves on.
    mode: 'onTouched',
    reValidateMode: 'onChange',
  });
  const {
    control,
    handleSubmit,
    getValues,
    setError,
    setValue,
    reset,
    formState: { errors, isSubmitting, isDirty, submitCount, isSubmitted, touchedFields },
  } = methods;
  // Which errors are drawn, the fields' one rule, so a section is flagged
  // only for an error a field in it shows.
  const { edited, clear: clearEdited } = useEditedFields(methods.subscribe);
  const shown = (path: string) => errorShown({ isSubmitted, touchedFields, edited }, path);
  const form = useRef<HTMLFormElement>(null);
  // The ingredient this form writes to: the one it opened with, or the one its first save made. The
  // ref is what a save reads as it starts; the state redraws what hangs on the id.
  const [createdId, setCreatedId] = useState<string | null>(null);
  const savedId = createdId ?? entry?.id ?? null;
  const savedIdRef = useRef<string | null>(entry?.id ?? null);
  // The revision the server last answered with, which the next save is written against.
  const revisionRef = useRef<number | null>(entry?.revision ?? null);
  const createAnyway = useRef<HTMLButtonElement>(null);
  const duplicates = useDuplicateWarning(
    workspaceId,
    useWatch({ control, name: 'name' }),
    savedId ?? undefined,
    // The name the form holds as saved: an edit's, and a save's reset moves it on.
    methods.formState.defaultValues?.name,
  );
  const { blocking } = duplicates;
  const kind = useWatch({ control, name: 'nomenclature' });
  // An edit saves over the entry, and opens nothing new; a new entry offers
  // both saves.
  const editing = entry !== undefined;

  // Which of the six sections are open, each by its own heading: a new entry opens with every one
  // open, an edit with every one closed, read at a glance from the summary lines.
  const [open, setOpen] = useState<ReadonlySet<SectionKey>>(
    () => new Set(editing ? [] : SECTION_KEYS),
  );
  // Each variant's own sections, which fold the same way: one added
  // here opens with every one open, one an edit opened with, every one closed.
  const variantFolds = useVariantFolds();
  // Standing still through a press, as the fields' errors do.
  const erring = useSettledWhilePressed(sectionsWithErrors(errors, shown));
  // A save held on the duplicate warning is the name's to answer.
  if (blocking) erring.add('identity');
  // A save that finds an error in a closed section opens it, every such
  // section, flagged, so the focus on the first field marked invalid (below)
  // can reach it.
  useOnEachSubmit(submitCount, () => {
    if ([...erring].some((key) => !open.has(key))) setOpen(new Set([...open, ...erring]));
    // A variant's too, inside it: the Variants section opens the card.
    variantFolds.openErring(variantsWithErrors(errors, shown));
    // The card of the first variant holding any error opens, unless the one
    // open errs too, so the focus on the first field marked invalid can reach it.
    const first = Object.keys(errors.variants ?? {})
      .map(Number)
      .filter(Number.isInteger)
      .sort((a, b) => a - b)[0];
    if (first !== undefined)
      variantFolds.setCard((now) => (now !== null && errors.variants?.[now] ? now : first));
  });
  const fold = (key: SectionKey): SectionFold => ({
    open: open.has(key),
    invalid: erring.has(key),
    onToggle: () =>
      setOpen((now) => {
        const next = new Set(now);
        if (!next.delete(key)) next.add(key);
        return next;
      }),
  });
  // The first field marked invalid, in page order, takes the focus once a
  // save's errors are all drawn.
  useFocusFirstInvalid(form, submitCount);
  // A save held on the duplicate warning focuses its button rather than the
  // name it marks, which needs no change, only an answer. After the effect
  // above, so it wins when both run, and again on each held save.
  useLayoutEffect(() => {
    if (blocking) createAnyway.current?.focus();
  }, [blocking, submitCount]);

  // Save & Add Another empties every field and list once the save has landed, and the name takes
  // the focus. It runs in an effect, counted here, not read off `isSubmitSuccessful`
  // (claude-docs/components/ingredient-form.md, "Save & Add Another and the toolbar").
  const [saves, setSaves] = useState(0);
  // What the last save wrote, said above the fields where a refusal would be,
  // so the cleared form is not the only sign it landed. A new save drops it.
  const [saved, setSaved] = useState<string | null>(null);
  // Which save was pressed: read by `save` from a ref, since the submit
  // handler passes the input alone, and drawn from state as the busy button.
  const next = useRef<AfterSave>('open');
  const [pressed, setPressed] = useState<AfterSave>('open');
  const busy = (button: AfterSave): boolean => isSubmitting && pressed === button;
  // The end-redirect question while it waits for an answer: the save is kept, and End
  // Redirect & Save sends it again, confirmed.
  const [question, setQuestion] = useState<RedirectQuestion | null>(null);
  // The delete's own confirmation, and why a delete was refused.
  const [deleting, setDeleting] = useState(false);
  const [refusal, setRefusal] = useState<string>();
  // The folk name whose promotion is being asked about, if any.
  const [promoting, setPromoting] = useState<PromotedName | null>(null);
  // Whether the last save sent through `handleSubmit(save)` landed: Save and
  // Promote promotes only if it did.
  const landed = useRef(false);
  // A reference panel's own edits, which `isDirty` never sees: the promotion question counts them as
  // changes to save or discard first.
  const panels = usePanelChanges();
  // The Reviewed switch lives beside react-hook-form's values, not in the entry's input, and is
  // saved on its own once the entry is. A flip still counts as a change: Save enables, and closing saves it.
  const [reviewed, setReviewed] = useState(review?.reviewed ?? false);
  const [reviewedSaved, setReviewedSaved] = useState(review?.reviewed ?? false);
  const reviewChanged = compendium && review !== undefined && reviewed !== reviewedSaved;
  // The Shown in Compendium switch is the same kind of field. An edit starts from the saved flag; an add
  // follows its categories (none on the entry or its forms: hidden) until the curator flips it, and
  // from then on their choice stands. A new row is written shown, so an add only writes a hidden one.
  const watchedValues = useWatch({ control }) as IngredientFormValues;
  const [shownChoice, setShownChoice] = useState<boolean | undefined>();
  const [shownSaved, setShownSaved] = useState(review?.shown ?? true);
  const hasCategories = (list: { categoryIds: string[]; variants: { categoryIds: string[] }[] }) =>
    list.categoryIds.length > 0 || list.variants.some((variant) => variant.categoryIds.length > 0);
  const shownField = compendium && review !== undefined;
  const shownNow =
    shownChoice ?? (review?.shown !== undefined ? shownSaved : hasCategories(watchedValues));
  const shownChanged =
    shownField &&
    (review?.shown !== undefined || shownChoice !== undefined) &&
    shownNow !== shownSaved;
  const changed = isDirty || reviewChanged || shownChanged;

  // Open All / Close All: Close All while any section is open, and it reaches every variant's
  // sections too. Off while the form asks a question over itself, as Undo and Redo are then
  // (claude-docs/components/ingredient-form.md, "Save & Add Another and the toolbar").
  const anyOpen = open.size > 0;
  const headerNote = useModalHeaderNote();
  const compendiumNotice = <Notice kind="plain">{COMPENDIUM_EDIT_NOTICE}</Notice>;
  const foldAll = (
    <FoldAll
      anyOpen={anyOpen}
      disabled={deleting || question !== null}
      onToggle={() => {
        setOpen(new Set(anyOpen ? [] : SECTION_KEYS));
        variantFolds.setAll(!anyOpen, getValues('variants').length);
      }}
    />
  );

  // Undo and redo, off while a save is in flight or a question is up over the form. A restore opens
  // whatever folds around the field it wrote, and a classification pick is one step with the formal
  // name it emptied, so focus is named rather than left to the first of the two.
  const history = useFormHistory(methods, {
    root: form,
    enabled: !deleting && question === null && !isSubmitting,
    ignore: inReferencePanel,
    skip: isPanelState,
    onRestored: (names, diffs, direction) => {
      const { sections, variants } = sectionsRestored(names);
      if (sections.size > 0) setOpen((now) => new Set([...now, ...sections]));
      const list = diffs.find((diff) => diff.name === 'variants');
      let returned = -1;
      if (list) {
        // The folds are keyed to the list as it stood: the step's other side.
        const [from, to] =
          direction === 'undo' ? [list.after, list.before] : [list.before, list.after];
        returned = variantFolds.reconcile(from as RestoredVariant[], to as RestoredVariant[]);
      }
      for (const [index, inside] of variants) variantFolds.reveal(index, inside);
      if (names.includes('nomenclature')) return 'nomenclature';
      // A variant brought back is where the eye should go; with one only taken
      // out, the New Form box that adds one.
      if (list && returned !== -1) return `variants.${returned}.form`;
      if (list && (list.before as unknown[]).length !== (list.after as unknown[]).length)
        return 'drafts.variants';
      // A list's entries are not inputs: its typing box is where its change shows.
      return listBoxOf(names[0]);
    },
  });
  const { clear: clearHistory } = history;
  // The form starts over after its own save: what came before no longer
  // leads anywhere.
  useEffect(() => {
    if (saves === 0) return;
    reset(EMPTY_VALUES);
    clearEdited();
    clearHistory();
    form.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
  }, [saves, reset, clearHistory, clearEdited]);

  /** Writes to the saved ingredient, or creates it, against the revision last answered. */
  const send = async ({
    input,
    endRedirect,
    revision,
  }: IngredientSend): Promise<SavedIngredient & { revision?: number | null }> => {
    const id = savedIdRef.current;
    const expectedRevision = revision ?? revisionRef.current ?? undefined;
    if (workspaceId !== null && id) {
      // A saved entry always holds a classification, and the select offers no
      // way back to none, so the whole input the update needs is what is sent.
      const answer = await graphqlRequest(UpdateWorkspaceIngredientDocument, {
        workspaceId,
        id,
        input: input as IngredientUpdateInput,
        expectedRevision,
      });
      return answer.updateIngredient;
    }
    if (workspaceId !== null) {
      const answer = await graphqlRequest(CreateWorkspaceIngredientDocument, {
        workspaceId,
        input,
      });
      return answer.createWorkspaceIngredient;
    }
    // The compendium resolver has refused a missing classification, so the
    // input is the compendium's, whose `nomenclature` is required.
    if (id) {
      // The update takes the whole entry, every field present, which the form's input always is.
      const answer = await graphqlRequest(UpdateCompendiumIngredientDocument, {
        id,
        input: input as CompendiumIngredientUpdateInput,
        endRedirect,
        expectedRevision,
      });
      return answer.updateCompendiumIngredient;
    }
    const answer = await graphqlRequest(CreateCompendiumIngredientDocument, {
      input: input as CompendiumIngredientInput,
      endRedirect,
    });
    return answer.createCompendiumIngredient;
  };

  // Writes go one at a time, each reading the id and revision the one before answered: Save's press
  // and the autosave's flush as the button goes busy would otherwise both create the entry.
  const writes = useRef<Promise<unknown>>(Promise.resolve());
  // True from Save's press to its answer. The press disables Save, which blurs it with nothing
  // focused next, and the autosave's flush on leaving the form would write before Save has asked
  // its questions (a name the compendium bears) and so could create the entry unasked.
  const submitting = useRef(false);
  useEffect(() => {
    const node = form.current;
    if (!node) return;
    const hold = (event: FocusEvent) => {
      if (submitting.current) event.stopPropagation();
    };
    // Capture, so it runs before the autosave's own listener on this element.
    node.addEventListener('focusout', hold, true);
    return () => node.removeEventListener('focusout', hold, true);
  }, []);
  const createdByWrite = useRef(false);
  // What the last write sent, so a write queued behind it with the same input has nothing to add.
  const lastSent = useRef<{
    input: string;
    answer: SavedIngredient & { revision?: number | null };
  } | null>(null);
  const mutation = useMutation({
    mutationFn: (sending: IngredientSend): Promise<SavedIngredient> => {
      const turn = writes.current.then(async () => {
        const input = JSON.stringify(sending.input);
        if (
          savedIdRef.current !== null &&
          sending.revision === undefined &&
          !sending.endRedirect &&
          lastSent.current?.input === input
        ) {
          createdByWrite.current = false;
          return lastSent.current.answer;
        }
        createdByWrite.current = savedIdRef.current === null;
        const answer = await send(sending);
        lastSent.current = { input, answer };
        savedIdRef.current = answer.id;
        revisionRef.current = answer.revision ?? null;
        return answer;
      });
      writes.current = turn.catch(() => undefined);
      return turn;
    },
  });

  const remove = useMutation({
    // Each tier answers with its own field, and nothing reads the answer: a
    // refusal throws, and success is the entry gone.
    mutationFn: async (id: string): Promise<void> => {
      if (workspaceId === null) await graphqlRequest(DeleteCompendiumIngredientDocument, { id });
      else await graphqlRequest(DeleteWorkspaceIngredientDocument, { id, workspaceId });
    },
  });

  /** Sends the input, and says what came of it: saved, asked about, or refused beside its fields. */
  const deliver = async (input: IngredientFormInput, endRedirect: boolean): Promise<boolean> => {
    try {
      const row = await mutation.mutateAsync({ input, endRedirect });
      // The review mark goes after the entry, which a new one has no id before. The entry is
      // saved either way: a refusal here is said above the fields and leaves the switch changed.
      let reviewRefusal: string | undefined;
      if (reviewChanged) {
        try {
          await graphqlRequest(SetCompendiumEntryReviewedDocument, { id: row.id, reviewed });
          setReviewedSaved(reviewed);
        } catch (error) {
          reviewRefusal = `Saved, but the review mark was not: ${readGraphqlFailure(error).alert}`;
        }
      }
      if (shownField && shownNow !== shownSaved) {
        try {
          await graphqlRequest(SetCompendiumEntryShownDocument, { id: row.id, shown: shownNow });
          setShownSaved(shownNow);
        } catch (error) {
          reviewRefusal = `Saved, but whether it is shown was not: ${readGraphqlFailure(error).alert}`;
        }
      }
      if (mirror) clearMirror(mirror);
      onSaved?.(row, next.current);
      if (reviewRefusal) setRefusal(reviewRefusal);
      setSaved(row.name);
      // Save Ingredient's page opens what it made, so its form is about to go
      // and keeps its values; Save & Add Another clears for the next one. An
      // edit keeps what it saved, now nothing to save until it changes again.
      if (next.current === 'another') {
        // The next entry is a new row, with no id or revision yet.
        savedIdRef.current = null;
        revisionRef.current = null;
        setCreatedId(null);
        setSaves((count) => count + 1);
        setReviewed(review?.reviewed ?? false);
        setReviewedSaved(review?.reviewed ?? false);
        setShownChoice(undefined);
        setShownSaved(review?.shown ?? true);
        // The next entry is a new one, so every section opens, as for this one.
        setOpen(new Set(SECTION_KEYS));
        variantFolds.setAll(true, 0);
      } else if (savedIdRef.current !== null) {
        reset(getValues());
        clearEdited();
        clearHistory();
      }
      return true;
    } catch (error) {
      // Another save got in first: the autosave holds the value and offers the choice.
      if (error instanceof StaleWriteError) {
        await autosave.flush().catch(() => undefined);
        return false;
      }
      // setError, as the resolver's own errors are set: the next submit or an
      // edit to the field clears them the same way. The end-redirect refusal is a
      // question rather than an error: it asks before the save goes again.
      placeServerIssues(error, setError, ({ path, message }) => {
        if (path[0] !== END_REDIRECT) return fieldNameOf(path, getValues());
        setQuestion({ message, input });
        return false;
      });
      return false;
    }
  };

  /**
   * A compendium match's +: the entry goes in under its own name, and what else was typed rides as
   * the coven's overrides. The form stays open with what was typed; answers whether it went in
   * (claude-docs/components/ingredient-form.md, "How the duplicate list behaves").
   */
  const useEntry = async (match: Duplicate): Promise<boolean> => {
    if (workspaceId === null) return false;
    const values = getValues();
    const listed = (entries: { value: string }[]): string[] | undefined => {
      const chosen = entries.map(({ value }) => value.trim()).filter((value) => value !== '');
      return chosen.length > 0 ? chosen : undefined;
    };
    const input = {
      description: values.description.trim() || undefined,
      safetyNotes: values.safetyNotes.trim() || undefined,
      elements: values.elements.length > 0 ? values.elements : undefined,
      celestialBodies: listed(values.celestialBodies),
      zodiacSigns: listed(values.zodiacSigns),
      colors: listed(values.colors),
    };
    // A refusal or a save said before is not about this add.
    setSaved(null);
    methods.clearErrors('root');
    try {
      await graphqlRequest(AddCupboardEntryDocument, {
        workspaceId,
        ingredientId: match.id,
        input,
      });
      // No Saved notice: the page status region says the add, once (NameField).
      onSaved?.({ id: match.id, name: match.name, slug: match.slug, revision: 0 }, 'another');
      return true;
    } catch (error) {
      // Nothing sent comes from the name now, so every issue is said at the form's head.
      placeServerIssues(error, setError, () => undefined);
      return false;
    }
  };

  const save = async (input: IngredientFormInput): Promise<void> => {
    // A near match not yet dismissed holds a save that would otherwise go, asked about the name being
    // sent. After validation, so an error to fix comes first. An edit's warning holds nothing, as it
    // renames what exists.
    if (savedIdRef.current === null && (await duplicates.check(input.name))) return;
    landed.current = await deliver(input, false);
  };

  // Promoting a folk name. Only a saved entry has folk names with ids.
  const promotion = usePromoteFolkName(workspaceId, savedId ?? '');
  const promoteOffered = mayPromote && savedId !== null;

  /**
   * Save & Promote's first half: the form's own save, validated and drawn as any save is. When it
   * does not land the question closes and the first invalid field takes the focus by hand.
   */
  const saveForPromotion = async (): Promise<boolean> => {
    landed.current = false;
    next.current = 'open';
    setSaved(null);
    setRefusal(undefined);
    await handleSubmit(save)();
    if (!landed.current) {
      flushSync(() => setPromoting(null));
      form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
    return landed.current;
  };

  /** The swap was made: the form holds what the server answered, with nothing left to save. */
  const promoted = (ingredient: PromotedIngredient): void => {
    reset({
      ...getValues(),
      name: ingredient.name,
      folkNames: ingredient.folkNames.map(({ id, name }) => ({ value: name, id })),
    });
    clearEdited();
    clearHistory();
    flushSync(() => {
      setPromoting(null);
      setSaved(ingredient.name);
    });
    onSaved?.(
      { id: ingredient.id, name: ingredient.name, slug: ingredient.slug } as SavedIngredient,
      'open',
    );
    // The chip that was pressed has gone with the reset; the name it became is
    // where the eye should go.
    form.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
  };

  // Delete is on its way or done: the entry is going, so nothing more is saved to it.
  const removed = deleting || remove.isPending || remove.isSuccess;
  const values = useWatch({ control }) as IngredientFormValues;
  const userId = useViewerId();
  const mirror = userId ? mirrorKey({ entity: 'ingredient', id: savedId, userId }) : undefined;
  const closing = useRef(false);
  const resolver = compendium ? compendiumResolver : ingredientResolver;

  /**
   * The one save the autosave and Close go through: the values checked as the schema reads them, then
   * written to the ingredient this form holds, or created once. A refusal lands beside its field and
   * is thrown for the autosave to report.
   */
  const persist = async (sent: AutosaveValue, context: SaveContext): Promise<SaveResult> => {
    const checked = await resolver(sent.fields, undefined, {
      fields: {},
      shouldUseNativeValidation: false,
      criteriaMode: 'firstError',
    });
    if (Object.keys(checked.errors).length > 0) {
      void methods.trigger();
      throw fieldsRefused();
    }
    let row: SavedIngredient;
    try {
      // Only Keep Mine names a revision; every other save writes against the last answer.
      row = await mutation.mutateAsync({
        input: toInput(sent.fields),
        endRedirect: false,
        revision: context.force ? (context.revision ?? undefined) : undefined,
      });
    } catch (error) {
      if (error instanceof GraphQLClientError && !(error instanceof StaleWriteError)) {
        placeServerIssues(error, setError, ({ path, message }) => {
          if (path[0] !== END_REDIRECT) return fieldNameOf(path, getValues());
          setQuestion({ message, input: toInput(sent.fields) });
          return false;
        });
      }
      throw error;
    }
    if (compendium && review !== undefined && sent.reviewed !== reviewedSaved) {
      try {
        await graphqlRequest(SetCompendiumEntryReviewedDocument, {
          id: row.id,
          reviewed: sent.reviewed,
        });
        setReviewedSaved(sent.reviewed);
      } catch (error) {
        setRefusal('Saved, but the review mark was not: ' + readGraphqlFailure(error).alert);
      }
    }
    if (shownField && sent.shown !== shownSaved) {
      try {
        await graphqlRequest(SetCompendiumEntryShownDocument, { id: row.id, shown: sent.shown });
        setShownSaved(sent.shown);
      } catch (error) {
        setRefusal('Saved, but whether it is shown was not: ' + readGraphqlFailure(error).alert);
      }
    }
    // The form now holds what was sent as saved; anything typed meanwhile stays a change.
    reset(sent.fields, { keepValues: true, keepErrors: true });
    methods.clearErrors('root');
    // Read as the write ran: a flush that queued behind Save's create updates what it made.
    const creating = createdByWrite.current;
    if (creating) {
      setCreatedId(row.id);
      if (!closing.current) onCreated?.(row);
    } else if (!closing.current) {
      onAutosaved?.(row);
    }
    return { revision: row.revision ?? 0, savedAt: new Date(), id: row.id };
  };

  const autosave = useAutosave<AutosaveValue>({
    value: { fields: values, reviewed, shown: shownNow },
    dirty: changed,
    enabled:
      !removed &&
      question === null &&
      !heldBack(values, compendium) &&
      // A name that resembles another entry waits for its answer, which the autosave never asks.
      (savedId !== null || (duplicates.shown.length === 0 && !duplicates.pending)),
    save: persist,
    mirror,
    revision: entry?.revision ?? null,
    root: form,
  });

  /** Saves for Close, answering whether Close may go on; a refusal keeps the dialog open. */
  const saveForClose = async (): Promise<boolean> => {
    closing.current = true;
    try {
      if (
        heldBack(getValues(), compendium) ||
        (savedIdRef.current === null && duplicates.shown.length > 0)
      ) {
        // Nothing is fit to save. A new entry closes with its text in the browser's copy; an
        // existing one stays open with its fields drawn.
        if (savedIdRef.current !== null) {
          await handleSubmit(
            () => undefined,
            () => undefined,
          )();
          closing.current = false;
          return false;
        }
        return true;
      }
      await autosave.flush();
      return true;
    } catch {
      closing.current = false;
      return false;
    }
  };
  useSaveOnClose(changed && !removed, saveForClose);

  // A copy of the form this browser kept that the server may not have: offered back once, as the
  // form opens, since the first change writes over it.
  const [recovered, setRecovered] = useState<MirrorEntry<AutosaveValue> | null>(null);
  useEffect(() => {
    if (!mirror) return;
    const found = readMirror<AutosaveValue>(mirror);
    if (!found) return;
    const savedAt = entry?.updatedAt ? new Date(entry.updatedAt) : null;
    if (
      (savedAt && found.at.getTime() <= savedAt.getTime()) ||
      !Array.isArray(found.value?.fields?.variants)
    ) {
      clearMirror(mirror);
      return;
    }
    setRecovered(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const recovery = recovered && (
    <RecoveryNotice
      at={recovered.at}
      onKeep={() => {
        reset(recovered.value.fields, { keepDefaultValues: true });
        setReviewed(recovered.value.reviewed);
        setShownChoice(recovered.value.shown);
        setRecovered(null);
      }}
      onDiscard={() => {
        if (mirror) clearMirror(mirror);
        setRecovered(null);
      }}
    />
  );

  /** Reload after a stale save: the page fetches the server's copy, which replaces the form. */
  const reload = async (): Promise<void> => {
    await autosave.resolveConflict('reload');
    if (mirror) clearMirror(mirror);
    if (onReload) onReload();
    else window.location.reload();
  };

  const endRedirect = async (): Promise<void> => {
    if (!question) return;
    await deliver(question.input, true);
    setQuestion(null);
  };

  const confirmDelete = async (): Promise<void> => {
    if (savedIdRef.current === null) return;
    setRefusal(undefined);
    await remove.mutateAsync(savedIdRef.current);
    onDeleted?.();
  };

  return (
    <FormProvider {...methods}>
      <EditedFieldsContext.Provider value={edited}>
        <FormHistoryContext.Provider value={history}>
          <PanelChangesContext.Provider value={panels.context}>
            {/* A variant's or a reference's removal question steps aside while
          the unsaved changes' asks, drawn in the same place. */}
            {/* Where each linked substitute's summary links its entry, read by
          the chips however deep their list sits. */}
            <EntryHrefContext.Provider value={entryHref}>
              {/* An edit of the compendium says so, drawn here so every
          dialog that opens it shows it once: under a modal's title, above
          its Open All row, or outside a modal
          above the form. */}
              {compendium &&
                editing &&
                (headerNote ? createPortal(compendiumNotice, headerNote) : compendiumNotice)}
              {recovery && (headerNote ? createPortal(recovery, headerNote) : recovery)}
              {/* `noValidate`: every refusal is the schema's, worded and placed like
          the rest, rather than the browser's own bubble. */}
              <form
                ref={form}
                className="form ingredient-form"
                // Built in the event rather than in render: `save` reads a ref.
                // Which button was pressed is the event's submitter; a submit with
                // none, Enter in a field, is Save Ingredient's, the form's default.
                onSubmit={(event) => {
                  const submitter = (event.nativeEvent as SubmitEvent).submitter;
                  next.current =
                    submitter?.getAttribute('value') === 'another' ? 'another' : 'open';
                  setPressed(next.current);
                  setSaved(null);
                  setRefusal(undefined);
                  submitting.current = true;
                  return handleSubmit(save)(event).finally(() => {
                    submitting.current = false;
                  });
                }}
                noValidate
              >
                {saved !== null && <Notice kind="success">Saved {saved}.</Notice>}
                {errors.root && <Notice kind="error">{errors.root.message}</Notice>}
                {refusal && <Notice kind="error">{refusal}</Notice>}
                {/* The sections flush, between hairlines. The one control that opens or closes them
              all sits beside the modal's title; outside a modal, at the end of the line above the
              first section. */}
                <div className="collapsible-sections">
                  {foldAll}
                  {/* After Open All, so the header reads Open All, Undo, Redo. */}
                  <FormHistoryButtons />
                  <CollapsibleSection
                    title="Identity"
                    summary={<SectionSummary section="identity" />}
                    fold={fold('identity')}
                  >
                    {/* Warns beneath it of the entries its name resembles (story 16),
            and a save stops on the warning until it is answered. */}
                    <NameField
                      warning={duplicates}
                      hrefOf={duplicateHref}
                      onUse={workspaceId === null ? undefined : useEntry}
                      workspaceId={workspaceId ?? undefined}
                      workspaceName={workspaceName}
                      quickLookOf={quickLookOf}
                      holds={!editing}
                      ref={createAnyway}
                    />
                    {/* The kind decides the formal name's error, so a change to it
            revalidates the formal name. A named kind marks it required;
            Unknown leaves it open and optional. A coven's formal name with no
            kind saves as unknown, so nothing marks the kind there;
            a compendium entry declares one always (§5). None takes no formal
            name at all, so choosing it empties the field and shuts it, with
            the reason in view rather than in a tip: a shut field that does
            not say why reads as broken. */}
                    <SelectField<IngredientFormValues>
                      name="nomenclature"
                      label="Classification"
                      hint='Botanical for a plant, mineral for a stone, and so on. "Unknown" if you are not sure which, with or without a formal name. "None" takes no formal name.'
                      placeholder="Choose a classification"
                      options={NOMENCLATURE_OPTIONS}
                      required={compendium}
                      deps={['canonicalName']}
                      onChange={(value) => {
                        if (value === NAMELESS_KIND) setValue('canonicalName', '');
                      }}
                    />
                    <TextField<IngredientFormValues>
                      name="canonicalName"
                      label="Formal Name"
                      placeholder="Add a formal name"
                      note={
                        kind === NAMELESS_KIND
                          ? 'A "none" entry records no formal name.'
                          : undefined
                      }
                      disabled={kind === NAMELESS_KIND}
                      required={kind !== '' && kind !== NAMELESS_KIND && kind !== UNSETTLED_KIND}
                    />
                    {/* Suggests from this coven and the compendium: the folk
            names in use. The form is each variant's, beneath. */}
                    <LookupListField
                      workspaceId={workspaceId}
                      useSuggestions={useCommonNameSuggestions}
                      name="folkNames"
                      rowAction={(row) => {
                        const { id, value } = row as { id?: string; value: string };
                        if (!promoteOffered || !id) return undefined;
                        return {
                          label: `Make ${value} the Display Name`,
                          tip: 'Make Display Name',
                          icon: <PromoteIcon />,
                          disabled: promotion.isPending,
                          onClick: () => {
                            setRefusal(undefined);
                            setPromoting({ id, value });
                          },
                        };
                      }}
                      legend="Folk Names"
                      entry="Folk Name"
                      placeholder="Add a folk name"
                    />
                  </CollapsibleSection>
                  <CollapsibleSection
                    title="Details & Care"
                    summary={<SectionSummary section="details" />}
                    fold={fold('details')}
                  >
                    <TextField<IngredientFormValues>
                      name="description"
                      label="Description"
                      placeholder="What it is, where it comes from and how it is used"
                      multiline
                      // Seven lines, as each variant's Description.
                      rows={7}
                    />
                    <TextField<IngredientFormValues>
                      name="safetyNotes"
                      label="Safety Notes"
                      placeholder="Add safety notes"
                      multiline
                    />
                    {/* Its own flag: a toxic form says so on its own. */}
                    <ToggleField name="toxic" label="Toxic" />
                  </CollapsibleSection>
                  <CollapsibleSection
                    title="Correspondences"
                    summary={<SectionSummary section="correspondences" />}
                    fold={fold('correspondences')}
                  >
                    {/* Several at once, in the order chosen; none chosen is
            the answer "none", so there is no None to choose. */}
                    <MultiSelectField
                      name="elements"
                      label="Element"
                      placeholder="Add an element"
                      options={ELEMENT_OPTIONS}
                    />
                    {/* Each list but the colours suggests, from the curated vocabularies where
            there are some and from this coven and the compendium otherwise
            (claude-docs/components/ingredient-form.md, "Suggestion lists and fields"). */}
                    <LookupListField
                      workspaceId={workspaceId}
                      useSuggestions={useCelestialBodySuggestions}
                      name="celestialBodies"
                      ordered
                      pickOnly={compendium}
                      legend="Celestial Bodies"
                      entry="Celestial Body"
                      placeholder="Add a body"
                    />
                    <LookupListField
                      workspaceId={workspaceId}
                      useSuggestions={useZodiacSuggestions}
                      name="zodiacSigns"
                      ordered
                      pickOnly={compendium}
                      legend="Zodiac Signs"
                      entry="Zodiac Sign"
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
                      workspaceId={workspaceId}
                      useSuggestions={useDeitySuggestions}
                      name="deities"
                      ordered
                      pickOnly={compendium}
                      legend="Deities"
                      entry="Deity"
                      placeholder="Add a deity"
                    />
                  </CollapsibleSection>
                  <CollapsibleSection
                    title="Relations"
                    summary={<SectionSummary section="relations" />}
                    fold={fold('relations')}
                  >
                    {/* First in Relations: every live category, picked from chips grouped by
            category group. */}
                    <CategoryField />
                    <LookupListField
                      workspaceId={workspaceId}
                      // Fixed for the form's life, since its tier is, so the hook called is
                      // always the same.
                      useSuggestions={
                        compendium ? useCompendiumSubstitutes : useSubstituteSuggestions
                      }
                      omit={savedId ?? undefined}
                      name="substitutes"
                      legend="Substitute Ingredients"
                      entry="Substitute Ingredient"
                      placeholder="Add a substitute"
                    />
                    {/* Which form of each linked ingredient, when it comes in several. */}
                    <SubstituteForms name="substitutes" />
                  </CollapsibleSection>
                  <CollapsibleSection
                    title="Sources"
                    summary={<SectionSummary section="sources" />}
                    fold={fold('sources')}
                  >
                    {/* Last, as a bibliography is: the sources picked, each
            with its locator, and a panel for a new one. */}
                    <ReferencesField workspaceId={workspaceId} />
                  </CollapsibleSection>
                  {/* After the ingredient's own fields, as the page shows its forms after it:
            each form, and what it adds. */}
                  <VariantsField
                    workspaceId={workspaceId}
                    fold={fold('variants')}
                    folds={variantFolds}
                  />
                </div>
                {/* The compendium's review row: after the last section and before the buttons, the
              same row the Quick Look ends its head with. Its words show the saved state, the
              switch the form's own value, a field that Save carries and Cancel discards. For a
              curator or admin only (claude-docs/components/ingredient-entry.md, "Structure"). */}
                {compendium && review && (
                  <div data-focus-skip>
                    <ReviewRow
                      standing={reviewedSaved}
                      reviewedAt={reviewedSaved === review.reviewed ? review.reviewedAt : null}
                      checked={reviewed}
                      onChange={setReviewed}
                      alongside={
                        <ShownToggle
                          shown={shownNow}
                          onChange={setShownChoice}
                          name={entry?.values.name ?? ''}
                          accessibleName="Shown in Compendium"
                        />
                      }
                    />
                  </div>
                )}
                {/* Two saves, held down from the press to the answer (the duplicate check
              included): Save Ingredient, first and so the default Enter, opens what it made;
              Save & Add Another clears the form. An edit has the first alone, and Delete apart at
              the far end, in either tier. */}
                <FormActions
                  noun="Ingredient"
                  dirty={changed}
                  submitting={isSubmitting}
                  busy={busy('open')}
                  saveValue="open"
                  aside={
                    editing ? (
                      <BinButton
                        verb="Delete Ingredient"
                        name=""
                        onClick={() => {
                          setRefusal(undefined);
                          setDeleting(true);
                        }}
                      />
                    ) : undefined
                  }
                >
                  {!editing && (
                    <BusyButton
                      type="submit"
                      value="another"
                      disabled={!changed || isSubmitting}
                      busy={busy('another')}
                      busyLabel="Saving Ingredient"
                    >
                      Save & Add Another
                    </BusyButton>
                  )}
                  <SaveStatus
                    status={autosave.status}
                    savedAt={autosave.savedAt}
                    conflictMessage="This ingredient was changed elsewhere."
                    conflictInto={headerNote}
                    onRetry={autosave.retry}
                    onReload={() => void reload()}
                    onKeepMine={() =>
                      void autosave.resolveConflict('keep-mine').catch(() => undefined)
                    }
                  />
                </FormActions>
                {/* A question is asked over the form, centred in view however far it is scrolled,
              the focus on its Cancel: the promotion's, then the end-redirect's, then Delete's. */}
                {promoteOffered && (
                  <PromoteFolkNameQuestion
                    promotion={promotion}
                    folkName={promoting}
                    displayName={entry?.values.name ?? ''}
                    tier={compendium ? 'compendium' : 'coven'}
                    dirty={changed || panels.changed}
                    saveFirst={saveForPromotion}
                    discardFirst={() => {
                      reset();
                      setReviewed(reviewedSaved);
                      setShownChoice(undefined);
                    }}
                    onPromoted={promoted}
                    onKeep={() => setPromoting(null)}
                    onRefused={(message) => {
                      setPromoting(null);
                      setRefusal(message);
                    }}
                  />
                )}
                {question ? (
                  // The address this save takes is another entry's redirect. Asked before anything
                  // else is pressed; Cancel leaves the entry as typed, unsaved.
                  <ConfirmQuestion
                    key="redirect"
                    question={question.message}
                    tone="solid"
                    confirmLabel="End Redirect & Save"
                    busyLabel="Saving Ingredient"
                    busy={mutation.isPending}
                    onConfirm={endRedirect}
                    onKeep={() => setQuestion(null)}
                  />
                ) : (
                  <ConfirmQuestion
                    key="delete"
                    asked={deleting}
                    question={
                      <>
                        Delete <strong>{entry?.values.name}</strong>? It leaves the{' '}
                        {compendium ? 'compendium' : 'coven'}, but any spell that uses it keeps it.
                      </>
                    }
                    details={compendium && entry ? <DeleteUsers id={entry.id} /> : undefined}
                    busy={remove.isPending}
                    onConfirm={confirmDelete}
                    onKeep={() => setDeleting(false)}
                    onRefused={(message) => {
                      setDeleting(false);
                      setRefusal(message);
                    }}
                  />
                )}
              </form>
            </EntryHrefContext.Provider>
          </PanelChangesContext.Provider>
        </FormHistoryContext.Provider>
      </EditedFieldsContext.Provider>
    </FormProvider>
  );
};

export default IngredientForm;
