import type { ReactNode } from 'react';

import type { ContentSection, FAQItem } from '@shared/pineappleSiteContent';

export function SurfaceCard({
  title,
  children,
  icon,
}: {
  title?: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <article className="surface-card">
      {title || icon ? (
        <div className="surface-card-header">
          {icon ? <div className="surface-card-icon">{icon}</div> : null}
          {title ? <h2>{title}</h2> : null}
        </div>
      ) : null}
      <div className="surface-card-body">{children}</div>
    </article>
  );
}

export function LegalSections({ sections }: { sections: ContentSection[] }) {
  return (
    <div className="stack-grid">
      {sections.map((section) => (
        <SurfaceCard key={section.heading} title={section.heading}>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {section.bullets?.length ? (
            <ul className="body-list">
              {section.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          ) : null}
        </SurfaceCard>
      ))}
    </div>
  );
}

export function FaqList({ items }: { items: FAQItem[] }) {
  return (
    <div className="faq-grid">
      {items.map((item) => (
        <SurfaceCard key={item.question} title={item.question}>
          <p>{item.answer}</p>
        </SurfaceCard>
      ))}
    </div>
  );
}
