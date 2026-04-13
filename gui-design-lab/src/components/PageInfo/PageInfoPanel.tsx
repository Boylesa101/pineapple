import { GUI_LAB_VERSION } from '../../config/version'
import type { LabPage } from '../../data/pages'
import { formatPageNumber } from '../../utils/navigation'
import styles from './PageInfoPanel.module.css'

type Props = {
  page: LabPage
  previousSlug?: string | null
  nextSlug?: string | null
  onNavigate: (slug: string) => void
  onDashboard: () => void
}

export function PageInfoPanel({
  page,
  previousSlug,
  nextSlug,
  onNavigate,
  onDashboard,
}: Props) {
  return (
    <aside className={styles.panel}>
      <div>
        <div className={styles.eyebrow}>
          {formatPageNumber(page)} - {page.category}
        </div>
        <h1 className={styles.title}>{page.name}</h1>
      </div>

      <p className={styles.description}>{page.shortDescription}</p>

      <div className={styles.metaGrid}>
        <section className={styles.metaCard}>
          <span className={styles.metaLabel}>Description</span>
          <p className={styles.metaValue}>{page.shortDescription}</p>
        </section>
        <section className={styles.metaCard}>
          <span className={styles.metaLabel}>Category</span>
          <p className={styles.metaValue}>{page.category}</p>
        </section>
        {page.mockNotes ? (
          <section className={styles.metaCard}>
            <span className={styles.metaLabel}>Navigation Notes</span>
            <p className={styles.metaValue}>{page.mockNotes}</p>
          </section>
        ) : null}
      </div>

      <div className={styles.actions}>
        {previousSlug ? (
          <button className={styles.buttonSecondary} onClick={() => onNavigate(previousSlug)}>
            Previous Page
          </button>
        ) : null}
        {nextSlug ? (
          <button className={styles.button} onClick={() => onNavigate(nextSlug)}>
            Next Page
          </button>
        ) : null}
        <button className={styles.buttonSecondary} onClick={onDashboard}>
          Return to Dashboard
        </button>
      </div>

      <div className={styles.version}>Design Lab {GUI_LAB_VERSION}</div>
    </aside>
  )
}
