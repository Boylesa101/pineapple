import { legalConfig, privacySections, privacySummaryBullets } from '../../../src/content/legal';
import { LegalSections, SurfaceCard } from '../components/ContentBlocks';
import { MaterialIcon, SiteLayout } from '../components/SiteLayout';

export function PrivacyPage() {
  return (
    <SiteLayout
      currentPath="/privacy"
      eyebrow="Legal"
      title="Privacy Policy"
      lede="Plain-English privacy information for Pineapple's current local-first release."
    >
      <section className="content-section two-up-grid">
        <SurfaceCard title="Quick privacy summary" icon={<MaterialIcon name="shield_lock" />}>
          <ul className="body-list">
            {privacySummaryBullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SurfaceCard>
        <SurfaceCard title="Contact" icon={<MaterialIcon name="mail" />}>
          <p>
            Privacy questions: <a href={`mailto:${legalConfig.privacyEmail}`}>{legalConfig.privacyEmail}</a>
          </p>
          <p>
            Support questions: <a href={`mailto:${legalConfig.supportEmail}`}>{legalConfig.supportEmail}</a>
          </p>
        </SurfaceCard>
      </section>

      <section className="content-section">
        <LegalSections sections={privacySections} />
      </section>
    </SiteLayout>
  );
}
