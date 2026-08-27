// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://homak.dev',
  output: 'static',
  image: {
    // The comps lean on large chrome renders — allow enough widths for retina.
    responsiveStyles: true,
  },
});
