'use client';

import { type FormEvent, type ReactElement, useId, useState } from 'react';
import { graphql } from '../../gql';
import type { WorkingParticipantInput } from '../../gql/graphql';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { usePendingNavigation } from '../../lib/navigation';
import type { Failure } from '../../lib/types';
import Combobox, { ComboboxEntry } from '../Combobox';
import { FieldShell, FormActions, RadioGroupField, fieldDescription } from '../Field';
import { DiscardQuestion, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import WorkingCompletion from './completion';
import type { RecordWorkingDialogProps, WorkingParticipantValue } from './types';

// The form inside the Record a Working dialog, which records a draft working of a complete spell or
// changes one the caller recorded. Inside the modal so its discard guard reaches the modal's Close,
// Escape and backdrop. Save closes it and the page behind shows the draft; Save & Complete goes on to the
// deduction preview (claude-docs/components/record-working.md).

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

const FIELDS = ['workedOn', 'note', 'participants', 'visibility'];

/** Today in the browser's own calendar, as the date input reads it. */
function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export default function RecordWorkingForm({
  workspaceId,
  spellId,
  spellVisibility,
  members,
  steps,
  working,
  close,
}: Omit<RecordWorkingDialogProps, 'onClose' | 'returnTo'> & { close: () => void }): ReactElement {
  const { refresh } = usePendingNavigation();
  const ids = useId();
  const [initial] = useState(() => ({
    workedOn: working?.workedOn ?? today(),
    note: working?.note ?? '',
    visibility: working?.visibility ?? spellVisibility,
    participants: working?.participants ?? [],
  }));
  const [workedOn, setWorkedOn] = useState(initial.workedOn);
  const [note, setNote] = useState(initial.note);
  const [visibility, setVisibility] = useState(initial.visibility);
  const [participants, setParticipants] = useState<readonly WorkingParticipantValue[]>(
    initial.participants,
  );
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<Failure>({});
  const [completing, setCompleting] = useState<string>();

  const complete = working?.status === 'complete';
  const changed =
    workedOn !== initial.workedOn ||
    note !== initial.note ||
    visibility !== initial.visibility ||
    participants.length !== initial.participants.length ||
    participants.some(
      (p, i) =>
        p.userId !== initial.participants[i]?.userId || p.name !== initial.participants[i]?.name,
    );
  const valid = DAY.test(workedOn) && workedOn <= today();
  const dirty = completing === undefined && changed;
  const discard = useDiscardGuard(dirty);

  // Only what the spell allows: never wider than it, and a complete working that is shared stays so.
  const choices = (['private', 'workspace'] as const).filter(
    (v) =>
      (v === 'private'
        ? spellVisibility === 'private' || !(complete && initial.visibility === 'workspace')
        : true) && (v === 'workspace' ? spellVisibility === 'workspace' : true),
  );

  const dateField = fieldDescription({
    id: `${ids}-date`,
    error: failure.field?.name === 'workedOn' ? failure.field.message : undefined,
  });
  const noteField = fieldDescription({
    id: `${ids}-note`,
    error: failure.field?.name === 'note' ? failure.field.message : undefined,
  });
  const peopleError = failure.field?.name === 'participants' ? failure.field.message : undefined;

  const typed = text.trim();
  const suggested = members
    .filter(
      (m) =>
        !participants.some((p) => p.userId === m.userId) &&
        m.name.toLowerCase().includes(typed.toLowerCase()),
    )
    .map((m) => ({ value: m.name, key: m.userId }));
  const addTyped = () => {
    if (typed === '' || participants.some((p) => p.userId === null && sameText(p.name, typed))) {
      return;
    }
    setParticipants([...participants, { userId: null, name: typed }]);
    setText('');
  };

  async function submit(thenComplete: boolean) {
    if (!valid) return;
    setSubmitting(true);
    setFailure({});
    const people: WorkingParticipantInput[] = participants.map((p) =>
      p.userId ? { userId: p.userId } : { name: p.name },
    );
    const input = {
      workedOn,
      note: note.trim() === '' ? null : note.trim(),
      visibility,
      // Left out on a new working with nobody named: the service puts the recorder in.
      ...(working || people.length > 0 ? { participants: people } : {}),
    };
    try {
      const result = working
        ? (await graphqlRequest(UpdateWorkingDocument, { workspaceId, id: working.id, input }))
            .updateWorking
        : (await graphqlRequest(RecordWorkingDocument, { workspaceId, spellId, input }))
            .recordWorking;
      setSubmitting(false);
      refresh();
      if (thenComplete) setCompleting(result.id);
      else close();
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
      className="form"
      noValidate
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void submit(false);
      }}
    >
      {failure.alert && <Notice kind="error">{failure.alert}</Notice>}
      <FieldShell label="Date" required {...dateField}>
        <input
          id={dateField.controlId}
          className="input"
          type="date"
          max={today()}
          aria-required
          {...dateField.aria}
          value={workedOn}
          disabled={submitting}
          onChange={(event) => setWorkedOn(event.target.value)}
        />
      </FieldShell>
      <div className="fieldset">
        <span id={`${ids}-people-label`} className="fieldset__legend">
          Participants
        </span>
        <Combobox
          id={`${ids}-people`}
          label="Participants"
          labelId={`${ids}-people-label`}
          value={text}
          onChange={setText}
          onPick={(value, option) => {
            if (option?.key) {
              setParticipants([...participants, { userId: option.key, name: option.value }]);
              setText('');
            } else addTyped();
            void value;
          }}
          keepOpen
          onCommit={addTyped}
          onRemoveLast={() => setParticipants(participants.slice(0, -1))}
          suggestions={{ options: suggested, pending: false }}
          offerTyped={
            typed !== '' && !participants.some((p) => p.userId === null && sameText(p.name, typed))
          }
          placeholder="Add a name"
          noun="member"
          aria-invalid={peopleError ? true : undefined}
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
        {peopleError && <p className="field__error">{peopleError}</p>}
      </div>
      <FieldShell label="Note" {...noteField}>
        <textarea
          id={noteField.controlId}
          className="textarea"
          rows={3}
          {...noteField.aria}
          value={note}
          disabled={submitting}
          onChange={(event) => setNote(event.target.value)}
        />
      </FieldShell>
      <RadioGroupField
        legend="Visibility"
        name={`${ids}-visibility`}
        options={choices.map((value) => ({
          value,
          label: value === 'private' ? 'Private' : 'Coven',
          description:
            value === 'private' ? 'Only you can see it.' : 'Every member of the coven can see it.',
        }))}
        value={visibility}
        onChange={setVisibility}
        disabled={submitting}
        note={
          spellVisibility === 'private'
            ? 'The spell is private, so its workings are too.'
            : complete && initial.visibility === 'workspace'
              ? 'A shared working stays shared.'
              : undefined
        }
      />
      <FormActions
        noun="Working"
        dirty={valid && (working ? changed : true)}
        submitting={submitting}
        holdCancel
        onCancel={() => discard.request(close)}
      >
        {!complete && (
          <button
            type="button"
            className="btn"
            disabled={!valid || submitting}
            onClick={() => void submit(true)}
          >
            Save & Complete
          </button>
        )}
      </FormActions>
      {discard.asking && <DiscardQuestion guard={discard} />}
    </form>
  );
}
