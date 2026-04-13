import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { DashboardPage } from './pages/Dashboard/DashboardPage'
import { GuiViewerPage } from './pages/GuiViewer/GuiViewerPage'
import { LoginPage } from './pages/Login/LoginPage'
import { ProtectedRoute } from './components/Auth/ProtectedRoute'
import { hasSession } from './utils/auth'

function RootRedirect() {
  return <Navigate to={hasSession() ? '/dashboard' : '/login'} replace />
}

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <Outlet />
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/gui/:pageSlug" element={<GuiViewerPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
