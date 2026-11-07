import { z } from 'zod';

export const BusinessCardSchema = z.object({
  name: z.string().trim().min(1, 'Enter the name to print.'),
  email: z.string().trim().pipe(z.email('Enter an email address, such as name@example.com.')),
  phone: z.string().trim().min(1, 'Enter the phone number to print.'),
});
