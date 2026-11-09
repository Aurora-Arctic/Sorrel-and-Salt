'use client';

import type { ReactElement } from 'react';
import { ModalButton } from '../Modal';
import type { HelpScreenshotProps } from './types';
import './index.scss';

/** Both themes' pictures, each with an empty alt; the `.screenshot` primitive shows the one for the reader's theme. */
function Pictures({ src, dark }: Omit<HelpScreenshotProps, 'alt'>): ReactElement {
  return (
    <>
      <img className="screenshot__light" src={src} alt="" />
      <img className="screenshot__dark" src={dark} alt="" />
    </>
  );
}

/**
 * A help article's screenshot, as a button that opens it full size in a dialog
 * (claude-docs/components/help-screenshot.md).
 */
export default function HelpScreenshot({ src, dark, alt }: HelpScreenshotProps): ReactElement {
  return (
    <ModalButton
      className="help-screenshot screenshot"
      ariaLabel={`Enlarge: ${alt}`}
      title="Screenshot"
      size="picture"
      readingBody
      label={<Pictures src={src} dark={dark} />}
    >
      {() => (
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- one picture drawn from two files, one per theme; either img alone would name only half
        <span className="help-screenshot__full screenshot" role="img" aria-label={alt}>
          <Pictures src={src} dark={dark} />
        </span>
      )}
    </ModalButton>
  );
}
