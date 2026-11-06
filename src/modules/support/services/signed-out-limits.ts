import 'server-only';

/** Sends one address may make in the window. */
export const SIGNED_OUT_ADDRESS_LIMIT = 10;
/** Sends one client address may make in the window, across every email address it writes from. */
export const SIGNED_OUT_IP_LIMIT = 30;
/** The window the limits count over, in seconds: 24 hours. */
export const SIGNED_OUT_WINDOW_SECONDS = 24 * 60 * 60;
