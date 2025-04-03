import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Router';
import { FaKey, FaLock, FaTrash, FaPlus, FaInfinity, FaCopy, FaExclamationTriangle } from 'react-icons/fa';
import LoadingSpinner from '../components/LoadingSpinner';
import './UserSettingsPage.css';
import { getHashParams, getProjectMetadataPath } from '../utils';

interface Token {
  token_id: string;
  title: string;
  created_at: string;
  expires_at: string;
}

export default function UserSettingsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, jwtToken, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [newTokenDescription, setNewTokenDescription] = useState('');
  const [tokenExpires, setTokenExpires] = useState(true);
  const [expiryDays, setExpiryDays] = useState(90);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const searchParams = getHashParams();
  const hostname = searchParams.get('host');
  const projectName = searchParams.get('projectName');
  const projectVersion = searchParams.get('projectVersion');

  // Add useEffect for navigation
  useEffect(() => {
    if (!hostname || !projectName || !projectVersion) {
      navigate('/');
    }
  }, [hostname, projectName, projectVersion, isAuthenticated, navigate]);

  if (!hostname || !projectName || !projectVersion) {
    return null;
  }
  const encodedHostname = encodeURIComponent(hostname);
  const projectMetadataPath = getProjectMetadataPath(projectName, projectVersion);

  // Fetch user tokens on component mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchTokens();
    }
  }, [isAuthenticated]);

  const fetchTokens = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${hostname}${projectMetadataPath}/tokens`, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      if (response.status === 200) {
        const data = await response.json();
        setTokens(data);
      } else if (response.status === 401) {
        alert('Your session has expired. Please log in again.');
        logout();
        navigate(`/login?host=${encodedHostname}&projectName=${projectName}&projectVersion=${projectVersion}`);
      } else {
        setError('Failed to fetch tokens');
      }
    } catch (error) {
      console.error('Error fetching tokens:', error);
      setError('An unexpected error occurred while fetching tokens');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenDescription.trim()) {
      setError('Token description is required');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch(`${hostname}${projectMetadataPath}/tokens`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          title: newTokenDescription,
          expiry_minutes: tokenExpires ? expiryDays * 24 * 60 : null
        })
      });

      if (response.status === 200) {
        const data = await response.json();
        setNewToken(data.access_token || data.token); // Handle both possible response formats
        setShowTokenModal(true);
        setTokenCopied(false);
        setNewTokenDescription('');
        fetchTokens(); // Refresh the token list
      } else {
        setError('Failed to create token');
      }
    } catch (error) {
      console.error('Error creating token:', error);
      setError('An unexpected error occurred while creating the token');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToken = () => {
    if (newToken) {
      navigator.clipboard.writeText(newToken)
        .then(() => {
          setTokenCopied(true);
        })
        .catch(() => {
          alert('Failed to copy token to clipboard');
        });
    }
  };

  const closeTokenModal = () => {
    setShowTokenModal(false);
    setNewToken(null);
    setSuccessMessage('Token created successfully');
  };

  const handleDeleteToken = async (tokenId: string) => {
    if (!confirm('Are you sure you want to delete this token?')) {
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch(`${hostname}${projectMetadataPath}/tokens/${tokenId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      if (response.status === 200) {
        fetchTokens(); // Refresh the token list
        setSuccessMessage('Token deleted successfully');
      } else {
        setError('Failed to delete token');
      }
    } catch (error) {
      console.error('Error deleting token:', error);
      setError('An unexpected error occurred while deleting the token');
    } finally {
      setIsLoading(false);
    }
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
      const response = await fetch(`${hostname}${projectMetadataPath}/change-password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        },
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
    const date = new Date(dateString);
    
    // Check if it's a "never expires" date (year 9999)
    if (date.getFullYear() === 9999) {
      return "Never";
    }
    
    // Format as MMM dd, yyyy
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    return `${month} ${day}, ${year}`;
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>User Settings</h1>
        <div className="header-actions">
          <button className="white-button" onClick={() => navigate(`/explorer?host=${encodedHostname}&projectName=${projectName}&projectVersion=${projectVersion}`)}>
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
          <h2><FaKey /> API Tokens</h2>
          
          <form onSubmit={handleCreateToken} className="create-token-form">
            <div className="form-group">
              <label htmlFor="token_description">Token Description</label>
              <input
                type="text"
                id="token_description"
                className="widget padded"
                value={newTokenDescription}
                onChange={(e) => setNewTokenDescription(e.target.value)}
                placeholder="e.g. Development, Testing, etc."
                required
              />
            </div>
            
            <div className="form-group">
              <div className="token-expiry-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={tokenExpires}
                    onChange={() => setTokenExpires(!tokenExpires)}
                  />
                  Token expires
                </label>
                
                {tokenExpires && (
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
            
            <button type="submit" className="blue-button create-token-button">
              <FaPlus /> Create Token
            </button>
          </form>
          
          <div className="tokens-list">
            <h3>Your Tokens</h3>
            {tokens.length === 0 ? (
              <p>You don't have any tokens yet.</p>
            ) : (
              <table className="tokens-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Created</th>
                    <th>Expires</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map(token => (
                    <tr key={token.token_id}>
                      <td>{token.title}</td>
                      <td>{formatDate(token.created_at)}</td>
                      <td>
                        {token.expires_at ? 
                          formatDate(token.expires_at) : 
                          <span className="never-expires"><FaInfinity /> Never</span>
                        }
                      </td>
                      <td>
                        <button 
                          className="icon-button delete-button" 
                          onClick={() => handleDeleteToken(token.token_id)}
                          title="Delete token"
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

      {/* Token Modal */}
      {showTokenModal && newToken && (
        <div className="modal-background" onClick={closeTokenModal}>
          <div className="modal-content token-modal" onClick={e => e.stopPropagation()}>
            <div className="token-modal-header">
              <FaExclamationTriangle className="warning-icon" />
              <h2>Important: Save Your New Token</h2>
            </div>
            
            <p className="token-modal-message">
              This token will only be displayed once. Please copy it now and store it securely.
            </p>
            
            <div className="token-display">
              <code>{newToken}</code>
              <button 
                className="copy-button"
                onClick={handleCopyToken}
                title="Copy token to clipboard"
              >
                <FaCopy />
              </button>
            </div>
            
            {tokenCopied && (
              <div className="token-copied-message">
                Token copied to clipboard!
              </div>
            )}
            
            <div className="token-modal-actions">
              <button 
                className="blue-button"
                onClick={closeTokenModal}
                disabled={!tokenCopied}
              >
                I've saved my token
              </button>
            </div>
          </div>
        </div>
      )}

      <LoadingSpinner isLoading={isLoading} />
    </div>
  );
} 