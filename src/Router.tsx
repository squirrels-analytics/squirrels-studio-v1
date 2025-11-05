import { createHashRouter, RouterProvider, Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import ExplorerPage from './pages/ExplorerPage';
import UserSettingsPage from './pages/UserSettingsPage';
import UserManagementPage from './pages/UserManagementPage';
import SessionTimeoutHandler from './components/SessionTimeoutHandler';
import RootPage from './pages/RootPage';
import { AppProvider, useApp } from './context/AppContext';

// Create a layout component that includes the SessionTimeoutHandler
function AppLayout() {
  const navigate = useNavigate();
  const { hostname, projectName, projectVersion } = useApp();
  
  // Use useEffect for navigation to avoid render issues
  useEffect(() => {
    if (!projectName || !projectVersion) {
      navigate('/');
    }
  }, [projectName, projectVersion, navigate]);

  // Only render the content if we have all required parameters
  if (!projectName || !projectVersion) {
    return null;
  }

  return (
    <>
      <SessionTimeoutHandler 
        hostname={hostname}
      />
      <Outlet />
    </>
  );
}

// Create the router with the layout
const router = createHashRouter([
  {
    element: <AppWithProvider />,
    children: [
      {
        path: '/',
        element: <RootPage />
      },
      {
        path: '/login',
        element: <LoginPage />
      },
      {
        element: <AppLayout />,
        children: [
          {
            path: '/explorer',
            element: <ExplorerPage />
          },
          {
            path: '/settings',
            element: <UserSettingsPage />
          },
          {
            path: '/users',
            element: <UserManagementPage />
          }
        ]
      }
    ]
  }
]);

// Wrapper component that provides the app context inside the router
function AppWithProvider() {
  return (
    <AppProvider>
      <Outlet />
    </AppProvider>
  );
}

// Main router component
export default function Router() {
  return <RouterProvider router={router} />;
} 