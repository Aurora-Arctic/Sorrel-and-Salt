/** Who a request or reply came from when no account name can be shown. */
export const DELETED_ACCOUNT = 'Deleted account';
export const SIGNED_OUT_SENDER = 'Signed-out sender';

/** The sender's name on a request: the signed-out label, the account's name, or the deleted-account label. */
export const senderLabel = (request: {
  signedOut: boolean;
  sender?: { name: string } | null;
}): string => (request.signedOut ? SIGNED_OUT_SENDER : (request.sender?.name ?? DELETED_ACCOUNT));
