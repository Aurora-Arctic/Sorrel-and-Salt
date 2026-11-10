'use client';

import { TERMS_LEDE, TERMS_TITLE } from './head';
import { useMutation } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';
import { graphql } from '@/lib/graphql-document';
import { formatAgreementVersion } from '../../lib/agreement-version';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { graphqlRequest } from '../../lib/graphql-client';
import type { AgreementDocumentKey } from '../../lib/types';
import { dayInUtc } from '../../lib/utc';
import BusyButton from '../BusyButton';
import Notice from '../Notice';
import PageHeader from '../PageHeader';
import type { TermsAgreementProps } from './types';
import './index.scss';
import { reportLeaving } from '../../lib/navigation';

// The server refuses a version no longer in force (claude-docs/auth/admin-bootstrap.md, "The terms page").

const DOCUMENT_TITLES: Record<AgreementDocumentKey, string> = {
  terms: TERMS_TITLE,
  disclaimer: 'Disclaimer',
  'code-of-ethics': 'Code of Ethics',
};

const AgreeToTermsDocument = graphql(`
  mutation AgreeToTerms($version: AgreementVersionInput!) {
    agreeToTerms(version: $version) {
      id
      agreedTermsVersion
      agreedDisclaimerVersion
      agreedEthicsVersion
    }
  }
`);

const TermsAgreement = ({
  version,
  changed,
  updatedOn,
  destination,
}: TermsAgreementProps): ReactElement => {
  const [alert, setAlert] = useState<string>();

  const mutation = useMutation({
    mutationFn: () => graphqlRequest(AgreeToTermsDocument, { version }),
    // A full navigation, not the router's: the router may hold the redirect to this page as the answer for the page asked for.
    onSuccess: () => {
      reportLeaving();
      window.location.assign(destination);
    },
    onError: (failure) => setAlert(readGraphqlFailure(failure, []).alert),
  });

  // Busy through the navigation too: the page stays up until the next one loads, and a second press would ask again.
  const recording = mutation.isPending || mutation.isSuccess;

  return (
    <div className="terms-agreement">
      <PageHeader title={TERMS_TITLE} lede={TERMS_LEDE} />
      <p className="terms-agreement__version">
        Version {formatAgreementVersion(version)}, last updated{' '}
        <time dateTime={updatedOn}>{dayInUtc(new Date(updatedOn))}</time>
      </p>
      <p>
        The terms include the{' '}
        <a href="/disclaimer" target="_blank">
          Disclaimer
        </a>{' '}
        and the{' '}
        <a href="/code-of-ethics" target="_blank">
          Code of Ethics
        </a>
        , and agreeing to the terms is agreeing to them too.
      </p>
      {changed.length > 0 && (
        <section className="terms-agreement__changed" aria-labelledby="terms-agreement-changed">
          <h2 id="terms-agreement-changed">Updated Since You Last Agreed</h2>
          <ul>
            {changed.map((key) => (
              <li key={key}>
                <a href={`/${key}`} target="_blank">
                  {DOCUMENT_TITLES[key]}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      {alert && <Notice kind="error">{alert}</Notice>}
      <p className="terms-agreement__actions">
        <a className="btn btn--quiet" href="/terms" target="_blank">
          Read the Terms of Use
        </a>
        <BusyButton
          className="btn btn--solid"
          busy={recording}
          busyLabel="Agreeing"
          disabled={recording}
          onClick={() => {
            setAlert(undefined);
            mutation.mutate();
          }}
        >
          Agree & Continue
        </BusyButton>{' '}
      </p>
    </div>
  );
};

export default TermsAgreement;
