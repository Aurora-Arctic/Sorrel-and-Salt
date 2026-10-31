'use client';

import { type FormEvent, type ReactElement, useId, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import {
  ISSUE_LINK_EXPECTED,
  ISSUE_LINK_HINT,
  ISSUE_REPOSITORY,
  normaliseIssueLink,
} from '../../lib/support-path';
import BusyButton from '../BusyButton';
import { FieldShell, fieldDescription } from '../Field';
import IconTip from '../IconTip';
import { PencilIcon } from '../IconTip/icons';
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

const IssuePanel = ({
  request,
  canEdit = true,
}: {
  request: SupportRequestDetailEntry;
  /** A curator reads the link and cannot change it, so the pencil and the address form are left out. */
  canEdit?: boolean;
}): ReactElement => {
  const [editing, setEditing] = useState(false);
  const [address, setAddress] = useState(request.issueUrl ?? '');
  const [refused, setRefused] = useState(false);
  const { busy, failure, run } = useSupportAction('issueUrl');
  const { aria, ...field } = fieldDescription({
    id: useId(),
    note: ISSUE_LINK_HINT,
    error: refused ? ISSUE_LINK_EXPECTED : failure.field?.message,
  });
  const changed = address.trim() !== (request.issueUrl ?? '');
  const discard = useDiscardGuard(changed);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const link = address.trim() === '' ? null : normaliseIssueLink(address, ISSUE_REPOSITORY);
    if (address.trim() !== '' && link === null) {
      setRefused(true);
      return;
    }
    void run(
      () => graphqlRequest(SetIssueUrlDocument, { id: request.id, issueUrl: link }),
      link ? 'Issue address saved.' : 'Issue address removed.',
    );
  }

  const showForm = canEdit && (!request.issueUrl || editing);

  return (
    <section
      className={
        canEdit ? 'support-detail__issue' : 'support-detail__issue support-detail__issue--plain'
      }
      aria-label="Issue"
    >
      <h3>Issue</h3>
      {request.issueUrl && (
        <div className="support-detail__issue-line">
          {canEdit && !editing && (
            <IconTip tip="Change Issue Address">
              <button
                type="button"
                className="support-detail__icon support-detail__icon--standard"
                onClick={() => setEditing(true)}
              >
                <PencilIcon />
                <span className="visually-hidden">Change Issue Address</span>
              </button>
            </IconTip>
          )}
          <a href={request.issueUrl} target="_blank" rel="noopener noreferrer">
            {issueLabel(request.issueUrl)}
          </a>
        </div>
      )}
      {showForm && (
        <form className="form" noValidate onSubmit={submit}>
          {failure.alert && <Notice kind="error">{failure.alert}</Notice>}
          <FieldShell label="GitHub Issue" note={ISSUE_LINK_HINT} {...field}>
            <input
              id={field.controlId}
              className="input"
              type="url"
              autoComplete="off"
              placeholder="Paste the issue address"
              {...aria}
              value={address}
              disabled={busy}
              onChange={(event) => {
                setRefused(false);
                setAddress(event.target.value);
              }}
            />
          </FieldShell>
          <div className="form__actions">
            <BusyButton
              type="submit"
              className="btn btn--solid btn--medium"
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
