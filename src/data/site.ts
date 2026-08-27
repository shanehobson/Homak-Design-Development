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

/** The header CTA and the hero CTA both point here. Swap for a form/Calendly later. */
export const projectEnquiry = `mailto:${site.email}?subject=${encodeURIComponent(
  'New project enquiry',
)}`;

export const nav = [
  { label: 'About', href: '#about' },
  { label: 'Work', href: '#work' },
  { label: 'Contact', href: '#contact' },
] as const;
