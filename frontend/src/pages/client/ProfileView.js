import React from 'react';
import { FiUser, FiMapPin, FiList } from 'react-icons/fi';

const ProfileView = ({ user, onLogout }) => {
  return (
    <div className="profile-page">
      <div className="profile-header-card">
        <div className="profile-avatar-large-page">
          {user?.username?.substring(0, 2).toUpperCase() || '??'}
        </div>
        <h2 className="profile-name">{user?.username}</h2>
        <div className="profile-email" style={{color: '#666', marginTop: '5px', marginBottom: '10px'}}>{user?.email}</div>
      </div>

      <div className="profile-menu-section">
        <button className="profile-menu-link">
          <div className="profile-menu-icon-wrapper icon-gold">
            <FiUser />
          </div>
          <span className="profile-menu-label">Informations personnelles</span>
          <span className="profile-menu-arrow">›</span>
        </button>
        <button className="profile-menu-link">
          <div className="profile-menu-icon-wrapper icon-blue">
            <FiMapPin />
          </div>
          <span className="profile-menu-label">Adresses enregistrées</span>
          <span className="profile-menu-arrow">›</span>
        </button>
        <button className="profile-menu-link">
          <div className="profile-menu-icon-wrapper icon-purple">
            <FiList />
          </div>
          <span className="profile-menu-label">Historique des commandes</span>
          <span className="profile-menu-arrow">›</span>
        </button>
      </div>

      <div className="profile-menu-section">
        <button className="profile-menu-link">
          <div className="profile-menu-icon-wrapper icon-green">
            <span style={{fontSize: '16px'}}>🔔</span>
          </div>
          <span className="profile-menu-label">Notifications</span>
          <span className="profile-menu-arrow">›</span>
        </button>
        <button className="profile-menu-link">
          <div className="profile-menu-icon-wrapper icon-gold">
            <span style={{fontSize: '16px'}}>💳</span>
          </div>
          <span className="profile-menu-label">Moyens de paiement</span>
          <span className="profile-menu-arrow">›</span>
        </button>
        <button className="profile-menu-link">
          <div className="profile-menu-icon-wrapper icon-blue">
            <span style={{fontSize: '16px'}}>❓</span>
          </div>
          <span className="profile-menu-label">Aide et support</span>
          <span className="profile-menu-arrow">›</span>
        </button>
      </div>

      <div className="logout-button-container">
        <button onClick={onLogout} className="logout-full-btn">
          <FiUser /> Déconnexion
        </button>
      </div>
      <div style={{textAlign: 'center', marginTop: '20px', color: '#999', fontSize: '12px'}}>
        Version 1.0.0
      </div>
    </div>
  );
};

export default ProfileView;
