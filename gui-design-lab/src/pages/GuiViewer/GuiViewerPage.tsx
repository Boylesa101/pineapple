import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { PageInfoPanel } from '../../components/PageInfo/PageInfoPanel'
import { PhoneShell } from '../../components/PhoneShell/PhoneShell'
import { ScreenRenderer } from '../../components/MockScreens/ScreenRenderer'
import { getAdjacentPages, getPageBySlug } from '../../utils/navigation'
import styles from './GuiViewerPage.module.css'

export function GuiViewerPage() {
  const navigate = useNavigate()
  const { pageSlug = '' } = useParams()
  const page = getPageBySlug(pageSlug)

  if (!page) {
    return <Navigate to="/dashboard" replace />
  }

  const adjacent = getAdjacentPages(page.slug)

  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <PageInfoPanel
          page={page}
          previousSlug={adjacent.previous?.slug}
          nextSlug={adjacent.next?.slug}
          onNavigate={(slug) => navigate(`/gui/${slug}`)}
          onDashboard={() => navigate('/dashboard')}
        />
        <PhoneShell>
          <ScreenRenderer page={page} onNavigate={(slug) => navigate(`/gui/${slug}`)} />
        </PhoneShell>
      </div>
    </main>
  )
}
