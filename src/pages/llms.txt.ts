import type { APIRoute } from 'astro';
import { site, addressLine } from '../data/site';
import { team, teamBio } from '../data/team';
import { projects, projectPath } from '../data/projects';
import { services } from '../data/services';
import { faqs } from '../data/faq';

/**
 * `/llms.txt` — the Answer.AI convention for handing an assistant a clean
 * markdown summary of a site.
 *
 * Built as an endpoint rather than dropped in `public/` so the studio details,
 * the founders and the eight project write-ups come from the same modules the
 * page renders from; a hand-kept copy would drift the first time a project
 * changed. The convention is normally a table of contents pointing at
 * per-page markdown; the project copy is reproduced in full here and each
 * entry also links to its case study page.
 */
export const GET: APIRoute = () => {
  const body = `# ${site.name}

> ${site.description}

- Site: ${site.url}
- Email: ${site.email}
- Address: ${addressLine}
- Service area: Naples and Collier County, Florida; remote work worldwide

The homepage at ${site.url}/ carries everything below. Each project also has
its own case study page under ${site.url}/work/.

## Team

${team.map((p) => `- **${p.name}** — ${p.role}`).join('\n')}

${teamBio}

## Services

${services.map((s) => `- **${s.name}** — ${s.description}`).join('\n')}

## Selected work

${projects
  .map((p) => {
    const lines = [
      `### [${p.title}](${site.url}${projectPath(p.slug)})`,
      p.category,
      p.description,
    ];
    if (p.body) lines.push(...p.body);
    if (p.url) lines.push(`Live site: ${p.url}`);
    return lines.join('\n\n');
  })
  .join('\n\n')}

## Frequently asked questions

${faqs.map((f) => `### ${f.question}\n\n${f.answer}`).join('\n\n')}

## Contact

Tell us what you're building and we'll come back to you within two business
days: ${site.email}
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
