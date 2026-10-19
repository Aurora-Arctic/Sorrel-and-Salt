import type { Story } from '@ladle/react';
import EntryMarks from '.';

// Render-only; what shows and when is asserted in tests/components/EntryMarks.
export default {
  title: 'Surfaces / Entry Marks',
};

const Row = ({ children }: { children: React.ReactNode }) => (
  <div className="badges">{children}</div>
);

export const Own: Story = () => (
  <Row>
    <EntryMarks kind="own" />
  </Row>
);

export const InCupboard: Story = () => (
  <Row>
    <EntryMarks kind="cupboard" />
  </Row>
);

export const InCupboardAnnotated: Story = () => (
  <Row>
    <EntryMarks kind="cupboard" annotated />
  </Row>
);

export const Retired: Story = () => (
  <Row>
    <EntryMarks kind="cupboard" retired annotated />
  </Row>
);

// Renders nothing: a compendium entry no cupboard names carries no mark.
export const NotInCupboard: Story = () => (
  <Row>
    <EntryMarks kind="compendium" />
  </Row>
);
