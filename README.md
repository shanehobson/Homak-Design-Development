# Homak Design & Development

Marketing and portfolio site for [Homak Design & Development](https://homak.dev),
a web design and development studio in Naples, Florida.

A single-page, statically generated site: one continuous scroll over a fixed
backdrop, with the project work opening into a video modal.

## Stack

| | |
|---|---|
| Framework | [Astro](https://astro.build) 7, `output: 'static'` |
| UI runtime | None — no React/Vue/Svelte island |
| Styling | Plain CSS with custom properties, scoped per component |
| Type | [Montserrat Variable](https://fonts.google.com/specimen/Montserrat), self-hosted via `@fontsource-variable` |

There is no client framework and no JS bundle. The carousel, the video modal,
and the scroll observers are a few dozen lines of hand-written TypeScript in
`<script>` tags, which Astro inlines. A production build ships roughly 10 KB of
gzipped HTML and 4 KB of gzipped CSS.

## Running it

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # -> dist/
npm run preview  # serve the built output
```

Astro's dev server can also be run detached: `npx astro dev --background`,
managed with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Layout

```
src/
├── assets/            # images processed by Astro's image pipeline
│   ├── projects/      # project poster stills
│   ├── sculptures/    # the chrome renders in the backdrop
│   └── team/
├── components/
│   ├── Backdrop.astro     # the fixed gradient + sculpture layer
│   ├── Header.astro       # fixed nav, with the mobile drawer
│   ├── VideoModal.astro   # one <dialog> reused by every project
│   └── sections/          # Hero, Team, Projects, Contact
├── data/              # all site content lives here
├── layouts/Base.astro # <head>, SEO, JSON-LD
├── pages/index.astro  # the one page, plus the scroll observers
└── styles/
    ├── tokens.css     # design tokens, sourced from Figma
    └── global.css
```

`public/videos/` holds project videos. They are deliberately kept out of
`src/assets` so Astro's image pipeline ignores them, and out of git — the files
are served from an S3 media bucket via CloudFront, on the same origin as the
site, so markup keeps using plain `/videos/...` paths. After a fresh clone run
`cd infra && npm run media:pull` to get a local copy for `astro dev`. See
[`infra/README.md`](infra/README.md).

## Content

Everything editable lives in `src/data/`, so copy changes never require touching
a component.

- **`site.ts`** — studio name, description, email, nav items. The `START A
  PROJECT` buttons resolve to a `mailto:` built from `site.email`; swap
  `projectEnquiry` for a form or scheduling link when there is one.
- **`team.ts`** — the two team members and the shared bio.
- **`projects.ts`** — the work. Adding a project is one object:

  ```ts
  {
    slug: 'example',
    title: 'Example',
    category: 'Sector / Location',
    description: 'Shown in the modal.',
    poster: exampleImage,     // imported from src/assets/projects
    video: '/videos/x.mp4',   // optional — omit for a still-only card
    url: 'https://example.com',
  }
  ```

  Descriptions describe the product and who it is for, not how it was
  built — the modal deliberately carries no technology listing.

  A card with no `video` opens the modal to a still and its description
  instead. The carousel arrows enable themselves once there are more projects
  than fit in view.

## Design tokens

`src/styles/tokens.css` is derived from the Figma document's published styles —
the `#00a0c4` accent, the Montserrat text styles, and the 12-column grid with
its 120px margin.

One deviation is worth knowing about. The Figma export of the `background` paint
style omits its gradient transform, and running those stops as a plain
corner-to-corner linear washes out the whole viewport. The comps show the ramp
confined to a bloom in the upper-left, so `Backdrop.astro` runs the same stops
along a radial anchored just off that corner: the bright core sits off-canvas
and only the falloff is visible.

## How the scroll works

`Backdrop.astro` renders once, fixed at `z-index: 0`, and never moves. The page
content scrolls over it at `z-index: 1`.

An `IntersectionObserver` in `index.astro` tracks each `<section>` and writes the
one covering the most of the viewport to `data-active` on the backdrop. CSS then
reveals that section's sculpture. Using an observer rather than a scroll
listener keeps this off the main thread during scrolling.

A second observer adds `.is-visible` to `.reveal` elements as they enter view,
then unobserves them. Both are disabled under `prefers-reduced-motion`, and the
sculptures fall back to visible if JavaScript never runs.

## Notes

- `<video>` elements carry `preload="none"` and get their `src` only when the
  modal opens; closing removes it and calls `load()` to drop the buffer. The
  page therefore ships zero video bytes.
- The modal's teardown is driven explicitly from each close path rather than
  from the `<dialog>` `close` event, which does not fire in every embedding.
- `.section` carries `overflow-x: clip` — without it the carousel's scrollable
  content widens the document.
- Passing a class into a child component will not pick up the parent's scoped
  styles; Astro scopes CSS to the component that owns the element. Wrap the
  child instead.

## Deploying

A static build, so any host works. `astro.config.mjs` sets
`site: 'https://homak.dev'`, which the canonical URL and JSON-LD depend on.

```sh
npm run build   # output in dist/
```
