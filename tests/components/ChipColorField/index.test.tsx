import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import ChipColorField from '@/components/ChipColorField';
import type { ChipColorFieldProps } from '@/components/ChipColorField/types';
import { pairedColor } from '@/lib/group-colors';

// One of a category group's two chip colours (M5.6b): Ark's picker and the
// hex it writes, kept in step; the channels of a format the admin chooses; a
// veil over the colours that fall short of 4.5:1 on its ground; a Match button setting it from its partner; a
// sample chip there with its ratio (MB.36); and a warning when another
// group's colour in the theme stands too close (the owner's calls).

function Controlled({
  initial = '#5d8ab1',
  onChange,
  ...props
}: Partial<ChipColorFieldProps> & { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <label htmlFor="dark">Dark Theme Colour</label>
      <ChipColorField
        id="dark"
        label="Dark Theme Colour"
        column="colorDark"
        sample="Fixture Wards"
        {...props}
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange?.(next);
        }}
      />
    </>
  );
}

const hex = () => screen.getByRole('textbox', { name: 'Dark Theme Colour' });
const channel = (name: string) =>
  screen.getByRole('spinbutton', { name: `Dark Theme Colour ${name}` });
const formatButton = () => screen.getByRole('button', { name: /^Dark Theme Colour format:/ });
/** Presses the format toggle until it shows `name`, as Chrome's cycles. */
const showFormat = (name: 'HSB' | 'HSL' | 'RGB') => {
  for (let press = 0; press < 3; press += 1) {
    if (formatButton().getAttribute('aria-label')?.includes(`format: ${name}.`)) return;
    fireEvent.click(formatButton());
  }
};

describe('ChipColorField', () => {
  // jsdom has no ResizeObserver, and the format tooltip's positioning watches
  // its trigger with one, a frame after it opens.
  beforeAll(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });
  afterAll(() => vi.unstubAllGlobals());

  it("shows the hex in a text box named by its label, beside the picker's area and hue slider", () => {
    render(<Controlled />);

    expect(hex()).toHaveValue('#5d8ab1');
    expect(
      screen.getByRole('slider', { name: 'Dark Theme Colour: saturation and brightness' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Dark Theme Colour hue' })).toBeInTheDocument();
  });

  describe('the format', () => {
    it('opens a tooltip on the toggle when the keyboard focuses it', async () => {
      render(<Controlled />);

      // Arrived at by the keyboard, as the tooltip opens on focus only then.
      fireEvent.keyDown(document.body, { key: 'Tab' });
      formatButton().focus();

      expect(await screen.findByRole('tooltip')).toBeVisible();
    });

    // Chrome's toggle: each press shows the next format, round again after the last.
    it('starts in HSB and cycles HSL, RGB and back, each with its own channels', () => {
      render(<Controlled />);

      expect(channel('hue')).toBeInTheDocument();
      expect(channel('saturation')).toBeInTheDocument();
      expect(channel('brightness')).toBeInTheDocument();
      fireEvent.click(formatButton());
      expect(channel('lightness')).toBeInTheDocument();
      expect(screen.queryByRole('spinbutton', { name: 'Dark Theme Colour brightness' })).toBeNull();

      fireEvent.click(formatButton());
      expect(channel('red')).toHaveValue(0x5d);
      expect(channel('green')).toHaveValue(0x8a);
      expect(channel('blue')).toHaveValue(0xb1);

      fireEvent.click(formatButton());
      expect(channel('brightness')).toBeInTheDocument();
    });
  });

  it('writes a channel typed into the hex on Enter, and on leaving it', async () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    showFormat('RGB');

    fireEvent.change(channel('red'), { target: { value: '255' } });
    fireEvent.keyDown(channel('red'), { key: 'Enter' });

    // The picker answers a moment after the key, not within it.
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('#ff8ab1'));
    expect(hex()).toHaveValue('#ff8ab1');

    channel('green').focus();
    fireEvent.change(channel('green'), { target: { value: '0' } });
    channel('green').blur();

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('#ff00b1'));
  });

  it('moves the channels to a hex typed whole, and leaves them for half of one', async () => {
    render(<Controlled />);
    showFormat('RGB');

    fireEvent.change(hex(), { target: { value: '#35987' } });
    expect(channel('red')).toHaveValue(0x5d);

    fireEvent.change(hex(), { target: { value: '#35987D' } });
    await waitFor(() => expect(channel('red')).toHaveValue(0x35));
  });

  // The owner's call: the pair's rule on demand, from the other colour.
  describe('Match', () => {
    it('sets the colour from its partner, fitted to this ground', () => {
      const onChange = vi.fn();
      render(<Controlled partner="#286ba6" onChange={onChange} />);

      fireEvent.click(screen.getByRole('button', { name: 'Match Light Theme Colour' }));

      expect(onChange).toHaveBeenLastCalledWith(pairedColor('#286ba6', 'colorDark'));
      expect(hex()).toHaveValue(pairedColor('#286ba6', 'colorDark'));
    });

    it('names the dark-theme colour on the light field, and waits for a whole partner', () => {
      const { unmount } = render(
        <Controlled
          column="colorLight"
          label="Light Theme Colour"
          initial="#286ba6"
          partner="#5d8ab1"
        />,
      );

      expect(screen.getByRole('button', { name: 'Match Dark Theme Colour' })).toBeEnabled();
      unmount();

      render(<Controlled partner="#286b" />);
      expect(screen.getByRole('button', { name: 'Match Light Theme Colour' })).toBeDisabled();
    });
  });

  it('describes the box by the ratio the colour reads on its own ground, and by none while the hex is not whole', () => {
    const { unmount } = render(<Controlled />);

    expect(hex()).toHaveAccessibleDescription(expect.stringContaining('4.64:1'));
    unmount();

    render(<Controlled initial="#5d8" />);
    expect(hex()).not.toHaveAccessibleDescription(expect.stringMatching(/\d:1/));
  });

  describe('the near-colour warning', () => {
    const others = [
      { name: 'Testward', hex: '#5a87ae' },
      { name: 'Testcraft', hex: '#c371c6' },
    ];

    it('names the group whose colour in this theme stands too close, describing the box by it', () => {
      render(<Controlled others={others} />);

      const warning = screen.getByRole('status');
      expect(warning).toHaveTextContent('Testward');
      expect(hex().getAttribute('aria-describedby')).toContain(warning.id);
    });

    it('follows the colour as it changes, and says nothing once every other colour stands clear', () => {
      render(<Controlled others={others} />);

      fireEvent.change(hex(), { target: { value: '#c56fc4' } });
      expect(screen.getByRole('status')).toHaveTextContent('Testcraft');

      fireEvent.change(hex(), { target: { value: '#35987d' } });
      expect(screen.getByRole('status')).toBeEmptyDOMElement();
    });
  });

  // The owner's call: a refusal in the error notice, as the warning is in its own.
  it('shows a refusal passed in, describing the box by it ahead of the ratio', () => {
    render(
      <Controlled
        error="The two colours are 135° apart in hue — keep them within 10° of each other"
        errorId="dark-error"
        aria-describedby="dark-error"
        aria-invalid
      />,
    );

    expect(hex()).toHaveAccessibleDescription(expect.stringContaining('135° apart in hue'));
    expect(hex().getAttribute('aria-describedby')).toMatch(/^dark-error /);
    expect(hex()).toHaveAttribute('aria-invalid', 'true');
  });
});
