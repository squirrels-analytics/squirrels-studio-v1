import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './RootPage.css';
import LoadingSpinner from '../components/LoadingSpinner';

export default function RootPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    hostname: '',
    projectName: '',
    projectVersion: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
      const projectMetadataURL = `${formData.hostname}/api/squirrels-v0/project/${formData.projectName}/${formData.projectVersion}`;
      const response = await fetch(projectMetadataURL);
      if (!response.ok) {
        throw new Error(`Connection failed: ${response.status} ${response.statusText}`);
      }
      await response.json();
      
      // If connection is successful, navigate to login
      navigate(`/login?host=${encodeURIComponent(formData.hostname)}&projectName=${formData.projectName}&projectVersion=${formData.projectVersion}`);
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
              required
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
              required
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
              required
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