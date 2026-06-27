import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'
import { CurrentUserProvider } from '@/hooks/use-current-user'

import Login from './pages/auth/Login'
import ForgotPassword from './pages/auth/ForgotPassword'
import Home from './pages/dashboard/Home'
import { AppShell } from './components/layout/AppShell'
import { ProtectedRoute } from './components/auth/ProtectedRoute'

import ProjetoDetalhePage from './pages/projects/ProjetoDetalhePage'
import ProjetosListPage from './pages/projects/ProjetosListPage'
import ProjectFormPage from './pages/projects/ProjectFormPage'
import NovaDemandaPage from './pages/demands/NovaDemandaPage'
import PaperEditPage from './pages/papers/PaperEditPage'
import DemandDetailsPage from './pages/demands/DemandDetailsPage'
import MyDemandsPage from './pages/demands/MyDemandsPage'
import NotificationsPage from './pages/notifications/NotificationsPage'
import AreaPage from './pages/AreaPage'
import AuditReport from './pages/AuditReport'
import HubDashboardPage from './pages/hub/HubDashboardPage'
import { HubGuard } from './components/auth/HubGuard'
import { AdminGuard } from './components/auth/AdminGuard'
import UsersPage from './pages/admin/UsersPage'
import AreasPage from './pages/admin/AreasPage'
import ProfilesPage from './pages/admin/ProfilesPage'
import SetPassword from './pages/auth/SetPassword'
import ClientsPage from './pages/admin/ClientsPage'
import ClientFormPage from './pages/admin/ClientFormPage'

const App = () => (
  <AuthProvider>
    <CurrentUserProvider>
      <BrowserRouter>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/set-password" element={<SetPassword />} />

            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />

              <Route path="/projetos" element={<ProjetosListPage />} />
              <Route path="/projetos/novo" element={<ProjectFormPage />} />
              <Route path="/projetos/:id/editar" element={<ProjectFormPage />} />
              <Route path="/projetos/:id" element={<ProjetoDetalhePage />} />
              <Route path="/projetos/:projectId/paper" element={<PaperEditPage />} />
              <Route path="/projetos/:id/demandas/nova" element={<NovaDemandaPage />} />

              <Route path="/demandas/:id" element={<DemandDetailsPage />} />
              <Route path="/minhas-demandas" element={<MyDemandsPage />} />
              <Route path="/notificacoes" element={<NotificationsPage />} />

              <Route path="/area/:area_slug" element={<AreaPage />} />
              <Route path="/auditoria" element={<AuditReport />} />

              <Route
                path="/hub"
                element={
                  <HubGuard>
                    <HubDashboardPage />
                  </HubGuard>
                }
              />

              <Route
                path="/admin"
                element={
                  <AdminGuard>
                    <Outlet />
                  </AdminGuard>
                }
              >
                <Route path="usuarios" element={<UsersPage />} />
                <Route path="areas" element={<AreasPage />} />
                <Route path="perfis" element={<ProfilesPage />} />
                <Route path="clientes" element={<ClientsPage />} />
                <Route path="clientes/novo" element={<ClientFormPage />} />
                <Route path="clientes/:id" element={<ClientFormPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </TooltipProvider>
      </BrowserRouter>
    </CurrentUserProvider>
  </AuthProvider>
)

export default App
