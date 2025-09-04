import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './RootPage.css';
import LoadingSpinner from '../components/LoadingSpinner';
import { getProjectMetadataPath, getProjectRelatedQueryParams, validateSquirrelsVersion } from '../utils';
import { ProjectMetadataType } from '../types/ProjectMetadataResponse';

export default function RootPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    hostname: '',
    projectName: '',
    projectVersion: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Clear any existing authentication data when the root page loads
  useEffect(() => {
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('isAdmin');
  }, []);

  // If DEFAULT_* globals are defined, redirect to login with those params
  useEffect(() => {
    const { DEFAULT_PROJECT_NAME, DEFAULT_PROJECT_VERSION } = window;
    if (DEFAULT_PROJECT_NAME && DEFAULT_PROJECT_VERSION) {
      navigate(`/login`);
    }
  }, [navigate]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    
    // Test connection to the project metadata URL
    setIsLoading(true);
    
    try {
      if (!formData.hostname.startsWith('http://') && !formData.hostname.startsWith('https://')) {
        throw new Error('Host URL must start with http:// or https://');
      }
      const projectMetadataPath = getProjectMetadataPath(formData.projectName, formData.projectVersion);
      if (!projectMetadataPath) {
        throw new Error('Project name and version are required');
      }
      const response = await fetch(formData.hostname + projectMetadataPath);
      if (!response.ok) {
        throw new Error(`Connection failed: ${response.status} ${response.statusText}`);
      }
      
      const metadata: ProjectMetadataType = await response.json();
      validateSquirrelsVersion(metadata);
      
      // If connection is successful, navigate to login
      const projectRelatedQueryParams = getProjectRelatedQueryParams(formData.hostname, formData.projectName, formData.projectVersion);
      navigate(`/login?${projectRelatedQueryParams}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed: Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="root-page">
      <div className="root-container">
        <h1>Squirrels Studio</h1>
        <h2>Project Configuration</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="hostname">Host URL</label>
            <input
              type="text"
              id="hostname"
              name="hostname"
              className="widget padded"
              value={formData.hostname}
              onChange={handleInputChange}
              placeholder="e.g. http://localhost:4465"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="projectName">Project Name</label>
            <input
              type="text"
              id="projectName"
              name="projectName"
              className="widget padded"
              value={formData.projectName}
              onChange={handleInputChange}
              placeholder="Enter project name"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="projectVersion">Project Version</label>
            <input
              type="text"
              id="projectVersion"
              name="projectVersion"
              className="widget padded"
              value={formData.projectVersion}
              onChange={handleInputChange}
              placeholder="e.g. v1"
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button 
            type="submit" 
            className="blue-button connect-button"
            disabled={isLoading}
          >
            {isLoading ? 'Connecting...' : 'Connect'}
          </button>
        </form>
      </div>
      <LoadingSpinner isLoading={isLoading} />
    </div>
  );
} 