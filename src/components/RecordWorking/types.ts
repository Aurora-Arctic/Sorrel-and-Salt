/** An ingredient step of the spell, named so a preview row can say which step it is about. */
export interface WorkingStep {
  id: string;
  name: string;
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
}
