import { Link, NavLink, useParams } from 'react-router-dom';
import { Info } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { legalDocs } from '../data/legal';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import NotFoundPage from './NotFoundPage';
import { cn } from '../utils/cn';
import { formatDate } from '../utils/format';
import { contactEmail } from '../data/site';


export default function LegalPage() {
  const { doc = 'privacy' } = useParams();
  const content = legalDocs[doc];
  useDocumentTitle(content?.title ?? 'Legal');

  if (!content) return <NotFoundPage />;

  return (
    <Container className="pb-20 pt-6 lg:pb-28 lg:pt-10">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Legal' }, { label: content.title }]} />

      <nav aria-label="Legal documents" className="no-scrollbar -mx-4 mt-8 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-2">
          {Object.entries(legalDocs).map(([key, item]) => (
            <li key={key}>
              <NavLink
                to={`/legal/${key}`}
                className={({ isActive }) =>
                  cn(
                    'inline-flex h-9 items-center whitespace-nowrap rounded-full px-4 text-caption font-medium transition-colors',
                    isActive ? 'bg-ink text-white' : 'ring-1 ring-inset ring-line-strong hover:ring-ink',
                  )
                }
              >
                {item.title}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-10 lg:mt-14 lg:grid lg:grid-cols-[220px_1fr] lg:gap-16">
        <aside className="hidden lg:block">
          <nav aria-label="On this page" className="sticky top-24">
            <p className="eyebrow text-muted">On this page</p>
            <ol className="mt-4 space-y-2.5 border-l border-line">
              {content.sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="-ml-px block border-l border-transparent pl-4 text-sm text-muted transition-colors hover:border-ink hover:text-ink">
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className="max-w-3xl">
          <h1 className="text-title font-bold leading-[1.05] tracking-[-0.03em] sm:text-5xl">{content.title}</h1>
          <p className="mt-4 text-sm text-muted">
            Last updated <time dateTime={content.updated}>{formatDate(content.updated)}</time>
          </p>

          <p className="mt-8 flex items-start gap-3 rounded-2xl bg-surface p-4 text-caption leading-relaxed text-ink/75">
            <Info className="mt-px size-4 shrink-0" aria-hidden="true" />
            Sample policy text for this storefront design. It is not legal advice — replace it with policies reviewed by a qualified
            lawyer before launch.
          </p>

          <p className="mt-8 text-base leading-relaxed text-ink/80">{content.intro}</p>

          {content.sections.map((section, index) => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="mt-12 scroll-mt-24">
              <h2 id={`${section.id}-title`} className="text-xl font-semibold tracking-tight sm:text-2xl">
                <span className="mr-2 text-muted tabular-nums">{index + 1}.</span>
                {section.title}
              </h2>
              <div className="mt-4 space-y-4 text-body leading-relaxed text-ink/75">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}

          <p className="mt-16 border-t border-line pt-8 text-sm text-muted">
            Questions? Visit the{' '}
            <Link to="/help#contact" className="font-medium text-ink underline underline-offset-4">
              Help centre
            </Link>{' '}
            or email {contactEmail.legal}.
          </p>
        </article>
      </div>
    </Container>
  );
}
