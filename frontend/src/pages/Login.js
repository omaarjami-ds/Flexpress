import React, { useState } from 'react';
import axios from 'axios';
import './Login.css';

const API_URL = 'https://flexpress.onrender.com/api';

function Login({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'client',
    phone: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (isLogin) {
        const response = await axios.post(`${API_URL}/auth/login`, {
          username: formData.username,
          password: formData.password
        });
        onLogin(response.data.user, response.data.token);
      } else {
        const response = await axios.post(`${API_URL}/auth/register`, formData);
        onLogin(response.data.user, response.data.token);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || err.message || 'Une erreur est survenue');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src="/logo.png" alt="FLEXPRESS" className="login-logo" />
          <h1>FLEXPRESS</h1>
          <p>Livraison Express</p>
        </div>

        <div className="login-tabs">
          <button 
            className={isLogin ? 'active' : ''} 
            onClick={() => setIsLogin(true)}
          >
            Connexion
          </button>
          <button 
            className={!isLogin ? 'active' : ''} 
            onClick={() => setIsLogin(false)}
          >
            Inscription
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}
          
          <input
            type="text"
            placeholder="Nom d'utilisateur"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required
            className="input"
          />

          {!isLogin && (
            <>
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="input"
              />
              <input
                type="tel"
                placeholder="Téléphone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input"
              />
              <div style={{padding: '10px', background: '#f0f0f0', borderRadius: '8px', fontSize: '0.9em', color: '#666'}}>
                <strong>Note:</strong> Seuls les clients peuvent s'inscrire. Les livreurs sont créés par l'administrateur.
              </div>
            </>
          )}

          <input
            type="password"
            placeholder="Mot de passe"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            className="input"
          />

          <button type="submit" className="btn btn-primary btn-full">
            {isLogin ? 'Se connecter' : "S'inscrire"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;

