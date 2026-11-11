import 'server-only';
import { Forbidden } from '../../../lib/errors';

/** The refusal for a user id that holds no live seat in the coven, as a wrong id earns it. */
export const notAMember = (): Forbidden =>
  new Forbidden('That person is not a member of this coven');
