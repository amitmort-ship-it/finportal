import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ThemeProvider } from 'next-themes';
import PageNotFound from '@/lib/PageNotFound.jsx';
import { AuthProvider } from '@/lib/AuthContext';
import ResponsiveLayout from '@/components/ResponsiveLayout.jsx';
import ErrorBoundary from '@/components/ErrorBoundary.jsx';

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const FilesPage = lazy(() => import('./pages/FilesPage.jsx'));
const PackagePage = lazy(() => import('./pages/PackagePage.jsx'));
const ApprovalsPage = lazy(() => import('./pages/ApprovalsPage.jsx'));
const CollateralsPage = lazy(() => import('./pages/CollateralsPage.jsx'));
const AdminPanel = lazy(() => import('./pages/AdminPanel.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));
const ClientFiles = lazy(() => import('./pages/ClientFiles.jsx'));
const JoinCasePage = lazy(() => import('./pages/JoinCasePage.jsx'));
const ToolsPage = lazy(() => import('./pages/ToolsPage.jsx'));

const PageLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
  </div>
);

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Router>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route element={<ResponsiveLayout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/files" element={<FilesPage />} />
                    <Route path="/package" element={<PackagePage />} />
                    <Route path="/approvals" element={<ApprovalsPage />} />
                    <Route path="/collaterals" element={<CollateralsPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/my-files" element={<ClientFiles />} />
                    <Route path="/tools" element={<ToolsPage />} />
                    <Route path="/admin" element={<AdminPanel />} />
                    <Route path="/join-case" element={<JoinCasePage />} />
                  </Route>

                  <Route path="*" element={<PageNotFound />} />
                </Routes>
              </Suspense>
            </Router>
            <Toaster />
            <SonnerToaster />
          </ThemeProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}