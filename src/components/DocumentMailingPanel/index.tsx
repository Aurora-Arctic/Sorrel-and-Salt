'use client';

import { type ReactElement, useId, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import ConfirmedAction from '../UserList/confirmed-action';
import type { DocumentMailingPanelProps } from './types';
import './index.scss';

// The editor page's panel for emailing every account about the published version: the button and its confirmation until the
// version is emailed, then the mailing's progress, with Resume while the provider's monthly allowance has paused it. The service
// is the guard (claude-docs/components/document-mailing-panel.md).

const EmailDocumentToEveryAccountDocument = graphql(`
  mutation EmailDocumentToEveryAccount($documentId: ID!, $summary: String!) {
    emailDocumentToEveryAccount(documentId: $documentId, summary: $summary) {
      versionNumber
      accountCount
      days
      current {
        id
        versionNumber
        state
        reached
        recipientCount
        startedAt
        finishedAt
      }
      inProgress {
        id
        versionNumber
        state
        reached
        recipientCount
        startedAt
        finishedAt
      }
    }
  }
`);

const ResumeDocumentMailingDocument = graphql(`
  mutation ResumeDocumentMailing($mailingId: ID!) {
    resumeDocumentMailing(mailingId: $mailingId) {
      versionNumber
      accountCount
      days
      current {
        id
        versionNumber
        state
        reached
        recipientCount
        startedAt
        finishedAt
      }
      inProgress {
        id
        versionNumber
        state
        reached
        recipientCount
        startedAt
        finishedAt
      }
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

const DocumentMailingPanel = ({
  documentId,
  documentKey,
  title,
  overview,
}: DocumentMailingPanelProps): ReactElement => {
  const { versionNumber, accountCount, days, current, inProgress } = overview;
  const [summary, setSummary] = useState('');
  const id = useId();
  const agreement = documentKey === 'terms';

  // On its own line, in the warning's colour, as how many it reaches is what makes the mailing high-risk.
  const reach = `That is ${count(accountCount)} ${accountCount === 1 ? 'account' : 'accounts'}, sent over ${days} ${days === 1 ? 'day' : 'days'}.`;

  const question = (
    <>
      Email every account about version {versionNumber} of <strong>{title}</strong>?
      {agreement && ' Each account is also asked to agree to the terms at its next visit.'}
      {inProgress &&
        ` The mailing of version ${inProgress.versionNumber} has reached ${count(inProgress.reached)} of ${count(inProgress.recipientCount)} accounts and stops here.`}
    </>
  );

  return (
    <section className="document-mailing" aria-labelledby={`${id}-heading`}>
      <h3 id={`${id}-heading`}>Email Every Account</h3>
      {current ? (
        <>
          <div
            className="document-mailing__progress"
            role="progressbar"
            aria-label={`Accounts emailed about version ${current.versionNumber}`}
            aria-valuemin={0}
            aria-valuenow={current.reached}
            aria-valuemax={current.recipientCount}
          >
            <span
              className="document-mailing__bar"
              style={{
                inlineSize: `${current.recipientCount === 0 ? 100 : Math.min(100, (current.reached / current.recipientCount) * 100)}%`,
              }}
            />
          </div>
          <p className="document-mailing__status">
            {count(current.reached)} of {count(current.recipientCount)} accounts reached.{' '}
            {STATE_TEXT[current.state]}
          </p>
          {current.state === 'paused' && (
            <ConfirmedAction
              label="Resume Mailing"
              accessibleName="Resume Mailing"
              openClass="btn btn--primary"
              title="Resume Mailing"
              question={`Resume the mailing of version ${current.versionNumber}? It carries on with the accounts it has not reached.`}
              busy="Resuming"
              confirmClass="btn btn--primary"
              send={() => graphqlRequest(ResumeDocumentMailingDocument, { mailingId: current.id })}
            />
          )}
        </>
      ) : (
        <>
          <p className="document-mailing__status">
            Version {versionNumber} has not been emailed. {count(accountCount)}{' '}
            {accountCount === 1 ? 'account' : 'accounts'} would be reached over {days}{' '}
            {days === 1 ? 'day' : 'days'}.
          </p>
          <ConfirmedAction
            label="Email Every Account"
            accessibleName="Email Every Account"
            confirmLabel="Send Emails"
            openClass="btn btn--destructive"
            title="Email Every Account"
            question={question}
            warning={reach}
            busy="Sending"
            confirmClass="btn btn--destructive"
            confirmDisabled={summary.trim() === ''}
            choices={(sending) => (
              <div className="field">
                <label htmlFor={`${id}-summary`}>Summary</label>
                <textarea
                  id={`${id}-summary`}
                  className="input"
                  rows={4}
                  aria-describedby={`${id}-hint`}
                  value={summary}
                  disabled={sending}
                  onChange={(event) => setSummary(event.target.value)}
                />
                <p id={`${id}-hint`} className="field__hint">
                  What changed, in your words. Every account reads it in the email.
                </p>
              </div>
            )}
            send={() =>
              graphqlRequest(EmailDocumentToEveryAccountDocument, {
                documentId,
                summary: summary.trim(),
              })
            }
          />
        </>
      )}
    </section>
  );
};

export default DocumentMailingPanel;
