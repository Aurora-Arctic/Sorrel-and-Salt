/** A run of days, each `YYYY-MM-DD`; an empty end leaves the range open at that end. */
export interface DayRange {
  from: string;
  to: string;
}

/** A range picked in one press beside the calendar, worked out when it is pressed. */
export interface QuickPick {
  label: string;
  range: () => DayRange;
}

export interface DateRangeFieldProps {
  id: string;
  /** The id of the label element, so the button reads "Minted, 1 Oct 2026 to 30 Oct 2026". */
  labelledBy: string;
  /** The field's name in words, for the calendar's name and the clear's: "Choose Minted Days". */
  label: string;
  from: string;
  to: string;
  onChange: (range: DayRange) => void;
  quickPicks?: QuickPick[];
  /** The first day that may be picked, `YYYY-MM-DD`. */
  min?: string;
  /** The last day that may be picked, `YYYY-MM-DD`. */
  max?: string;
  /** What the button shows while it holds no day. */
  placeholder?: string;
  /** Whether the range mostly looks back, so the calendar opens on the month before as well. */
  past?: boolean;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}
