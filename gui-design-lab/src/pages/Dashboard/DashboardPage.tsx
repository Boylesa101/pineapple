import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GUI_LAB_VERSION } from '../../config/version'
import { pages } from '../../data/pages'
import { clearSession } from '../../utils/auth'
import { formatPageNumber, getPageBySlug } from '../../utils/navigation'
import styles from './DashboardPage.module.css'

export function DashboardPage() {
  const navigate = useNavigate()
  const recommendedSequence: Array<{ label: string; slug: string }> = [
    { label: 'Home Dashboard', slug: 'home-dashboard' },
    { label: 'Trip Overview', slug: 'trip-overview-page' },
    { label: 'Travel Timeline', slug: 'travel-timeline-transport-stack' },
    { label: 'Accommodation', slug: 'accommodation-detail-page' },
    { label: 'Vault', slug: 'vault-documents-home' },
    { label: 'Passport Viewer', slug: 'passport-viewer' },
    { label: 'Alerts', slug: 'alerts-centre' },
    { label: 'Account', slug: 'account-page' },
    { label: 'Settings', slug: 'settings-home' },
    { label: 'New User Flow', slug: 'splash-launch-screen' },
  ]
  const recommendedPages: Array<{ label: string; page: NonNullable<ReturnType<typeof getPageBySlug>> }> = recommendedSequence
    .map((entry) => ({
      label: entry.label,
      page: getPageBySlug(entry.slug),
    }))
    .filter((entry): entry is { label: string; page: NonNullable<ReturnType<typeof getPageBySlug>> } => entry.page !== undefined)
  const [selectedSlug, setSelectedSlug] = useState<string>(recommendedSequence[0].slug)

  const selectedPage = useMemo(
    () => pages.find((page) => page.slug === selectedSlug) ?? pages[0],
    [selectedSlug],
  )

  const openPage = (slug: string) => {
    setSelectedSlug(slug)
    navigate(`/gui/${slug}`)
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.panel}>
          <div className={styles.heroRow}>
            <div>
              <h1 className={styles.title}>GUI Design Dashboard</h1>
              <p className={styles.subtitle}>
                Premium private control centre for reviewing Pineapple screens, testing navigation flows, comparing revisions, and iterating GUI direction page by page.
              </p>
            </div>
            <button
              className={styles.logout}
              onClick={() => {
                clearSession()
                navigate('/login', { replace: true })
              }}
            >
              Logout
            </button>
          </div>

          <h2 className={styles.sectionTitle}>Recommended Design Order</h2>
          <div className={styles.recommendedList}>
            {recommendedPages.map(({ label, page }) => (
              <button
                key={page.slug}
                className={styles.recommendedButton}
                onClick={() => setSelectedSlug(page.slug)}
              >
                <span>{label}</span>
                <span>{formatPageNumber(page)}</span>
              </button>
            ))}
          </div>

          <div className={styles.buttonRow}>
            <button className={styles.primaryButton} onClick={() => openPage(selectedPage.slug)}>
              Open GUI Viewer
            </button>
            <button className={styles.secondaryButton} onClick={() => openPage(recommendedSequence[0].slug)}>
              Launch Page 01
            </button>
          </div>
        </section>

        <section className={styles.summaryPanel}>
          <h2 className={styles.sectionTitle}>Project Status</h2>
          <div className={styles.summaryGrid}>
            <article className={styles.summaryCard}>
              <strong>Total Screens</strong>
              <p className={styles.pageMeta}>{pages.length} registered screens across onboarding, core app, vault, alerts, transfer, settings, and utility states.</p>
            </article>
            <article className={styles.summaryCard}>
              <strong>Current Focus</strong>
              <p className={styles.pageMeta}>Page 01 Home Dashboard is the most complete flagship build with motion, hierarchy, and connected tap targets.</p>
            </article>
            <article className={styles.summaryCard}>
              <strong>Review Use</strong>
              <p className={styles.pageMeta}>Review screens, test page flows, iterate visuals, and update versions without touching the real mobile app.</p>
            </article>
            <article className={styles.summaryCard}>
              <strong>Selected Page</strong>
              <p className={styles.pageMeta}>{selectedPage.name}</p>
            </article>
          </div>

          <h2 className={styles.sectionTitle} style={{ marginTop: 28 }}>Full Page Inventory</h2>
          <div className={styles.inventoryGrid}>
            {pages.map((page) => (
              <button key={page.slug} className={styles.pageCard} onClick={() => openPage(page.slug)}>
                <strong>
                  {formatPageNumber(page)} · {page.name}
                </strong>
                <span className={styles.pageMeta}>{page.category}</span>
                <span className={styles.pageMeta}>{page.shortDescription}</span>
              </button>
            ))}
          </div>

          <div className={styles.version}>{GUI_LAB_VERSION}</div>
        </section>
      </div>
    </main>
  )
}
