import { BrowserRouter } from 'react-router-dom';

import { ErrorBoundary } from './ErrorBoundary';
import { AppProviders } from './AppProviders';
import { AppRoutes } from './AppRoutes';

export function App() {
  return (
    <AppProviders>
      <div className="app-frame-stage">
        <div className="app-frame">
          <ErrorBoundary>
            <BrowserRouter basename={import.meta.env.BASE_URL}>
              <AppRoutes />
            </BrowserRouter>
          </ErrorBoundary>
        </div>
      </div>
    </AppProviders>
  );
}
