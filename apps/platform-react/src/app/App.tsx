import { BrowserRouter } from 'react-router-dom';

import { ErrorBoundary } from './ErrorBoundary';
import { AppProviders } from './AppProviders';
import { AppRoutes } from './AppRoutes';

export function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <AppRoutes />
        </BrowserRouter>
      </AppProviders>
    </ErrorBoundary>
  );
}
