import 'server-only';
import { SECONDS_PER_DAY } from '../../../lib/duration';

export const SIGNED_OUT_ADDRESS_LIMIT = 10;
/** Sends one client address may make in the window, across every email address it writes from. */
export const SIGNED_OUT_IP_LIMIT = 30;
export const SIGNED_OUT_WINDOW_SECONDS = SECONDS_PER_DAY;
