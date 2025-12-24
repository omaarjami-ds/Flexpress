import React, { useState, useRef, useEffect } from 'react';
import { FiUser, FiLogOut } from 'react-icons/fi';
import './ProfileMenu.css';

function ProfileMenu({ user, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (username) => {
    return username?.substring(0, 2).toUpperCase() || '??';
  };

  const getRoleLabel = (role) => {
    const labels = {
      client: 'Client',
      livreur: 'Livreur',
      admin: 'Administrateur'
    };
    return labels[role] || role;
  };

  const handleLogout = () => {
    setIsOpen(false);
    onLogout();
  };

  return (
    <div className="profile-menu-container" ref={menuRef}>
      <button 
        className="profile-avatar"
        onClick={() => setIsOpen(!isOpen)}
        title={user?.username}
      >
        <span className="avatar-initials">{getInitials(user?.username)}</span>
      </button>

      {isOpen && (
        <div className="profile-dropdown">
          <div className="profile-header">
            <div className="profile-info">
              <div className="profile-avatar-large">
                <span>{getInitials(user?.username)}</span>
              </div>
              <div className="profile-details">
                <h3>{user?.username}</h3>
                <p className="profile-role">{getRoleLabel(user?.role)}</p>
                {user?.email && <p className="profile-email">{user?.email}</p>}
              </div>
            </div>
          </div>

          <div className="profile-divider"></div>

          <div className="profile-menu-items">
            <button className="profile-menu-item">
              <FiUser size={18} />
              <span>Mon profil</span>
            </button>
            <button 
              className="profile-menu-item logout-item"
              onClick={handleLogout}
            >
              <FiLogOut size={18} />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileMenu;
