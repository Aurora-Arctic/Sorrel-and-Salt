/// <reference types="@testing-library/jest-dom/vitest" />

// react-server-dom-webpack ships no types.
declare module 'react-server-dom-webpack/server.edge' {
  export function renderToReadableStream(
    model: unknown,
    webpackMap: Record<string, unknown>,
    options?: { onError?: (error: unknown) => void },
  ): ReadableStream<Uint8Array>;
  export function registerClientReference<T>(proxy: T, id: string, exportName: string): T;
}
