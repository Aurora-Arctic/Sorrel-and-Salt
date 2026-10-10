export interface NameFormProps {
  /** The account's name as the row holds it: the field's starting value, and what "unchanged" compares against. */
  name: string;
}

export interface NameFailure {
  /** Lands beside the input: a VALIDATION issue pathed to `name`. */
  field?: string;
  /** Lands in the alert region: anything else. */
  alert?: string;
}
