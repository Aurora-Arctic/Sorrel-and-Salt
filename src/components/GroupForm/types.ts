/**
 * Which group vocabulary the form writes: the category groups, whose rows
 * carry a chip's two colours, or the ingredient form groups, which carry none.
 */
export type GroupKind = 'category' | 'form';

/**
 * A live group, as the move picker offers it and the form names it; a
 * category group with its colours, which the pickers warn against standing
 * too close to.
 */
export interface GroupChoice {
  id: string;
  name: string;
  colorDark?: string;
  colorLight?: string;
}

/**
 * The fields as typed. A form group has no colours, so its two stay `''` and
 * its schema drops them before the request.
 */
export interface GroupValues {
  name: string;
  description: string;
  colorDark: string;
  colorLight: string;
}

/** The group being edited, as the form starts from it. */
export interface EditedGroup extends GroupValues {
  id: string;
}

export interface GroupFormProps {
  kind: GroupKind;
  /** The group to edit; none adds one. */
  group?: EditedGroup;
  /** Every live group, alphabetical (MB.35): the edited one's rows move to one of the others. */
  groups: readonly GroupChoice[];
  /** How many live rows are filed under the edited group, which a delete must move. */
  memberCount?: number;
  /** Called once the group is saved or deleted, and on Cancel: the owner closes it. */
  onDone: () => void;
}

/**
 * Where a delete stands: not begun; choosing where the group's rows go; or
 * asked to confirm, the rows' destination chosen when there are any.
 */
export type DeleteStep =
  { at: 'idle' } | { at: 'choosing' } | { at: 'confirming'; moveTo?: string };
