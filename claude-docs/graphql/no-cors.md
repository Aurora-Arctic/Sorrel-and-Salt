## No CORS

`cors: false`, so the endpoint sends no `Access-Control-*` headers at all.
Yoga's default is not neutral: it echoes back whatever `Origin` a request
carries and adds `Access-Control-Allow-Credentials: true`. That lets any origin
read a response made with the visitor's cookie. The client is same-origin, so it
needs no grant. Staging and the hotfix previews share `sorrelandsalt.com` with
production, so an open grant would also let one environment's pages read
another's responses.
