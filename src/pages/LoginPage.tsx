import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Router';
import LoadingSpinner from '../components/LoadingSpinner';
import './LoginPage.css';
import { getHashParams } from '../utils/urlParams';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const searchParams = getHashParams();
  const hostname = searchParams.get('host');
  const projectName = searchParams.get('projectName');
  const projectVersion = searchParams.get('projectVersion');

  useEffect(() => {
    if (!hostname || !projectName || !projectVersion) {
      navigate('/');
    }
  }, [hostname, projectName, projectVersion, navigate]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  const handleGuestAccess = () => {
    navigate(`/explorer?host=${hostname}&projectName=${projectName}&projectVersion=${projectVersion}`);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Now submit the login request
      const loginData = new FormData();
      loginData.append('username', formData.username);
      loginData.append('password', formData.password);
      
      const loginURL = `/api/squirrels-v0/project/${projectName}/${projectVersion}/login`;
      const response = await fetch(hostname + loginURL, {
        method: 'POST',
        body: loginData
      });

      if (response.status === 200) {
        const data = await response.json();
        login(data.username, data.access_token, data.expiry_time, data.is_admin);
        navigate(`/explorer?host=${hostname}&projectName=${projectName}&projectVersion=${projectVersion}`);
      } else if (response.status === 401) {
        setError('Invalid username or password');
      } else {
        setError(`Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      console.error(error);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>Squirrels Studio Login</h1>
        <h2>Project: {projectName} / {projectVersion}</h2>
        <div style={{ textAlign: 'center' }}>
          <div className="api-docs-buttons">
            <a href={`${hostname}/api/squirrels-v0/project/${projectName}/${projectVersion}/redoc`} target="_blank" rel="noopener noreferrer">
              <button className="blue-button">
                <span>ReDoc API Docs</span>
              </button>
            </a>
            <a href={`${hostname}/api/squirrels-v0/project/${projectName}/${projectVersion}/docs`} target="_blank" rel="noopener noreferrer">
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
            
            <div className="or-divider">
              <span>or</span>
            </div>
            
            <button 
              type="button" 
              className="white-button guest-button" 
              onClick={handleGuestAccess}
              disabled={isLoading}
            >
              Explore as Guest
            </button>
          </div>
        </form>
      </div>
      
      <LoadingSpinner isLoading={isLoading} />
    </div>
  );
} 