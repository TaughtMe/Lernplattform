import React, { useEffect, Suspense } from 'react';
// import { useRegisterSW } from 'virtual:pwa-register/react'; // Moved to Context
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ServiceWorkerProvider } from './context/ServiceWorkerContext';
import { SettingsProvider } from './context/SettingsContext';
import { vocabularyService } from './services/db.service';

// Lazy Load Components
const DeckList = React.lazy(() => import('./components/DeckList').then(module => ({ default: module.DeckList })));
const DeckDetail = React.lazy(() => import('./components/DeckDetail').then(module => ({ default: module.DeckDetail })));
const LearningSession = React.lazy(() => import('./components/LearningSession').then(module => ({ default: module.LearningSession })));
const Settings = React.lazy(() => import('./components/Settings').then(module => ({ default: module.Settings })));
const LegalPage = React.lazy(() => import('./components/LegalPage').then(module => ({ default: module.LegalPage })));

import { UpdateBanner } from './components/UpdateBanner';

function App() {
  // Ensure Auth Persistence & Check Logic
  useEffect(() => {
    // 1. Check Card Decay
    vocabularyService.checkCardDecay().then(count => {
      if (count > 0) {
        alert(`Ups! ${count} Karten sind wegen Inaktivität zurückgestuft worden.`);
      }
    });

    // 2. Check for token in localStorage. The user reported issues with session loss.
    // This is a safeguard validation step.
    const token = localStorage.getItem('token');
    if (!token && localStorage.getItem('user_session')) {
      // If we have alternative session storage, maybe we need to migrate or just log it?
      console.log('Session found in alternative storage');
    }
    // Note: We do NOT want to clear storage here.
  }, []);

  return (
    <ServiceWorkerProvider>
      <SettingsProvider>
        <ErrorBoundary>
          <Suspense fallback={<Layout><LoadingSpinner /></Layout>}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<DeckList />} />
                <Route path="deck/:deckId" element={<DeckDetail />} />
                <Route path="learn/:deckId" element={<LearningSession />} />
                <Route path="settings" element={<Settings />} />
                <Route path="legal" element={<LegalPage />} />
              </Route>
            </Routes>
            <UpdateBanner />
          </Suspense>
        </ErrorBoundary>
      </SettingsProvider>
    </ServiceWorkerProvider>
  );
}

export default App;
