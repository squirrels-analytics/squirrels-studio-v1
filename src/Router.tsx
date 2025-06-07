import { createHashRouter, RouterProvider, Outlet, useNavigate } from 'react-router-dom';
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import LoginPage from './pages/LoginPage';
import ExplorerPage from './pages/ExplorerPage';
import UserSettingsPage from './pages/UserSettingsPage';
import UserManagementPage from './pages/UserManagementPage';
import SessionTimeoutHandler from './components/SessionTimeoutHandler';
import RootPage from './pages/RootPage';
import Modal from './components/Modal';
import ConfirmModal from './components/ConfirmModal';
import LoadingSpinner from './components/LoadingSpinner';
import { getProjectMetadataPath } from './utils';

type UserProps = {
  username: string;
  isAdmin: boolean;
}

// Combined app context interface
interface AppContextType {
  // Auth properties
  userProps: UserProps;
  setUserProps: (userProps: UserProps) => void;
  logout: () => void;
  
  // Modal properties
  showModal: (message: string, title: string, logout?: boolean) => void;
  showConfirm: (message: string, onConfirm: () => void, title?: string, confirmText?: string, confirmButtonClass?: string) => void;
  
  // Loading properties
  setIsLoading: (loading: boolean) => void;
  
  // Shared URL properties
  hostname: string | null;
  projectName: string | null;
  projectVersion: string | null;
  projectMetadataPath: string | null;
  projectRelatedQueryParams: string;
}

const AppContext = createContext<AppContextType | null>(null);

// Utility function to parse URL parameters
const parseUrlParams = () => {
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
  const hostname = urlParams.get('host');
  const projectName = urlParams.get('projectName');
  const projectVersion = urlParams.get('projectVersion');
  const projectMetadataPath = getProjectMetadataPath(projectName, projectVersion);
  
  const queryParams = new URLSearchParams();
  if (hostname) queryParams.append('host', hostname);
  if (projectName) queryParams.append('projectName', projectName);
  if (projectVersion) queryParams.append('projectVersion', projectVersion);
  const projectRelatedQueryParams = queryParams.toString();
  
  return {
    hostname,
    projectName,
    projectVersion,
    projectMetadataPath,
    projectRelatedQueryParams
  };
};

// Combined app provider component
export function AppProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  
  // Parse URL parameters
  const urlParams = useMemo(() => parseUrlParams(), [window.location.hash]);
  const { hostname, projectName, projectVersion, projectMetadataPath, projectRelatedQueryParams } = urlParams;
  
  // Auth state
  const [userProps, setUserProps] = useState<UserProps>({
    username: '',
    isAdmin: false
  });
  
  // Modal state
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean; message: string; title: string; logout?: boolean;
  }>({ isOpen: false, message: '', title: '' });
  
  // Confirm modal state
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean; 
    message: string; 
    title: string; 
    confirmText: string;
    confirmButtonClass: string;
    onConfirm: (() => void) | null;
  }>({ 
    isOpen: false, 
    message: '', 
    title: 'Confirm Action', 
    confirmText: 'Confirm',
    confirmButtonClass: 'blue-button',
    onConfirm: null 
  });
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  
  // Auth functions
  const logout = useCallback(() => {
    // Attempt to call the logout endpoint, but don't wait for it
    if (hostname) {
      fetch(`${hostname}/api/auth/logout`, {
        method: 'GET',
        credentials: 'include'
      }).catch(() => {
        // Ignore errors, as we'll clear local state anyway
      });
    }
    setUserProps({
      username: '',
      isAdmin: false
    });
  }, [hostname]);

  // Modal functions
  const showModal = useCallback((message: string, title: string, logout?: boolean) => {
    setModalConfig({ isOpen: true, message, title, logout });
  }, []);

  const showConfirm = useCallback((
    message: string, 
    onConfirm: () => void, 
    title: string = 'Confirm Action',
    confirmText: string = 'Confirm',
    confirmButtonClass: string = 'blue-button'
  ) => {
    setConfirmConfig({ 
      isOpen: true, 
      message, 
      title, 
      confirmText,
      confirmButtonClass,
      onConfirm 
    });
  }, []);

  const handleLogout = () => {
    navigate(`/login?${projectRelatedQueryParams}`);
  };

  const closeModal = () => {
    setModalConfig({ isOpen: false, message: '', title: '' });
    if (modalConfig.logout) {
      handleLogout();
    }
  };

  const clearConfirmConfig = () => {
    setConfirmConfig({ 
      isOpen: false, 
      message: '', 
      title: 'Confirm Action', 
      confirmText: 'Confirm',
      confirmButtonClass: 'blue-button',
      onConfirm: null 
    });
  };

  const handleConfirmCancel = () => {
    clearConfirmConfig();
  };

  const handleConfirm = () => {
    if (confirmConfig.onConfirm) {
      confirmConfig.onConfirm();
    }
    clearConfirmConfig();
  };

  const contextValue: AppContextType = {
    // Auth
    userProps,
    setUserProps,
    logout,
    
    // Modal
    showModal,
    showConfirm,
    
    // Loading
    setIsLoading,
    
    // Shared URL params
    hostname,
    projectName,
    projectVersion,
    projectMetadataPath,
    projectRelatedQueryParams
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
      <Modal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        title={modalConfig.title}
      >
        {modalConfig.message}
      </Modal>
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onConfirm={handleConfirm}
        onCancel={handleConfirmCancel}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        confirmButtonClass={confirmConfig.confirmButtonClass}
      />
      <LoadingSpinner isLoading={isLoading} />
    </AppContext.Provider>
  );
}

// Hook to use the app context
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

// Create a layout component that includes the SessionTimeoutHandler
function AppLayout() {
  const navigate = useNavigate();
  const location = window.location;
  
  // Parse parameters from hash fragment instead of search params
  const hashParams = new URLSearchParams(location.hash.split('?')[1] || '');
  const hostname = hashParams.get('host');
  const projectName = hashParams.get('projectName');
  const projectVersion = hashParams.get('projectVersion');
  
  // Use useEffect for navigation to avoid render issues
  useEffect(() => {
    if (!hostname || !projectName || !projectVersion) {
      navigate('/');
    }
  }, [hostname, projectName, projectVersion, navigate]);

  // Only render the content if we have all required parameters
  if (!hostname || !projectName || !projectVersion) {
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