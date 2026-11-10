import { useMutation } from '@tanstack/react-query';
import { type RefObject, useRef, useState } from 'react';
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { placeServerIssues } from '../../lib/graphql-failure';
import type { ValidationIssue } from '../../lib/types';
import type { DiscardGuard } from '../Modal/types';
import type { FormHistory } from './types';
import { useFormHistory } from './use-form-history';

interface EntityFormOptions<Values extends FieldValues> {
  methods: UseFormReturn<Values>;
  /** The form's own guard, called in the form so the leaving-guard lint rule sees it. */
  discard: DiscardGuard;
  save: (values: Values) => Promise<void>;
  onDone: () => void;
  /** The field a server issue belongs on, or undefined to say it at the top of the form. */
  toField: (issue: ValidationIssue) => Path<Values> | undefined;
  /** True while a question the form asks has the keyboard, so undo and redo stand down. */
  asking?: boolean;
}

/**
 * The wiring a curated record's save form repeats: the guard over unsaved changes, the undo
 * history, the save mutation and where a refused save is said. Each form keeps its fields and
 * its delete, whose refusal it places (claude-docs/components/group-form.md).
 */
export function useEntityForm<Values extends FieldValues>({
  methods,
  discard,
  save,
  onDone,
  toField,
  asking = false,
}: EntityFormOptions<Values>): {
  root: RefObject<HTMLFormElement | null>;
  history: FormHistory;
  alert: string | undefined;
  setAlert: (alert: string | undefined) => void;
  rootError: string | undefined;
  send: (values: Values) => Promise<void>;
} {
  const {
    setError,
    formState: { errors },
  } = methods;
  const root = useRef<HTMLFormElement>(null);
  const history = useFormHistory(methods, { root, enabled: !discard.asking && !asking });
  const [alert, setAlert] = useState<string>();
  const saving = useMutation({ mutationFn: save });

  const send = async (values: Values): Promise<void> => {
    setAlert(undefined);
    try {
      await saving.mutateAsync(values);
      onDone();
    } catch (error) {
      placeServerIssues(error, setError, toField);
    }
  };

  return {
    root,
    history,
    alert,
    setAlert,
    rootError: errors.root?.message ?? alert,
    send,
  };
}
