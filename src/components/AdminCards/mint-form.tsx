'use client';

import { type FormEvent, type ReactElement, useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { graphql } from '@/lib/graphql-document';
import { MS_PER_DAY } from '../../lib/duration';
import { graphqlRequest } from '../../lib/graphql-client';
import { useFormSend } from '../../lib/use-form-send';
import { expiryOfDay } from '../../lib/utc';
import DateField from '../DateField';
import { FieldShell, FormActions, PlainTextField, SwitchField, fieldDescription } from '../Field';
import { DiscardQuestion, RouteModal, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import MintedCards from './minted';
import type { MintedBatch } from './minted';
import {
  CARDS_PER_SHEET,
  DEFAULT_EXPIRY_DAYS,
  MAX_NOTE_LENGTH,
  MAX_SHEETS_PER_BATCH,
} from '../../lib/invitation-cards/limits';
import type { MintFieldsProps, MintFormProps } from './types';

// The answer carries each token once, so the modal then shows the codes and stays until closed; closing re-reads the tab.

const CreateInvitationCardsDocument = graphql(`
  mutation CreateInvitationCards(
    $sheets: Int!
    $expiresAt: DateTime!
    $beta: Boolean!
    $note: String
  ) {
    createInvitationCards(sheets: $sheets, expiresAt: $expiresAt, beta: $beta, note: $note) {
      batchId
      expiresAt
      tokens
    }
  }
`);

const NOTE_HINT =
  'Shown to keepers beside the batch on the Invitation Cards tab, and searchable there.';

export const MINT_TITLE = 'Mint Cards';

export const SHEETS_REQUIRED = 'Enter how many sheets to mint, like 3';

/** A day as an expiry: the end of that day in UTC-12, so the card lasts through its printed day everywhere. */
const expiryOf = (day: string): string => expiryOfDay(day).toISOString();

/** The day after today in UTC: the service refuses an expiry at or before now. */
const earliestDay = (): string => new Date(Date.now() + MS_PER_DAY).toISOString().slice(0, 10);

const defaultDay = (): string =>
  new Date(Date.now() + DEFAULT_EXPIRY_DAYS * MS_PER_DAY).toISOString().slice(0, 10);

/** A decimal count is rounded to the nearest whole sheet, not refused. */
const wholeSheets = (text: string): string => {
  const sheets = Number(text);
  return text.trim() !== '' && Number.isFinite(sheets) && !Number.isInteger(sheets)
    ? String(Math.round(sheets))
    : text;
};

const sheetsOf = (typed: string): number | undefined => {
  const text = wholeSheets(typed);
  const sheets = Number(text);
  return text.trim() !== '' && Number.isInteger(sheets) ? sheets : undefined;
};

const sheetsRefusal = (text: string): string | undefined => {
  if (text.trim() === '') return undefined;
  const sheets = sheetsOf(text);
  const inRange = sheets !== undefined && sheets >= 1 && sheets <= MAX_SHEETS_PER_BATCH;
  return inRange ? undefined : `A batch is from 1 to ${MAX_SHEETS_PER_BATCH} sheets`;
};

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
  const [note, setNote] = useState('');
  const [beta, setBeta] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const { sending: minting, failure, send } = useFormSend(['sheets', 'expiresAt', 'note']);
  const [minted, setMinted] = useState<MintedBatch>();
  const [pressed, setPressed] = useState(false);
  const sheetsRef = useRef<HTMLInputElement>(null);
  const [totalRow, setTotalRow] = useState<HTMLDivElement | null>(null);
  const sheetsField = fieldDescription({
    id: sheetsId,
    hint: `A Letter sheet holds ${CARDS_PER_SHEET} cards.`,
    error:
      sheetsRefusal(sheets) ??
      (pressed && sheets.trim() === '' ? SHEETS_REQUIRED : undefined) ??
      (failure.field?.name === 'sheets' ? failure.field.message : undefined),
  });
  const dayField = fieldDescription({
    id: dayId,
    error: failure.field?.name === 'expiresAt' ? failure.field.message : undefined,
  });
  const { aria: sheetsAria, ...sheetsShell } = sheetsField;
  const { aria: dayAria, ...dayShell } = dayField;

  // Anything typed or changed is a change; once minted the codes are what a way out would lose, until the PDF is saved.
  const discard = useDiscardGuard(
    minted ? !downloaded : sheets !== '' || day !== first || note !== '' || beta,
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const wanted = sheetsOf(sheets);
    if (wanted === undefined || sheetsRefusal(sheets)) {
      flushSync(() => {
        setPressed(true);
        setSheets(wholeSheets(sheets));
      });
      sheetsRef.current?.focus();
      return;
    }
    await send(async () => {
      const answer = await graphqlRequest(CreateInvitationCardsDocument, {
        sheets: wanted,
        expiresAt: expiryOf(day),
        beta,
        note: note.trim() || undefined,
      });
      setMinted(answer.createInvitationCards);
    });
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
      <div className="admin-cards__when">
        <FieldShell
          label="Number of Sheets"
          required
          hint={`A Letter sheet holds ${CARDS_PER_SHEET} cards.`}
          {...sheetsShell}
          errorInto={totalRow}
          after={
            // The refusal takes the total line's place, so the row keeps its height.
            <div
              ref={setTotalRow}
              className={`admin-cards__total${sheetsShell.error ? ' admin-cards__total--error' : ''}`}
            >
              {!sheetsShell.error && <span aria-live="polite">{totalOf(sheets)}</span>}
            </div>
          }
        >
          <input
            id={sheetsShell.controlId}
            className="input"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_SHEETS_PER_BATCH}
            name="sheets"
            step={1}
            placeholder={`1 to ${MAX_SHEETS_PER_BATCH}`}
            aria-required
            {...sheetsAria}
            value={sheets}
            disabled={minting}
            ref={sheetsRef}
            onChange={(event) => setSheets(event.target.value)}
            onBlur={() => setSheets(wholeSheets)}
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
      </div>
      <PlainTextField
        name="note"
        label="Note"
        hint={NOTE_HINT}
        multiline
        rows={3}
        placeholder="Add a note"
        limit={MAX_NOTE_LENGTH}
        value={note}
        disabled={minting}
        error={failure.field?.name === 'note' ? failure.field.message : undefined}
        onChange={setNote}
      />
      <div className="admin-cards__switches">
        <SwitchField
          label="Print Backs"
          name="backs"
          value="1"
          checked={printBacks}
          disabled={minting}
          onChange={setPrintBacks}
        />
        <SwitchField
          label="Beta Testers"
          name="beta"
          value="1"
          checked={beta}
          disabled={minting}
          onChange={setBeta}
        />
      </div>
      <FormActions
        noun="Cards"
        label="Mint Cards"
        busyLabel="Minting"
        dirty
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
