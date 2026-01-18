import React from 'react';
import { FiRefreshCw, FiArrowLeft, FiX } from 'react-icons/fi';
import './WindowControls.css';

function WindowControls() {
  const handleRefresh = () => {
    if (window.ElectronWindow) {
      window.ElectronWindow.reload();
    } else {
      window.location.reload();
    }
  };

  const handleBack = () => {
    if (window.ElectronWindow) {
      window.ElectronWindow.goBack();
    } else {
      window.history.back();
    }
  };

  const handleExit = () => {
    if (window.ElectronWindow) {
      window.ElectronWindow.exit();
    } else {
      // Pour le navigateur, on peut simplement rediriger vers l'accueil ou fermer si possible
      window.location.href = '/';
    }
  };

  return (
    <div className="window-controls">
      <button onClick={handleBack} className="control-btn" title="Retour">
        <FiArrowLeft size={18} />
      </button>
      <button onClick={handleRefresh} className="control-btn" title="Rafraîchir">
        <FiRefreshCw size={18} />
      </button>
      <button onClick={handleExit} className="control-btn exit-btn" title="Quitter">
        <FiX size={18} />
      </button>
    </div>
  );
}

export default WindowControls;
