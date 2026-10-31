'use client';

import { type FormEvent, type ReactElement, useId, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import BusyButton from '../BusyButton';
import { FieldShell, fieldDescription } from '../Field';
import { DiscardQuestion, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import { issueLabel } from './issue-link';
import type { SupportRequestDetailEntry } from './types';
import { useSupportAction } from './use-support-action';

// An admin tracks a bug in GitHub by hand and pastes the issue's address here to link it. Nothing is
// copied from the request into GitHub, as its message could hold private information.

const SetIssueUrlDocument = graphql(`
  mutation SetSupportRequestIssueUrl($id: ID!, $issueUrl: String) {
    setSupportRequestIssueUrl(id: $id, issueUrl: $issueUrl) {
      id
    }
  }
`);

const IssuePanel = ({ request }: { request: SupportRequestDetailEntry }): ReactElement => {
  const [editing, setEditing] = useState(false);
  const [address, setAddress] = useState(request.issueUrl ?? '');
  const { busy, failure, run } = useSupportAction('issueUrl');
  const { aria, ...field } = fieldDescription({ id: useId(), error: failure.field?.message });
  const changed = address.trim() !== (request.issueUrl ?? '');
  const discard = useDiscardGuard(changed);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(
      () =>
        graphqlRequest(SetIssueUrlDocument, { id: request.id, issueUrl: address.trim() || null }),
      address.trim() ? 'Issue address saved.' : 'Issue address removed.',
    );
  }

  const showForm = !request.issueUrl || editing;

  return (
    <section className="support-detail__issue" aria-label="Issue">
      <h3>Issue</h3>
      {request.issueUrl && (
        <div className="support-detail__issue-line">
          <a href={request.issueUrl} target="_blank" rel="noopener noreferrer">
            {issueLabel(request.issueUrl)}
          </a>
          {!editing && (
            <button
              type="button"
              className="btn btn--quiet btn--small"
              onClick={() => setEditing(true)}
            >
              Change
            </button>
          )}
        </div>
      )}
      {showForm && (
        <form className="form" noValidate onSubmit={submit}>
          {failure.alert && <Notice kind="error">{failure.alert}</Notice>}
          <FieldShell label="Issue Address" {...field}>
            <input
              id={field.controlId}
              className="input"
              type="url"
              autoComplete="off"
              placeholder="Paste the issue address"
              {...aria}
              value={address}
              disabled={busy}
              onChange={(event) => setAddress(event.target.value)}
            />
          </FieldShell>
          <div className="form__actions">
            <BusyButton
              type="submit"
              className="btn btn--solid"
              disabled={!changed || busy}
              busy={busy}
              busyLabel="Saving Address"
            >
              Save Address
            </BusyButton>
          </div>
          {discard.asking && <DiscardQuestion guard={discard} />}
        </form>
      )}
    </section>
  );
};

export default IssuePanel;
