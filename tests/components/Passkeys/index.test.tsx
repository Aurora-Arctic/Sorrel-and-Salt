import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StatusRegionProvider } from '@/components/ClickFeedback/status-region';
import Passkeys, { ADD_FAILED, LAST_WAY_IN } from '@/components/Passkeys';
import type { AccountPasskey } from '@/lib/types';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

// The plugin's client actions, mocked: each answers `{ data }` or `{ error }`, as Better Auth's client does.
const addMock = vi.fn();
const listMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();
vi.mock('@/lib/auth-client', () => ({
  passkey: {
    addPasskey: (...args: unknown[]) => addMock(...args),
    listUserPasskeys: (...args: unknown[]) => listMock(...args),
    updatePasskey: (...args: unknown[]) => updateMock(...args),
    deletePasskey: (...args: unknown[]) => deleteMock(...args),
  },
}));

const LAPTOP: AccountPasskey = {
  id: 'pk-laptop',
  name: 'Laptop',
  createdAt: '2026-10-01T09:00:00.000Z',
};
const UNNAMED: AccountPasskey = {
  id: 'pk-unnamed',
  name: null,
  createdAt: '2026-10-02T09:00:00.000Z',
};

const press = (element: Element) =>
  act(async () => {
    fireEvent.click(element);
  });

const renderOnPage = (ui: ReactElement) =>
  render(<StatusRegionProvider>{ui}</StatusRegionProvider>);

/** The names the list shows, in order. */
const listed = () =>
  within(screen.getByRole('list', { name: 'Passkeys' }))
    .getAllByRole('listitem')
    .map((item) => item.firstElementChild?.textContent);

describe('Passkeys', () => {
  afterEach(() => {
    for (const mock of [addMock, listMock, updateMock, deleteMock]) mock.mockReset();
  });

  it('lists each passkey by name, an unnamed one as Passkey, with the day it was added', () => {
    render(<Passkeys passkeys={[LAPTOP, UNNAMED]} />);

    expect(listed()).toEqual(['Laptop', 'Passkey']);
    expect(screen.getByText('Added 1 Oct 2026')).toBeInTheDocument();
  });

  it('adds a passkey and lists what the server then holds', async () => {
    addMock.mockResolvedValue({ data: {} });
    listMock.mockResolvedValue({
      data: [LAPTOP, { id: 'pk-new', name: null, createdAt: new Date('2026-10-30T09:00:00Z') }],
    });
    renderOnPage(<Passkeys passkeys={[LAPTOP]} />);

    await press(screen.getByRole('button', { name: 'Add a Passkey' }));

    await waitFor(() => expect(listed()).toEqual(['Laptop', 'Passkey']));
    expect(addMock).toHaveBeenCalledTimes(1);
  });

  it('says so under Add when the prompt is cancelled, and lists nothing new', async () => {
    addMock.mockResolvedValue({ error: { code: 'ERROR_OR_ABORT' } });
    renderOnPage(<Passkeys passkeys={[]} />);
    const add = screen.getByRole('button', { name: 'Add a Passkey' });

    await press(add);

    expect(await screen.findByRole('alert')).toHaveTextContent(ADD_FAILED);
    expect(listMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('list', { name: 'Passkeys' })).not.toBeInTheDocument();
  });

  it('renames a passkey through the dialog, and the list shows the new name', async () => {
    updateMock.mockResolvedValue({ data: { passkey: {} } });
    renderOnPage(<Passkeys passkeys={[LAPTOP]} />);

    await press(screen.getByRole('button', { name: 'Rename Laptop' }));
    const dialog = await screen.findByRole('dialog', { name: 'Rename Passkey' });
    const save = within(dialog).getByRole('button', { name: 'Save Name' });
    expect(save).toBeDisabled();
    fireEvent.change(within(dialog).getByRole('textbox', { name: /Name/ }), {
      target: { value: '  Work Laptop ' },
    });
    await press(save);

    await waitFor(() => expect(listed()).toEqual(['Work Laptop']));
    expect(updateMock).toHaveBeenCalledWith({ id: 'pk-laptop', name: 'Work Laptop' });
  });

  it('asks before removing, and removes nothing until the question is confirmed', async () => {
    deleteMock.mockResolvedValue({ data: { status: true } });
    renderOnPage(<Passkeys passkeys={[LAPTOP, UNNAMED]} />);

    await press(screen.getByRole('button', { name: 'Remove Laptop' }));

    const dialog = await screen.findByRole('dialog', { name: 'Remove Passkey' });
    expect(deleteMock).not.toHaveBeenCalled();
    expect(listed()).toEqual(['Laptop', 'Passkey']);

    await press(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(deleteMock).not.toHaveBeenCalled();
    expect(listed()).toEqual(['Laptop', 'Passkey']);
  });

  it('removes a passkey once confirmed, and the list no longer holds it', async () => {
    deleteMock.mockResolvedValue({ data: { status: true } });
    renderOnPage(<Passkeys passkeys={[LAPTOP, UNNAMED]} />);

    await press(screen.getByRole('button', { name: 'Remove Laptop' }));
    const dialog = await screen.findByRole('dialog', { name: 'Remove Passkey' });
    await press(within(dialog).getByRole('button', { name: 'Remove' }));

    await waitFor(() => expect(listed()).toEqual(['Passkey']));
    expect(deleteMock).toHaveBeenCalledWith({ id: 'pk-laptop' });
  });

  it('keeps the last way in listed when the server refuses it, saying why under Remove', async () => {
    deleteMock.mockResolvedValue({ error: { code: 'LAST_SIGN_IN_METHOD' } });
    renderOnPage(<Passkeys passkeys={[LAPTOP]} />);
    const remove = screen.getByRole('button', { name: 'Remove Laptop' });
    // A real press focuses the button; fireEvent does not.
    remove.focus();

    await press(remove);
    const dialog = await screen.findByRole('dialog', { name: 'Remove Passkey' });
    await press(within(dialog).getByRole('button', { name: 'Remove' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(LAST_WAY_IN);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(listed()).toEqual(['Laptop']);
  });
});
