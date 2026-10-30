'use client';

import { type FormEvent, type ReactElement, useId, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import type { Failure } from '../../lib/types';
import DateField from '../DateField';
import { FieldShell, FormActions, fieldDescription } from '../Field';
import { DiscardQuestion, RouteModal, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import MintedCards from './minted';
import type { MintedBatch } from './minted';
import { MAX_CARDS_PER_BATCH } from './limits';
import type { MintFieldsProps, MintFormProps } from './types';

// The modal Mint Cards opens at `?mint`: how many cards and the day they stop working, sent as `createInvitationCards`.
// The answer carries each token once, so the modal then shows the codes and stays until closed; closing re-reads the tab.

const CreateInvitationCardsDocument = graphql(`
  mutation CreateInvitationCards($count: Int!, $expiresAt: DateTime!) {
    createInvitationCards(count: $count, expiresAt: $expiresAt) {
      batchId
      expiresAt
      tokens
    }
  }
`);

/** The modal's head, and the tab's action that opens it. */
export const MINT_TITLE = 'Mint Cards';

/** A day as an expiry: midnight UTC at its start, as an invitation's is. */
const expiryOf = (day: string): string => `${day}T00:00:00.000Z`;

/** The first day an expiry may be: the day after today in UTC, as the service refuses an expiry at or before now. */
const earliestDay = (): string =>
  new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

/** The count a field holds, or undefined while it is not a whole number the field can send. */
const countOf = (text: string): number | undefined => {
  const count = Number(text);
  return text.trim() !== '' && Number.isInteger(count) ? count : undefined;
};

const MintFields = ({ close }: MintFieldsProps): ReactElement => {
  const countId = useId();
  const dayId = useId();
  const [count, setCount] = useState('');
  const [day, setDay] = useState('');
  const [minting, setMinting] = useState(false);
  const [failure, setFailure] = useState<Failure>({});
  const [minted, setMinted] = useState<MintedBatch>();
  const countField = fieldDescription({
    id: countId,
    error: failure.field?.name === 'count' ? failure.field.message : undefined,
  });
  const dayField = fieldDescription({
    id: dayId,
    error: failure.field?.name === 'expiresAt' ? failure.field.message : undefined,
  });
  const { aria: countAria, ...countShell } = countField;
  const { aria: dayAria, ...dayShell } = dayField;

  // Anything typed is a change; once minted there is nothing left to lose but the codes, which the notice names.
  const discard = useDiscardGuard(!minted && (count !== '' || day !== ''));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const wanted = countOf(count);
    if (wanted === undefined || !day) return;
    setMinting(true);
    setFailure({});
    try {
      const answer = await graphqlRequest(CreateInvitationCardsDocument, {
        count: wanted,
        expiresAt: expiryOf(day),
      });
      setMinting(false);
      setMinted(answer.createInvitationCards);
    } catch (error) {
      setMinting(false);
      setFailure(readGraphqlFailure(error, ['count', 'expiresAt']));
    }
  }

  if (minted) return <MintedCards batch={minted} onDone={close} />;

  return (
    <form className="form" noValidate onSubmit={(event) => void submit(event)}>
      <p>
        Each card admits one signed-in account, once. The codes are shown after minting and cannot
        be shown again.
      </p>
      {failure.alert && <Notice kind="error">{failure.alert}</Notice>}
      <FieldShell label="Number of Cards" required {...countShell}>
        <input
          id={countShell.controlId}
          className="input"
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_CARDS_PER_BATCH}
          step={1}
          placeholder={`1 to ${MAX_CARDS_PER_BATCH}`}
          aria-required
          {...countAria}
          value={count}
          disabled={minting}
          onChange={(event) => setCount(event.target.value)}
        />
      </FieldShell>
      <FieldShell label="Expires On" required {...dayShell}>
        <DateField
          id={dayShell.controlId}
          labelledBy={dayShell.labelId}
          value={day}
          min={earliestDay()}
          disabled={minting}
          onChange={setDay}
          {...dayAria}
        />
      </FieldShell>
      <FormActions
        noun="Cards"
        label="Mint Cards"
        busyLabel="Minting"
        dirty={countOf(count) !== undefined && day !== ''}
        submitting={minting}
        holdCancel
        onCancel={() => discard.request(close)}
      />
      {discard.asking && <DiscardQuestion guard={discard} />}
    </form>
  );
};

// The tab's one modal place, rendered whether or not `?mint` is open, so the press shows it at once.
const MintForm = ({ open, closeHref }: MintFormProps): ReactElement => (
  <RouteModal
    closeHref={closeHref}
    content={
      open
        ? { heading: { title: MINT_TITLE }, body: (close) => <MintFields close={close} /> }
        : undefined
    }
  />
);

export default MintForm;
