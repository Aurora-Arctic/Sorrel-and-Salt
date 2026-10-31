'use client';

import { type FormEvent, type ReactElement, useId, useState } from 'react';
import { FieldShell, FormActions, fieldDescription } from '../Field';
import { DiscardQuestion, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import type { RenameFieldsProps } from './types';

/** The Rename dialog's form: one name, saved through the plugin's update, closing the dialog once it is. */
export function RenameFields({ name, onRename, close }: RenameFieldsProps): ReactElement {
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<string>();
  const { aria, ...field } = fieldDescription({ id: useId() });
  const typed = value.trim();
  // Outer whitespace is no change, and an empty name is none: the plugin trims and refuses it.
  const dirty = typed !== '' && typed !== name;
  const discard = useDiscardGuard(value !== name);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!dirty || saving) return;
    setSaving(true);
    setAlert(undefined);
    const failure = await onRename(typed);
    if (failure) {
      setSaving(false);
      setAlert(failure);
      return;
    }
    close();
  };

  return (
    <form className="form" noValidate onSubmit={(event) => void submit(event)}>
      {alert && <Notice kind="error">{alert}</Notice>}
      <FieldShell label="Name" required {...field}>
        <input
          id={field.controlId}
          className="input"
          type="text"
          autoComplete="off"
          placeholder="Name it"
          aria-required
          {...aria}
          value={value}
          disabled={saving}
          onChange={(event) => setValue(event.target.value)}
        />
      </FieldShell>
      <FormActions
        noun="Name"
        dirty={dirty}
        submitting={saving}
        holdCancel
        onCancel={() => discard.request(close)}
      />
      {discard.asking && <DiscardQuestion guard={discard} />}
    </form>
  );
}
