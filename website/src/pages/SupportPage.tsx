import { releaseChecklist, siteConfig, supportFaqs, supportIntroSections } from '@shared/pineappleSiteContent';

import { FaqList, LegalSections, SurfaceCard } from '@/components/ContentBlocks';
import { MaterialIcon, SiteLayout } from '@/components/SiteLayout';

export function SupportPage() {
  return (
    <SiteLayout
      currentPath="/support"
      eyebrow="Help"
      title="Support"
      lede="Help information for Pineapple users, reviewers, and release checks."
    >
      <section className="content-section two-up-grid">
        <SurfaceCard title="Support details" icon={<MaterialIcon name="support_agent" />}>
          <p>
            Email: <a href={`mailto:${siteConfig.supportEmail}`}>{siteConfig.supportEmail}</a>
          </p>
          <p>Release support label: {siteConfig.releaseLabel}</p>
          <p>Typical help topics: Vault, reminders, onboarding, backups, and trip setup.</p>
        </SurfaceCard>
        <SurfaceCard title="Reviewer note" icon={<MaterialIcon name="checklist" />}>
          <p>
            This public support page exists so users and app-store reviewers can reach Pineapple without needing an
            in-app account.
          </p>
        </SurfaceCard>
      </section>

      <section className="content-section">
        <LegalSections sections={supportIntroSections} />
      </section>

      <section className="content-section">
        <div className="section-heading">
          <p className="page-eyebrow">FAQ</p>
          <h2>Common questions</h2>
        </div>
        <FaqList items={supportFaqs} />
      </section>

      <section className="content-section">
        <div className="section-heading">
          <p className="page-eyebrow">Release readiness</p>
          <h2>Compliance checks before the public launch</h2>
        </div>
        <SurfaceCard>
          <ul className="body-list">
            {releaseChecklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SurfaceCard>
      </section>
    </SiteLayout>
  );
}
