import { deliverStep, reportUndelivered } from './mail-delivery-steps';
import type { Message } from './types';

/**
 * One mail, handed to the transport by a step the SDK retries. True when the transport took it; false when it was refused before
 * any transport was tried, or when every attempt failed, which is logged.
 */
export async function mailDelivery(message: Message): Promise<boolean> {
  'use workflow';
  try {
    return await deliverStep(message);
  } catch {
    await reportUndelivered(message.subject);
    return false;
  }
}
