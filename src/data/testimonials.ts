export interface Testimonial {
  quote: string;
  name: string;
  /** Optional line under the name, such as the client's business. */
  detail?: string;
}

export const testimonials: Testimonial[] = [
  {
    quote:
      'Shane was so easy to work with and made the whole process feel simple and stress-free. He really took the time to understand what I was looking for and brought my vision to life exactly how I imagined it. I couldn’t be happier with how my website turned out and would definitely recommend him!',
    name: 'Lauren Bartolone',
    detail: 'Naples, FL',
  },
  {
    quote:
      'Shane and Ksenia did a great job crafting a strategy for my company’s online presence and bringing it to life. I’ve truly enjoyed working with them and I’m extremely happy with the results!',
    name: 'Nadzeya Palitskavaya',
    detail: 'Naples, FL',
  },
];
