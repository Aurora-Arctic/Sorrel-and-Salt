import type { Route } from 'next';
import type { CardCategory } from '../CategoryChips/types';
import type { LastEditProps } from '../LastEdit/types';
import type { WorkingMember } from '../RecordWorking/types';
import type { SpellMoreMenuProps } from '../SpellRecipe/types';
import type { SpellStatus, SpellVisibility } from '@/modules/grimoire';

export interface SpellCardProps {
  id: string;
  href?: Route;
  editHref?: Route;
  recordWorking?: Pick<SpellCardRecordWorkingProps, 'workspaceId' | 'recorder'>;
  more?: Omit<SpellMoreMenuProps, 'spellId' | 'name' | 'canPrint'>;
  lookHref?: Route;
  title: string | null;
  intent: string | null;
  status: SpellStatus;
  visibility: SpellVisibility;
  /** The categories its author assigned it, what it intends; never the derived ones. */
  categories: readonly CardCategory[];
  lastEdit?: LastEditProps | null;
  workingCount?: number;
  level?: 2 | 3;
}

export interface SpellCardRecordWorkingProps {
  workspaceId: string;
  spellId: string;
  spellName: string;
  spellVisibility: SpellVisibility;
  recorder: WorkingMember;
}

/** Which spell card a skeleton stands for: a complete one, or a draft, which is taller. */
export type SpellCardSkeletonKind = 'spell' | 'spell-draft';
