import type { ReactElement } from 'react';
import type { HelpWidgetName } from '../../lib/help-widgets';
import AutosaveStatusWidget from './autosave-status';
import InvitationRefusals from './invitation-refusals';
import RolePermissionTable from './role-permission-table';
import UnitConverter from './unit-converter';
import './index.scss';

// What a help body's `::widget[name]` paragraph draws, for each name the list holds. Two read server-only services,
// so this map is built only on the server: the form's preview leaves each tag as text
// (claude-docs/components/help-pages.md, "Widgets").

export const HELP_WIDGET_ELEMENTS: Readonly<Record<HelpWidgetName, ReactElement>> = {
  'unit-converter': <UnitConverter />,
  'invitation-refusals': <InvitationRefusals />,
  'role-permission-table': <RolePermissionTable />,
  'autosave-status': <AutosaveStatusWidget />,
};
