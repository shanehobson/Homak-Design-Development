import hobsonElectric from '../assets/projects/hobson-electric.webp';
import lumina from '../assets/projects/lumina-model-academy.webp';
import maxManicure from '../assets/projects/max-manicure.webp';
import nightingale from '../assets/projects/nightingale-nails.webp';
import odyssey from '../assets/projects/odyssey.webp';
import scienceOfDance from '../assets/projects/science-of-dance.webp';
import vault from '../assets/projects/vault.webp';
import zaera from '../assets/projects/zaera.webp';

export interface Project {
  /** Also the path segment of the case study page, `/work/<slug>/`. */
  slug: string;
  title: string;
  /** Shown under the title on the card. */
  category: string;
  /** Shown in the modal, and the case study's opening paragraph until `body` lands. */
  description: string;
  poster: ImageMetadata;
  /** Optional — cards without a video open to a still instead. */
  video?: string;
  /** The live site. Absent for work that is not publicly reachable. */
  url?: string;

  /* ---- Case study page ---------------------------------------------------
     All optional so a project renders a page from the card copy alone; each
     one replaces a fallback derived from the fields above. */

  /** `<title>` for the case study. Falls back to "title — category | Homak". */
  seoTitle?: string;
  /** Meta description, ideally 120–160 characters. Falls back to `description`. */
  summary?: string;
  /** The long-form write-up, one entry per paragraph. Falls back to `description`. */
  body?: string[];
  /** ISO date (`YYYY-MM-DD`) the case study and its walkthrough video were
      published on this site. Emitted as the video's `uploadDate`, which Google
      requires before it will show a video result. */
  published?: string;
}

/** Path of a project's case study page, with the trailing slash Astro emits. */
export const projectPath = (slug: string) => `/work/${slug}/`;

/* Every case study went live with the site itself; see `git log` for the
   date the posters were added. */
const SITE_LAUNCH = '2026-08-27';

export const projects: Project[] = [
  {
    slug: 'zaera',
    title: 'Zaera',
    category: 'Scheduling & payments platform',
    description:
      'An all-in-one platform for service businesses. Booking, payments, and customer messaging live in a single dashboard, so owners stop juggling calendars and chasing invoices. Clients get a branded booking page, and staff schedules are colour-coded so two people never land in the same slot.',
    poster: zaera,
    video: '/videos/zaera.mp4',
    url: 'https://zaera.io/',
    published: SITE_LAUNCH,
    seoTitle: 'Zaera — Booking & Payments Platform for Service Businesses | Homak',
    summary:
      'Zaera is an online booking and payments platform for service businesses: 24/7 scheduling, Stripe payments, staff calendars and reminders in one dashboard. Designed and built by Homak.',
    body: [
      'A small service business runs its day across a paper diary, a card reader and a phone that will not stop ringing. Bookings live in one place, money in another, and the customer conversation in a third. Zaera set out to replace all of it with one product: a booking and payments platform that works as well for a single practitioner as for a team, and that a client can use without ever making a call.',
      'We designed and built the whole thing, from the marketing site at zaera.io to the application behind it. The marketing site walks a business owner through the product in the order they would meet it. See the whole team at a glance. Let customers book around the clock. Get paid without chasing. Make it yours. It ends with a three-step onboarding and a free start with no card required, and a request-a-demo path for owners who would rather see it first.',
      'Scheduling is the heart of the app. Every staff member gets their own colour on a shared weekly view, so two appointments can never land in the same slot unnoticed. Clients book through a branded page that shows only the services, people and times that are actually available, on a layout built for a phone. Confirmed appointments sync to Google Calendar, and confirmation emails and reminders go out on their own.',
      'Payments run through Stripe. A card can be kept on file and charged after the appointment in a single click, or taken at checkout, and every transaction and its status is visible from the dashboard. The service menu supports categories, prices and durations, and the whole booking experience takes the business’s logo and colours, with a live preview as the owner makes changes.',
      'The result is a product that runs end to end, from a visitor reading the landing page to a paid appointment on the calendar, with the design and the engineering coming from the same two people.',
    ],
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
    published: SITE_LAUNCH,
    seoTitle: 'Nail Salon Website Design in Naples, FL — Max Manicure | Homak',
    summary:
      'A website for Max Manicure, a private nail studio in Naples, Florida, with a full service menu, testimonials and online booking with payment built in. Designed and built by Homak.',
    body: [
      'Max Manicure is a private nail studio in Naples with a speciality in clean, elegant hard gel work. The studio needed a website that did two jobs at once: show the quality of the nails to someone who had never been in, and let a returning client book and pay without a phone call.',
      'The site is a single page that reads top to bottom the way a first visit would go. A short introduction in the studio’s own voice, then a portfolio of nude, pink and French designs, then the service menu. Every service is listed with its price and its duration, from a traditional manicure to extensions and complex designs, along with the add-ons a client can ask for: foil, chrome powder, glitter, stamping, stones and 3D work. Nobody has to message to ask what something costs or how long to set aside.',
      'Booking is built in rather than bolted on. The Book Now buttons take a client straight to online scheduling, where they choose a service, pick a time that is actually free, and pay for it there and then. For anyone who would rather talk first, a contact form asks for a name, email, phone and message and lands directly in the owner’s inbox, with the studio’s phone number and Instagram alongside it.',
      'Three short testimonials sit near the end, chosen because they say specific things: precision, nails that lasted four weeks, a studio that feels private and calm. The design follows the same brief. Soft neutrals, generous space around the photography, and a typeface pairing that reads as a boutique rather than a chain.',
      'It is built as a static site, so it loads quickly on a phone in a parking lot, and it is hosted and maintained by us. When the service list or prices change, the owner tells us and the site is updated the same day.',
    ],
  },
  {
    slug: 'nightingale-nails',
    title: 'Nightingale Nails',
    category: 'Nail salon / Denver, CO',
    description:
      'A site for a Denver nail salon, with a contact form that lands enquiries straight in the owner’s inbox.',
    poster: nightingale,
    video: '/videos/nightingale.mp4',
    /* No `url`: the Vercel preview this used to link to is gone (404). */
    published: SITE_LAUNCH,
    seoTitle: 'Nail Salon Website Design — Nightingale Nails, Denver | Homak',
    summary:
      'A website for Nightingale Nails, a nail studio in Denver, Colorado, with an appointment request form on the first screen. Designed and built by Homak.',
    body: [
      'Nightingale Nails is a Denver nail studio that describes itself as a community as much as a salon: a place built on creativity, self-care and connection, where the artists mix current trends with classic technique. The brief was a site that felt like the studio, and that made asking for an appointment the easiest thing on the page.',
      'So the appointment form is the first thing a visitor sees. It sits on the opening screen beside the studio’s name and tagline, and asks for only a full name, an email and a phone number before a Get in touch button. Submissions arrive in the owner’s inbox as an email, with nothing for the studio to log into and check. The studio’s phone number is right next to the form for anyone who would rather call, and a first-visit offer sits under the introduction for anyone still deciding.',
      'From there the site moves through the studio’s services, the team of artists, the salon itself and a contact section, all reachable from a simple menu across the top. The whole thing lives on one page, so a visitor on a phone scrolls rather than hunts.',
      'The design leans into the name. A dark, painted floral background, a hand-drawn nightingale in the logo, a warm gold header and a deep teal for the buttons, with a high-contrast serif for the studio’s name and a monospaced face for labels. It looks nothing like a template, which was the point: the studio’s whole pitch is that it is not like the salon down the street.',
      'Everything on the page is real HTML, so it is fast, it is readable by search engines, and it works without waiting on scripts. The form is the only moving part, and it does one job.',
    ],
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
    published: SITE_LAUNCH,
    seoTitle: 'Dance Studio Website Design in Naples, FL — The Science of Dance | Homak',
    summary:
      'A website for The Science of Dance, a Naples ballet and fitness studio, presenting the instructor’s credentials, class memberships and a direct contact form. Designed and built by Homak.',
    body: [
      'The Science of Dance is a Naples studio run by a choreographer, dancer and fitness coach with twenty years of experience, a background in international ballet competition and advanced degrees in dance. She teaches ballet to children and functional training to teenagers and adults, one to one and in groups. The site had to carry all of that credibility in a few seconds, and then get a parent or a client to the class list and the booking button.',
      'The opening screen sets the tone. A black-and-white photograph of a dancer folded forward, the studio’s name set across it in thin capitals, and a single word picked out in pink. Three links, About, Price and Contact, and nothing else. It looks like a studio, not a directory listing.',
      'The About section lists what the instructor is, in her own order: choreographer, dancer, fitness coach, doctor of science. Then the facts that matter to a parent choosing a ballet teacher: the years of experience, the competitions, the number of students taught, the degrees.',
      'Pricing is laid out plainly, which is rarer than it should be for a studio. Children’s ballet is offered as a single session or as a monthly membership of four or eight classes. Functional training is listed for individuals and for groups on the same terms, and a membership bonus is spelled out rather than hidden. A visitor can work out what a month would cost without sending a message, and a Book Now button follows the price list for the ones who are ready.',
      'The contact section gives the studio’s email and phone number directly, so an enquiry reaches the instructor herself rather than a shared inbox. The site is a static build served from a global CDN, hosted and looked after by us.',
    ],
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
    published: SITE_LAUNCH,
    seoTitle: 'Odyssey — AI Travel Itinerary Planner Web App | Homak',
    summary:
      'Odyssey is an AI travel planner that turns one sentence about a trip into a day-by-day itinerary, streamed live and refined in conversation. A web application designed and built by Homak.',
    body: [
      'Planning a trip is mostly research: which neighbourhood, which days, what is near what, how much can fit before everyone is tired. Odyssey compresses that work into a sentence. Describe the trip you want, a long weekend in a city with good food and one big hike, say, and the planner returns a structured, day-by-day itinerary in seconds.',
      'The part we cared most about is how the plan arrives. Rather than a spinner and a wall of text, the itinerary streams in as it is generated, day by day, so the person watching sees the shape of the trip form and can start reading before it is finished. It makes a wait of several seconds feel like a conversation rather than a delay, and it was the detail that took the most engineering to get right.',
      'A first draft is rarely the final one, so the plan is a starting point rather than an answer. A traveller can keep refining it, swap a day, push a museum to the morning, ask for something quieter, until the trip looks the way they had imagined it. Each pass keeps what was working and changes only what was asked.',
      'Odyssey is a full web application with user accounts, so plans are saved and can be returned to. The entry screen is deliberately spare: the logo, the line “Plan your next adventure” and a sign-in over a mountain landscape. The interface stays out of the way of the itinerary, which is the thing people came for.',
      'It is the kind of product we build when a client has a product idea of their own: an interface designed around a single core interaction, an AI model behind it, and the streaming, accounts and infrastructure to make it feel instant.',
    ],
  },
  {
    slug: 'vault',
    title: 'Vault',
    category: 'Personal photo & video storage',
    description:
      'A private home for every photo and video off your phone, tablet, or laptop. Uploads go straight to your own cloud storage, and the whole library stays browsable by month and year — any point in the timeline is one gesture away, with nothing to wait for in between.',
    poster: vault,
    video: '/videos/vault.mp4',
    published: SITE_LAUNCH,
    seoTitle: 'Vault — Private Photo & Video Library Web App | Homak',
    summary:
      'Vault is a private photo and video library that uploads from any device to your own cloud storage and stays fast to browse by month and year. A web application designed and built by Homak.',
    body: [
      'Everyone has the same problem: years of photos and videos scattered across a phone, an old phone, a tablet and a laptop, and a nagging sense that the only copy of some of them is on a device that could fall in a pool. Vault is a private home for all of it. Uploads from any device go straight into cloud storage that belongs to the owner, not to a platform, and the whole library is there in one place.',
      'The design problem was scale. A library like this runs to tens of thousands of items, and the thing that makes photo apps feel slow is waiting for a grid to load. Vault organises everything by month and year, shows the count for each, and lets a viewer jump to any point in the timeline with one gesture. Years, months or everything at once, switched from a control that stays in reach. There is nothing to wait for in between; the grid is ready when the viewer gets there.',
      'Videos sit in the same grid as photos, each marked with its length, and play in place. Uploading is a single action from the top bar, and selecting items for a download or a delete is one tap away. The interface is a header, a grid and a timeline, and it stays that simple no matter how large the library grows.',
      'Under the hood it is a web application backed by object storage, so it works the same from a phone browser, a tablet or a laptop, with no app to install and no subscription tier deciding how much can be kept. The library is exactly as big as the storage the owner chooses to give it.',
      'Vault is unforgiving about speed by design, and it is a good example of what we mean by a web application: a real interface over real data, engineered to stay fast as the data grows.',
    ],
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
    published: SITE_LAUNCH,
    seoTitle: 'Model Academy Website Design in Naples, FL — Lumina Model Academy | Homak',
    summary:
      'A website for Lumina Model Academy, a Naples modelling school for children and teenagers, presenting its founders, curriculum and casting sign-up. Designed and built by Homak.',
    body: [
      'Lumina Model Academy is a modelling school in Naples for children and teenagers, with the tagline “Where talent meets opportunity, and dreams take the runway.” The people it has to convince are parents, and parents want to know two things before they hand over a child for a Saturday: who is teaching, and what exactly will be taught. The site is built to answer both before asking for anything.',
      'The founders come first. Between them they bring decades of international modelling, years of teaching ballet and choreography, and a career in fashion design with runway shows in the major fashion capitals. Each founder gets a portrait and a biography in full, because the credentials are the product.',
      'The curriculum is then laid out as a list a parent can read in a minute: Runway, Photoposing, Choreography, Model Etiquette and Makeup, finishing with an official certificate of completion. Beyond the core programme the site describes master classes with industry professionals and the fashion shows and beauty contests students take part in, and shows the students themselves in the academy’s own photography.',
      'The call to action is “Sign up for casting”, by text or call, repeated where a parent is likely to have decided. The academy’s address and Instagram sit alongside it. The visual language is bright and a little playful, orange and white squiggles between sections, so it reads as a place for young people rather than an agency.',
      'The brief was a site that a parent could trust in a minute and a teenager would be happy to share, and the design answers both without leaning on a template.',
    ],
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
    published: SITE_LAUNCH,
    seoTitle: 'Electrical Contractor Website Design — Hobson Electric, Indiana | Homak',
    summary:
      'A website for Hobson Electric, a commercial and residential electrical contractor serving nine counties in West Central Indiana since 1999, with a free-estimate request form. Designed and built by Homak.',
    body: [
      'Hobson Electric has been an electrical contractor in West Central Indiana since 1999, covering nine counties around its home base. It does commercial and industrial work, including the large jobs that need a bucket truck, and residential work from new construction to remodelling. It needed a website that did what a good yard sign does, only with more room: say what the company does, where, for how long, and how to get an estimate.',
      'The site is organised the way a customer thinks. Commercial and Residential each get their own section, written for the person reading it. The commercial copy talks about decades of experience serving business and industry and the capacity for larger projects; the residential copy talks about safety and efficiency for a homeowner. An About Us section introduces the people who actually show up, with photographs of the team rather than stock images of a stranger in a hard hat.',
      'The service area is drawn on a map and spelled out as a list of counties, so a customer knows at a glance whether they are covered. The company’s founding year is right under the name, because twenty-five years in the same county is the single most persuasive thing a contractor can say.',
      'The main call to action is a free estimate. A request form sends the enquiry straight to the owner as an email, with the phone number, email address and physical address alongside it for customers who prefer to call or drop in. A Facebook link connects to the page the company already keeps.',
      'It is a static site served from a global CDN, so it is fast on a rural mobile connection and costs almost nothing to run. It is hosted and maintained by us, and it shows how we approach a trades business: plain language, real people, one clear next step.',
    ],
  },
];
