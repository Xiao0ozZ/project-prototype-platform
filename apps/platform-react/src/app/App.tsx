import { BrowserRouter } from 'react-router-dom';

import { ErrorBoundary } from './ErrorBoundary';
import { AppProviders } from './AppProviders';
import { AppRoutes } from './AppRoutes';
import { WorkspaceOnboarding } from '@/features/projects/WorkspaceOnboarding';

export function App() {
  return (
    <AppProviders>
      <div className="app-frame-stage">
        <div className="app-frame">
          <ErrorBoundary>
            <BrowserRouter basename={import.meta.env.BASE_URL}>
              <AppRoutes />
              <WorkspaceOnboarding />
            </BrowserRouter>
          </ErrorBoundary>
        </div>
      </div>
    </AppProviders>
  );
}
