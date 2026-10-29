import type { CSSProperties } from 'react';

// The room the text keeps after a list's chips: as wide as the placeholder, so the prompt shows whole or wraps under the chips
// (claude-docs/components/combobox.md, "Chips' room").

/** The slot's `--combobox-room`, set only beside chips and only for a placeholder. */
export function chipsRoom(
  beside: boolean,
  placeholder: string | undefined,
): CSSProperties | undefined {
  if (!beside || !placeholder) return undefined;
  return { '--combobox-room': `${placeholder.length + 1}ch` } as CSSProperties;
}
