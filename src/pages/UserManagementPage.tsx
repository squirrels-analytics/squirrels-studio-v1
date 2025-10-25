import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../Router';
import { FaUserPlus, FaTrash, FaArrowLeft, FaEdit } from 'react-icons/fa';
import { User, UserField } from '../types/UserManagement';
import './UserManagementPage.css';
import { AUTH_PATH } from '../utils';
import Modal from '../components/Modal';


export default function UserManagementPage() {
  const navigate = useNavigate();
  const { 
    userProps, 
    showModal, 
    showConfirm,
    setIsLoading,
    hostname, 
    projectMetadataPath, 
    projectRelatedQueryParams 
  } = useApp();
  const { username: isAuthenticated } = userProps;
  const [users, setUsers] = useState<User[]>([]);
  const [userFields, setUserFields] = useState<UserField[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [newUserData, setNewUserData] = useState<Record<string, any>>({
    username: '',
    password: '',
    access_level: 'member'
  });
  const [editUserData, setEditUserData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!projectMetadataPath) {
      navigate('/');
    }
    
    if (isAuthenticated) {
      fetchUsers();
      fetchUserFields();
    }
  }, [projectMetadataPath, isAuthenticated, navigate]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${hostname}${AUTH_PATH}/user-management/users`, {
        credentials: 'include'
      });

      if (response.status === 200) {
        const data = await response.json();
        setUsers(data);
      } else if (response.status === 401) {
        showModal({ message: 'Your session has expired. Please log in again.', title: 'Session Expired', logout: true });
      } else {
        setError('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('An unexpected error occurred while fetching users');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserFields = async () => {
    try {
      const response = await fetch(`${hostname}${AUTH_PATH}/user-management/user-fields`, {
        credentials: 'include'
      });

      if (response.status === 200) {
        const data: UserField[] = await response.json();
        const customFields = data.filter(field => !['username', 'password', 'access_level'].includes(field.name));
        setUserFields(customFields);
        
        // Initialize newUserData with default values
        const defaultData: Record<string, any> = {
          username: '',
          password: '',
          access_level: 'member'
        };
        customFields.forEach(field => {
          defaultData[field.name] = field.default;
        });
        setNewUserData(defaultData);
      }
    } catch (error) {
      console.error('Error fetching user fields:', error);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch(`${hostname}${AUTH_PATH}/user-management/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(newUserData)
      });

      if (response.status === 200) {
        setSuccessMessage('User created successfully');
        setShowCreateModal(false);
        fetchUsers();
        
        // Reset form with proper defaults from userFields
        const defaultData: Record<string, any> = {
          username: '',
          password: '',
          access_level: 'member'
        };
        userFields.forEach(field => {
          defaultData[field.name] = field.default;
        });
        setNewUserData(defaultData);
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setError('An unexpected error occurred while creating the user');
    } finally {
      setIsLoading(false);
      setShowCreateModal(false);
    }
  };

  const handleDeleteUser = async (username: string) => {
    const performDelete = async () => {
      setIsLoading(true);
      setError('');
      setSuccessMessage('');

      try {
        const response = await fetch(`${hostname}${AUTH_PATH}/user-management/users/${username}`, {
          method: 'DELETE',
          credentials: 'include'
        });

        if (response.status === 204) {
          setSuccessMessage('User deleted successfully');
          fetchUsers();
        } else {
          setError('Failed to delete user');
        }
      } catch (error) {
        console.error('Error deleting user:', error);
        setError('An unexpected error occurred while deleting the user');
      } finally {
        setIsLoading(false);
      }
    };

    showConfirm({
      message: `Are you sure you want to delete user "${username}"? This action cannot be undone.`,
      onConfirm: performDelete,
      title: 'Delete User',
      confirmText: 'Delete',
      confirmButtonClass: 'red-button'
    });
  };

  const handleInputChange = (name: string, value: any, switchOffNull: boolean = false) => {
    if (switchOffNull) {
      setNewUserData(prev => ({
        ...prev,
        [name]: prev["__prev__" + name] || value
      }));
    } else {
      setNewUserData(prev => ({
        ...prev,
        ["__prev__" + name]: prev[name],
        [name]: value
      }));
    }
  };

  const getFieldTypeBaseValue = (field_type: string) => {
    if (field_type === 'boolean') {
      return false;
    } else if (field_type === 'integer' || field_type === 'number') {
      return 0;
    } else {
      return '';
    }
  };

  const handleEditUser = (user: User) => {
    // Initialize edit form with user data
    const userData: Record<string, any> = {
      username: user.username,
      access_level: user.access_level
    };
    
    // Add custom fields
    userFields.forEach(field => {
      userData[field.name] = user[field.name];
    });
    
    setEditUserData(userData);
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch(`${hostname}${AUTH_PATH}/user-management/users/${editUserData.username}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(editUserData)
      });

      if (response.status === 200) {
        setSuccessMessage('User updated successfully');
        setShowEditModal(false);
        fetchUsers();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      setError('An unexpected error occurred while updating the user');
    } finally {
      setIsLoading(false);
      setShowEditModal(false);
    }
  };

  // Add this function to generate random passwords
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    handleInputChange('password', password);
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>User Management</h1>
        <div className="header-actions">
          <button 
            className="white-button" 
            onClick={() => navigate(`/explorer?${projectRelatedQueryParams}`)}
          >
            <FaArrowLeft /> Back to Explorer
          </button>
          <button 
            className="blue-button" 
            onClick={() => setShowCreateModal(true)}
          >
            <FaUserPlus /> Create User
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      <div className="settings-content single-column">
        <div className="settings-section">
          <h2>Users</h2>
          <div className="users-list">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Username / Email</th>
                  <th>Access Level</th>
                  {userFields.map(field => (
                    <th key={field.name}>{field.name}</th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.username}>
                    <td>{user.username}</td>
                    <td>{user.access_level === "admin" ? 'Admin' : 'Member'}</td>
                    {userFields.map(field => (
                      <td key={field.name}>{user[field.name]?.toString() || ''}</td>
                    ))}
                    <td>
                      <div className="action-buttons">
                        <button 
                          className={`icon-button edit-button`}
                          onClick={() => handleEditUser(user)}
                          title="Edit user"
                        >
                          <FaEdit />
                        </button>
                        <button 
                          className={`icon-button delete-button ${user.username === "admin" ? "disabled-button" : ""}`}
                          onClick={() => handleDeleteUser(user.username)}
                          title={user.username === "admin" ? "Cannot delete admin user" : "Delete user"}
                          disabled={user.username === "admin"}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <Modal 
          isOpen={showCreateModal} 
          onClose={() => setShowCreateModal(false)} 
          title="Create New User"
          footer={(
            <>
              <button type="submit" form="create-user-form" className="blue-button">Create User</button>
              <button type="button" className="white-button" onClick={() => setShowCreateModal(false)}>Cancel</button>
            </>
          )}
        >
          <form id="create-user-form" onSubmit={handleCreateUser}>
            <div className="scrollable-form">
                <div className="form-group">
                  <label htmlFor="username">Username / Email</label>
                  <input
                    type="text"
                    id="username"
                    className="widget padded"
                    value={newUserData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <div className="password-input-container">
                    <input
                      type="text"
                      id="password"
                      className="widget padded"
                      value={newUserData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      required
                    />
                    <button 
                      type="button" 
                      className="generate-password-button"
                      onClick={generateRandomPassword}
                      title="Generate random password"
                    >
                      Generate
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="access_level">Access Level</label>
                  <select
                    id="access_level"
                    className="widget padded"
                    value={newUserData.access_level}
                    onChange={(e) => handleInputChange('access_level', e.target.value)}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {userFields.map(field => (
                  field.type === 'boolean' ? (
                    <div className="form-group">
                      <label htmlFor={field.name}>
                        <input
                            type="checkbox"
                            id={field.name}
                            checked={newUserData[field.name] || false}
                            onChange={(e) => handleInputChange(field.name, e.target.checked)}
                            disabled={newUserData[field.name] === null}
                        />
                        {field.name} ({field.type})
                      </label>
                    </div>
                  ) : (
                    <div className="form-group" key={field.name}>
                      <label htmlFor={field.name}>{field.name} ({field.type})</label>
                      
                      {field.nullable && (
                        <div className="null-toggle">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={newUserData[field.name] === null}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  handleInputChange(field.name, null);
                                } else {
                                  handleInputChange(field.name, getFieldTypeBaseValue(field.type), true);
                                }
                              }}
                            />
                            Set to null
                          </label>
                        </div>
                      )}
                      
                      {field.enum ? (
                        <select
                          id={field.name}
                          className="widget padded"
                          value={newUserData[field.name] || ''}
                          onChange={(e) => handleInputChange(field.name, e.target.value)}
                          disabled={newUserData[field.name] === null}
                        >
                          {field.enum.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type === 'integer' ? 'number' : 'text'}
                          id={field.name}
                          className="widget padded"
                          value={newUserData[field.name] === null ? '' : newUserData[field.name]}
                          onChange={(e) => handleInputChange(field.name, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                          disabled={newUserData[field.name] === null}
                        />
                      )}
                    </div>
                  )
                ))}
            </div>
          </form>
        </Modal>
      )}

      {showEditModal && (
        <Modal 
          isOpen={showEditModal} 
          onClose={() => setShowEditModal(false)} 
          title="Edit User"
          footer={(
            <>
              <button type="submit" form="edit-user-form" className="blue-button">Update User</button>
              <button type="button" className="white-button" onClick={() => setShowEditModal(false)}>Cancel</button>
            </>
          )}
        >
          <form id="edit-user-form" onSubmit={handleUpdateUser}>
            <div className="scrollable-form">
                <div className="form-group">
                  <label htmlFor="edit-username">Username / Email</label>
                  <input
                    type="text"
                    id="edit-username"
                    className="widget padded"
                    value={editUserData.username}
                    disabled={true}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-access_level">Access Level</label>
                  <select
                    id="edit-access_level"
                    className="widget padded"
                    value={editUserData.access_level}
                    onChange={(e) => setEditUserData({...editUserData, access_level: e.target.value})}
                    disabled={editUserData.username === "admin"}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {userFields.map(field => (
                  field.type === 'boolean' ? (
                    <div className="form-group" key={field.name}>
                      <label htmlFor={`edit-${field.name}`}>
                        <input
                            type="checkbox"
                            id={`edit-${field.name}`}
                            checked={editUserData[field.name] || false}
                            onChange={(e) => setEditUserData({...editUserData, [field.name]: e.target.checked})}
                            disabled={editUserData[field.name] === null}
                        />
                        {field.name} ({field.type})
                      </label>
                    </div>
                  ) : (
                    <div className="form-group" key={field.name}>
                      <label htmlFor={`edit-${field.name}`}>{field.name} ({field.type})</label>
                      
                      {field.nullable && (
                        <div className="null-toggle">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={editUserData[field.name] === null}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditUserData({...editUserData, [field.name]: null});
                                } else {
                                  setEditUserData({...editUserData, [field.name]: getFieldTypeBaseValue(field.type)});
                                }
                              }}
                            />
                            Set to null
                          </label>
                        </div>
                      )}
                      
                      {field.enum ? (
                        <select
                          id={`edit-${field.name}`}
                          className="widget padded"
                          value={editUserData[field.name] || ''}
                          onChange={(e) => setEditUserData({...editUserData, [field.name]: e.target.value})}
                          disabled={editUserData[field.name] === null}
                        >
                          {field.enum.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type === 'integer' ? 'number' : 'text'}
                          id={`edit-${field.name}`}
                          className="widget padded"
                          value={editUserData[field.name] === null ? '' : editUserData[field.name]}
                          onChange={(e) => setEditUserData({...editUserData, [field.name]: field.type === 'number' ? Number(e.target.value) : e.target.value})}
                          disabled={editUserData[field.name] === null}
                        />
                      )}
                    </div>
                  )
                ))}
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
} 