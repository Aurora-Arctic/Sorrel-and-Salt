import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StatusRegionProvider } from '@/components/ClickFeedback/status-region';
import ShownSwitch from '@/components/ShownSwitch';
import type { ShownSwitchProps } from '@/components/ShownSwitch/types';
import { announced } from '../../support/click-feedback';
import { router } from '../../support/next-navigation';

// The lidded-eye switch that shows or hides a row to readers. With `save` it stores each press as it lands, the last
// press winning; with `onChange` it only reports the press, as a form field does.

beforeEach(() => {
  router.refresh.mockClear();
});

function renderSwitch(props: Partial<ShownSwitchProps> = {}) {
  render(
    <ShownSwitch
      shown
      tip={(on) => (on ? 'Shown to Readers' : 'Hidden from Readers')}
      announcement={(on) => (on ? 'Testwort shown' : 'Testwort hidden')}
      accessibleName="Show Testwort"
      {...props}
    />,
    { wrapper: StatusRegionProvider },
  );
  return screen.getByRole('switch');
}

/** A save that waits until the test settles it. */
function heldSave() {
  const sent: boolean[] = [];
  const settles: (() => void)[] = [];
  const saveCallback = vi.fn(
    (shown: boolean) =>
      new Promise<void>((resolve) => {
        sent.push(shown);
        settles.push(resolve);
      }),
  );
  const settleNext = () =>
    act(async () => {
      settles.shift()?.();
    });
  return { save: saveCallback, sent, settleNext };
}

describe('ShownSwitch, saving each press', () => {
  it('saves a press, announces it and refreshes the page', async () => {
    const saveCallback = vi.fn(async () => undefined);
    const control = renderSwitch({ save: saveCallback });

    // Precondition: nothing is saved before the press.
    expect(control).toBeChecked();
    expect(saveCallback).not.toHaveBeenCalled();

    fireEvent.click(control);

    expect(control).not.toBeChecked();
    await waitFor(() => expect(announced()).toBe('Testwort hidden'));
    expect(saveCallback).toHaveBeenCalledExactlyOnceWith(false);
    expect(router.refresh).toHaveBeenCalled();
  });

  it('saves a press made during a save once that save lands, one save at a time', async () => {
    const { save, sent, settleNext } = heldSave();
    const control = renderSwitch({ save });

    fireEvent.click(control);
    expect(control).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(control);

    // Precondition: the press during the first save sent nothing of its own.
    expect(sent).toEqual([false]);
    expect(control).toBeChecked();

    await settleNext();
    await waitFor(() => expect(sent).toEqual([false, true]));
    await settleNext();
    await waitFor(() => expect(control).toHaveAttribute('aria-busy', 'false'));
    expect(control).toBeChecked();
  });

  it('skips a save when the presses during one end where it saved', async () => {
    const { save, sent, settleNext } = heldSave();
    const control = renderSwitch({ save });

    fireEvent.click(control);
    fireEvent.click(control);
    fireEvent.click(control);

    await settleNext();
    await waitFor(() => expect(control).toHaveAttribute('aria-busy', 'false'));
    expect(sent).toEqual([false]);
  });

  it('puts the switch back and says why when the save is refused', async () => {
    const saveCallback = vi.fn(async () => {
      throw new Error('refused');
    });
    const control = renderSwitch({ save: saveCallback });

    fireEvent.click(control);

    expect(await screen.findByRole('alert')).toHaveTextContent(/\S/);
    expect(control).toBeChecked();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('follows a new `shown` from the page', () => {
    const saveCallback = vi.fn(async () => undefined);
    const { rerender } = render(
      <ShownSwitch
        shown
        save={saveCallback}
        tip={() => 'Tip'}
        announcement={() => 'Said'}
        accessibleName="Show Testwort"
      />,
    );
    expect(screen.getByRole('switch', { name: 'Show Testwort' })).toBeChecked();

    rerender(
      <ShownSwitch
        shown={false}
        save={saveCallback}
        tip={() => 'Tip'}
        announcement={() => 'Said'}
        accessibleName="Show Testwort"
      />,
    );

    expect(screen.getByRole('switch', { name: 'Show Testwort' })).not.toBeChecked();
    expect(saveCallback).not.toHaveBeenCalled();
  });
});

describe('ShownSwitch, as a form field', () => {
  it('reports a press to `onChange` and saves nothing', () => {
    const saveCallback = vi.fn(async () => undefined);
    const onChange = vi.fn();
    const control = renderSwitch({ save: saveCallback, onChange });

    fireEvent.click(control);

    expect(onChange).toHaveBeenCalledExactlyOnceWith(false);
    expect(saveCallback).not.toHaveBeenCalled();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('is named by its visible label when it has one', () => {
    renderSwitch({ onChange: vi.fn(), label: 'Shown' });

    expect(screen.getByRole('switch', { name: 'Shown' })).toBeInTheDocument();
  });
});
