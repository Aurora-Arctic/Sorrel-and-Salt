import type { ReactElement, ReactNode } from 'react';
import IconTip, { CopyIcon } from '../IconTip';
import LocalTime from '../LocalTime';

// The facts at the head of an opened request: Sent, Page and Error, with a fact before them and one beside Sent for the
// facts only one screen shows (From and Resolved for staff). Page takes a row of its own, so a path never sits beside a date.

export interface SupportFactsProps {
  createdAt: Date;
  path: string | null;
  errorCode: number | null;
  /** The crash digest; staff only, so the sender's dialog leaves it out and the Error fact shows the code alone. */
  errorReference?: string | null;
  /** Rows drawn before Sent. */
  lead?: ReactNode;
  /** Facts drawn after Sent, sharing its row. */
  afterSent?: ReactNode;
}

const SupportFacts = ({
  createdAt,
  path,
  errorCode,
  errorReference,
  lead,
  afterSent,
}: SupportFactsProps): ReactElement => (
  <dl className="support-detail__facts">
    {lead}
    <div>
      <dt>Sent</dt>
      <dd>
        <LocalTime at={createdAt} long />
      </dd>
    </div>
    {afterSent}
    {path && (
      <div className="support-detail__fact--wide">
        <dt>Page</dt>
        <dd className="support-detail__mono">{path}</dd>
      </div>
    )}
    {errorCode !== null && (
      <div>
        <dt>Error</dt>
        <dd>
          {errorCode}
          {errorReference && (
            <>
              {' '}
              <span aria-hidden="true">·</span>{' '}
              <span className="support-detail__mono">{errorReference}</span>
              <IconTip tip="Copy" placement="above">
                <button
                  type="button"
                  className="support-detail__copy"
                  onClick={() => void navigator.clipboard?.writeText(errorReference)}
                >
                  <CopyIcon />
                  <span className="visually-hidden">Copy Error Reference</span>
                </button>
              </IconTip>
            </>
          )}
        </dd>
      </div>
    )}
  </dl>
);

export default SupportFacts;
