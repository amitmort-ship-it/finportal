import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ThemeProvider } from 'next-themes';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { base44 } from '@/api/base44Client';
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
const MortgageSimulationsPage = lazy(() => import('./pages/MortgageSimulationsPage'));

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
    } else if (authError.type === 'access_blocked') {
      return (
        <div dir="rtl" className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-sm w-full bg-card border border-border rounded-2xl p-8 text-center shadow-lg space-y-4">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
            </div>
            <h2 className="text-xl font-bold text-foreground">הגישה חסומה</h2>
            <p className="text-muted-foreground text-sm">הגישה שלך למערכת חסומה. אנא פנה ליועץ שלך לפרטים נוספים.</p>
            <button onClick={() => base44.auth.logout()} className="w-full mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              התנתק
            </button>
          </div>
        </div>
      );
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
          <Route path="/simulations" element={<MortgageSimulationsPage />} />
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
          defaultTheme="light"
          enableSystem={false}
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