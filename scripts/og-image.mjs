/**
 * Regenerates the two raster brand assets search engines and link previews
 * want but cannot get from the site's SVGs: `public/og.png`, the 1200x630
 * Open Graph / Twitter card, and `public/logo.png`, the wordmark the
 * `Organization` logo in `Base.astro`'s JSON-LD points at (Google reads a
 * raster there, not an SVG). Run with `node scripts/og-image.mjs` after a
 * brand change; both outputs are committed, so a normal build never runs it.
 *
 * Everything but the two caption lines is vector: the wordmark comes from
 * `src/assets/logo.svg` and the sculpture from the same render the hero uses,
 * so the card cannot drift from the site. The captions are set in whatever
 * grotesque the machine resolves — uppercase at wide tracking, which is where
 * Montserrat and a system fallback are hardest to tell apart.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const at = (p) => fileURLToPath(new URL(p, root));

const W = 1200;
const H = 630;

// tokens.css --grad-0..3 and --accent.
const GRAD_0 = '#141414';
const GRAD_2 = '#383737';
const ACCENT = '#00a0c4';

/* The site's gradient runs dark at bottom-right to light at top-left, so the
   card's light falls in the same corner the comps put it in. */
const background = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="g" x1="1" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="${GRAD_0}"/>
      <stop offset="0.62" stop-color="${GRAD_0}"/>
      <stop offset="1" stop-color="${GRAD_2}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
</svg>`);

/* Bleeds off the right and bottom edges the way the hero artboard does. The
   902x1326 render is far taller than the card, and `composite` rejects any
   input larger than its base whatever the offset, so the crop happens here
   rather than by overhanging. The render is transparent chrome on alpha; 0.5
   lands its highlights a few levels above the base rather than letting them
   fight the wordmark. */
const SCULPT_W = 560;
const sculpture = await sharp(at('src/assets/sculptures/knot-hero.png'))
  .resize({ width: 700 })
  .extract({ left: 0, top: 0, width: SCULPT_W, height: H })
  .ensureAlpha()
  .composite([{
    input: Buffer.from([0, 0, 0, Math.round(255 * 0.5)]),
    raw: { width: 1, height: 1, channels: 4 },
    tile: true,
    blend: 'dest-in',
  }])
  .png()
  .toBuffer();

/* All fills are `black`/`white` in the source; the card wants one flat white.
   The source's own `width`/`height` come off first — nesting it under a second
   pair is an XML parse error, not an override. `viewBox` stays and does the
   scaling. */
const wordmark = (await readFile(at('src/assets/logo.svg'), 'utf8'))
  .replace(/fill="(black|white)"/g, 'fill="#ffffff"')
  .replace(/^<svg width="\d+" height="\d+" /, '<svg x="82" y="212" width="640" height="156" ');

const foreground = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <style>
    /* Set uppercase in the strings below, not with a text-transform rule —
       librsvg does not implement it and would ship the captions title-cased. */
    .cap { font-family: Montserrat, 'Helvetica Neue', Helvetica, Arial, sans-serif; }
    .lede { font-size: 30px; fill: #ffffff; letter-spacing: 5px; }
    .where { font-size: 21px; fill: #ffffffab; letter-spacing: 5px; }
  </style>
  ${wordmark}
  <line x1="82" y1="424" x2="176" y2="424" stroke="${ACCENT}" stroke-width="2"/>
  <text class="cap lede" x="82" y="482">DESIGN MEETS ENGINEERING</text>
  <text class="cap where" x="82" y="528">NAPLES, FLORIDA</text>
</svg>`);

await writeFile(
  at('public/og.png'),
  await sharp(background)
    .composite([
      { input: sculpture, top: 0, left: W - SCULPT_W },
      { input: foreground, top: 0, left: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer(),
);

/* The wordmark alone on the base tone, at the source's own 267:65. Padded to
   a tenth of its width on each side so a consumer that crops or rounds the
   corners cannot clip a glyph. */
const LOGO_W = 1200;
const LOGO_H = Math.round((LOGO_W * 65) / 267);
await writeFile(
  at('public/logo.png'),
  await sharp(Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${LOGO_W}" height="${LOGO_H + 120}">
  <rect width="${LOGO_W}" height="${LOGO_H + 120}" fill="${GRAD_0}"/>
  ${wordmark.replace(
    /^<svg x="\d+" y="\d+" width="\d+" height="\d+" /,
    `<svg x="120" y="60" width="${LOGO_W - 240}" height="${Math.round(((LOGO_W - 240) * 65) / 267)}" `,
  )}
</svg>`))
    .png({ compressionLevel: 9 })
    .toBuffer(),
);

console.log('wrote public/og.png and public/logo.png');
