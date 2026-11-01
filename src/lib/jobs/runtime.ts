// What a job file may use inside a workflow function. A separate file from
// ./index so the workflow bundle never loads the code that starts runs.
// oxlint-disable-next-line no-restricted-imports
export { createHook, sleep, FatalError, RetryableError } from 'workflow';
// A run may start its successor from the workflow body: the call is recorded as a step, so a replay
// or a retried hand-off starts one next run, not two.
// oxlint-disable-next-line no-restricted-imports
export { start } from 'workflow/api';
