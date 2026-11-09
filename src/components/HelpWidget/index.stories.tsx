import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import AutosaveStatusWidget from './autosave-status';
import UnitConverter from './unit-converter';
import './index.scss';

// The two client widgets. The invitation refusals and the role table read server-only modules, so they have no
// story (.claude/rules/components.md).
const meta = {
  title: 'Pages / Help / HelpWidget',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const UnitConverterWidget: Story = {
  name: 'Unit Converter',
  render: () => <UnitConverter />,
};

export const AutosaveStatus: Story = {
  name: 'Autosave Status',
  render: () => <AutosaveStatusWidget />,
};
