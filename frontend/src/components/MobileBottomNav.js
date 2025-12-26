import React from 'react';
import { FiHome, FiShoppingCart, FiList, FiUser, FiLogOut } from 'react-icons/fi';
import './MobileBottomNav.css';

function MobileBottomNav({ role, currentPage, onNavigate, onLogout }) {
  const getNavItems = () => {
    switch(role) {
      case 'client':
        return [
          { id: 'home', label: 'Accueil', icon: FiHome },
          { id: 'orders', label: 'Commandes', icon: FiShoppingCart },
          { id: 'profile', label: 'Profil', icon: FiUser },
          { id: 'logout', label: 'Déco', icon: FiLogOut, action: 'logout' },
        ];
      case 'livreur':
        return [
          { id: 'available', label: 'Dispo', icon: FiList },
          { id: 'active', label: 'En cours', icon: FiShoppingCart },
          { id: 'profile', label: 'Profil', icon: FiUser },
          { id: 'logout', label: 'Déco', icon: FiLogOut, action: 'logout' },
        ];
      case 'admin':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: FiHome },
          { id: 'restaurants', label: 'Resto', icon: FiList },
          { id: 'orders', label: 'Commandes', icon: FiShoppingCart },
          { id: 'profile', label: 'Profil', icon: FiUser },
          { id: 'logout', label: 'Déco', icon: FiLogOut, action: 'logout' },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const handleItemClick = (item) => {
    if (item.action === 'logout') {
      if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
        onLogout();
      }
    } else {
      onNavigate(item.id);
    }
  };

  return (
    <nav className="mobile-bottom-nav">
      {navItems.map(item => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            className={`mobile-nav-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => handleItemClick(item)}
            title={item.label}
          >
            <Icon className="mobile-nav-icon" />
            <span className="mobile-nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default MobileBottomNav;
