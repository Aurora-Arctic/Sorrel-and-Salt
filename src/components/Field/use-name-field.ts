'use client';

import { useState } from 'react';
import type { ZodType } from 'zod';
import { readGraphqlFailure } from '../../lib/graphql-failure';

/**
 * The state of a form that holds one name: the typed value, the schema's refusal under the field, and an alert for what the server
 * refused otherwise. `saved` is the name now stored; outer whitespace is no change, as the server trims it.
 */
export function useNameField(saved: string, schema?: ZodType<string>) {
  const [value, setValueState] = useState(saved);
  const [alert, setAlert] = useState<string>();
  const [fieldError, setFieldError] = useState<string>();

  const typed = value.trim();

  /** Typing takes the field's refusal away, as it is about the old value. */
  const setValue = (next: string): void => {
    setValueState(next);
    setFieldError(undefined);
  };

  /** Whether the value passes the schema; if not, its first refusal shows under the field. */
  const check = (): boolean => {
    const refused = schema?.safeParse(value).error?.issues[0]?.message;
    setFieldError(refused);
    return refused === undefined;
  };

  /** Shows a failed write: a refusal of the name under the field, anything else as the alert. */
  const fail = (failure: unknown): void => {
    const { field, alert: message } = readGraphqlFailure(failure, ['name']);
    setFieldError(field?.message);
    setAlert(message);
  };

  /** Back to the stored name, with nothing refused. */
  const reset = (to: string = saved): void => {
    setValueState(to);
    setAlert(undefined);
    setFieldError(undefined);
  };

  return {
    value,
    setValue,
    typed,
    changed: typed !== saved,
    alert,
    setAlert,
    fieldError,
    check,
    fail,
    reset,
  };
}
