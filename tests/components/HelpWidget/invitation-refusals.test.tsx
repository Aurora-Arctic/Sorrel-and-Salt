import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import InvitationRefusals from '@/components/HelpWidget/invitation-refusals';
import { REFUSAL_FIXES } from '@/components/HelpWidget/invitation-refusal-fixes';
import { CARD_REFUSAL_MESSAGES, INVITATION_REFUSAL_MESSAGES } from '@/modules/identity';

// Every reason the accept page can give, read from the service's own tables: a reason added there and missing here
// fails this test (claude-docs/components/help-pages.md, "Widgets").

const LINK = INVITATION_REFUSAL_MESSAGES;
const CARD = CARD_REFUSAL_MESSAGES;
const EVERY_MESSAGE = [...Object.values(LINK), ...Object.values(CARD)];

const picker = () => screen.getByRole('combobox', { name: 'The Message You Saw' });
const type = (text: string) => fireEvent.change(picker(), { target: { value: text } });
const optionNames = () => screen.queryAllByRole('option').map((option) => option.textContent);
const answer = () => screen.getByRole('status', { name: 'What It Means' });
const facts = () =>
  within(answer())
    .getAllByRole('definition')
    .map((fact) => fact.textContent);
const everyMessage = () => screen.getByRole('list', { name: 'Every Message the Page Can Give' });

describe('InvitationRefusals', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('keeps a who and a what for every reason and every printed card wording', () => {
    expect(Object.keys(REFUSAL_FIXES).sort()).toEqual(Object.keys(LINK).sort());
    for (const reason of Object.keys(CARD) as (keyof typeof CARD)[]) {
      expect(REFUSAL_FIXES[reason].card).toBeDefined();
    }
    // A card wording with no service message would be listed under nothing.
    for (const [reason, fixes] of Object.entries(REFUSAL_FIXES)) {
      if (fixes.card) expect(CARD).toHaveProperty(reason);
    }
  });

  it('offers every message the page can give, verbatim, in the picker', () => {
    render(<InvitationRefusals />);

    fireEvent.click(picker());

    expect(optionNames()).toHaveLength(EVERY_MESSAGE.length);
    expect(new Set(optionNames())).toEqual(new Set(EVERY_MESSAGE));
  });

  it('finds a half-remembered message: a typo, words out of order, a partial word', () => {
    render(<InvitationRefusals />);

    type('expird invitaton');
    expect(optionNames()[0]).toBe(LINK.expired);

    // "This card has been withdrawn", asked for the other way round.
    type('withdrawn card');
    expect(optionNames()[0]).toBe(CARD.revoked);

    type('emial confirmd');
    expect(optionNames()[0]).toBe(LINK.unverified);

    type('diffrent adress');
    expect(optionNames()[0]).toBe(LINK['different-address']);

    type('delet cov');
    expect(optionNames()[0]).toBe(LINK.closed);
  });

  it('leaves out messages nothing typed resembles', () => {
    render(<InvitationRefusals />);

    type('withdrawn card');
    expect(optionNames()).not.toContain(LINK.expired);
    expect(optionNames()).not.toContain(LINK.paused);

    type('zzqqx');
    expect(optionNames()).toEqual([]);
  });

  it('draws a picked message as the accept page does, with who can fix it and what to do now', () => {
    render(<InvitationRefusals />);

    type('withdrawn card');
    fireEvent.click(screen.getByRole('option', { name: CARD.revoked }));

    expect(answer()).toHaveTextContent(CARD.revoked as string);
    expect(facts()).toEqual([REFUSAL_FIXES.revoked.card?.who, REFUSAL_FIXES.revoked.card?.now]);
    // The accept page offers no button for a withdrawn card, so neither does the answer.
    expect(within(answer()).queryByRole('link')).toBeNull();

    type('paused');
    fireEvent.click(screen.getByRole('option', { name: LINK.paused }));

    expect(answer()).toHaveTextContent(LINK.paused);
    expect(answer()).not.toHaveTextContent(CARD.revoked as string);
    expect(facts()).toEqual([REFUSAL_FIXES.paused.link.who, REFUSAL_FIXES.paused.link.now]);
  });

  it('offers the accept page’s own button where it shows one', () => {
    render(<InvitationRefusals />);

    type('already used this card');
    fireEvent.click(screen.getByRole('option', { name: LINK['used-by-you'] }));
    expect(within(answer()).getByRole('link', { name: 'Start a Coven' })).toHaveAttribute(
      'href',
      '/coven/new',
    );

    type('email isnt confirmed');
    fireEvent.click(screen.getByRole('option', { name: LINK.unverified }));
    expect(within(answer()).getByRole('link', { name: 'Confirm Your Email' })).toHaveAttribute(
      'href',
      '/account/email',
    );
  });

  it('shows the first message’s answer before anything is picked, so the shape is visible', () => {
    render(<InvitationRefusals />);

    expect(picker()).toHaveValue(LINK.invalid);
    expect(answer()).toHaveTextContent(LINK.invalid);
    expect(facts()).toEqual([REFUSAL_FIXES.invalid.link.who, REFUSAL_FIXES.invalid.link.now]);
  });

  it('lists all fourteen messages in the disclosure, each with who can fix it and what to do now', () => {
    render(<InvitationRefusals />);

    const items = within(everyMessage()).getAllByRole('listitem');
    expect(items).toHaveLength(EVERY_MESSAGE.length);
    for (const [reason, message] of Object.entries(LINK)) {
      const fix = REFUSAL_FIXES[reason as keyof typeof LINK].link;
      const item = items.find((candidate) => candidate.textContent?.startsWith(message));
      expect(item, message).toBeDefined();
      expect(item).toHaveTextContent(fix.who);
      expect(item).toHaveTextContent(fix.now);
    }
    for (const [reason, message] of Object.entries(CARD)) {
      const fix = REFUSAL_FIXES[reason as keyof typeof CARD].card;
      // A card's item opens with its Printed Card mark, then the message.
      const item = items.find((candidate) => candidate.textContent?.includes(message as string));
      expect(item, message).toBeDefined();
      expect(item).toHaveTextContent('Printed Card');
      expect(item).toHaveTextContent(fix?.who as string);
      expect(item).toHaveTextContent(fix?.now as string);
    }
  });

  it('sits each printed card wording straight after the link message it replaces', () => {
    render(<InvitationRefusals />);

    const texts = within(everyMessage())
      .getAllByRole('listitem')
      .map((item) => item.textContent ?? '');
    for (const [reason, message] of Object.entries(CARD)) {
      const link = texts.findIndex((text) => text.startsWith(LINK[reason as keyof typeof LINK]));
      expect(texts[link + 1]).toContain(message);
    }
    // The two card-only reasons keep the service table's place, among the link messages.
    const order = texts.map((text) => EVERY_MESSAGE.find((message) => text.includes(message)));
    expect(order.indexOf(LINK['used-by-you'])).toBe(order.indexOf(LINK.accepted) + 1);
    expect(order.indexOf(LINK['used-another-card'])).toBe(order.indexOf(LINK['used-by-you']) + 1);
  });

  it('server-renders the full list and no picker, and hydration adds the picker without a mismatch', async () => {
    const widget = <InvitationRefusals />;
    const html = renderToString(widget);
    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.append(container);

    expect(within(everyMessage()).getAllByRole('listitem')).toHaveLength(EVERY_MESSAGE.length);
    expect(screen.queryByRole('combobox')).toBeNull();

    const onRecoverableError = vi.fn();
    await act(async () => {
      hydrateRoot(container, widget, { onRecoverableError });
    });

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(picker()).toBeInTheDocument();
  });
});
