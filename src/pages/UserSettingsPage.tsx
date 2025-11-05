import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { FaKey, FaLock, FaTrash, FaPlus, FaInfinity, FaCopy } from 'react-icons/fa';
import './UserSettingsPage.css';
import { AUTH_PATH } from '../utils';
import Modal from '../components/Modal';


interface ApiKey {
  id: string;
  title: string;
  created_at: string;
  expires_at: string;
}

export default function UserSettingsPage() {
  const navigate = useNavigate();
  const { 
    userProps, 
    showModal, 
    showConfirm,
    setIsLoading,
    hostname, 
    projectName, 
    projectVersion,
    projectRelatedQueryParams 
  } = useApp();
  const { username: isAuthenticated } = userProps;

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newApiKeyDescription, setNewApiKeyDescription] = useState('');
  const [apiKeyExpires, setApiKeyExpires] = useState(true);
  const [expiryDays, setExpiryDays] = useState(90);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Add useEffect for navigation
  useEffect(() => {
    if (!projectName || !projectVersion) {
      navigate('/');
    }
  }, [projectName, projectVersion, isAuthenticated, navigate]);

  if (!projectName || !projectVersion) {
    return null;
  }

  const fetchApiKeys = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${hostname}${AUTH_PATH}/api-key`, {
        credentials: 'include',
      });

      if (response.status === 200) {
        const data = await response.json();
        setApiKeys(data);
      } else if (response.status === 401) {
        showModal({ message: 'Your session has expired. Please log in again.', title: 'Session Expired', logout: true });
      } else {
        setError('Failed to fetch API Keys');
      }
    } catch (error) {
      console.error('Error fetching API Keys:', error);
      setError('An unexpected error occurred while fetching API Keys');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch user API Keys on component mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchApiKeys();
    }
  }, [isAuthenticated]);

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApiKeyDescription.trim()) {
      setError('API Key description is required');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch(`${hostname}${AUTH_PATH}/api-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ 
          title: newApiKeyDescription,
          expiry_minutes: apiKeyExpires ? expiryDays * 24 * 60 : null
        })
      });

      if (response.status === 200) {
        const data = await response.json();
        setNewApiKey(data.api_key); // Handle both possible response formats
        setShowApiKeyModal(true);
        setApiKeyCopied(false);
        setNewApiKeyDescription('');
        fetchApiKeys(); // Refresh the API Key list
      } else {
        setError('Failed to create API Key');
      }
    } catch (error) {
      console.error('Error creating API Key:', error);
      setError('An unexpected error occurred while creating the API Key');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyApiKey = () => {
    if (newApiKey) {
      navigator.clipboard.writeText(newApiKey)
        .then(() => {
          setApiKeyCopied(true);
        })
        .catch(() => {
          showModal({ message: 'Failed to copy API Key to clipboard', title: 'Error' });
        });
    }
  };

  const closeApiKeyModal = () => {
    if (apiKeyCopied) {
      setShowApiKeyModal(false);
      setNewApiKey(null);
      setSuccessMessage('API Key created successfully');
    }
  };

  const handleDeleteApiKey = async (apiKeyId: string) => {
    const performDelete = async () => {
      setIsLoading(true);
      setError('');
      setSuccessMessage('');

      try {
        const response = await fetch(`${hostname}${AUTH_PATH}/api-key/${apiKeyId}`, {
          method: 'DELETE',
          credentials: 'include'
        });

        if (response.status === 204) {
          setSuccessMessage('API Key deleted successfully');
          fetchApiKeys(); // Refresh the API Key list
        } else {
          setError('Failed to delete API Key');
        }
      } catch (error) {
        console.error('Error deleting API Key:', error);
        setError('An unexpected error occurred while deleting the API Key');
      } finally {
        setIsLoading(false);
      }
    };

    showConfirm({
      message: 'Are you sure you want to delete this API Key? This action cannot be undone.',
      onConfirm: performDelete,
      title: 'Delete API Key',
      confirmText: 'Delete',
      confirmButtonClass: 'red-button'
    });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('New passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch(`${hostname}${AUTH_PATH}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          old_password: passwordData.current_password,
          new_password: passwordData.new_password
        })
      });

      if (response.status === 200) {
        setPasswordData({
          current_password: '',
          new_password: '',
          confirm_password: ''
        });
        setSuccessMessage('Password changed successfully');
      } else {
        setError('Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setError('An unexpected error occurred while changing the password');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatDate = (dateString: string) => {
    // Create date object and explicitly convert to local time
    const date = new Date(dateString); // Add 'Z' to ensure UTC interpretation
    
    // Check if it's a "never expires" date (year 9999)
    if (date.getFullYear() === 9999) {
      return "Never";
    }
    
    // Format as MMM dd, yyyy at hh:mm AM/PM
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    // Convert to 12-hour format with AM/PM
    let hours = date.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${month} ${day}, ${year} at ${hours}:${minutes} ${ampm}`;
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>User Settings</h1>
        <div className="header-actions">
          <button className="white-button" onClick={() => navigate(`/explorer?${projectRelatedQueryParams}`)}>
            Back to Explorer
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      <div className="settings-content single-column">
        <div className="settings-section">
          <h2><FaLock /> Change Password</h2>
          <form onSubmit={handlePasswordChange}>
            <div className="form-group">
              <label htmlFor="current_password">Current Password</label>
              <input
                type="password"
                id="current_password"
                name="current_password"
                className="widget padded"
                value={passwordData.current_password}
                onChange={handlePasswordInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="new_password">New Password</label>
              <input
                type="password"
                id="new_password"
                name="new_password"
                className="widget padded"
                value={passwordData.new_password}
                onChange={handlePasswordInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirm_password">Confirm New Password</label>
              <input
                type="password"
                id="confirm_password"
                name="confirm_password"
                className="widget padded"
                value={passwordData.confirm_password}
                onChange={handlePasswordInputChange}
                required
              />
            </div>
            
            <button type="submit" className="blue-button">Change Password</button>
          </form>
        </div>

        <div className="settings-section">
          <h2><FaKey /> API Keys</h2>
          
          <form onSubmit={handleCreateApiKey} className="create-api-key-form">
            <div className="form-group">
              <label htmlFor="api_key_description">API Key Description</label>
              <input
                type="text"
                id="api_key_description"
                className="widget padded"
                value={newApiKeyDescription}
                onChange={(e) => setNewApiKeyDescription(e.target.value)}
                placeholder="e.g. Development, Testing, etc."
                required
              />
            </div>
            
            <div className="form-group">
              <div className="api-key-expiry-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={apiKeyExpires}
                    onChange={() => setApiKeyExpires(!apiKeyExpires)}
                  />
                  API Key Expires in
                </label>
                
                {apiKeyExpires && (
                  <div className="expiry-days-inline">
                    <input
                      type="number"
                      id="expiry_days"
                      className="widget days-input"
                      min="1"
                      max="365"
                      value={expiryDays}
                      onChange={(e) => setExpiryDays(Math.max(1, parseInt(e.target.value) || 90))}
                    />
                    <span>days</span>
                  </div>
                )}
              </div>
            </div>
            
            <button type="submit" className="blue-button create-api-key-button">
              <FaPlus /> Create API Key
            </button>
          </form>
          
          <div className="api-keys-list">
            <h3>Your API Keys</h3>
            {apiKeys.length === 0 ? (
              <p>You don't have any API Keys yet.</p>
            ) : (
              <table className="api-keys-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Created</th>
                    <th>Expires</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map(api_key => (
                    <tr key={api_key.id}>
                      <td>{api_key.title}</td>
                      <td>{formatDate(api_key.created_at)}</td>
                      <td>
                        {api_key.expires_at ? 
                          formatDate(api_key.expires_at) : 
                          <span className="never-expires"><FaInfinity /> Never</span>
                        }
                      </td>
                      <td>
                        <button 
                          className="icon-button delete-button" 
                          onClick={() => handleDeleteApiKey(api_key.id)}
                          title="Delete API Key"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* API Key Modal */}
      {showApiKeyModal && newApiKey && (
        <Modal 
          isOpen={showApiKeyModal}
          onClose={closeApiKeyModal}
          title="IMPORTANT: Save Your New API Key!"
          footer={(
            <div className="api-key-modal-actions">
              <button 
                className="blue-button"
                onClick={closeApiKeyModal}
                disabled={!apiKeyCopied}
              >
                I've saved my API Key
              </button>
            </div>
          )}
        >
          <p className="api-key-modal-message">
            This API Key will only be displayed once. Please copy it now and store it securely.
          </p>
          
          <div className="api-key-display">
            <code>{newApiKey}</code>
            <button 
              className="copy-button"
              onClick={handleCopyApiKey}
              title="Copy API Key to Clipboard"
            >
              <FaCopy />
            </button>
          </div>
          
          {apiKeyCopied && (
            <div className="api-key-copied-message">
              API Key copied to clipboard!
            </div>
          )}
        </Modal>
      )}
    </div>
  );
} 