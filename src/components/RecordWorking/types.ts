import type { StockDialogProps } from '../StockDialog/types';

/** An ingredient step of the spell, named so a preview line can say which step it is about and draw its jar. */
export interface WorkingStep {
  id: string;
  name: string;
  /** The form laid, as stored: it picks the jar's shape. */
  form?: string | null;
  /** What picks the jar's shape with the form: the ingredient's id, or a one-off's name. */
  seed?: string;
  /** A step that names its ingredient by typing it, so no jar is kept for it. */
  oneOff?: boolean;
  /** Present only for a role that may edit stock, and an ingredient not deleted: the jar opens this dialog. */
  stock?: StockDialogProps | null;
}

export interface WorkingCompletionProps {
  workspaceId: string;
  spellId: string;
  workingId: string;
  /** The spell's ingredient steps in order: the preview lists them in this order. */
  steps: readonly WorkingStep[];
  /** The working is complete: the page behind reads again, and the panel shows what was not deducted. */
  onCompleted?: () => void;
  /** Leave without completing. */
  onBack: () => void;
}

export interface CompleteWorkingActionProps extends Omit<
  WorkingCompletionProps,
  'onBack' | 'onCompleted'
> {
  /** Names the working in the button's accessible name when a page lists several. */
  label?: string;
  /** The working's day: a draft dated after today has Complete off. */
  workedOn?: string;
}

/** A coven member the participants box suggests. */
export interface WorkingMember {
  userId: string;
  name: string;
}

/** Who took part: a member by id (named as their row last held), or a name typed for anyone else (`userId` null). */
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
  members: readonly WorkingMember[];
  /** The signed-in member recording: a new working starts with them as a participant, who may remove themselves. */
  recorderId?: string;
  steps: readonly WorkingStep[];
  /** Present: the dialog changes this working (`updateWorking`) rather than recording a new one. Only its recorder may. */
  working?: EditableWorking;
  /** Draws Delete Working on an edit, for a viewer who may delete the working: `name` is the day it was worked, `remove` runs the write and rejects with the server's refusal. */
  deleteWorking?: { name: string; remove: () => Promise<unknown> };
  onClose: () => void;
  /** Where the focus goes when it closes and the opener is gone. */
  returnTo?: (gone: Element | null) => HTMLElement | null | undefined;
}

export type RecordWorkingButtonProps = Omit<
  RecordWorkingDialogProps,
  'working' | 'onClose' | 'returnTo'
>;
