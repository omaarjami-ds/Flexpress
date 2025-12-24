import React, { useEffect, useState } from 'react';
import './SplashScreen.css';

const SplashScreen = ({ onFinish }) => {
  const [animationStep, setAnimationStep] = useState('start'); // start, center, finish

  useEffect(() => {
    // Step 1: Start animation
    const timer1 = setTimeout(() => {
      setAnimationStep('center');
    }, 100);

    // Step 2: Fade out (longer display time for premium feel)
    const timer2 = setTimeout(() => {
      setAnimationStep('finish');
    }, 2500);

    // Step 3: Unmount
    const timer3 = setTimeout(() => {
      onFinish();
    }, 3000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onFinish]);

  return (
    <div className={`splash-screen ${animationStep === 'finish' ? 'fade-out' : ''}`}>
      <div className={`splash-logo-container ${animationStep === 'finish' ? 'top' : animationStep}`}>
        <img src="/logo.png" alt="FLEXPRESS" className="splash-logo" />
        <h1 className="splash-title">FLEXPRESS</h1>
        <div className="splash-loader"></div>
      </div>
    </div>
  );
};

export default SplashScreen;
