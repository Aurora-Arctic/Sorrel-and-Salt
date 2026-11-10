/** How long a saved file's object URL lives: long enough for the browser to finish reading it. */
const URL_LIFETIME_MS = 60_000;

/** Hands the browser a file to save, through an object URL it is given a minute to read before it is released. */
export const saveFile = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), URL_LIFETIME_MS);
};
