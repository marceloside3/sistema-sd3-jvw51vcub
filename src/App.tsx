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

import ProjectDetails from './pages/ProjectDetails'
import AreaPage from './pages/AreaPage'
import AuditReport from './pages/AuditReport'
import { AdminGuard } from './components/auth/AdminGuard'
import UsersPage from './pages/admin/UsersPage'
import AreasPage from './pages/admin/AreasPage'
import ProfilesPage from './pages/admin/ProfilesPage'
import SetPassword from './pages/auth/SetPassword'

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
              <Route path="/projeto/:id" element={<ProjectDetails />} />
              <Route path="/area/:area_slug" element={<AreaPage />} />
              <Route path="/auditoria" element={<AuditReport />} />

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
