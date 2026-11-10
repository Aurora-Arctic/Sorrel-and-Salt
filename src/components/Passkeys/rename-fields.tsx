'use client';

import { type FormEvent, type ReactElement, useState } from 'react';
import { FormActions, PlainTextField } from '../Field';
import { DiscardQuestion, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import type { RenameFieldsProps } from './types';

export function RenameFields({ name, onRename, close }: RenameFieldsProps): ReactElement {
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<string>();
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
      <PlainTextField
        label="Name"
        required
        autoComplete="off"
        placeholder="Name it"
        value={value}
        disabled={saving}
        onChange={setValue}
      />
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
