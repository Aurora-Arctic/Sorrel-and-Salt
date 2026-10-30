/** Today in the browser's own calendar, as the date input reads it. */
export function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Why a draft dated `workedOn` cannot be completed yet, or `undefined` once its day has come. */
export function completeReason(workedOn: string): string | undefined {
  if (workedOn <= today()) return undefined;
  const day = new Date(`${workedOn}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return `Complete on or after ${day}`;
}
