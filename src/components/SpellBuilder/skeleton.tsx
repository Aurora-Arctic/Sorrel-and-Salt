'use client';

import type { ReactElement } from 'react';
import { CollapsibleSection, FoldAll } from '../CollapsibleSection';
import {
  FormActions,
  FormHistoryButtons,
  FormHistoryContext,
  type FormHistory,
  VisibilitySwitch,
} from '../Field';
import { BinButton } from '../IconTip';
import { VISIBILITY_LABELS } from '../GrimoireList/params';
import SaveStatus from '../SaveStatus';
import Skeleton from '../Skeleton';
import { SkeletonWords } from '../Skeleton/text';
import { NOTHING_TO_SAVE, SECTION_NAMES } from '.';

const nothing = () => undefined;

/** Undo and Redo with nothing to undo, drawn off, as the form opens. */
const NO_HISTORY: FormHistory = {
  undo: nothing,
  redo: nothing,
  canUndo: false,
  canRedo: false,
  clear: nothing,
  announcement: '',
  undoButton: { current: null },
  redoButton: { current: null },
};

// A saved spell's form while it is on its way: the builder's own controls, drawn off and inert, with
// each shut section's line a bar. Duplicate or Mark Complete, which the spell's status picks, is a bar;
// the bin shows where the form's will.
export const SpellEditSkeleton = ({ canDelete }: { canDelete: boolean }): ReactElement => (
  <div className="form spell-builder" inert>
    <div className="collapsible-sections">
      <FoldAll anyOpen={false} onToggle={nothing} disabled />
      <FormHistoryContext.Provider value={NO_HISTORY}>
        <FormHistoryButtons />
      </FormHistoryContext.Provider>
      {SECTION_NAMES.map((name) => (
        <CollapsibleSection
          key={name}
          title={name}
          summary={<SkeletonWords count={4} />}
          fold={{ open: false, invalid: false, onToggle: nothing }}
        >
          {null}
        </CollapsibleSection>
      ))}
    </div>
    {/* On, as most of a coven's spells are shared: a shared spell's note carries its tip, a private one's does not. */}
    <div className="spell-builder__share">
      <VisibilitySwitch
        noun="spell"
        label={VISIBILITY_LABELS.workspace}
        brief
        checked
        onChange={nothing}
      />
    </div>
    <FormActions noun="Spell" dirty={false} submitting={false} saveReason={NOTHING_TO_SAVE}>
      <span className="spell-builder__pending-action">
        <Skeleton shape="block" />
      </span>
      <SaveStatus
        status="idle"
        savedAt={null}
        conflictMessage={null}
        onRetry={nothing}
        onReload={nothing}
        onKeepMine={nothing}
      />
      {canDelete && (
        <div className="form__aside spell-builder__delete">
          <BinButton verb="Delete Spell" name="" onClick={nothing} />
        </div>
      )}
    </FormActions>
  </div>
);
