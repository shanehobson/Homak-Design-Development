/* One-shot reveal for `.reveal` content as it scrolls in. Side-effect module:
   importing it from a page's `<script>` is enough. Shared by every page rather
   than inlined in `index.astro`, because the class is global (`global.css`)
   and any page that uses it without this observer renders invisible copy. */
const revealables = document.querySelectorAll<HTMLElement>('.reveal');

if (revealables.length) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.2, rootMargin: '0px 0px -8% 0px' },
  );

  revealables.forEach((el) => revealObserver.observe(el));
}
