// One field's shell: label, required mark, hint tip, note, control and error, wired by id. It knows
// no form library, so react-hook-form fields and plain-state controls share it
// (claude-docs/components/field.md).

export { FieldError, FieldShell, Required } from './shell';
export { fieldDescription } from './description';
export { TextField } from './text-field';
export { SelectField } from './select-field';
export { RadioGroupField } from './radio-group-field';
export { SwitchField } from './switch-field';
export { VisibilitySwitch } from './visibility-switch';
export { SearchField } from './search-field';
export { FilterSelectField } from './filter-select-field';
export { errorShown, useField } from './use-field';
export { EditedFieldsContext, useEditedFields, useEditedFieldsContext } from './edited-fields';
export { usePointerHeld, useSettledWhilePressed } from './pointer-held';
export { FormActions } from './form-actions';
export { ReasonField } from './reason-field';
export { useFormHistory } from './use-form-history';
export { FormHistoryContext, useFormHistoryContext } from './form-history-context';
export { FormHistoryButtons } from './form-history-buttons';
export type { FormHistory } from './types';
