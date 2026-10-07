import type { ReactElement } from 'react';
import type { PagerEndContentProps } from './types';

// An end's label and its chevron, the chevron on the side it points to, or
// the spinner in the chevron's place while the end's page is on the way. Not
// a client file, so the disabled end the server renders draws it too.
const PagerEndContent = ({ label, busy = false }: PagerEndContentProps): ReactElement => {
  const mark = (
    <span className="pager__mark" aria-hidden="true">
      {busy ? (
        <span className="spinner" />
      ) : (
        <span className="pager__chevron">{label === 'Prev' ? '‹' : '›'}</span>
      )}
    </span>
  );
  return label === 'Prev' ? (
    <>
      {mark}
      {label}
    </>
  ) : (
    <>
      {label}
      {mark}
    </>
  );
};

export default PagerEndContent;
