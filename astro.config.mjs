// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

/* The enquiry form POSTs to `/api/contact`, which in production is a
   CloudFront behaviour in front of the contact Lambda. In dev there is no
   CloudFront, so proxy the same path straight at the Function URL — same
   fetch, same origin, no CORS. Put the stack's `ContactFunctionUrl` output in
   `.env` as CONTACT_FN_URL; without it the form fails in dev only. */
const { CONTACT_FN_URL } = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '');

// https://astro.build/config
export default defineConfig({
  site: 'https://homak.dev',
  output: 'static',
  image: {
    // The comps lean on large chrome renders — allow enough widths for retina.
    responsiveStyles: true,
  },
  vite: {
    server: {
      proxy: CONTACT_FN_URL
        ? {
            // The Function URL serves the handler at its root, so the path is
            // rewritten away rather than forwarded.
            '/api/contact': {
              target: CONTACT_FN_URL,
              changeOrigin: true,
              rewrite: () => '/',
            },
          }
        : {},
    },
  },
});
