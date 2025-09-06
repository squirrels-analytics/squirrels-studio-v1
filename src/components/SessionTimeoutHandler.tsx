import { useEffect, useRef } from 'react';
import { useApp } from '../Router';
import { AUTH_PATH } from '../utils';

interface SessionTimeoutHandlerProps {
  hostname: string;
}

export default function SessionTimeoutHandler({ 
  hostname
}: SessionTimeoutHandlerProps) {
  const { userProps, showModal } = useApp();
  const { username: isAuthenticated } = userProps;
  const pollingIntervalId = useRef<number>(0);

  const handleLogout = () => {
    clearInterval(pollingIntervalId.current);
    showModal("User session expired", "Session Expired", true);
  };

  // Set up polling to check authentication status
  useEffect(() => {
    if (isAuthenticated) {
      // Check authentication status every 5 minutes
      // This is to detect if the session cookie has expired
      const checkAuthStatus = async () => {
        try {
          // Use the /userinfo endpoint to check if the user is still authenticated
          const response = await fetch(`${hostname}${AUTH_PATH}/userinfo`, {
            credentials: 'include'
          });
          
          if (response.status === 401) {
            // If 401 Unauthorized, the session has expired
            handleLogout();
          }
        } catch (error) {
          console.error("Error checking authentication status:", error);
        }
      };

      // Start polling interval
      pollingIntervalId.current = window.setInterval(checkAuthStatus, 5 * 60 * 1000); // 5 minutes

      return () => {
        clearInterval(pollingIntervalId.current);
      };
    }
  }, [isAuthenticated, hostname]);

  return null; // This component doesn't render anything
} 