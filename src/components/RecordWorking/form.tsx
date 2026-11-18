'use client';

import { type FormEvent, type ReactElement, useId, useRef, useState } from 'react';
import { graphql } from '@/lib/graphql-document';
import type { RecordWorkingMembersQuery, WorkingParticipantInput } from '../../gql/graphql';
import { trimEnds } from '../../lib/formats';
import { CalendarDay } from '../../lib/validation';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure, fieldMessage } from '../../lib/graphql-failure';
import { useDebouncedValue } from '../../lib/debounce';
import { usePendingNavigation } from '../../lib/navigation';
import type { Failure } from '../../lib/types';
import { fold } from '@/lib/text';
import Combobox, { ComboboxEntry } from '../Combobox';
import {
  FieldError,
  FormActions,
  PlainDateField,
  PlainTextField,
  VisibilitySwitch,
} from '../Field';
import { BinButton } from '../IconTip';
import { useLookup } from '../IngredientForm/suggestions';
import { ConfirmQuestion, DiscardQuestion, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import WorkingCompletion from './completion';
import { today } from '../DateField/day';
import { completeReason } from './day';
import './index.scss';
import { DeleteWorkingQuestion } from '../SpellWorkings/delete-working';
import type { RecordWorkingDialogProps, WorkingParticipantValue } from './types';

// The form inside the Record a Working dialog. Inside the modal so its discard guard reaches Close, Escape and the
// backdrop (claude-docs/components/record-working.md).

const RecordWorkingDocument = graphql(`
  mutation RecordWorking($workspaceId: ID!, $spellId: ID!, $input: WorkingInput!) {
    recordWorking(workspaceId: $workspaceId, spellId: $spellId, input: $input) {
      id
      status
      note
      workedOn
      visibility
      participants {
        id
        name
        userId
      }
    }
  }
`);

const UpdateWorkingDocument = graphql(`
  mutation UpdateWorking($workspaceId: ID!, $id: ID!, $input: WorkingInput!) {
    updateWorking(workspaceId: $workspaceId, id: $id, input: $input) {
      id
      status
      note
      workedOn
      visibility
      participants {
        id
        name
        userId
      }
    }
  }
`);

const RecordWorkingMembersDocument = graphql(`
  query RecordWorkingMembers($workspaceId: ID!, $query: String, $first: Int) {
    workspace(id: $workspaceId) {
      id
      members(first: $first, query: $query) {
        edges {
          node {
            user {
              id
              name
            }
          }
        }
      }
    }
  }
`);

/** What the recipe page calls a member it cannot name. */
const FORMER_MEMBER = 'A former member';

const memberOptions = (data: RecordWorkingMembersQuery) =>
  data.workspace.members.edges.map(({ node }) => ({
    value: node.user.name ?? FORMER_MEMBER,
    key: node.user.id,
  }));

const FIELDS = ['workedOn', 'note', 'participants', 'visibility'];

const sameText = (a: string, b: string) => fold(a) === fold(b);

export default function RecordWorkingForm({
  workspaceId,
  spellId,
  spellVisibility,
  recorder,
  steps,
  working,
  deleteWorking,
  close,
  onConfirming,
}: Omit<RecordWorkingDialogProps, 'onClose' | 'returnTo'> & {
  close: () => void;
  onConfirming?: (confirming: boolean) => void;
}): ReactElement {
  const { refresh } = usePendingNavigation();
  const ids = useId();
  const [initial] = useState(() => ({
    workedOn: working?.workedOn ?? today(),
    note: working?.note ?? '',
    visibility: working?.visibility ?? spellVisibility,
    participants: working?.participants ?? (recorder ? [recorder] : []),
  }));
  const [workedOn, setWorkedOn] = useState(initial.workedOn);
  const [note, setNote] = useState(initial.note);
  const [visibility, setVisibility] = useState(initial.visibility);
  const [participants, setParticipants] = useState<readonly WorkingParticipantValue[]>(
    initial.participants,
  );
  const [text, setText] = useState('');
  // A save was refused for typed text that is not yet a chip; shown only while that text is there.
  const [refusedText, setRefusedText] = useState(false);
  const peopleBox = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<Failure>({});
  const [completing, setCompleting] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const [removed, setRemoved] = useState(false);

  const complete = working?.status === 'complete';
  // Text typed into Participants and not yet added is a change too, so Save is not held back while it waits.
  const changed =
    text.trim() !== '' ||
    workedOn !== initial.workedOn ||
    note !== initial.note ||
    visibility !== initial.visibility ||
    participants.length !== initial.participants.length ||
    participants.some(
      (p, i) =>
        p.userId !== initial.participants[i]?.userId || p.name !== initial.participants[i]?.name,
    );
  const valid = CalendarDay.safeParse(workedOn).success;
  const waitFor = completeReason(workedOn);
  const dirty = completing === undefined && changed && !removed;
  const discard = useDiscardGuard(dirty);

  // Never wider than the spell, and a complete working that is shared stays so.
  const sharedForGood = complete && initial.visibility === 'workspace';

  const completeButton = (
    <button
      type="button"
      className="btn"
      disabled={!valid || submitting || waitFor !== undefined}
      aria-describedby={waitFor ? `${ids}-wait` : `${ids}-effect`}
      onClick={() => void submit(true)}
    >
      Complete
    </button>
  );

  const typed = text.trim();
  const peopleError =
    refusedText && typed !== ''
      ? 'Press Enter to add this name, or clear it'
      : fieldMessage(failure, 'participants');
  // The search waits for typed text, as the box takes the focus when the dialog opens and opening asks nothing.
  const active = useDebouncedValue(typed) !== '';
  const found = useLookup(
    RecordWorkingMembersDocument,
    { workspaceId },
    text,
    active,
    memberOptions,
  );
  const suggested = {
    ...found,
    options:
      typed === ''
        ? []
        : found.options.filter((m) => !participants.some((p) => p.userId === m.key)),
  };
  const addTyped = () => {
    if (typed === '' || participants.some((p) => p.userId === null && sameText(p.name, typed))) {
      return;
    }
    setParticipants([...participants, { userId: null, name: typed }]);
    setText('');
  };

  async function submit(thenComplete: boolean) {
    if (!valid) return;
    // Typed and not added is no participant yet: refuse it, so a save never drops a name unseen.
    if (typed !== '') {
      setRefusedText(true);
      peopleBox.current?.focus();
      return;
    }
    setSubmitting(true);
    setFailure({});
    const people: WorkingParticipantInput[] = participants.map((p) =>
      p.userId ? { userId: p.userId } : { name: p.name },
    );
    const input = {
      workedOn,
      note: note.trim() === '' ? null : note.trim(),
      visibility,
      participants: people,
    };
    try {
      const result = working
        ? (await graphqlRequest(UpdateWorkingDocument, { workspaceId, id: working.id, input }))
            .updateWorking
        : (await graphqlRequest(RecordWorkingDocument, { workspaceId, spellId, input }))
            .recordWorking;
      setSubmitting(false);
      refresh();
      if (thenComplete) {
        setCompleting(result.id);
        onConfirming?.(true);
      } else close();
    } catch (error) {
      setSubmitting(false);
      setFailure(readGraphqlFailure(error, FIELDS));
    }
  }

  if (completing !== undefined) {
    return (
      <WorkingCompletion
        workspaceId={workspaceId}
        spellId={spellId}
        workingId={completing}
        steps={steps}
        onBack={close}
      />
    );
  }
  return (
    <form
      className="form working-form"
      noValidate
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void submit(false);
      }}
    >
      {failure.alert && <Notice kind="error">{failure.alert}</Notice>}
      <PlainDateField
        label="Date"
        required
        value={workedOn}
        disabled={submitting}
        onChange={setWorkedOn}
        error={fieldMessage(failure, 'workedOn')}
      />
      {/* A fieldset so `disabled` shuts the box, its chevron and every chip's x at once while the save runs. */}
      <fieldset className="fieldset" aria-labelledby={`${ids}-people-label`} disabled={submitting}>
        <span id={`${ids}-people-label`} className="fieldset__legend">
          Participants
        </span>
        <Combobox
          id={`${ids}-people`}
          label="Participants"
          labelId={`${ids}-people-label`}
          value={text}
          onChange={(next) => {
            setText(next);
            setRefusedText(false);
          }}
          inputRef={peopleBox}
          onPick={(_value, option) => {
            if (option?.key) {
              setParticipants([...participants, { userId: option.key, name: option.value }]);
              setText('');
            } else addTyped();
          }}
          keepOpen
          onCommit={addTyped}
          onRemoveLast={() => setParticipants(participants.slice(0, -1))}
          suggestions={suggested}
          offerTyped={
            typed !== '' && !participants.some((p) => p.userId === null && sameText(p.name, typed))
          }
          placeholder="Add a Name"
          noun="member"
          aria-invalid={peopleError ? true : undefined}
          aria-describedby={peopleError ? `${ids}-people-error` : undefined}
          entries={
            participants.length > 0 && (
              <ul className="combobox__entries">
                {participants.map((p) => (
                  <ComboboxEntry
                    key={p.userId ?? `name:${p.name.toLowerCase()}`}
                    value={p.name}
                    removeNoun="Participant"
                    onRemove={() => setParticipants(participants.filter((q) => q !== p))}
                  />
                ))}
              </ul>
            )
          }
        />
        <FieldError id={`${ids}-people-error`} message={peopleError} />
      </fieldset>
      <PlainTextField
        label="Note"
        multiline
        rows={3}
        spellCheck
        format={trimEnds}
        value={note}
        onChange={setNote}
        error={fieldMessage(failure, 'note')}
        disabled={submitting}
      />
      <VisibilitySwitch
        noun="working"
        checked={visibility === 'workspace'}
        onChange={(on) => setVisibility(on ? 'workspace' : 'private')}
        sharedForGood={sharedForGood}
        heldPrivate={
          spellVisibility === 'private'
            ? 'The spell is private, so its workings are too.'
            : undefined
        }
      />
      <FormActions
        noun="Working"
        dirty={valid && (working ? changed : true)}
        submitting={submitting}
        holdCancel
        onCancel={() => discard.request(close)}
        aside={
          working && deleteWorking ? (
            <BinButton
              verb="Delete Working"
              name={deleteWorking.name}
              onClick={() => setDeleting(true)}
            />
          ) : undefined
        }
      >
        {!complete && completeButton}
      </FormActions>
      {/* Text rather than a tip, so the button's description is on screen; while it waits for its day, the reason below describes it instead. */}
      {!complete && !waitFor && (
        <p id={`${ids}-effect`} className="meta">
          Completing takes the ingredients from the coven’s jars, and a complete working cannot go
          back to a draft.
        </p>
      )}
      {/* Text rather than a tip, since a disabled button takes no focus to show one. */}
      {!complete && waitFor && (
        <p id={`${ids}-wait`} className="meta">
          {waitFor}
        </p>
      )}
      {discard.asking && <DiscardQuestion guard={discard} />}
      {working && deleteWorking && (
        <ConfirmQuestion
          asked={deleting}
          busy={removed}
          question={<DeleteWorkingQuestion name={deleteWorking.name} />}
          onConfirm={async () => {
            setRemoved(true);
            try {
              await deleteWorking.remove();
            } catch (error) {
              setRemoved(false);
              throw error;
            }
            close();
          }}
          onKeep={() => setDeleting(false)}
          onRefused={(message) => {
            setDeleting(false);
            setFailure({ alert: message });
          }}
        />
      )}
    </form>
  );
}
