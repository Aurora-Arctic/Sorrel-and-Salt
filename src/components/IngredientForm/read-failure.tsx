import type { ReactElement } from 'react';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import Notice from '../Notice';
import type { ReadFailureProps } from './types';

// A read of an entry that failed, in the error notice with Try Again beneath it. The sentence is the
// server's: "No such ingredient" for one deleted since, or else "That didn't work. Please try again."
export default function ReadFailure({ error, onRetry }: ReadFailureProps): ReactElement {
  return (
    <>
      <Notice kind="error">{readGraphqlFailure(error).alert}</Notice>
      <button type="button" className="btn btn--small" onClick={onRetry}>
        Try Again
      </button>
    </>
  );
}
