// Stands in for `msw/browser` in design-sync PREVIEWS only (never in _ds_bundle.js).
// The workshop answers a story's requests with a service worker; a preview page has none, and
// the sync's stub makes msw inert. This worker sets window.__dsFetch, which a forwarding wrapper
// (installed by an inline script before _ds_bundle.js, which also keeps the real fetch as window.__dsRealFetch; see .design-sync/emit-fetch.patch) calls
// in place of the real fetch. The wrapper exists because Better Auth's client captures
// window.fetch at bundle load. Requests no handler claims go to the real fetch. See .design-sync/NOTES.md, "Preview fake fetch".
import { getResponse, type RequestHandler } from 'msw';

export function setupWorker(...initial: RequestHandler[]) {
  const defaults = [...initial];
  let current = [...initial];
  let realFetch: typeof window.fetch | undefined;
  return {
    async start() {
      if (realFetch) return;
      realFetch = (
        (window as unknown as { __dsRealFetch?: typeof window.fetch }).__dsRealFetch ?? window.fetch
      ).bind(window);
      const passThrough = realFetch;
      (window as unknown as { __dsFetch?: typeof window.fetch }).__dsFetch = async (
        input: RequestInfo | URL,
        init?: RequestInit,
      ) => {
        const request = new Request(input, init);
        const response = await getResponse(current, request.clone());
        return response ?? passThrough(request);
      };
    },
    stop() {
      (window as unknown as { __dsFetch?: typeof window.fetch }).__dsFetch = undefined;
      realFetch = undefined;
    },
    use(...handlers: RequestHandler[]) {
      current = [...handlers, ...current];
    },
    resetHandlers(...next: RequestHandler[]) {
      current = next.length ? next : [...defaults];
    },
    listHandlers: () => current,
  };
}
