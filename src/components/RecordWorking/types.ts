import type { StockDialogProps } from '../StockDialog/types';

/** An ingredient step of the spell, named so a preview line can say which step it is about and draw its jar. */
export interface WorkingStep {
  id: string;
  name: string;
  form?: string | null;
  seed?: string;
  /** A step that names its ingredient by typing it, so no jar is kept for it. */
  oneOff?: boolean;
  /**
   * Present only for a role that may edit stock and an ingredient not deleted: the jar opens it.
   */
  stock?: StockDialogProps | null;
}

export interface WorkingCompletionProps {
  workspaceId: string;
  spellId: string;
  workingId: string;
  steps: readonly WorkingStep[];
  onCompleted?: () => void;
  /** Leave without completing. */
  onBack: () => void;
}

export interface CompleteWorkingActionProps extends Omit<
  WorkingCompletionProps,
  'onBack' | 'onCompleted'
> {
  label?: string;
  workedOn?: string;
}

export interface WorkingMember {
  userId: string;
  name: string;
}

export interface WorkingParticipantValue {
  userId: string | null;
  name: string;
}

/** A working the dialog edits instead of recording: what it holds now. */
export interface EditableWorking {
  id: string;
  /** `YYYY-MM-DD`. */
  workedOn: string;
  note: string | null;
  visibility: 'private' | 'workspace';
  /** A complete working's visibility only widens. */
  status: 'draft' | 'complete';
  participants: readonly WorkingParticipantValue[];
}

export interface RecordWorkingDialogProps {
  workspaceId: string;
  spellId: string;
  /** A working is never visible to more people than its spell. */
  spellVisibility: 'private' | 'workspace';
  recorder?: WorkingMember;
  steps: readonly WorkingStep[];
  /** Present: the dialog changes this working (`updateWorking`) rather than recording a new one. Only its recorder may. */
  working?: EditableWorking;
  /**
   * Draws Delete Working on an edit; `remove` runs the write and rejects with the server's
   * refusal.
   */
  deleteWorking?: { name: string; remove: () => Promise<unknown> };
  onClose: () => void;
  /** Where the focus goes when it closes and the opener is gone. */
  returnTo?: (gone: Element | null) => HTMLElement | null | undefined;
}

export type RecordWorkingButtonProps = Omit<
  RecordWorkingDialogProps,
  'working' | 'onClose' | 'returnTo'
> & {
  spellName: string;
};
