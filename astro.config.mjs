// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
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
  /* Emits `sitemap-index.xml` + `sitemap-0.xml`, which `public/robots.txt`
     points search engines at. One page today, but the integration picks up
     anything added under `src/pages/` without a second place to update.

     Left unconfigured on purpose: `lastmod` would restamp to the build time on
     every deploy whether or not the page changed, which is exactly the signal
     a crawler learns to discount, and Google ignores `changefreq`/`priority`
     outright. */
  integrations: [sitemap()],
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
