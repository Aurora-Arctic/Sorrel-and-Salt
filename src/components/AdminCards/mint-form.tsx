'use client';

import { type FormEvent, type ReactElement, useId, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import type { Failure } from '../../lib/types';
import { expiryOfDay } from '../../lib/utc';
import DateField from '../DateField';
import { FieldShell, FormActions, SwitchField, fieldDescription } from '../Field';
import { DiscardQuestion, RouteModal, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import MintedCards from './minted';
import type { MintedBatch } from './minted';
import {
  CARDS_PER_SHEET,
  DEFAULT_EXPIRY_DAYS,
  MAX_SHEETS_PER_BATCH,
} from '../../lib/invitation-cards/limits';
import type { MintFieldsProps, MintFormProps } from './types';

// The modal Mint Cards opens at `?mint`: how many sheets of cards and the day they stop working, sent as `createInvitationCards`.
// The answer carries each token once, so the modal then shows the codes and stays until closed; closing re-reads the tab.

const CreateInvitationCardsDocument = graphql(`
  mutation CreateInvitationCards($sheets: Int!, $expiresAt: DateTime!) {
    createInvitationCards(sheets: $sheets, expiresAt: $expiresAt) {
      batchId
      expiresAt
      tokens
    }
  }
`);

/** The modal's head, and the tab's action that opens it. */
export const MINT_TITLE = 'Mint Cards';

/** A day as an expiry: the end of that day in UTC-12, so the card lasts through its printed day everywhere. */
const expiryOf = (day: string): string => expiryOfDay(day).toISOString();

/** The first day an expiry may be: the day after today in UTC, as the service refuses an expiry at or before now. */
const earliestDay = (): string =>
  new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

/** The day the expiry starts at: today in UTC plus the default span, a calendar day the admin may change. */
const defaultDay = (): string =>
  new Date(Date.now() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

/** The sheets a field holds, or undefined while it is not a whole number the field can send. */
const sheetsOf = (text: string): number | undefined => {
  const sheets = Number(text);
  return text.trim() !== '' && Number.isInteger(sheets) ? sheets : undefined;
};

/** What the sheets come to, as typed: "27 cards"; empty while the field holds no whole number. */
const totalOf = (text: string): string | undefined => {
  const sheets = sheetsOf(text);
  if (sheets === undefined) return undefined;
  return `${sheets * CARDS_PER_SHEET} cards`;
};

const MintFields = ({ close }: MintFieldsProps): ReactElement => {
  const sheetsId = useId();
  const dayId = useId();
  const [sheets, setSheets] = useState('');
  const [first] = useState(defaultDay);
  const [day, setDay] = useState(first);
  const [printBacks, setPrintBacks] = useState(true);
  const [downloaded, setDownloaded] = useState(false);
  const [minting, setMinting] = useState(false);
  const [failure, setFailure] = useState<Failure>({});
  const [minted, setMinted] = useState<MintedBatch>();
  const sheetsField = fieldDescription({
    id: sheetsId,
    hint: `A Letter sheet holds ${CARDS_PER_SHEET} cards.`,
    error: failure.field?.name === 'sheets' ? failure.field.message : undefined,
  });
  const dayField = fieldDescription({
    id: dayId,
    error: failure.field?.name === 'expiresAt' ? failure.field.message : undefined,
  });
  const { aria: sheetsAria, ...sheetsShell } = sheetsField;
  const { aria: dayAria, ...dayShell } = dayField;

  // Anything typed or changed is a change; once minted the codes are what a way out would lose, until the PDF is saved.
  const discard = useDiscardGuard(minted ? !downloaded : sheets !== '' || day !== first);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const wanted = sheetsOf(sheets);
    if (wanted === undefined || !day) return;
    setMinting(true);
    setFailure({});
    try {
      const answer = await graphqlRequest(CreateInvitationCardsDocument, {
        sheets: wanted,
        expiresAt: expiryOf(day),
      });
      setMinting(false);
      setMinted(answer.createInvitationCards);
    } catch (error) {
      setMinting(false);
      setFailure(readGraphqlFailure(error, ['sheets', 'expiresAt']));
    }
  }

  if (minted) {
    return (
      <MintedCards
        batch={minted}
        printBacks={printBacks}
        guard={discard}
        onDownloaded={() => setDownloaded(true)}
        onDone={close}
      />
    );
  }

  return (
    <form className="form" noValidate onSubmit={(event) => void submit(event)}>
      <p>
        Each card admits one signed-in account, once. After minting, the only copy of the cards is
        the PDF you download; it cannot be made again.
      </p>
      {failure.alert && <Notice kind="error">{failure.alert}</Notice>}
      <FieldShell
        label="Number of Sheets"
        required
        hint={`A Letter sheet holds ${CARDS_PER_SHEET} cards.`}
        {...sheetsShell}
        after={
          <p className="admin-cards__total" aria-live="polite">
            {totalOf(sheets)}
          </p>
        }
      >
        <input
          id={sheetsShell.controlId}
          className="input"
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_SHEETS_PER_BATCH}
          step={1}
          placeholder={`1 to ${MAX_SHEETS_PER_BATCH}`}
          aria-required
          {...sheetsAria}
          value={sheets}
          disabled={minting}
          onChange={(event) => setSheets(event.target.value)}
        />
      </FieldShell>
      <div className="admin-cards__when">
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
        <SwitchField
          label="Print Backs"
          name="backs"
          value="1"
          checked={printBacks}
          disabled={minting}
          onChange={setPrintBacks}
        />
      </div>
      <FormActions
        noun="Cards"
        label="Mint Cards"
        busyLabel="Minting"
        dirty={sheetsOf(sheets) !== undefined && day !== ''}
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
