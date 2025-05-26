import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import './LoginPage.css';
import { getHashParams, getProjectMetadataPath, getProjectRelatedQueryParams } from '../utils';
import { useApp } from '../Router';

interface Provider {
  name: string;
  label: string;
  icon: string;
  login_url: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { logout } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const searchParams = getHashParams();
  const hostname = searchParams.get('host');
  const projectName = searchParams.get('projectName');
  const projectVersion = searchParams.get('projectVersion');

  const projectMetadataPath = getProjectMetadataPath(projectName, projectVersion);
  const projectRelatedQueryParams = getProjectRelatedQueryParams(hostname, projectName, projectVersion);
  const targetRedirectPath = searchParams.get('redirectPath') || `/explorer?${projectRelatedQueryParams}`;
  const redirectUrl = `${window.location.origin}/squirrels-studio/#${targetRedirectPath}`;

  useEffect(() => {
    logout();
  }, [logout]);

  useEffect(() => {
    if (!hostname || !projectMetadataPath) {
      navigate('/');
    }
  }, [hostname, projectMetadataPath, navigate]);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await fetch(`${hostname}${projectMetadataPath}/providers`);
        if (response.ok) {
          const data = await response.json();
          setProviders(data);
        }
      } catch (error) {
        console.error('Failed to fetch providers:', error);
      }
    };

    if (hostname && projectMetadataPath) {
      fetchProviders();
    }
  }, [hostname, projectMetadataPath]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  const handleGuestAccess = () => {
    navigate(`/explorer?${projectRelatedQueryParams}`);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const loginData = new FormData();
      loginData.append('username', formData.username);
      loginData.append('password', formData.password);
      
      // Construct the login path
      const loginPath = `${projectMetadataPath}/login`;
      
      const response = await fetch(hostname + loginPath, {
        method: 'POST',
        body: loginData,
        credentials: 'include',
      });

      if (response.status === 200) {
        // Navigate to target URL
        navigate(targetRedirectPath);
      } else if (response.status === 401) {
        setError('Invalid username or password');
      } else {
        setError(`Login failed with an unexpected server response: ${response.status}`);
      }
    } catch (error) {
      console.error("Login request failed:", error);
      setError('An unexpected error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>Squirrels Studio Login</h1>
        <div className="project-header">
          <h2>Project: {projectName} / {projectVersion}</h2>
          <button 
            onClick={() => navigate('/')} 
            className="edit-project-button"
            title="Change project configuration"
          >
            ✏️
          </button>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div className="api-docs-buttons">
            <a href={`${hostname}${projectMetadataPath}/redoc`} target="_blank" rel="noopener noreferrer">
              <button className="blue-button">
                <span>ReDoc API Docs</span>
              </button>
            </a>
            <a href={`${hostname}${projectMetadataPath}/docs`} target="_blank" rel="noopener noreferrer">
              <button className="white-button">
                <span>Swagger API Docs</span>
              </button>
            </a>
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              className="widget padded"
              value={formData.username}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              className="widget padded"
              value={formData.password}
              onChange={handleInputChange}
              required
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
        
          <div className="button-container">
            <button type="submit" className="blue-button login-button" disabled={isLoading}>
              Login
            </button>
          </div>
        </form>
            
        <div className="or-divider">
          <span>or</span>
        </div>
        
        {providers.map((provider) => (
          <form key={provider.name} method="get" action={provider.login_url}>
            <input type="hidden" name="redirect_url" value={redirectUrl} /> 
            <button
              key={provider.name}
              type="submit"
              className="white-button provider-button"
              disabled={isLoading}
            >
              {provider.icon && (
                <img 
                  src={provider.icon} 
                  alt={provider.label} 
                  className="provider-icon"
                />
              )}
              <span>Login with {provider.label}</span>
            </button>
          </form>
        ))}

        <button 
          type="button" 
          className="white-button guest-button" 
          onClick={handleGuestAccess}
          disabled={isLoading}
        >
          Explore as Guest
        </button>
      </div>
      
      <LoadingSpinner isLoading={isLoading} />
    </div>
  );
} 