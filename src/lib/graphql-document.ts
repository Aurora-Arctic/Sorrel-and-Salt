import type { graphql as generated } from '../gql';

// What a caller writes its GraphQL document with: codegen types each call through `src/gql/gql.ts`, but at
// runtime the document is the caller's own text, so a page never ships `gql.ts`, which holds every document
// in the app. A fragment the text spreads from another call is appended when the document is sent, found by
// name (claude-docs/graphql/client-types.md, "Client types"). Regular expressions read the text, since the
// parser stays out of the browser's bundle.

const SPREAD = /\.\.\.\s*(?!on\b)([_A-Za-z]\w*)/g;
const DEFINITION = /\bfragment\s+([_A-Za-z]\w*)\s+on\b/g;

/** Every fragment any call has defined so far, by name. */
const fragments = new Map<string, string>();

/** The definition starting at `start`: through the brace that closes its selection set. */
function definitionAt(text: string, start: number): string {
  let depth = 0;
  let quoted = false;
  for (let at = text.indexOf('{', start); at >= 0 && at < text.length; at++) {
    const char = text[at];
    if (char === '"') quoted = !quoted;
    else if (!quoted && char === '{') depth++;
    else if (!quoted && char === '}' && --depth === 0) return text.slice(start, at + 1);
  }
  return text.slice(start);
}

const definedIn = (text: string): Map<string, string> =>
  new Map(
    [...text.matchAll(DEFINITION)].map((match) => [match[1]!, definitionAt(text, match.index)]),
  );

const spreadsIn = (text: string): string[] => [...text.matchAll(SPREAD)].map(([, name]) => name!);

/** The text with each fragment it spreads but does not define appended once, transitively. */
function withFragments(text: string): string {
  const defined = new Set(definedIn(text).keys());
  let sent = text;
  const pending = spreadsIn(text);
  for (let name = pending.shift(); name !== undefined; name = pending.shift()) {
    if (defined.has(name)) continue;
    const definition = fragments.get(name);
    if (definition === undefined) {
      throw new Error(`The fragment ${name} is spread but no graphql() call defines it.`);
    }
    defined.add(name);
    sent += `\n${definition}`;
    pending.push(...spreadsIn(definition));
  }
  return sent;
}

/** A String, so a document is typed and compared as text, whose text gains its fragments when read at send time. */
class Document extends String {
  constructor(private readonly source: string) {
    super(source);
  }

  override toString(): string {
    return withFragments(this.source);
  }

  override valueOf(): string {
    return this.toString();
  }
}

export const graphql = ((source: string) => {
  for (const [name, definition] of definedIn(source)) fragments.set(name, definition);
  return new Document(source);
}) as unknown as typeof generated;
