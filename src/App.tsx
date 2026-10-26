import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AppProvider, PrefsProvider, usePrefs } from './lib/app-context';
import { AuthProvider, useAuth } from './lib/auth';
import { queryClient } from './data/queries';
import { Layout } from './components/layout/Layout';
import { OverviewPage } from './features/overview/OverviewPage';
import { RequestsPage } from './features/requests/RequestsPage';
import { SchedulingPage } from './features/scheduling/SchedulingPage';
import { DecisionsPage } from './features/decisions/DecisionsPage';
import { lazy, Suspense, type ReactNode } from 'react';

// Admin screens load on demand (the map and Excel libraries stay out of the main bundle).
const BranchesPage = lazy(() => import('./features/branches/BranchesPage').then((m) => ({ default: m.BranchesPage })));
const DistrictsPage = lazy(() => import('./features/districts/DistrictsPage').then((m) => ({ default: m.DistrictsPage })));
const DriversPage = lazy(() => import('./features/drivers/DriversPage').then((m) => ({ default: m.DriversPage })));
const MaterialsPage = lazy(() => import('./features/materials/MaterialsPage').then((m) => ({ default: m.MaterialsPage })));
const ListsPage = lazy(() => import('./features/lists/ListsPage').then((m) => ({ default: m.ListsPage })));
const ReportsPage = lazy(() => import('./features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })));

const page = (el: ReactNode) => <Suspense fallback={<div aria-busy="true" className="min-h-[60vh]" />}>{el}</Suspense>;
import { AuthSplash, ChangePasswordPage, LoginPage } from './features/auth/AuthScreens';

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<OverviewPage />} />
        <Route path="requests" element={<RequestsPage />} />
        <Route path="scheduling" element={<SchedulingPage />} />
        <Route path="decisions" element={<DecisionsPage />} />
        <Route path="branches" element={page(<BranchesPage />)} />
        <Route path="districts" element={page(<DistrictsPage />)} />
        <Route path="drivers" element={page(<DriversPage />)} />
        <Route path="materials" element={page(<MaterialsPage />)} />
        <Route path="lists" element={page(<ListsPage />)} />
        <Route path="reports" element={page(<ReportsPage />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

/** Shows the sign-in flow until there is an active dashboard session, then the app. */
function Gate() {
  const { state, signOut } = useAuth();
  const { dir, theme } = usePrefs();

  let screen;
  if (state.status === 'loading' || state.status === 'error') screen = <AuthSplash state={state} />;
  else if (state.status === 'signedOut') screen = <LoginPage notice={state.notice} />;
  else if (state.status === 'changePassword') screen = <ChangePasswordPage />;
  else
    screen = (
      <AppProvider user={state.user} signOut={signOut}>
        {/* Keyed by user so filters and drafts never leak between accounts on a shared computer. */}
        <AppRoutes key={state.user.id} />
      </AppProvider>
    );

  return (
    <>
      {screen}
      {state.status !== 'ready' && <Toaster dir={dir} position="bottom-center" theme={theme} />}
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PrefsProvider>
        <BrowserRouter>
          <AuthProvider>
            <Gate />
          </AuthProvider>
        </BrowserRouter>
      </PrefsProvider>
    </QueryClientProvider>
  );
}
