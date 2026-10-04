import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import App from '../../App';
import { RequireAuth } from '@danbro96/lupira-web-session/RequireAuth';
import { Centered } from '@danbro96/lupira-web-mui/Centered';
import { AppShell } from '../components/AppShell';
import Typography from '@mui/material/Typography';
import { Page } from '../components/Page';

// Lazy: MapScreen pulls in maplibre-gl (+ CSS), which stays out of the main bundle.
const MapScreen = lazy(() => import('../screens/MapScreen'));
const PlacesScreen = lazy(() => import('../screens/PlacesScreen'));

const loading = (screen: ReactNode, label: string) => (
  <Suspense fallback={<Page><Typography variant="caption" sx={{ color: 'text.secondary' }} component="p">{label}</Typography></Page>}>
    {screen}
  </Suspense>
);

// Everything requires the SSO session — no upstream has an anonymous surface. The event card rides
// the ?item= search param on any route.
export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      {
        element: <RequireAuth pending={(title) => <Centered title={title} />} />,
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, element: loading(<MapScreen />, 'Loading map…') },
              { path: 'places', element: loading(<PlacesScreen />, 'Loading…') },
              { path: '*', element: loading(<MapScreen />, 'Loading map…') },
            ],
          },
        ],
      },
    ],
  },
]);
