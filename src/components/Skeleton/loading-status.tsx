import type { ReactElement, ReactNode } from 'react';

// The one "Loading" status a wait announces, beside the skeleton drawn for the eye. A skeleton that
// is not quiet carries its own; a host of a body skeleton, which carries none, wraps it in this.
const LoadingStatus = ({ children }: { children: ReactNode }): ReactElement => (
  <>
    <output className="visually-hidden">Loading</output>
    {children}
  </>
);

export default LoadingStatus;
