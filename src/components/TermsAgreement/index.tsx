'use client';

import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';
import { graphql } from '../../gql';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { graphqlRequest } from '../../lib/graphql-client';
import { dayInUtc } from '../../lib/utc';
import BusyButton from '../BusyButton';
import Notice from '../Notice';
import PageHeader from '../PageHeader';
import type { TermsAgreementProps } from './types';
import './index.scss';

// The acceptance page's body: where to read the terms, and the one button that records agreement. The mutation names the version
// shown, and the server refuses one no longer in force (claude-docs/auth/admin-bootstrap.md, "The terms page").

const AgreeToTermsDocument = graphql(`
  mutation AgreeToTerms($version: Int!) {
    agreeToTerms(version: $version) {
      id
      agreedTermsVersion
    }
  }
`);

const TermsAgreement = ({ version, updatedOn, destination }: TermsAgreementProps): ReactElement => {
  const [alert, setAlert] = useState<string>();

  const mutation = useMutation({
    mutationFn: () => graphqlRequest(AgreeToTermsDocument, { version }),
    // A full navigation, not the router's: the router may hold the redirect to this page as the answer for the page asked for.
    onSuccess: () => window.location.assign(destination),
    onError: (failure) => setAlert(readGraphqlFailure(failure, []).alert),
  });

  // Busy through the navigation too: the page stays up until the next one loads, and a second press would ask again.
  const recording = mutation.isPending || mutation.isSuccess;

  return (
    <div className="terms-agreement">
      <PageHeader
        title="Terms of Use"
        lede="Read the terms of use, then agree to them to carry on. You agree again only when they change."
      />
      <p className="terms-agreement__version">
        Version {version}, last updated{' '}
        <time dateTime={updatedOn}>{dayInUtc(new Date(updatedOn))}</time>
      </p>
      <p>
        The terms include the{' '}
        <Link href="/disclaimer" target="_blank">
          Disclaimer
        </Link>{' '}
        and the{' '}
        <Link href="/code-of-ethics" target="_blank">
          Code of Ethics
        </Link>
        , and agreeing to the terms is agreeing to them too.
      </p>
      {alert && <Notice kind="error">{alert}</Notice>}
      <p className="terms-agreement__actions">
        <Link className="btn btn--quiet" href="/terms" target="_blank">
          Read the Terms of Use
        </Link>
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
