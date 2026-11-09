import { withScheme, type FieldFormat } from './formats';

// The one rule for which addresses a link in a document may hold, shared by the editor's link dialog
// and its link plugin and by the page that renders the saved Markdown, so what the editor accepts is
// what the page opens. Pure and client-safe.

/** The schemes the link plugin accepts; the renderer's pattern below opens the same ones. */
export const LINK_SCHEMES = ['https', 'mailto'];

/** An address the site opens: a path on the site (not `//`), a fragment or query, `https:` or `mailto:`. */
export const OPENABLE_ADDRESS = /^(\/(?!\/)|#|\?|https:|mailto:)/i;

export const isOpenableAddress = (address: string): boolean => OPENABLE_ADDRESS.test(address);

/** What the dialog shows on blur: `https://` put in front of a bare host, and `http://` made `https://`. */
export const tidyLinkAddress: FieldFormat = (text) =>
  withScheme(text.trim().replace(/^http:\/\//i, 'https://'));

/** What is wrong with an address for a link, or undefined when the page will open it. */
export function linkAddressProblem(address: string): string | undefined {
  if (address === '') return 'Enter a web address, like https://example.com';
  if (!isOpenableAddress(address)) {
    return 'Use a full web address starting https://, an email link starting mailto:, or a path on this site starting /';
  }
  if (/\s/.test(address)) return 'That address has a space in it';
  if (address.toLowerCase().startsWith('https:')) {
    if (!URL.canParse(address) || !new URL(address).hostname.includes('.')) {
      return 'That is not a web address: check it for a full site name';
    }
  }
  return undefined;
}
