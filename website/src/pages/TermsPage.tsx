import { legalConfig, termsSections } from '../../../src/content/legal';
import { LegalSections, SurfaceCard } from '../components/ContentBlocks';
import { MaterialIcon, SiteLayout } from '../components/SiteLayout';

export function TermsPage() {
  return (
    <SiteLayout
      currentPath="/terms"
      eyebrow="Legal"
      title="Terms of Use"
      lede="Simple, practical terms for using Pineapple and relying on it as a travel organiser."
    >
      <section className="content-section two-up-grid">
        <SurfaceCard title="Key takeaway" icon={<MaterialIcon name="travel_explore" />}>
          <p>
            Pineapple helps organise travel information, but you remain responsible for checking official rules,
            document validity, bookings, and emergency information.
          </p>
        </SurfaceCard>
        <SurfaceCard title="Contact" icon={<MaterialIcon name="mail" />}>
          <p>
            Support: <a href={`mailto:${legalConfig.supportEmail}`}>{legalConfig.supportEmail}</a>
          </p>
        </SurfaceCard>
      </section>

      <section className="content-section">
        <LegalSections sections={termsSections} />
      </section>
    </SiteLayout>
  );
}
