import type { Story } from '@ladle/react';
import { type ReactElement, useEffect } from 'react';
import ActionFailure, { useActionFailure } from '.';

// Render-only; where the refusal lands is asserted in
// tests/components/ActionFailure. The buttons stand for a page's actions,
// each reporting the refusal its service would give.
export default {
  title: 'Surfaces / Action Failure',
};

const REFUSAL = 'Only an owner can delete this coven.';

const Action = ({
  label,
  className = 'btn',
}: {
  label: string;
  className?: string;
}): ReactElement => {
  const failure = useActionFailure();
  return (
    <button type="button" className={className} onClick={() => failure?.report(REFUSAL)}>
      {label}
    </button>
  );
};

// Already refused, as after a press: the alert above both buttons.
const Refusing = (): null => {
  const failure = useActionFailure();
  useEffect(() => failure?.report(REFUSAL), [failure]);
  return null;
};

const Actions = ({ refused }: { refused?: boolean }) => (
  <ActionFailure>
    {refused && <Refusing />}
    <div className="modal__actions">
      <Action label="Leave Coven" />
      <Action label="Delete Coven" className="btn btn--destructive" />
    </div>
  </ActionFailure>
);

// Press either button for its refusal, said once above both.
export const Default: Story = () => <Actions />;

export const Refused: Story = () => <Actions refused />;

export const PhoneDark: Story = () => <Actions refused />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <Actions refused />;
PhoneLight.meta = { theme: 'light', width: 375 };
