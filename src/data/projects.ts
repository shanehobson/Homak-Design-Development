import maxManicure from '../assets/projects/max-manicure.webp';
import nightingale from '../assets/projects/nightingale-nails.webp';
import odyssey from '../assets/projects/odyssey.webp';

export interface Project {
  slug: string;
  title: string;
  /** Shown under the title on the card. */
  category: string;
  /** Shown in the modal. */
  description: string;
  stack: string[];
  poster: ImageMetadata;
  /** Optional — cards without a video open to a still instead. */
  video?: string;
  url?: string;
}

export const projects: Project[] = [
  {
    slug: 'max-manicure',
    title: 'Max Manicure',
    category: 'Nail salon / Naples, FL',
    description:
      'A site for a nail salon with online scheduling and payments built in, powered by Zaera. Built with Astro for fast static delivery and deployed on AWS via CDK.',
    stack: ['Astro', 'Zaera', 'AWS CDK'],
    poster: maxManicure,
    url: 'https://www.maxmanicure.com/',
  },
  {
    slug: 'odyssey',
    title: 'Odyssey',
    category: 'AI travel planning',
    description:
      'An AI-driven travel planner that turns a prompt into a structured, day-by-day itinerary in seconds. Streaming architecture for live partial responses, tiered plans with cost guardrails, and a serverless AWS backend.',
    stack: ['React', 'TanStack Query', 'AWS Lambda', 'DynamoDB'],
    poster: odyssey,
    video: '/videos/odyssey.mp4',
    url: 'https://www.findmyodyssey.com/',
  },
  {
    slug: 'nightingale-nails',
    title: 'Nightingale Nails',
    category: 'Nail salon / Denver, CO',
    description:
      'A site for a Denver nail salon with an email contact form built on Next.js API routes and Nodemailer. Uses Incremental Static Regeneration for fast loads with fresh content.',
    stack: ['Next.js', 'ISR', 'Nodemailer'],
    poster: nightingale,
    url: 'https://nails-git-main-shane-hobsons-projects.vercel.app/',
  },
];
