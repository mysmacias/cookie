import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {ToastProvider} from './components/ui/Toast';
import {RecipeProvider} from './context/RecipeContext';
import {ErrorBoundary} from './components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <RecipeProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </RecipeProvider>
    </ErrorBoundary>
  </StrictMode>,
);
