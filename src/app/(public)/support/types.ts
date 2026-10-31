export interface SupportPageProps {
  // A promise, awaited before use. `support` is what the request is about, `error` the status of the error
  // page the sender came from, and `from` the page the request is about.
  searchParams: Promise<{
    support?: string | string[];
    error?: string | string[];
    ref?: string | string[];
    from?: string | string[];
  }>;
}
