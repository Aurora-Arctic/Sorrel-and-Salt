'use client';

import { type FormEvent, type ReactElement, useState } from 'react';
import { FormActions, PlainTextField } from '../Field';
import { useNameField } from '../Field/use-name-field';
import { DiscardQuestion, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import type { RenameFieldsProps } from './types';

export function RenameFields({ name, onRename, close }: RenameFieldsProps): ReactElement {
  const { value, setValue, typed, changed, alert, setAlert } = useNameField(name);
  const [saving, setSaving] = useState(false);
  // An empty name is no change: the plugin trims and refuses it.
  const dirty = typed !== '' && changed;
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
