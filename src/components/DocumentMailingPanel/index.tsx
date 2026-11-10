'use client';

import { type ReactElement, useId, useState } from 'react';
import { graphql } from '@/lib/graphql-document';
import { asksAgreement } from '../../lib/agreement-version';
import { graphqlRequest } from '../../lib/graphql-client';
import { PlainTextField } from '../Field';
import ConfirmedAction from '../ConfirmedAction';
import Notice from '../Notice';
import type { DocumentMailingPanelProps, MailingProgressProps } from './types';
import './index.scss';
import { plural } from '@/lib/text';

// The service is the guard (claude-docs/components/document-mailing-panel.md).

const EmailDocumentsToEveryAccountDocument = graphql(`
  mutation EmailDocumentsToEveryAccount($summaries: [DocumentMailingSummaryInput!]!) {
    emailDocumentsToEveryAccount(summaries: $summaries) {
      canSend
    }
  }
`);

const ResumeDocumentMailingDocument = graphql(`
  mutation ResumeDocumentMailing($mailingId: ID!) {
    resumeDocumentMailing(mailingId: $mailingId) {
      canSend
    }
  }
`);

const STATE_TEXT = {
  queued: 'Waiting behind an older mailing, which starts this one when it ends.',
  sending: 'Sending.',
  waiting: 'Today’s allowance is used. Sending carries on tomorrow.',
  paused:
    'Paused: the mail provider’s monthly allowance is used. Resume it once the allowance renews.',
  sent: 'Sent to every account.',
  replaced: 'Replaced by a newer mailing.',
} as const;

const count = (n: number): string => n.toLocaleString('en-GB');

const titlesOf = (titles: readonly string[]): string =>
  titles.length <= 2
    ? titles.join(' and ')
    : `${titles.slice(0, -1).join(', ')}, and ${titles[titles.length - 1]}`;

const MailingProgress = ({ mailing }: MailingProgressProps): ReactElement => {
  const titles = titlesOf(mailing.documents.map((document) => document.title));
  return (
    <div className="document-mailing__mailing">
      <div
        className="document-mailing__progress"
        role="progressbar"
        aria-label={`Accounts emailed about the ${titles}`}
        aria-valuemin={0}
        aria-valuenow={mailing.reached}
        aria-valuemax={mailing.recipientCount}
      >
        <span
          className="document-mailing__bar"
          style={{
            inlineSize: `${mailing.recipientCount === 0 ? 100 : Math.min(100, (mailing.reached / mailing.recipientCount) * 100)}%`,
          }}
        />
      </div>
      <p className="document-mailing__status">
        The {titles}: {count(mailing.reached)} of {count(mailing.recipientCount)} accounts reached.{' '}
        {STATE_TEXT[mailing.state]}
      </p>
      {mailing.state === 'paused' && (
        <ConfirmedAction
          label="Resume Mailing"
          accessibleName="Resume Mailing"
          openClass="btn btn--primary"
          title="Resume Mailing"
          question={`Resume the mailing of the ${titles}? It carries on with the accounts it has not reached.`}
          busy="Resuming"
          confirmClass="btn btn--primary"
          send={() => graphqlRequest(ResumeDocumentMailingDocument, { mailingId: mailing.id })}
        />
      )}
    </div>
  );
};

const DocumentMailingPanel = ({ overview }: DocumentMailingPanelProps): ReactElement => {
  const { pending, accountCount, days, canSend, open, lastSent } = overview;
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const id = useId();
  const summaryOf = (versionId: string): string => summaries[versionId] ?? '';
  const written = pending.every((document) => summaryOf(document.versionId).trim() !== '');
  const titles = titlesOf(pending.map((document) => document.title));
  const reached = open.reduce((sum, mailing) => sum + mailing.reached, 0);
  const recipients = open.reduce((sum, mailing) => sum + mailing.recipientCount, 0);

  // On its own line, in the warning's colour, as how many it reaches is what makes the mailing high-risk.
  const reach = `That is ${count(accountCount)} ${plural(accountCount, 'account', 'accounts')}, sent over ${days} ${plural(days, 'day', 'days')}.`;

  const question = (
    <>
      Email every account about the <strong>{titles}</strong>?
      {asksAgreement(pending) && ' Each account is also asked to agree again at its next visit.'}
      {open.length > 0 &&
        ` The mailing in progress has reached ${count(reached)} of ${count(recipients)} accounts and stops here.`}
    </>
  );

  return (
    <section className="document-mailing" aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`}>Email Every Account</h2>
      {open.map((mailing) => (
        <MailingProgress key={mailing.id} mailing={mailing} />
      ))}
      {pending.length === 0 && (
        <p className="document-mailing__status">No document has changed since the last email.</p>
      )}
      {canSend && (
        <>
          <p className="document-mailing__status">Changed since the last email: the {titles}.</p>
          <Notice kind="warn" quiet className="document-mailing__reach">
            {count(accountCount)} {plural(accountCount, 'account', 'accounts')} would be reached
            over {days} {plural(days, 'day', 'days')}.
          </Notice>
          {pending.map((document) => (
            <PlainTextField
              key={document.versionId}
              name={`summary-${document.versionId}`}
              label={`Summary of the ${document.title}`}
              hint={`What changed in version ${document.versionNumber}, in your words. Every account reads it in the email.`}
              required
              multiline
              rows={4}
              value={summaryOf(document.versionId)}
              onChange={(next) =>
                setSummaries((current) => ({ ...current, [document.versionId]: next }))
              }
            />
          ))}
          <ConfirmedAction
            label="Email Every Account"
            accessibleName="Email Every Account"
            confirmLabel="Send Emails"
            openClass="btn btn--destructive"
            disabled={!written}
            title="Email Every Account"
            question={question}
            warning={reach}
            busy="Sending"
            confirmClass="btn btn--destructive"
            send={() =>
              graphqlRequest(EmailDocumentsToEveryAccountDocument, {
                summaries: pending.map((document) => ({
                  versionId: document.versionId,
                  summary: summaryOf(document.versionId).trim(),
                })),
              })
            }
          />
        </>
      )}
      {lastSent && (
        <>
          <h3>Last Email</h3>
          <MailingProgress mailing={lastSent} />
        </>
      )}
    </section>
  );
};

export default DocumentMailingPanel;
