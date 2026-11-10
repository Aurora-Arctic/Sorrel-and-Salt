import { zodResolver } from '@hookform/resolvers/zod';
import type { FieldValues, Resolver, ResolverOptions } from 'react-hook-form';
import type { ZodType } from 'zod';

/**
 * A form's resolver from its schema. The schema's input and output types rarely match the form's values exactly (strings in a
 * field that parses to a number), so the cast to the form's own types is made here once, not at each form.
 */
export function typedResolver<Values extends FieldValues, Output = Values>(
  schema: ZodType,
): Resolver<Values, unknown, Output> {
  return zodResolver(schema as never) as unknown as Resolver<Values, unknown, Output>;
}

/** The schema's check with its errors left raw, for a form that places them itself; it takes the values already in the schema's shape. */
export function rawValidator<Values extends FieldValues, Output = Values>(
  schema: ZodType,
): (
  values: unknown,
  context: unknown,
  options: ResolverOptions<Values>,
) => ReturnType<Resolver<Values, unknown, Output>> {
  const validate = zodResolver(schema as never, undefined, { raw: true });
  return (values, context, options) =>
    validate(values as never, context, options as never) as unknown as ReturnType<
      Resolver<Values, unknown, Output>
    >;
}
