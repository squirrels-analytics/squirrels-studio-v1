import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import './LoginPage.css';
import { useApp } from '../context/AppContext';
import { AUTH_PATH, validateSquirrelsVersion } from '../utils';
import { ProjectMetadataType } from '../types/ProjectMetadataResponse';

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
  const [projectMetadata, setProjectMetadata] = useState<ProjectMetadataType | null>(null);
  const [selectedMcpIndex, setSelectedMcpIndex] = useState(0);
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

  useEffect(() => {
    if (!projectMetadataPath) return;
    
    const fetchMetadata = async () => {
      try {
        const response = await fetch(`${hostname}${projectMetadataPath}`);
        if (response.ok) {
          const metadata: ProjectMetadataType = await response.json();
          try {
            validateSquirrelsVersion(metadata);
            setProjectMetadata(metadata);
          } catch (error: any) {
            console.error(error.message);
            navigate('/');
          }
        }
      } catch (error) {
        console.error('Failed to fetch project metadata:', error);
      }
    };

    fetchMetadata();
  }, [hostname, projectMetadataPath, navigate]);

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

  // Helper function to build absolute URL from relative path
  const buildAbsoluteUrl = (path: string | undefined): string => {
    if (!path) return '';
    const effectiveHost = hostname || window.location.origin;
    // If path already starts with http:// or https://, return as is
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    // Otherwise, treat as relative path and prepend hostname
    return `${effectiveHost}${path.startsWith('/') ? path : '/' + path}`;
  };

  // Get ReDoc URL - use metadata if available, otherwise fall back to default
  const getRedocUrl = (): string => {
    if (projectMetadata?.redoc_path) {
      return buildAbsoluteUrl(projectMetadata.redoc_path);
    }
    return `${hostname}${projectMetadataPath}/redoc`;
  };

  // Get Swagger URL - use metadata if available, otherwise fall back to default
  const getSwaggerUrl = (): string => {
    if (projectMetadata?.swagger_path) {
      return buildAbsoluteUrl(projectMetadata.swagger_path);
    }
    return `${hostname}${projectMetadataPath}/docs`;
  };

  // Get MCP URL(s) - use metadata if available, otherwise fall back to default
  const getMcpUrls = (): string[] => {
    if (projectMetadata?.mcp_server_path) {
      if (Array.isArray(projectMetadata.mcp_server_path)) {
        return projectMetadata.mcp_server_path.map(path => buildAbsoluteUrl(path));
      } else {
        return [buildAbsoluteUrl(projectMetadata.mcp_server_path)];
      }
    }
    const effectiveHost = hostname || window.location.origin;
    return [`${effectiveHost}${projectMetadataPath}/mcp`];
  };

  const handleCopyMcpUrl = async () => {
    const mcpUrls = getMcpUrls();
    const mcpUrl = mcpUrls[selectedMcpIndex] || mcpUrls[0]; // Use selected index or fallback to first
    try {
      await navigator.clipboard.writeText(mcpUrl);
      setCopiedMcp(true);
      setTimeout(() => setCopiedMcp(false), 1000);
    } catch (error) {
      console.error('Failed to copy MCP URL:', error);
    }
  };

  // Reset selected MCP index when URLs change
  // useEffect(() => {
  //   const mcpUrls = getMcpUrls();
  //   if (selectedMcpIndex >= mcpUrls.length) {
  //     setSelectedMcpIndex(0);
  //   }
  // }, [projectMetadata, hostname, projectMetadataPath, selectedMcpIndex]);

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

        {activeTab === 'actions' && (() => {
          const redocUrl = getRedocUrl();
          const swaggerUrl = getSwaggerUrl();
          const mcpUrls = getMcpUrls();
          
          return (
            <div className="resources-panel">
              <div className="section-title">API Documentation</div>
              <div className="api-docs-buttons">
                <a href={redocUrl} target="_blank" rel="noopener noreferrer">
                  <button className="white-button">
                    <span>ReDoc API Docs</span>
                  </button>
                </a>
                <a href={swaggerUrl} target="_blank" rel="noopener noreferrer">
                  <button className="blue-button">
                    <span>Swagger API Docs</span>
                  </button>
                </a>
              </div>
              <div className="section-title" style={{ marginTop: '0.75rem' }}>
                {mcpUrls.length > 1 ? 'MCP URLs' : 'MCP URL'}
              </div>
              {mcpUrls.length > 1 && (
                <select
                  className="widget padded"
                  style={{ marginBottom: '0.5rem', width: '100%' }}
                  value={selectedMcpIndex}
                  onChange={(e) => setSelectedMcpIndex(Number(e.target.value))}
                >
                  {mcpUrls.map((_, index) => (
                    <option key={index} value={index}>
                      Option {index + 1}
                    </option>
                  ))}
                </select>
              )}
              <div className="mcp-input-group">
                <input
                  type="text"
                  className="widget padded mcp-input"
                  readOnly
                  value={mcpUrls[selectedMcpIndex] || ''}
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
          );
        })()}
        
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