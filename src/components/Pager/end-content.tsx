import type { ReactElement } from 'react';
import type { PagerEndContentProps } from './types';

// Not a client file, so the disabled end the server renders draws it too.
const PagerEndContent = ({ label }: PagerEndContentProps): ReactElement => {
  const mark = (
    <span className="pager__mark" aria-hidden="true">
      <span className="pager__chevron">{label === 'Prev' ? '‹' : '›'}</span>
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
