import { Kind, parse, type OperationDefinitionNode } from 'graphql';

// The root fields a paused account's session may still act through: the signed-in support form's, and nothing else, so a
// paused user can ask about the pause and read the answer (claude-docs/design-decisions/m15.52-site-access-pause.md).

const SUPPORT_FIELDS = new Set([
  '__typename',
  'supportDialogState',
  'mySupportRequests',
  'mySupportRequest',
  'sendSupportRequest',
  'sendSupportMessage',
  'resolveMySupportRequest',
]);

/** The parameters Yoga hands its context factory: the document and the operation chosen from it. */
export interface OperationParams {
  query?: string;
  operationName?: string | null;
}

/** The operation a request runs: the one it names, or the document's only one. */
function chosenOperation(
  query: string,
  operationName: string | null | undefined,
): OperationDefinitionNode | undefined {
  const operations = parse(query).definitions.filter(
    (definition): definition is OperationDefinitionNode =>
      definition.kind === Kind.OPERATION_DEFINITION,
  );
  if (operationName) return operations.find(({ name }) => name?.value === operationName);
  return operations.length === 1 ? operations[0] : undefined;
}

/**
 * Whether every root selection of the operation is a support field, written out as a field. A fragment at the root, a
 * document that does not parse, or an operation that cannot be told apart is not, so the pause refuses it.
 */
export function isSupportOperation(params: OperationParams | undefined): boolean {
  if (!params?.query) return false;
  let operation: OperationDefinitionNode | undefined;
  try {
    operation = chosenOperation(params.query, params.operationName);
  } catch {
    return false;
  }
  if (!operation || operation.operation === 'subscription') return false;
  return operation.selectionSet.selections.every(
    (selection) => selection.kind === Kind.FIELD && SUPPORT_FIELDS.has(selection.name.value),
  );
}
