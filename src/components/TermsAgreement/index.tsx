'use client';

import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';
import { graphql } from '../../gql';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { graphqlRequest } from '../../lib/graphql-client';
import { dayInUtc } from '../../lib/utc';
import Notice from '../Notice';
import PageHeader from '../PageHeader';
import type { TermsAgreementProps } from './types';
import './index.scss';

// The acceptance page's body: where to read the terms, and the one button that records agreement. The mutation takes no
// version; the server records the one in force (claude-docs/auth/admin-bootstrap.md, "The terms page").

const AgreeToTermsDocument = graphql(`
  mutation AgreeToTerms {
    agreeToTerms {
      id
      termsVersion
    }
  }
`);

const TermsAgreement = ({ version, updatedOn, destination }: TermsAgreementProps): ReactElement => {
  const [alert, setAlert] = useState<string>();

  const mutation = useMutation({
    mutationFn: () => graphqlRequest(AgreeToTermsDocument, {}),
    // A full navigation, not the router's: the router may hold the redirect to this page as the answer for the page asked for.
    onSuccess: () => window.location.assign(destination),
    onError: (failure) => setAlert(readGraphqlFailure(failure, []).alert),
  });

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
      {alert && <Notice kind="error">{alert}</Notice>}
      <p className="terms-agreement__actions">
        <Link className="btn btn--quiet" href="/terms" target="_blank">
          Read the Terms of Use
        </Link>
        <button
          type="button"
          className="btn btn--solid"
          disabled={mutation.isPending}
          onClick={() => {
            setAlert(undefined);
            mutation.mutate();
          }}
        >
          {mutation.isPending ? 'Agreeing' : 'Agree & Continue'}
        </button>
      </p>
    </div>
  );
};

export default TermsAgreement;
