import { z } from 'zod';
import { EmailAddress } from '../../lib/email-address';

export const BusinessCardSchema = z.object({
  name: z.string().trim().min(1, 'Enter the name to print'),
  email: EmailAddress,
  phone: z.string().trim().min(1, 'Enter the phone number to print'),
});
