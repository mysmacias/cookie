import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {ToastProvider} from './components/ui/Toast';
import {AuthProvider} from './context/AuthContext';
import {RecipeProvider} from './context/RecipeContext';
import {ErrorBoundary} from './components/ErrorBoundary';

if (typeof window !== 'undefined') {
  try {
    const stored = localStorage.getItem('cookie_theme');
    const pref = stored === 'dark' || stored === 'light' || stored === 'system' ? stored : 'system';
    const dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark-dim', dark);
  } catch { /* ignore */ }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <RecipeProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </RecipeProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
