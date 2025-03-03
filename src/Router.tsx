import { createBrowserRouter, RouterProvider, Outlet, useNavigate } from 'react-router-dom';
import { createContext, useContext, useEffect, useState } from 'react';
import LoginPage from './pages/LoginPage';
import ExplorerPage from './pages/ExplorerPage';
import UserSettingsPage from './pages/UserSettingsPage';
import UserManagementPage from './pages/UserManagementPage';
import SessionTimeoutHandler from './components/SessionTimeoutHandler';
import RootPage from './pages/RootPage';

// Create an auth context
interface AuthContextType {
  isAuthenticated: boolean;
  username: string;
  jwtToken: string;
  expiryTime: string;
  isAdmin: boolean;
  login: (username: string, token: string, expiry: string, isAdmin: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Auth provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [jwtToken, setJwtToken] = useState('');
  const [expiryTime, setExpiryTime] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if token exists in sessionStorage on initial load
  useEffect(() => {
    const storedToken = sessionStorage.getItem('jwtToken');
    const storedUsername = sessionStorage.getItem('username');
    const storedExpiry = sessionStorage.getItem('expiryTime');
    const storedIsAdmin = sessionStorage.getItem('isAdmin');
    
    if (storedToken && storedUsername && storedExpiry) {
      // Check if token is expired
      const expiry = new Date(storedExpiry).getTime();
      const now = new Date().getTime();
      
      if (expiry > now) {
        setIsAuthenticated(true);
        setUsername(storedUsername);
        setJwtToken(storedToken);
        setExpiryTime(storedExpiry);
        setIsAdmin(storedIsAdmin === 'true');
      } else {
        // Clear expired token
        sessionStorage.removeItem('jwtToken');
        sessionStorage.removeItem('username');
        sessionStorage.removeItem('expiryTime');
        sessionStorage.removeItem('isAdmin');
      }
    }
  }, []);

  const login = (username: string, token: string, expiry: string, isAdmin: boolean) => {
    setIsAuthenticated(true);
    setUsername(username);
    setJwtToken(token);
    setExpiryTime(expiry);
    setIsAdmin(isAdmin);
    
    // Store in sessionStorage
    sessionStorage.setItem('username', username);
    sessionStorage.setItem('jwtToken', token);
    sessionStorage.setItem('expiryTime', expiry);
    sessionStorage.setItem('isAdmin', isAdmin.toString());
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUsername('');
    setJwtToken('');
    setExpiryTime('');
    setIsAdmin(false);
    
    // Remove from sessionStorage
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('jwtToken');
    sessionStorage.removeItem('expiryTime');
    sessionStorage.removeItem('isAdmin');
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      username, 
      jwtToken, 
      expiryTime,
      isAdmin, 
      login, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Create a layout component that includes the SessionTimeoutHandler
function AppLayout() {
  const navigate = useNavigate();
  
  // Get URL parameters that are common across the app
  const searchParams = new URLSearchParams(window.location.search);
  const hostname = searchParams.get('host');
  const projectName = searchParams.get('projectName');
  const projectVersion = searchParams.get('projectVersion');
  if (!hostname || !projectName || !projectVersion) {
      navigate('/');
      return;
  }

  return (
    <>
      <SessionTimeoutHandler 
        hostname={hostname}
        projectName={projectName}
        projectVersion={projectVersion}
      />
      <Outlet />
    </>
  );
}

// Create the router with the layout
const router = createBrowserRouter([
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
]);

// Main router component
export default function Router() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
} 