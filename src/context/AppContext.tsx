import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSpinner from '../components/LoadingSpinner';
import { getProjectMetadataPath, AUTH_PATH } from '../utils';

// Global defaults for project parameters (can be set from index.html)
declare global {
  interface Window {
    DEFAULT_HOSTNAME?: string;
    DEFAULT_PROJECT_NAME?: string;
    DEFAULT_PROJECT_VERSION?: string;
  }
}

const defaultHostname: string = window.DEFAULT_HOSTNAME ?? '';
const defaultProjectName: string | null = window.DEFAULT_PROJECT_NAME ?? null;
const defaultProjectVersion: string | null = window.DEFAULT_PROJECT_VERSION ?? null;

type UserProps = {
  username: string;
  isAdmin: boolean;
};

export interface AppContextType {
  // Auth properties
  userProps: UserProps;
  setUserProps: (userProps: UserProps) => void;
  logout: () => Promise<void>;

  // Modal properties
  showModal: (props: {
    message: string;
    title: string;
    size?: 'small' | 'medium' | 'large';
    logout?: boolean;
  }) => void;
  showConfirm: (props: {
    message: string;
    onConfirm: () => void;
    title?: string;
    confirmText?: string;
    confirmButtonClass?: string;
  }) => void;

  // Loading properties
  setIsLoading: (loading: boolean) => void;

  // Shared URL properties
  hostname: string;
  projectName: string | null;
  projectVersion: string | null;
  projectMetadataPath: string | null;
  projectRelatedQueryParams: string;
}

const AppContext = createContext<AppContextType | null>(null);

// Utility function to parse URL parameters
const parseUrlParams = () => {
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
  const projectRelatedQueryParams = urlParams.toString();

  const hostname = urlParams.get('host') || defaultHostname;
  const projectName = urlParams.get('projectName') || defaultProjectName;
  const projectVersion = urlParams.get('projectVersion') || defaultProjectVersion;
  const projectMetadataPath = getProjectMetadataPath(projectName, projectVersion);

  return {
    hostname,
    projectName,
    projectVersion,
    projectMetadataPath,
    projectRelatedQueryParams,
  };
};

export function AppProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  // Parse URL parameters
  const urlParams = useMemo(() => parseUrlParams(), [window.location.hash]);
  const { hostname, projectName, projectVersion, projectMetadataPath, projectRelatedQueryParams } = urlParams;

  // Auth state
  const [userProps, setUserProps] = useState<UserProps>({
    username: '',
    isAdmin: false,
  });

  // Modal state
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    message: string;
    title: string;
    size: 'small' | 'medium' | 'large';
    logout?: boolean;
  }>({ isOpen: false, message: '', title: '', size: 'small' });

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
    onConfirm: null,
  });

  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  // Auth functions
  const logout = useCallback(async () => {
    // Attempt to call the logout endpoint, but don't wait for it
    await fetch(`${hostname}${AUTH_PATH}/logout`, {
      method: 'GET',
      credentials: 'include',
    });
    setUserProps({
      username: '',
      isAdmin: false,
    });
  }, [hostname]);

  // Modal functions
  const showModal = useCallback(
    (props: {
      message: string;
      title: string;
      size?: 'small' | 'medium' | 'large';
      logout?: boolean;
    }) => {
      setModalConfig({ isOpen: true, size: 'small', ...props });
    },
    [],
  );

  const showConfirm = useCallback(
    ({ message, onConfirm, title = 'Confirm Action', confirmText = 'Confirm', confirmButtonClass = 'blue-button' }: {
      message: string;
      onConfirm: () => void;
      title?: string;
      confirmText?: string;
      confirmButtonClass?: string;
    }) => {
      setConfirmConfig({
        isOpen: true,
        message,
        title,
        confirmText,
        confirmButtonClass,
        onConfirm,
      });
    },
    [],
  );

  const handleLogout = () => {
    navigate(`/login?${projectRelatedQueryParams}`);
  };

  const closeModal = () => {
    setModalConfig({ isOpen: false, message: '', title: '', size: 'small' });
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
      onConfirm: null,
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
    projectRelatedQueryParams,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
      <Modal isOpen={modalConfig.isOpen} onClose={closeModal} title={modalConfig.title} size={modalConfig.size}>
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

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

