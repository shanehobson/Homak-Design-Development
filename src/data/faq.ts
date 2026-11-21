/**
 * The homepage FAQ. Rendered as visible prose in `FAQ.astro` and emitted as
 * `FAQPage` JSON-LD from the same array, which is what Google requires: the
 * structured answers must match text a visitor can actually read.
 *
 * Deliberately no pricing. Answers describe how the studio already works
 * rather than promising turnaround times or service levels.
 */
export interface Faq {
  question: string;
  answer: string;
}

export const faqs: Faq[] = [
  {
    question: 'Who do you work with?',
    answer:
      'Mostly small businesses and independent professionals: salons, studios, academies, contractors, and founders building a product of their own. Many of our clients are in Naples and Southwest Florida, but the work itself happens online, so location is not a requirement.',
  },
  {
    question: 'Do you only work with businesses in Naples?',
    answer:
      'No. We are based in Naples, Florida and take on work from anywhere. Calls happen over video, reviews happen in the browser, and everything we need from you can be sent by email, so a client in another state or country gets the same process as one down the road.',
  },
  {
    question: 'What does the process look like?',
    answer:
      'It starts with a conversation about your business, who the site is for, and what it has to do. Ksenia designs the site in Figma, and you review and approve it before anything is built. Shane then builds it, we test it together on real phones and laptops, and we launch it on your domain.',
  },
  {
    question: 'How long does a project take?',
    answer:
      'It depends on the size of the site and how quickly content and feedback come back. A marketing site with a handful of pages moves fastest; anything with booking, payments or user accounts is scoped on its own. We agree the timeline with you at the start, before any work begins.',
  },
  {
    question: 'What do you build with?',
    answer:
      'Modern web frameworks such as Astro for content sites, and the same family of tools for applications, with payments through Stripe where a site takes money. Sites are hosted on AWS behind a global CDN, which is why they stay fast for visitors wherever they are.',
  },
  {
    question: 'Can you help us use AI in our business?',
    answer:
      'Yes. We help companies put AI to work in the processes they already have: answering common customer questions, drafting replies and documents, sorting incoming requests, and moving information between tools without retyping it. We start by finding the steps where it would save real time, build and test the workflow with your team, and connect it to the systems you already use.',
  },
  {
    question: 'Do you handle hosting and the domain?',
    answer:
      'Yes. We host what we build, set up the domain, certificates and email, and keep the site updated after launch. If you would rather own the hosting yourself, we set it up in your own accounts and hand over the keys.',
  },
  {
    question: 'What happens after the site launches?',
    answer:
      'We stay on. Content changes, new pages, new photos, and fixes all go to the two people who built the site, with one point of contact and no ticket queue. Larger changes are scoped as small projects of their own.',
  },
  {
    question: 'What do you need from me to get started?',
    answer:
      'A description of your business and who your customers are, any branding you already have, and the photos, text or services you want on the site. If some of that does not exist yet, say so; we can help write it and tell you what to photograph.',
  },
];
