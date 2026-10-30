'use client';

import { type FormEvent, type ReactElement, useId, useState } from 'react';
import { graphql } from '../../gql';
import type { WorkingParticipantInput } from '../../gql/graphql';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { usePendingNavigation } from '../../lib/navigation';
import type { Failure } from '../../lib/types';
import Combobox, { ComboboxEntry } from '../Combobox';
import DateField from '../DateField';
import { FieldError, FieldShell, FormActions, VisibilitySwitch, fieldDescription } from '../Field';
import IconTip, { BinButton } from '../IconTip';
import { ConfirmQuestion, DiscardQuestion, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import WorkingCompletion from './completion';
import { completeReason, today } from './day';
import './index.scss';
import { DeleteWorkingQuestion } from '../SpellWorkings/delete-working';
import type { RecordWorkingDialogProps, WorkingParticipantValue } from './types';

// The form inside the Record a Working dialog, which records a draft working of a complete spell or
// changes one the caller recorded. Inside the modal so its discard guard reaches the modal's Close,
// Escape and backdrop. Save closes it and the page behind shows the draft; Complete goes on to the
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

const DAY = /^\d{4}-\d{2}-\d{2}$/;

const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export default function RecordWorkingForm({
  workspaceId,
  spellId,
  spellVisibility,
  members,
  recorderId,
  steps,
  working,
  deleteWorking,
  close,
}: Omit<RecordWorkingDialogProps, 'onClose' | 'returnTo'> & { close: () => void }): ReactElement {
  const { refresh } = usePendingNavigation();
  const ids = useId();
  const [initial] = useState(() => ({
    workedOn: working?.workedOn ?? today(),
    note: working?.note ?? '',
    visibility: working?.visibility ?? spellVisibility,
    participants:
      working?.participants ??
      members.filter((m) => m.userId === recorderId).map(({ userId, name }) => ({ userId, name })),
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
  const [deleting, setDeleting] = useState(false);
  // Once the delete is sent the form has nothing left to save.
  const [removed, setRemoved] = useState(false);

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
  const valid = DAY.test(workedOn);
  // A draft may be dated ahead; it is completed only once its day has come.
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
      onClick={() => void submit(true)}
    >
      Complete
    </button>
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
      className="form working-form"
      noValidate
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void submit(false);
      }}
    >
      {failure.alert && <Notice kind="error">{failure.alert}</Notice>}
      <FieldShell label="Date" required {...dateField}>
        <DateField
          id={dateField.controlId}
          labelledBy={dateField.labelId}
          value={workedOn}
          disabled={submitting}
          onChange={setWorkedOn}
          {...dateField.aria}
        />
      </FieldShell>
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
        label={complete ? 'Save Working' : 'Save as Draft'}
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
        {!complete &&
          (waitFor ? <IconTip tip={waitFor}>{completeButton}</IconTip> : completeButton)}
      </FormActions>
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
