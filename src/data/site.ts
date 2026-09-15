export const site = {
  name: 'Homak Design & Development',
  shortName: 'Homak',
  tagline: 'Design meets engineering.',
  /* Leads with the service and the city rather than the brand: nobody searches
     "Homak" yet, and Google truncates around 60 characters. */
  seoTitle: 'Web Design & Development in Naples, FL | Homak Studio',
  description:
    'Homak is a web design and development studio in Naples, Florida. We build fast, distinctive websites — thoughtful design and solid engineering under one roof.',
  location: 'Naples, FL / Available worldwide',
  email: 'hello@homak.dev',
  url: 'https://homak.dev',
  /* Rendered into the card by `scripts/og-image.mjs`. */
  ogImage: '/og.png',
  ogImageAlt: 'Homak — design / development studio, Naples, Florida.',
  logo: '/logo.png',
} as const;

/**
 * The studio's registered address. Local search wants one spelling of this
 * everywhere it appears — the JSON-LD in `Base.astro`, the visible block in
 * `Contact.astro`, and any directory listing — so both forms are derived here
 * rather than retyped per surface.
 */
export const address = {
  street: '4174 Pegasus Way',
  locality: 'Naples',
  region: 'FL',
  postalCode: '34120',
  country: 'US',
} as const;

export const addressLine =
  `${address.street}, ${address.locality}, ${address.region} ${address.postalCode}`;

/**
 * Stripe-hosted customer portal login. A client enters their email and Stripe
 * mails them a sign-in link to pay invoices, update their card and see their
 * payment history. Swap for `https://portal.homak.dev` once that portal ships.
 */
export const billingPortal = 'https://billing.stripe.com/p/login/eVqaEWdlz4Y58f11Vw0Ba00';

/**
 * No-JS fallback for every "Start a project" CTA. With JS the same controls
 * carry `data-enquiry` and open `EnquiryModal.astro` instead, which POSTs to
 * `/api/contact`; the href is only followed when that script has not run.
 */
export const projectEnquiry = `mailto:${site.email}?subject=${encodeURIComponent(
  'New project enquiry',
)}`;

/* Rooted at `/` rather than bare fragments so the header works from the case
   study pages and the 404 too. On the homepage the browser treats `/#about`
   as a same-document fragment jump, so smooth scroll is unaffected. */
export const nav = [
  { label: 'About', href: '/#about' },
  { label: 'Services', href: '/#services' },
  { label: 'Work', href: '/#work' },
  { label: 'Contact', href: '/#contact' },
] as const;

/**
 * `@id`s of the JSON-LD nodes every page shares. `Base.astro` emits the nodes;
 * page-specific graphs (the case studies) reference them by id rather than
 * repeating them, so Google sees one studio entity across the whole site.
 */
export const ids = {
  studio: `${site.url}/#studio`,
  website: `${site.url}/#website`,
} as const;
