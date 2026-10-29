import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { useClickFeedback } from '@/components/ClickFeedback';
import { StatusRegionProvider, useAnnounce } from '@/components/ClickFeedback/status-region';

// The click-feedback callout, design F (claude-docs/components/click-feedback.md): a failed click's sentence in a callout under the control,
// a badge on the control that brings it back, and the control described by the failure until the next try clears it.

const REFUSED = 'Testwort is in a spell, so it cannot be removed.';
const OTHER = 'Mossbell could not be saved.';

function Harness({ name, message }: { name: string; message: string }): ReactElement {
  const { anchorRef, report, feedback } = useClickFeedback({ name });
  return (
    <>
      <button type="button" className="btn" ref={anchorRef} onClick={() => report(message)}>
        {name}
      </button>
      {feedback}
      <button type="button" onClick={() => report(undefined)}>
        Clear {name}
      </button>
    </>
  );
}

function draw(...controls: Array<[string, string]>) {
  return render(
    <StatusRegionProvider>
      {controls.map(([name, message]) => (
        <Harness key={name} name={name} message={message} />
      ))}
      <button type="button">Elsewhere</button>
    </StatusRegionProvider>,
  );
}

const control = (name = 'Remove') => screen.getByRole('button', { name });
const badge = (name = 'Remove') =>
  screen.getByRole('button', { name: `Show the error for ${name}` });
const dismiss = () => screen.getByRole('button', { name: 'Dismiss' });

// Each step awaited inside act: Floating UI places the callout and the badge
// in a promise, whose state lands after the event that opened them.
const settle = (step: () => unknown) =>
  act(async () => {
    step();
  });
const press = (element: Element) => settle(() => fireEvent.click(element));
const focus = (element: HTMLElement) => settle(() => element.focus());
const pointerDown = (element: Element) => settle(() => fireEvent.pointerDown(element));

/** The click that fails: the control pressed, with the focus on it as a press leaves it. */
async function fail(name = 'Remove') {
  await focus(control(name));
  await press(control(name));
}

describe('useClickFeedback', () => {
  it('reports in an alert and a badge, closes on Dismiss, and the badge brings the alert back', async () => {
    draw(['Remove', REFUSED]);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button', { name: /Show the error/ })).toBeNull();

    await fail();

    expect(screen.getByRole('alert')).toHaveTextContent(REFUSED);
    expect(badge()).toHaveAttribute('aria-expanded', 'true');
    expect(badge()).toHaveAttribute('aria-controls', screen.getByRole('alert').id);
    // The focus stays where the press left it: the alert is read, not entered.
    expect(control()).toHaveFocus();

    await press(dismiss());

    expect(screen.queryByRole('alert')).toBeNull();
    expect(badge()).toHaveAttribute('aria-expanded', 'false');
    // Back on what opened it: the control, for a callout the failure opened.
    expect(control()).toHaveFocus();

    await focus(badge());
    await press(badge());

    expect(screen.getByRole('alert')).toHaveTextContent(REFUSED);
    expect(badge()).toHaveAttribute('aria-expanded', 'true');

    // The badge is a toggle: pressed again, it closes the callout it opened.
    await press(badge());
    expect(screen.queryByRole('alert')).toBeNull();
    expect(badge()).toHaveAttribute('aria-expanded', 'false');
  });

  it('returns the focus to the badge when the badge opened the callout', async () => {
    draw(['Remove', REFUSED]);
    await fail();
    await press(dismiss());

    await focus(badge());
    await press(badge());
    await focus(dismiss());
    await press(dismiss());

    expect(screen.queryByRole('alert')).toBeNull();
    expect(badge()).toHaveFocus();
  });

  it('closes on Escape, the focus back on what opened it', async () => {
    draw(['Remove', REFUSED]);
    await fail();
    await focus(dismiss());

    let escape = true;
    await settle(() => {
      escape = fireEvent.keyDown(document.activeElement!, { key: 'Escape', cancelable: true });
    });

    expect(screen.queryByRole('alert')).toBeNull();
    expect(control()).toHaveFocus();
    // Taken, so a dialog the control sits in does not close with it.
    expect(escape).toBe(false);
    expect(badge()).toBeInTheDocument();
  });

  it('stays open while the focus moves among the control, the badge and the callout', async () => {
    draw(['Remove', REFUSED]);
    await fail();

    await focus(badge());
    await focus(dismiss());
    await focus(control());
    await pointerDown(badge());
    await pointerDown(screen.getByRole('alert'));

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('closes when the focus leaves the control, the badge and the callout, without taking the focus back', async () => {
    draw(['Remove', REFUSED]);
    await fail();
    const elsewhere = screen.getByRole('button', { name: 'Elsewhere' });

    await focus(elsewhere);

    expect(screen.queryByRole('alert')).toBeNull();
    expect(elsewhere).toHaveFocus();
    expect(badge()).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on a press outside the control, the badge and the callout', async () => {
    draw(['Remove', REFUSED]);
    await fail();

    await pointerDown(document.body);

    expect(screen.queryByRole('alert')).toBeNull();
    expect(badge()).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps one callout on the screen: a new failure closes the other, whose badge stays', async () => {
    draw(['Remove', REFUSED], ['Save', OTHER]);
    await fail('Remove');
    // Opened without the focus leaving the first, as a second failure
    // arriving late from the server would be.
    await press(control('Save'));

    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toHaveTextContent(OTHER);
    expect(badge('Remove')).toHaveAttribute('aria-expanded', 'false');
    expect(badge('Save')).toHaveAttribute('aria-expanded', 'true');
  });

  it('describes the control by its last failure, and a cleared report takes the description, badge and callout away', async () => {
    draw(['Remove', REFUSED]);
    expect(control()).not.toHaveAttribute('aria-describedby');

    await fail();
    expect(control()).toHaveAccessibleDescription(`Last try failed: ${REFUSED}`);

    await press(screen.getByRole('button', { name: 'Clear Remove' }));

    expect(control()).not.toHaveAttribute('aria-describedby');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button', { name: /Show the error/ })).toBeNull();
  });

  it('keeps a description the control already had beside its failure', async () => {
    function Described(): ReactElement {
      const { anchorRef, report, feedback } = useClickFeedback({ name: 'Remove' });
      return (
        <>
          <p id="remove-hint">Removes it from this coven only.</p>
          <button
            type="button"
            aria-describedby="remove-hint"
            ref={anchorRef}
            onClick={() => report(REFUSED)}
          >
            Remove
          </button>
          {feedback}
          <button type="button" onClick={() => report(undefined)}>
            Clear Remove
          </button>
        </>
      );
    }
    render(<Described />);

    await press(control());
    expect(control()).toHaveAccessibleDescription(
      `Removes it from this coven only. Last try failed: ${REFUSED}`,
    );

    await press(screen.getByRole('button', { name: 'Clear Remove' }));
    expect(control()).toHaveAttribute('aria-describedby', 'remove-hint');
  });

  it('says a new failure again when it is reported over an open callout', async () => {
    draw(['Remove', REFUSED]);
    await fail();
    const first = screen.getByRole('alert');

    await press(control());

    // A new alert element, so a screen reader reads the sentence again.
    expect(screen.getByRole('alert')).not.toBe(first);
    expect(screen.getByRole('alert')).toHaveTextContent(REFUSED);
  });
});

describe('StatusRegionProvider', () => {
  function Announcer({ text }: { text: string }): ReactElement {
    const announce = useAnnounce();
    return (
      <button type="button" onClick={() => announce(text)}>
        Say
      </button>
    );
  }

  it('says the same sentence twice by changing its text', async () => {
    render(
      <StatusRegionProvider>
        <Announcer text="Testwort removed." />
      </StatusRegionProvider>,
    );
    const region = screen.getByRole('status');
    expect(region).toBeEmptyDOMElement();

    await press(screen.getByRole('button', { name: 'Say' }));
    const once = region.textContent;
    await press(screen.getByRole('button', { name: 'Say' }));
    const twice = region.textContent;

    expect(once?.trim()).toBe('Testwort removed.');
    expect(twice?.trim()).toBe('Testwort removed.');
    expect(twice).not.toBe(once);
  });

  it('says nothing, and throws nothing, with no region on the page', async () => {
    function Failing(): ReactElement {
      const { anchorRef, announce, feedback, report } = useClickFeedback({ name: 'Remove' });
      return (
        <>
          <button
            type="button"
            ref={anchorRef}
            onClick={() => {
              announce('Testwort removed.');
              report(REFUSED);
            }}
          >
            Remove
          </button>
          {feedback}
        </>
      );
    }
    render(<Failing />);

    // A throw from `announce` would fail the press, and the test with it.
    await press(control());
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent(REFUSED);
  });
});
