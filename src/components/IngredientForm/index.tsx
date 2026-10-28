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
import { placeServerIssues } from '../../lib/graphql-failure';
import BusyButton from '../BusyButton';
import { ConfirmQuestion, useDiscardGuard, useModalHeaderNote } from '../Modal';
import { PanelChangesContext, usePanelChanges } from './panel-changes';
import { DiscardAskingContext } from './remove-question';
import {
  PromoteFolkNameQuestion,
  usePromoteFolkName,
  type PromotedIngredient,
  type PromotedName,
} from './promote';
import { PromoteIcon } from './icons';
import { DeleteUsers } from './delete-users';
import Notice from '../Notice';
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
  ingredientResolver,
  openingValues,
  listBoxOf,
  sectionsRestored,
  sectionsWithErrors,
  variantsWithErrors,
} from './values';
import { VariantsField, useVariantFolds } from './variants';
import './index.scss';

// Every property of an ingredient, validated by the shared schema before the
// mutation is sent, and by the service again after. An error from either side
// lands beside the field its path names, through the same element; one naming
// no field lands above them all. A coven's ingredient, new or its own given to
// edit (M8.17), or a compendium entry, new or given to edit (M5.5).
// See claude-docs/components/ingredient-form.md.

const CreateWorkspaceIngredientDocument = graphql(`
  mutation CreateWorkspaceIngredient($workspaceId: ID!, $input: IngredientInput!) {
    createWorkspaceIngredient(workspaceId: $workspaceId, input: $input) {
      id
      name
      slug
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

// A coven's own entry saved over (M8.17). The update takes the whole entry,
// every field present (MB.159), and reads back what the create does but the
// jars, which a save has not moved since M12.27.
const UpdateWorkspaceIngredientDocument = graphql(`
  mutation UpdateWorkspaceIngredient($workspaceId: ID!, $id: ID!, $input: IngredientUpdateInput!) {
    updateIngredient(workspaceId: $workspaceId, id: $id, input: $input) {
      id
      name
      slug
    }
  }
`);

// A match's + (M12.20's Use It, an icon since M12.48): the compendium entry goes
// into the cupboard, no jar with it.
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
    }
  }
`);

const UpdateCompendiumIngredientDocument = graphql(`
  mutation UpdateCompendiumIngredient(
    $id: ID!
    $input: CompendiumIngredientUpdateInput!
    $endRedirect: Boolean
  ) {
    updateCompendiumIngredient(id: $id, input: $input, endRedirect: $endRedirect) {
      id
      name
      slug
    }
  }
`);

const DeleteCompendiumIngredientDocument = graphql(`
  mutation DeleteCompendiumIngredient($id: ID!) {
    deleteCompendiumIngredient(id: $id)
  }
`);

// A coven's own entry is deleted from its edit dialog too (M8.17, moved from
// M9.10): from this coven alone, a spell holding it still reaching it (M5.3).
const DeleteWorkspaceIngredientDocument = graphql(`
  mutation DeleteWorkspaceIngredient($id: ID!, $workspaceId: ID!) {
    deleteIngredient(id: $id, workspaceId: $workspaceId)
  }
`);

/** Keys pressed inside a reference panel are its own history's (M12.10). */
const inReferencePanel = (target: HTMLElement): boolean =>
  target.closest('.ingredient-form__panel') !== null;

/** A panel opening or closing is interface state among the values, not an edit to undo. */
const isPanelState = (name: string): boolean => /(^|\.)referencePanelOpen$/.test(name);

/** The path of MB.82's refusal: the write would end another entry's redirect, unless confirmed. */
const END_REDIRECT = 'endRedirect';

const IngredientForm = ({
  workspaceId,
  workspaceName,
  entry,
  onSaved,
  onDeleted,
  onCancel,
  duplicateHref,
  quickLookOf,
  entryHref,
  mayPromote = false,
}: IngredientFormProps): ReactElement => {
  // A null coven is the compendium: the classification answered, the
  // vocabulary boxes picked from the curated rows, and every lookup asking
  // about the compendium alone (M5.5; MB.162).
  const compendium = workspaceId === null;
  const methods = useForm<IngredientFormValues, unknown, IngredientFormInput>({
    defaultValues: entry ? openingValues(entry.values) : EMPTY_VALUES,
    resolver: compendium ? compendiumResolver : ingredientResolver,
    // react-hook-form focuses in registration order and only a registered
    // field; a list entry is neither, so the effect below does it instead.
    shouldFocusError: false,
    // A field is checked when it is first left, and on every change after, so
    // an untouched one stays quiet until submit. Not the default (submit, then
    // change): story 31 wants the error beside the field as the person moves on.
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
  const createAnyway = useRef<HTMLButtonElement>(null);
  const duplicates = useDuplicateWarning(
    workspaceId,
    useWatch({ control, name: 'name' }),
    entry?.id,
    // The name the form holds as saved: an edit's, and a save's reset moves it on.
    methods.formState.defaultValues?.name,
  );
  const { blocking } = duplicates;
  const kind = useWatch({ control, name: 'nomenclature' });
  // An edit saves over the entry, and opens nothing new; a new entry offers
  // both saves (MB.131).
  const editing = entry !== undefined;

  // Which of the six sections are open, several at once, each by its own
  // heading (MB.115, the owner's calls): a new entry opens with every one
  // open, as the long form it is; an edit with every one closed, its entry
  // read at a glance from the summary lines.
  const [open, setOpen] = useState<ReadonlySet<SectionKey>>(
    () => new Set(editing ? [] : SECTION_KEYS),
  );
  // Each variant's own sections, which fold the same way (MB.115): one added
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

  // Save & Add Another leaves the form ready for the next ingredient, the owner's call
  // (MB.131): once the save has landed, every field and list empties and the
  // name takes the focus. In an effect rather than in `save`, so the reset
  // comes after react-hook-form's own end-of-submit update, and counted here
  // rather than read off `isSubmitSuccessful`, which a save held on the
  // duplicate warning sets too. The name is found in the page, as the error
  // focus above finds its field: `setFocus` reads a ref the reset has just
  // dropped, and the field registers again only on the next render.
  const [saves, setSaves] = useState(0);
  // What the last save wrote, said above the fields where a refusal would be,
  // so the cleared form is not the only sign it landed. A new save drops it.
  const [saved, setSaved] = useState<string | null>(null);
  // Which save was pressed: read by `save` from a ref, since the submit
  // handler passes the input alone, and drawn from state as the busy button.
  const next = useRef<AfterSave>('open');
  const [pressed, setPressed] = useState<AfterSave>('open');
  const busy = (button: AfterSave): boolean => isSubmitting && pressed === button;
  // MB.82's question while it waits for an answer: the save is kept, and End
  // Redirect & Save sends it again, confirmed.
  const [question, setQuestion] = useState<RedirectQuestion | null>(null);
  // The delete's own confirmation, and why a delete was refused.
  const [deleting, setDeleting] = useState(false);
  const [refusal, setRefusal] = useState<string>();
  // The folk name whose promotion is being asked about (M12.1), if any.
  const [promoting, setPromoting] = useState<PromotedName | null>(null);
  // Whether the last save sent through `handleSubmit(save)` landed: Save and
  // Promote promotes only if it did.
  const landed = useRef(false);
  // Cancel, and every other way out of the modal, asks first while the form
  // has changes (MB.115, the owner's call), ahead of any other question; a
  // save or a delete does not. A reference panel's own edits count too:
  // they are in a form of their own, which `isDirty` never sees.
  const panels = usePanelChanges();
  const discard = useDiscardGuard(isDirty || panels.changed);

  // Open All / Close All: Close All while any section is open, so a press
  // from any mix folds the form to its summary lines, the view the sections
  // are for, and a new entry, all open, offers it at once. It reaches every
  // variant's sections too; a variant's are in view only while Variants is
  // open, which already reads Close All. Off while the form asks a question
  // over itself, as Undo and Redo are then, the owner's call: a control that
  // cannot be used reads as one, rather than faded with the form behind.
  const anyOpen = open.size > 0;
  const headerNote = useModalHeaderNote();
  const compendiumNotice = <Notice kind="plain">{COMPENDIUM_EDIT_NOTICE}</Notice>;
  const foldAll = (
    <FoldAll
      anyOpen={anyOpen}
      disabled={discard.asking || deleting || question !== null}
      onToggle={() => {
        setOpen(new Set(anyOpen ? [] : SECTION_KEYS));
        variantFolds.setAll(!anyOpen, getValues('variants').length);
      }}
    />
  );

  // Undo and redo (M12.9, adopted here by M12.10), off while a save is in
  // flight (its success handler resets over the values) or a question is up
  // over the form. A restore opens whatever folds around the field it wrote,
  // and a classification pick is one step with the formal name it emptied, so
  // focus is named rather than left to the first of the two.
  const history = useFormHistory(methods, {
    root: form,
    enabled: !discard.asking && !deleting && question === null && !isSubmitting,
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
  // leads anywhere (M12.10).
  useEffect(() => {
    if (saves === 0) return;
    reset(EMPTY_VALUES);
    clearEdited();
    clearHistory();
    form.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
  }, [saves, reset, clearHistory, clearEdited]);

  const mutation = useMutation({
    mutationFn: async ({ input, endRedirect }: IngredientSend): Promise<SavedIngredient> => {
      if (workspaceId !== null && entry) {
        // A saved entry always holds a classification, and the select offers no
        // way back to none, so the whole input the update needs is what is sent.
        const answer = await graphqlRequest(UpdateWorkspaceIngredientDocument, {
          workspaceId,
          id: entry.id,
          input: input as IngredientUpdateInput,
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
      if (entry) {
        // The update takes the whole entry, every field present (MB.159),
        // which the form's input always is.
        const answer = await graphqlRequest(UpdateCompendiumIngredientDocument, {
          id: entry.id,
          input: input as CompendiumIngredientUpdateInput,
          endRedirect,
        });
        return answer.updateCompendiumIngredient;
      }
      const answer = await graphqlRequest(CreateCompendiumIngredientDocument, {
        input: input as CompendiumIngredientInput,
        endRedirect,
      });
      return answer.createCompendiumIngredient;
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
      onSaved?.(row, next.current);
      setSaved(row.name);
      // Save Ingredient's page opens what it made, so its form is about to go
      // and keeps its values; Save & Add Another clears for the next one. An
      // edit keeps what it saved, now nothing to save until it changes again.
      if (next.current === 'another') {
        setSaves((count) => count + 1);
        // The next entry is a new one, so every section opens, as for this one.
        setOpen(new Set(SECTION_KEYS));
        variantFolds.setAll(true, 0);
      } else if (entry) {
        reset(getValues());
        clearEdited();
        clearHistory();
      }
      return true;
    } catch (error) {
      // setError, as the resolver's own errors are set: the next submit or an
      // edit to the field clears them the same way. MB.82's refusal is a
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
   * A compendium match's +: the entry goes in under its own name, and what else
   * was typed rides as the coven's overrides. The typed name is never sent as a
   * label: it was a search that found the entry, and as a label it could clash
   * with one the coven already gives another entry, which refused the add (the
   * owner's call, M12.48). The entry can be relabelled on its page. The form
   * stays open with what was typed, reported as Save & Add Another's save is
   * (`another`), and the + says the add itself: its check, then the eye, and
   * the row moving under In This Coven (the owner's calls, M12.48, in place of
   * opening the entry's page). Answers whether it went in.
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
      onSaved?.({ id: match.id, name: match.name, slug: match.slug }, 'another');
      return true;
    } catch (error) {
      // Nothing sent comes from the name now, so every issue is said at the form's head.
      placeServerIssues(error, setError, () => undefined);
      return false;
    }
  };

  const save = async (input: IngredientFormInput): Promise<void> => {
    // A near match not yet dismissed holds a save that would otherwise go,
    // asked about the name being sent rather than waiting out the debounce.
    // After validation, so an error to fix comes first. An edit renames what
    // exists rather than making another, so its warning holds nothing (MB.115,
    // the owner's call).
    if (!editing && (await duplicates.check(input.name))) return;
    landed.current = await deliver(input, false);
  };

  // Promoting a folk name (M12.1). Only a saved entry has folk names with ids.
  const promotion = usePromoteFolkName(workspaceId, entry?.id ?? '');
  const promoteOffered = mayPromote && entry !== undefined;

  /**
   * Save & Promote's first half: the form's own save, validated and drawn as
   * any save is. When it does not land the question closes and the first
   * invalid field takes the focus by hand, since the question's overlay would
   * otherwise hand the focus back to the control that opened it.
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

  const endRedirect = async (): Promise<void> => {
    if (!question) return;
    await deliver(question.input, true);
    setQuestion(null);
  };

  const confirmDelete = async (): Promise<void> => {
    if (!entry) return;
    setRefusal(undefined);
    await remove.mutateAsync(entry.id);
    onDeleted?.();
  };

  return (
    <FormProvider {...methods}>
      <EditedFieldsContext.Provider value={edited}>
        <FormHistoryContext.Provider value={history}>
          <PanelChangesContext.Provider value={panels.context}>
            {/* A variant's or a reference's removal question steps aside while
          the unsaved changes' asks, drawn in the same place. */}
            <DiscardAskingContext.Provider value={discard.asking}>
              {/* Where each linked substitute's summary links its entry, read by
          the chips however deep their list sits (MB.115). */}
              <EntryHrefContext.Provider value={entryHref}>
                {/* An edit of the compendium says so (M8.17), drawn here so every
          dialog that opens it shows it once: under a modal's title, above
          its Open All row (the owner's call, 2026-10-19), or outside a modal
          above the form. */}
                {compendium &&
                  editing &&
                  (headerNote ? createPortal(compendiumNotice, headerNote) : compendiumNotice)}
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
                    return handleSubmit(save)(event);
                  }}
                  noValidate
                >
                  {saved !== null && <Notice kind="success">Saved {saved}.</Notice>}
                  {errors.root && <Notice kind="error">{errors.root.message}</Notice>}
                  {refusal && <Notice kind="error">{refusal}</Notice>}
                  {/* The sections flush, between hairlines. The one control that
              opens or closes them all sits beside the modal's title, the
              owner's call (MB.115); outside a modal, at the end of the line
              above the first section. */}
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
            kind saves as unknown, so nothing marks the kind there (MB.161);
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
                        placeholder="Add formal name"
                        note={
                          kind === NAMELESS_KIND
                            ? 'A "none" entry records no formal name.'
                            : undefined
                        }
                        disabled={kind === NAMELESS_KIND}
                        required={kind !== '' && kind !== NAMELESS_KIND && kind !== UNSETTLED_KIND}
                      />
                      {/* Suggests from this coven and the compendium (M4.7a): the folk
            names in use. The form is each variant's, beneath (MB.221). */}
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
                        // Seven lines, as each variant's Description (MB.115, the owner's call).
                        rows={7}
                      />
                      <TextField<IngredientFormValues>
                        name="safetyNotes"
                        label="Safety Notes"
                        placeholder="Add safety notes"
                        multiline
                      />
                      {/* Its own flag: a toxic form says so on its own (M11.21). */}
                      <ToggleField name="toxic" label="Toxic" />
                    </CollapsibleSection>
                    <CollapsibleSection
                      title="Correspondences"
                      summary={<SectionSummary section="correspondences" />}
                      fold={fold('correspondences')}
                    >
                      {/* Several at once, in the order chosen (MB.159); none chosen is
            the answer "none", so there is no None to choose. */}
                      <MultiSelectField
                        name="elements"
                        label="Element"
                        placeholder="Add an element"
                        options={ELEMENT_OPTIONS}
                      />
                      {/* Each list but the colours suggests (MB.131): celestial bodies, signs and
            deities from their curated vocabularies and the values in use, a
            pick adding the text, and a curated deity's a link to it as well
            (MB.169); substitutes from the compendium and this coven, a pick
            adding a link to the ingredient. On the compendium the celestial bodies,
            signs and deities are picks of the curated rows alone, and the
            substitutes its other entries (MB.162, MB.138). Celestial bodies, signs,
            colours and deities keep the order entered, so their entries move
            (MB.170); folk names and substitutes read alphabetically, so
            theirs do not. */}
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
                      {/* First in Relations, on the owner's call at MB.115 (MB.126 had put it
            after the lists): every live category, picked from chips grouped by
            category group. */}
                      <CategoryField />
                      <LookupListField
                        workspaceId={workspaceId}
                        // Fixed for the form's life, since its tier is, so the hook called is always the same.
                        useSuggestions={
                          compendium ? useCompendiumSubstitutes : useSubstituteSuggestions
                        }
                        omit={entry?.id}
                        name="substitutes"
                        legend="Substitute Ingredients"
                        entry="Substitute Ingredient"
                        placeholder="Add a substitute"
                      />
                      {/* Which form of each linked ingredient, when it comes in several (MB.215). */}
                      <SubstituteForms name="substitutes" />
                    </CollapsibleSection>
                    <CollapsibleSection
                      title="Sources"
                      summary={<SectionSummary section="sources" />}
                      fold={fold('sources')}
                    >
                      {/* Last, as a bibliography is (MB.154): the sources picked, each
            with its locator, and a panel for a new one. */}
                      <ReferencesField workspaceId={workspaceId} />
                    </CollapsibleSection>
                    {/* After the ingredient's own fields, as the page shows its forms
            after it (MB.215): each form, and what it adds. */}
                    <VariantsField
                      workspaceId={workspaceId}
                      fold={fold('variants')}
                      folds={variantFolds}
                    />
                  </div>
                  {/* Two saves, both held down from the press to the answer, the
              duplicate check included: Save Ingredient, first and so the
              default Enter presses, opens what it made; Save & Add Another
              clears the form for the next. The one pressed says so, the
              owner's call during MB.131. An edit has the first alone, and
              Delete apart at the far end, in either tier (M8.17). */}
                  <FormActions
                    noun="Ingredient"
                    dirty={isDirty}
                    submitting={isSubmitting}
                    busy={busy('open')}
                    saveValue="open"
                    onCancel={onCancel && (() => discard.request(onCancel))}
                    onDelete={
                      editing
                        ? () => {
                            setRefusal(undefined);
                            setDeleting(true);
                          }
                        : undefined
                    }
                  >
                    {!editing && (
                      <BusyButton
                        type="submit"
                        value="another"
                        disabled={!isDirty || isSubmitting}
                        busy={busy('another')}
                        busyLabel="Saving Ingredient"
                      >
                        Save & Add Another
                      </BusyButton>
                    )}
                  </FormActions>
                  {/* A question is asked over the form, centred in view however far
              the form is scrolled, the focus on Keep It (MB.115, the owner's
              call): the unsaved changes' first, then MB.82's, then Delete's. */}
                  {promoteOffered && (
                    <PromoteFolkNameQuestion
                      promotion={promotion}
                      folkName={promoting}
                      displayName={entry?.values.name ?? ''}
                      tier={compendium ? 'compendium' : 'coven'}
                      dirty={isDirty || panels.changed}
                      saveFirst={saveForPromotion}
                      discardFirst={() => reset()}
                      onPromoted={promoted}
                      onKeep={() => setPromoting(null)}
                      onRefused={(message) => {
                        setPromoting(null);
                        setRefusal(message);
                      }}
                    />
                  )}
                  {question ? (
                    // MB.82: the address this save takes is another entry's redirect.
                    // Asked before anything else is pressed; Keep It leaves the entry
                    // as typed, unsaved.
                    <ConfirmQuestion
                      key="redirect"
                      guard={discard}
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
                      guard={discard}
                      asked={deleting}
                      question={
                        <>
                          Delete &quot;{entry?.values.name}&quot;? It leaves the{' '}
                          {compendium ? 'compendium' : 'coven'}, but any spell that uses it keeps
                          it.
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
            </DiscardAskingContext.Provider>
          </PanelChangesContext.Provider>
        </FormHistoryContext.Provider>
      </EditedFieldsContext.Provider>
    </FormProvider>
  );
};

export default IngredientForm;
