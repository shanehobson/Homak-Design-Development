import hobsonElectric from '../assets/projects/hobson-electric.webp';
import lumina from '../assets/projects/lumina-model-academy.webp';
import maxManicure from '../assets/projects/max-manicure.webp';
import nightingale from '../assets/projects/nightingale-nails.webp';
import odyssey from '../assets/projects/odyssey.webp';
import scienceOfDance from '../assets/projects/science-of-dance.webp';
import vault from '../assets/projects/vault.webp';
import zaera from '../assets/projects/zaera.webp';

export interface Project {
  slug: string;
  title: string;
  /** Shown under the title on the card. */
  category: string;
  /** Shown in the modal. */
  description: string;
  poster: ImageMetadata;
  /** Optional — cards without a video open to a still instead. */
  video?: string;
  url?: string;
}

export const projects: Project[] = [
  {
    slug: 'nightingale-nails',
    title: 'Nightingale Nails',
    category: 'Nail salon / Denver, CO',
    description:
      'A site for a Denver nail salon, with a contact form that lands enquiries straight in the owner’s inbox.',
    poster: nightingale,
    video: '/videos/nightingale.mp4',
    url: 'https://nails-git-main-shane-hobsons-projects.vercel.app/',
  },
  {
    slug: 'max-manicure',
    title: 'Max Manicure',
    category: 'Nail salon / Naples, FL',
    description:
      'A site for a Naples nail salon with scheduling and payments built in, so clients can pick a time and pay for it without picking up the phone.',
    poster: maxManicure,
    video: '/videos/max-mani.mp4',
    url: 'https://www.maxmanicure.com/',
  },
  {
    slug: 'zaera',
    title: 'Zaera',
    category: 'Scheduling & payments platform',
    description:
      'An all-in-one platform for service businesses. Booking, payments, and customer messaging live in a single dashboard, so owners stop juggling calendars and chasing invoices. Clients get a branded booking page, and staff schedules are colour-coded so two people never land in the same slot.',
    poster: zaera,
    video: '/videos/zaera.mp4',
    url: 'https://zaera.io/',
  },
  {
    slug: 'science-of-dance',
    title: 'The Science of Dance',
    category: 'Dance studio / Naples, FL',
    description:
      'A site for a Naples dance studio, introducing its instructor and her twenty years of ballet and coaching experience, with class pricing and a contact form that reaches the studio owner directly.',
    poster: scienceOfDance,
    video: '/videos/science-of-dance.mp4',
    url: 'https://d115owle18y2b1.cloudfront.net/',
  },
  {
    slug: 'vault',
    title: 'Vault',
    category: 'Personal photo & video storage',
    description:
      'A private home for every photo and video off your phone, tablet, or laptop. Uploads go straight to your own cloud storage, and the whole library stays browsable by month and year — any point in the timeline is one gesture away, with nothing to wait for in between.',
    poster: vault,
    video: '/videos/vault.mp4',
  },
  {
    slug: 'odyssey',
    title: 'Odyssey',
    category: 'AI travel planning',
    description:
      'An AI travel planner that turns a sentence about the trip you want into a structured, day-by-day itinerary in seconds. Plans arrive as you watch, and you can keep refining them until the trip looks right.',
    poster: odyssey,
    video: '/videos/odyssey.mp4',
    url: 'https://www.findmyodyssey.com/',
  },
  {
    slug: 'lumina-model-academy',
    title: 'Lumina Model Academy',
    category: 'Model academy / Naples, FL',
    description:
      'A site for a Naples model academy for children and teenagers. It introduces the founders, lays out what the program covers — runway, posing, choreography, etiquette — and points prospective students toward casting.',
    poster: lumina,
    video: '/videos/lumina-model-academy.mp4',
    url: 'https://www.luminamodelacademy.com/',
  },
  {
    slug: 'hobson-electric',
    title: 'Hobson Electric',
    category: 'Electrical services / West Central Indiana',
    description:
      'A site for an electrical services company, covering the commercial and residential work it takes on and the people who do it. A free-estimate request form sends enquiries directly to the owner.',
    poster: hobsonElectric,
    video: '/videos/hobson-electric.mp4',
    url: 'https://d2rovogyqdtmn6.cloudfront.net/',
  },
];
