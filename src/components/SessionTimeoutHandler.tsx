import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Router';
import { getProjectRelatedQueryParams } from '../utils';

interface SessionTimeoutHandlerProps {
  hostname: string;
  projectName: string;
  projectVersion: string;
}

export default function SessionTimeoutHandler({ 
  hostname, 
  projectName, 
  projectVersion 
}: SessionTimeoutHandlerProps) {
  const navigate = useNavigate();
  const { isAuthenticated, expiryTime, logout } = useAuth();
  const userTimeoutId = useRef<number>(0);
  const projectRelatedQueryParams = getProjectRelatedQueryParams(hostname, projectName, projectVersion);

  const handleLogout = () => {
    clearTimeout(userTimeoutId.current);
    logout();
    navigate(`/login?${projectRelatedQueryParams}`);
    alert("User session expired");
  };

  // Set up token expiry timeout
  useEffect(() => {
    if (isAuthenticated && expiryTime) {
      const timeDiff = new Date(expiryTime).getTime() - new Date().getTime();
      if (timeDiff > 0) {
        userTimeoutId.current = window.setTimeout(() => {
          handleLogout();
        }, timeDiff);
      }
    }

    return () => {
      clearTimeout(userTimeoutId.current);
    };
  }, [expiryTime, isAuthenticated]);

  return null; // This component doesn't render anything
} 