import type { Story } from '@ladle/react';
import LastEdit from '.';

// Render-only; what shows and when is asserted in tests/components/LastEdit.
export default {
  title: 'Surfaces / Last Edit',
};

const DAYS_AGO = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

export const Named: Story = () => <LastEdit by="Fixture A" at={DAYS_AGO(3)} />;

// An editor the viewer cannot name: the time stays, the name goes.
export const Unnamed: Story = () => <LastEdit by={null} at={DAYS_AGO(40)} />;
