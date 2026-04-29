import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ThemeProvider } from 'next-themes';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ResponsiveLayout from './components/ResponsiveLayout';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const FilesPage = lazy(() => import('./pages/FilesPage'));
const PackagePage = lazy(() => import('./pages/PackagePage'));
const ApprovalsPage = lazy(() => import('./pages/ApprovalsPage'));
const CollateralsPage = lazy(() => import('./pages/CollateralsPage'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ClientFiles = lazy(() => import('./pages/ClientFiles'));
const JoinCasePage = lazy(() => import('./pages/JoinCasePage'));
const ToolsPage = lazy(() => import('./pages/ToolsPage'));

const PageLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <PageLoader />;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
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
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
