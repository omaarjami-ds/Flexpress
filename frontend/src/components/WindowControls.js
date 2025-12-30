import React from 'react';
import { FiRefreshCw, FiArrowLeft, FiX } from 'react-icons/fi';
import './WindowControls.css';

function WindowControls() {
  if (!window.ElectronWindow) {
    return null;
  }

  const handleRefresh = () => {
    window.ElectronWindow.reload();
  };

  const handleBack = () => {
    window.ElectronWindow.goBack();
  };

  const handleExit = () => {
    window.ElectronWindow.exit();
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
