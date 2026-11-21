import ksenia from '../assets/team/ksenia.webp';
import shane from '../assets/team/shane.webp';

export const team = [
  {
    /* Also the fragment each founder's `Person` node is keyed by in the
       JSON-LD graph, so the studio's `founder` list can point at them. */
    id: 'ksenia-maksymiv',
    name: 'Ksenia Maksymiv',
    role: 'Web Designer / Co-founder',
    photo: ksenia,
  },
  {
    id: 'shane-hobson',
    name: 'Shane Hobson',
    role: 'Software Engineer / Co-founder',
    photo: shane,
  },
] as const;

export const teamBio =
  'We build software that gets you noticed, streamlines your work and makes you money. Ksenia designs it and Shane engineers it, so you work directly with the two people doing the work: one point of contact, and changes handled quickly. We have been building together for three years, based in Naples, Florida.';
