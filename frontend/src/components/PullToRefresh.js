import React, { useState, useRef } from 'react';
import './PullToRefresh.css';

const PullToRefresh = ({ onRefresh, children }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef(null);
  const startY = useRef(0);
  const pullThreshold = 80;

  const handleTouchStart = (e) => {
    if (containerRef.current?.scrollTop === 0 && !isRefreshing) {
      startY.current = e.touches[0].pageY;
    } else {
      startY.current = 0;
    }
  };

  const handleTouchMove = (e) => {
    if (startY.current === 0 || isRefreshing) return;

    const currentY = e.touches[0].pageY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      // Resistance effect
      const distance = Math.min(diff * 0.4, pullThreshold + 20);
      setPullDistance(distance);
      
      if (distance > 10) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > pullThreshold) {
      setIsRefreshing(true);
      setPullDistance(pullThreshold);
      try {
        await onRefresh();
      } catch (err) {
        console.error('Refresh error:', err);
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 500);
      }
    } else {
      setPullDistance(0);
    }
    startY.current = 0;
  };

  return (
    <div 
      className="pull-to-refresh-container" 
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="pull-to-refresh-indicator"
        style={{ 
          height: `${pullDistance}px`,
          opacity: pullDistance / pullThreshold,
          transition: isRefreshing ? 'height 0.3s ease' : 'none'
        }}
      >
        <div className={`refresh-icon ${isRefreshing ? 'spinning' : ''}`}>
          {isRefreshing ? '⏳' : '↓'}
        </div>
        <span className="refresh-text">
          {isRefreshing ? 'Chargement...' : pullDistance > pullThreshold ? 'Relâcher pour rafraîchir' : 'Tirer pour rafraîchir'}
        </span>
      </div>
      <div className="pull-to-refresh-content">
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
