export const site = {
  name: 'Homak Design & Development',
  shortName: 'Homak',
  tagline: 'Design meets engineering.',
  description:
    'Homak is a web design and development studio in Naples, Florida. We create distinctive digital experiences through thoughtful design and solid development.',
  location: 'Naples, FL / Available worldwide',
  email: 'hello@homak.dev',
  url: 'https://homak.dev',
} as const;

/**
 * No-JS fallback for every "Start a project" CTA. With JS the same controls
 * carry `data-enquiry` and open `EnquiryModal.astro` instead, which POSTs to
 * `/api/contact`; the href is only followed when that script has not run.
 */
export const projectEnquiry = `mailto:${site.email}?subject=${encodeURIComponent(
  'New project enquiry',
)}`;

export const nav = [
  { label: 'About', href: '#about' },
  { label: 'Work', href: '#work' },
  { label: 'Contact', href: '#contact' },
] as const;
