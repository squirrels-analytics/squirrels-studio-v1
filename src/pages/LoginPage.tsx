import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import './LoginPage.css';
import { useApp } from '../Router';
import { AUTH_PATH } from '../utils';

interface Provider {
  name: string;
  label: string;
  icon: string;
  login_url: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hostname, projectName, projectVersion, projectMetadataPath } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [copiedMcp, setCopiedMcp] = useState(false);
  const [activeTab, setActiveTab] = useState<'signin' | 'actions'>('signin');
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const targetRedirectPath = `/explorer${location.search || ''}`;
  const squirrelsStudioUrl = window.location.href.split('#')[0];
  const redirectUrl = `${squirrelsStudioUrl}#${targetRedirectPath}`;

  useEffect(() => {
    if (!projectMetadataPath) {
      navigate('/');
    }
  }, [projectMetadataPath, navigate]);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await fetch(`${hostname}${AUTH_PATH}/providers`);
        if (response.ok) {
          const data = await response.json();
          setProviders(data);
        }
      } catch (error) {
        console.error('Failed to fetch providers:', error);
      }
    };

    fetchProviders();
  }, [hostname]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  const handleGuestAccess = () => {
    navigate(targetRedirectPath);
  };

  const handleCopyMcpUrl = async () => {
    const effectiveHost = hostname || window.location.origin;
    const mcpUrl = `${effectiveHost}${projectMetadataPath}/mcp`;
    try {
      await navigator.clipboard.writeText(mcpUrl);
      setCopiedMcp(true);
      setTimeout(() => setCopiedMcp(false), 1000);
    } catch (error) {
      console.error('Failed to copy MCP URL:', error);
    }
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
      const loginPath = `${AUTH_PATH}/login`;
      
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
        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'signin' ? 'active' : ''}`}
            onClick={() => setActiveTab('signin')}
          >
            Sign In
          </button>
          <button
            className={`tab ${activeTab === 'actions' ? 'active' : ''}`}
            onClick={() => setActiveTab('actions')}
          >
            Resources
          </button>
        </div>

        {activeTab === 'actions' && (
          <div className="resources-panel">
            <div className="section-title">API Documentation</div>
            <div className="api-docs-buttons">
              <a href={`${hostname}${projectMetadataPath}/redoc`} target="_blank" rel="noopener noreferrer">
                <button className="white-button">
                  <span>ReDoc API Docs</span>
                </button>
              </a>
              <a href={`${hostname}${projectMetadataPath}/docs`} target="_blank" rel="noopener noreferrer">
                <button className="blue-button">
                  <span>Swagger API Docs</span>
                </button>
              </a>
            </div>
            <div className="section-title" style={{ marginTop: '0.75rem' }}>MCP URL</div>
            <div className="mcp-input-group">
              <input
                type="text"
                className="widget padded mcp-input"
                readOnly
                value={`${(hostname || window.location.origin)}${projectMetadataPath}/mcp`}
              />
              <button
                type="button"
                className="white-button icon-button"
                title={copiedMcp ? 'Copied!' : 'Copy MCP URL'}
                onClick={handleCopyMcpUrl}
              >
                {copiedMcp ? '✓' : '📋'}
              </button>
            </div>
          </div>
        )}
        
        {activeTab === 'signin' && (
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
        )}
        
        {activeTab === 'signin' && (
          <div className="or-divider">
            <span>or</span>
          </div>
        )}

        {activeTab === 'signin' && providers.map((provider) => (
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

        {activeTab === 'signin' && (
          <button 
            type="button" 
            className="white-button guest-button" 
            onClick={handleGuestAccess}
            disabled={isLoading}
          >
            Explore as Guest
          </button>
        )}
      </div>
      
      <LoadingSpinner isLoading={isLoading} />
    </div>
  );
} 