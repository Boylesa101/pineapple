import { SurfaceCard } from '@/components/ContentBlocks';
import { MaterialIcon, SiteLayout } from '@/components/SiteLayout';

export function DeleteAccountPage() {
  return (
    <SiteLayout
      currentPath="/support"
      eyebrow="Future-proofing"
      title="Delete account"
      lede="Account deletion information is reserved for a future release if Pineapple adds account features."
    >
      <section className="content-section">
        <SurfaceCard title="Future release placeholder" icon={<MaterialIcon name="manage_accounts" />}>
          <p>Account deletion information will appear here if account features are added in a future release.</p>
        </SurfaceCard>
      </section>
    </SiteLayout>
  );
}
