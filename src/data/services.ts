/**
 * What the studio sells. Rendered as the homepage Services section and as the
 * `OfferCatalog` on the studio's JSON-LD node in `Base.astro`, so the visible
 * list and the structured one cannot drift apart.
 *
 * Each entry is grounded in shipped work (see `projects.ts`) rather than a
 * wish list: nothing here that the portfolio cannot already show.
 */
export interface Service {
  /** Anchor id within the Services section. */
  id: string;
  name: string;
  /** One short paragraph. Also the `Service.description` in the JSON-LD. */
  description: string;
}

export const services: Service[] = [
  {
    id: 'marketing-sites',
    name: 'Marketing websites',
    description:
      'A site that says what you do, shows the work, and turns a visit into an enquiry. Designed around your brand, written to be found in search, and built to load fast on a phone.',
  },
  {
    id: 'booking-and-payments',
    name: 'Booking & payments',
    description:
      'Online scheduling and card payments built into your site, so clients pick a time and pay for it without a phone call. Staff calendars, reminders and receipts included.',
  },
  {
    id: 'web-applications',
    name: 'Web applications',
    description:
      'Products with accounts, dashboards and data behind them: the software a business runs on, or a product of your own. Scoped, designed and engineered end to end.',
  },
  {
    id: 'design-and-branding',
    name: 'Design & branding',
    description:
      'Visual identity, layout and type designed for the screen first. Every project starts in Figma, so you see and approve the site before a line of it is built.',
  },
  {
    id: 'hosting-and-maintenance',
    name: 'Hosting & maintenance',
    description:
      'We host what we build on AWS and keep it fast, secure and up to date after launch. Content changes and new pages are handled by the people who made the site.',
  },
];
