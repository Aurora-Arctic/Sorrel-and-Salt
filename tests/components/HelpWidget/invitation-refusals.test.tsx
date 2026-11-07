import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import InvitationRefusals from '@/components/HelpWidget/invitation-refusals';
import { CARD_REFUSAL_MESSAGES, INVITATION_REFUSAL_MESSAGES } from '@/modules/identity';

// Every reason the accept page can give, read from the service's own tables: a reason added there and missing here
// fails this test.

describe('InvitationRefusals', () => {
  it('lists every message an invitation link can give, once each', () => {
    render(<InvitationRefusals />);

    const list = screen.getByRole('list', { name: 'An Invitation Link' });
    const messages = Object.values(INVITATION_REFUSAL_MESSAGES);
    expect(within(list).getAllByRole('listitem')).toHaveLength(messages.length);
    for (const message of messages) expect(within(list).getByText(message)).toBeInTheDocument();
  });

  it('lists every message a printed card gives in place of the link’s', () => {
    render(<InvitationRefusals />);

    const list = screen.getByRole('list', { name: 'A Printed Card' });
    const messages = Object.values(CARD_REFUSAL_MESSAGES);
    expect(messages.length).toBeGreaterThan(0);
    expect(within(list).getAllByRole('listitem')).toHaveLength(messages.length);
    for (const message of messages) expect(within(list).getByText(message)).toBeInTheDocument();
  });
});
