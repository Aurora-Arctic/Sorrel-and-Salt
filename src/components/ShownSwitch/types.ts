export interface ShownSwitchProps {
  shown: boolean;
  /**
   * Stores one position. Left out (or with `onChange`), the switch only reports the press, as a form field does.
   * It throws a GraphQL failure to refuse.
   */
  save?: (shown: boolean) => Promise<void>;
  /** Called with the pressed position instead of saving it. */
  onChange?: (next: boolean) => void;
  /** The tip for each position, such as "Shown in the Compendium". */
  tip: (on: boolean) => string;
  /** What the live region says after a save, for each position. */
  announcement: (on: boolean) => string;
  /** A visible label beside the switch; without one, `accessibleName` names it. */
  label?: string;
  accessibleName: string;
}
