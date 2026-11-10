import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { rawValidator, typedResolver } from '@/lib/typed-resolver';

const Schema = z.object({ name: z.string().min(1, 'Enter a name') });
const options = { fields: {}, shouldUseNativeValidation: false } as never;

describe('typedResolver', () => {
  it('passes values the schema accepts', async () => {
    const result = await typedResolver<{ name: string }>(Schema)({ name: 'Testwort' }, {}, options);
    expect(result.errors).toEqual({});
    expect(result.values).toEqual({ name: 'Testwort' });
  });

  it('puts a refusal under the input it concerns', async () => {
    const result = await typedResolver<{ name: string }>(Schema)({ name: '' }, {}, options);
    expect(result.errors).toMatchObject({ name: { message: 'Enter a name' } });
  });
});

describe('rawValidator', () => {
  it('keeps the schema issues raw', async () => {
    const result = await rawValidator<{ name: string }>(Schema)({ name: '' }, {}, options);
    expect(JSON.stringify(result.errors)).toContain('Enter a name');
  });
});
