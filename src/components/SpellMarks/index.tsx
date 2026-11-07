import type { ReactElement } from 'react';
import type { SpellMarksProps } from './types';

const SpellMarks = ({ status, visibility }: SpellMarksProps): ReactElement | null =>
  status === 'draft' || visibility === 'private' ? (
    <div className="specimen__badges">
      {status === 'draft' && <span className="badge badge--draft">Draft</span>}
      {visibility === 'private' && <span className="badge badge--private">Private</span>}
    </div>
  ) : null;

export default SpellMarks;
export type { SpellMarksProps } from './types';
