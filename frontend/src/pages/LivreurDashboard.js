import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FiUser, FiMapPin, FiList, FiHelpCircle, FiSettings } from 'react-icons/fi';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import WindowControls from '../components/WindowControls';
import ProfileMenu from '../components/ProfileMenu';
import PullToRefresh from '../components/PullToRefresh';
import './Dashboard.css';

// Fix for default marker icons
if (L && L.Icon && L.Icon.Default && L.Icon.Default.prototype) {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

const API_URL = 'https://flexpress.onrender.com/api';

// Calcul de distance (en km) entre deux points GPS, style Google Maps simplifié
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // rayon de la Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Composant pour recentrer la carte
function RecenterMap({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

function LivreurDashboard({ user, onLogout, onUpdateUser }) {
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [position, setPosition] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(13);
  const [accuracy, setAccuracy] = useState(null);
  const [positionLabel, setPositionLabel] = useState('📍 Position livreur non détectée. Cliquez sur le bouton de localisation.');
  const [showEarningsDetails, setShowEarningsDetails] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState(''); // all, accepted, delivering, delivered
  const [earningsDateFilter, setEarningsDateFilter] = useState('');
  const [previousOrderCount, setPreviousOrderCount] = useState(0);
  const [profileSubView, setProfileSubView] = useState('main'); // 'main', 'personal', 'help'
  const [personalInfoForm, setPersonalInfoForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });
  const watchIdRef = useRef(null);
  const mapRef = useRef(null);
  const audioRef = useRef(null);

  const [livreurStats, setLivreurStats] = useState({
    stats: {
      total_orders: 0,
      total_earnings: 0,
      delivered_orders: 0,
      cancelled_orders: 0,
      today_orders: 0,
      today_earnings: 0
    },
    recent_orders: []
  });

  const fetchLivreurStats = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Token manquant');
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/livreur/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res && res.data) {
        setLivreurStats(res.data);
      }
    } catch (err) {
      console.error('Erreur chargement stats livreur:', err);
      // Initialiser avec des valeurs par défaut en cas d'erreur
      setLivreurStats({
        stats: {
          total_orders: 0,
          total_earnings: 0,
          delivered_orders: 0,
          cancelled_orders: 0,
          today_orders: 0,
          today_earnings: 0
        },
        recent_orders: []
      });
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const response = await axios.put(`${API_URL}/user/profile`, personalInfoForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Profil mis à jour avec succès !');
      if (onUpdateUser) onUpdateUser(response.data.user);
      setProfileSubView('main');
    } catch (err) {
      console.error('Erreur mise à jour profil:', err);
      alert('Erreur lors de la mise à jour du profil.');
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('La géolocalisation n\'est pas supportée par votre navigateur.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy: acc } = pos.coords;
        const newPos = [latitude, longitude];
        setPosition(newPos);
        setMapCenter(newPos);
        setAccuracy(acc);
        updateLocation(latitude, longitude);
        updatePositionLabel(latitude, longitude);
      },
      (err) => {
        console.warn('Erreur géolocalisation:', err);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
    );
  };

  const updatePositionLabel = async (lat, lon) => {
    try {
      const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=fr`);
      setPositionLabel(`📍 ${res.data.display_name}`);
    } catch (e) {
      setPositionLabel(`📍 Position: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    }
  };

  const updateLocation = async (lat, lon) => {
    const token = localStorage.getItem('token');
    try {
      await axios.put(`${API_URL}/user/location`, { latitude: lat, longitude: lon }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Erreur mise à jour position backend:', err);
    }
  };

  const toggleStatus = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.put(`${API_URL}/user/status`, { is_available: !isAvailable }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsAvailable(res.data.is_available);
    } catch (err) {
      console.error('Erreur toggle status:', err);
    }
  };

  const loadOrders = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Token manquant');
      return;
    }
    try {
      const [availableRes, myRes] = await Promise.all([
        axios.get(`${API_URL}/livreur/available-orders`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/livreur/my-orders`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setAvailableOrders(availableRes?.data || []);
      setMyOrders(myRes?.data || []);
      
      const availableCount = (availableRes?.data || []).length;
      if (availableCount > previousOrderCount) {
        if (audioRef.current) {
          audioRef.current.play().catch(e => console.log('Audio error:', e));
        }
      }
      setPreviousOrderCount(availableCount);
    } catch (err) {
      console.error('Erreur chargement commandes:', err);
      // Initialiser avec des tableaux vides en cas d'erreur
      setAvailableOrders([]);
      setMyOrders([]);
    }
  };

  const acceptOrder = async (orderId) => {
    const token = localStorage.getItem('token');
    try {
      await axios.post(`${API_URL}/orders/${orderId}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadOrders();
      fetchLivreurStats();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur acceptation commande');
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    const token = localStorage.getItem('token');
    try {
      await axios.put(`${API_URL}/orders/${orderId}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadOrders();
      fetchLivreurStats();
    } catch (err) {
      alert('Erreur mise à jour statut');
    }
  };

  useEffect(() => {
    try {
      loadOrders();
      fetchLivreurStats();
      const interval = setInterval(() => {
        try {
          loadOrders();
          fetchLivreurStats();
        } catch (err) {
          console.error('Erreur dans l\'intervalle:', err);
        }
      }, 10000);
      return () => {
        if (interval) clearInterval(interval);
      };
    } catch (err) {
      console.error('Erreur dans useEffect:', err);
    }
  }, []);

  const openItineraryForOrder = (order) => {
    const destLat = order.delivery_latitude || order.client_lat;
    const destLon = order.delivery_longitude || order.client_lon;
    if (destLat && destLon && position) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${position[0]},${position[1]}&destination=${destLat},${destLon}&travelmode=driving`;
      window.open(url, '_blank');
    } else {
      alert('Position manquante');
    }
  };

  const getRouteInfoForOrder = (order) => {
    const destLat = order.delivery_latitude || order.client_lat;
    const destLon = order.delivery_longitude || order.client_lon;
    if (destLat && destLon && position) {
      const dist = calculateDistanceKm(position[0], position[1], destLat, destLon);
      return { distanceKm: dist, travelMinutes: Math.round(dist * 3 + 2) };
    }
    return null;
  };

  const stats = {
    totalAccepted: livreurStats?.stats?.total_orders || 0,
    totalDelivered: livreurStats?.stats?.delivered_orders || 0,
    totalEarnings: livreurStats?.stats?.total_earnings || 0,
    inProgress: (myOrders || []).filter(o => o?.status === 'delivering').length,
    available: (availableOrders || []).length
  };

  const allOrders = [...(availableOrders || []), ...(myOrders || [])];
  const activeOrders = (myOrders || []).filter(o => o && ['accepted', 'delivering'].includes(o.status));
  const deliveredOrders = (myOrders || []).filter(o => o?.status === 'delivered').filter(o => {
    if (!earningsDateFilter || !o?.created_at) return true;
    try {
      return new Date(o.created_at).toISOString().split('T')[0] === earningsDateFilter;
    } catch (e) {
      return true;
    }
  });

  const markers = (allOrders || []).map(order => {
    if (!order) return null;
    const lat = parseFloat(order.restaurant_lat || order.delivery_latitude);
    const lon = parseFloat(order.restaurant_lon || order.delivery_longitude);
    if (isNaN(lat) || isNaN(lon)) return null;
    return {
      id: order.id || Math.random(),
      position: [lat, lon],
      type: order.delivery_id === user?.id ? 'my' : 'available',
      order
    };
  }).filter(m => m !== null);

  return (
    <div className="dashboard">
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==" type="audio/wav" />
      </audio>
      <header className="header">
        <div className="header-logo">
          <img src="/logo.png" alt="FLEXPRESS" className="main-logo" />
          <h1>FLEXPRESS - Livreur</h1>
        </div>
        <div className="header-actions">
          <button 
            onClick={toggleStatus} 
            className={`btn btn-status-toggle ${isAvailable ? 'btn-success' : 'btn-danger'}`}
            style={{fontWeight: 'bold'}}
          >
            {isAvailable ? '🟢 En Service' : '🔴 Hors Service'}
          </button>
          <WindowControls />
          <ProfileMenu 
            user={user} 
            onLogout={onLogout} 
            onProfileClick={() => {
              setShowProfile(true);
              setProfileSubView('main');
              setShowHistory(false);
              setShowEarningsDetails(false);
            }} 
          />
        </div>
      </header>

      <PullToRefresh onRefresh={loadOrders}>
        <div className="container">
          {showProfile ? (
            <div className="profile-page">
              {profileSubView !== 'main' ? (
                <button 
                  onClick={() => setProfileSubView('main')} 
                  className="btn btn-secondary btn-sm"
                  style={{marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '5px'}}
                >
                  ‹ Retour
                </button>
              ) : (
                <button 
                  onClick={() => setShowProfile(false)} 
                  className="btn btn-secondary btn-sm"
                  style={{marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '5px'}}
                >
                  ‹ Retour à l'accueil
                </button>
              )}

              {profileSubView === 'main' && (
                <>
                  <div className="profile-header-card">
                    <div className="profile-avatar-large-page">
                      {user?.username?.substring(0, 2).toUpperCase() || '??'}
                    </div>
                    <h2 className="profile-name">{user?.username}</h2>
                    <span className="profile-email-badge">Livreur - {user?.email || 'email@exemple.com'}</span>
                  </div>

                  <div className="livreur-stats-section card" style={{marginBottom: '20px', padding: '15px'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                      <h2 style={{margin: 0, fontSize: '1.2rem'}}>📈 Mes Rendements</h2>
                      <div style={{backgroundColor: '#e3f2fd', padding: '5px 12px', borderRadius: '15px', color: '#1976d2', fontWeight: 'bold'}}>
                        Total : {stats.totalEarnings.toFixed(3)} DT
                      </div>
                    </div>
                    
                    <div className="stats-grid-livreur" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '15px'}}>
                      <div className="stat-box" style={{textAlign: 'center', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '8px', borderLeft: '4px solid #4caf50'}}>
                        <div style={{fontSize: '0.8rem', color: '#666'}}>Aujourd'hui</div>
                        <div style={{fontSize: '1.1rem', fontWeight: 'bold'}}>{(livreurStats?.stats?.today_earnings || 0).toFixed(3)} DT</div>
                      </div>
                      <div className="stat-box" style={{textAlign: 'center', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '8px', borderLeft: '4px solid #2196f3'}}>
                        <div style={{fontSize: '0.8rem', color: '#666'}}>Livrées</div>
                        <div style={{fontSize: '1.1rem', fontWeight: 'bold'}}>{stats.totalDelivered}</div>
                      </div>
                    </div>
                  </div>

                  <div className="profile-menu-section">
                    <button className="profile-menu-link" onClick={() => setProfileSubView('personal')}>
                      <div className="profile-menu-icon-wrapper icon-gold"><FiUser /></div>
                      <span className="profile-menu-label">Informations personnelles</span>
                      <span className="profile-menu-arrow">›</span>
                    </button>
                    <button className="profile-menu-link" onClick={() => setShowHistory(true)}>
                      <div className="profile-menu-icon-wrapper icon-purple"><FiList /></div>
                      <span className="profile-menu-label">Historique des livraisons</span>
                      <span className="profile-menu-arrow">›</span>
                    </button>
                    <button className="profile-menu-link" onClick={() => setShowEarningsDetails(!showEarningsDetails)}>
                      <div className="profile-menu-icon-wrapper icon-gold"><span style={{fontSize: '16px'}}>💰</span></div>
                      <span className="profile-menu-label">Détail des gains</span>
                      <span className="profile-menu-arrow">›</span>
                    </button>
                    <button className="profile-menu-link" onClick={() => setProfileSubView('help')}>
                      <div className="profile-menu-icon-wrapper icon-blue"><FiHelpCircle /></div>
                      <span className="profile-menu-label">Aide et support</span>
                      <span className="profile-menu-arrow">›</span>
                    </button>
                  </div>

                  <div className="logout-button-container">
                    <button onClick={onLogout} className="logout-full-btn">Déconnexion</button>
                  </div>
                </>
              )}

              {profileSubView === 'personal' && (
                <div className="profile-sub-section">
                  <h3>Informations personnelles</h3>
                  <form onSubmit={handleUpdateProfile} className="profile-form">
                    <div className="form-group">
                      <label>Nom d'utilisateur</label>
                      <input type="text" value={personalInfoForm.username} onChange={(e) => setPersonalInfoForm({...personalInfoForm, username: e.target.value})} className="input" />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input type="email" value={personalInfoForm.email} onChange={(e) => setPersonalInfoForm({...personalInfoForm, email: e.target.value})} className="input" />
                    </div>
                    <div className="form-group">
                      <label>Téléphone</label>
                      <input type="tel" value={personalInfoForm.phone} onChange={(e) => setPersonalInfoForm({...personalInfoForm, phone: e.target.value})} className="input" />
                    </div>
                    <button type="submit" className="btn btn-primary btn-full" style={{marginTop: '20px'}}>Sauvegarder</button>
                  </form>
                </div>
              )}

              {profileSubView === 'help' && (
                <div className="profile-sub-section">
                  <h3>Aide et Support - Livreur</h3>
                  <div style={{padding: '15px', background: '#f9f9f9', borderRadius: '12px', border: '1px dashed #FFD700'}}>
                    <p>Support Email: flexpress.contact@gmail.com</p>
                    <p>Support Téléphone: +216 22 749 748</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className={`mobile-status-banner ${isAvailable ? 'online' : 'offline'}`}>
                <div className="status-info">
                  <span className="status-dot"></span>
                  <span className="status-text">{isAvailable ? 'En ligne' : 'Hors service'}</span>
                </div>
                <button onClick={toggleStatus} className={`btn btn-sm ${isAvailable ? 'btn-danger' : 'btn-success'}`}>
                  {isAvailable ? 'Déconnexion' : 'Se mettre en service'}
                </button>
              </div>

              <div className="livreur-priority-section">
                {activeOrders.length > 0 ? (
                  <div className="card active-order-card">
                    <h2 style={{color: '#28a745', marginBottom: '15px'}}>🚚 Livraison en cours</h2>
                    {activeOrders.map(order => (
                      <div key={order.id} className="order-item-active" onClick={() => setSelectedOrder(order)}>
                        <div className="order-main-info">
                          <div className="restaurant-badge">{order.restaurant_name}</div>
                          <div className="order-price-badge">{order.total_price.toFixed(2)} DT</div>
                        </div>
                        <div className="order-details-mini">
                          <p>📍 {order.delivery_address}</p>
                        </div>
                        <div className="order-actions-grid">
                          <button onClick={(e) => { e.stopPropagation(); openItineraryForOrder(order); }} className="btn btn-info btn-full">🗺️ Itinéraire</button>
                          {order.status === 'accepted' && (
                            <button onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'delivering'); }} className="btn btn-primary btn-full">En route</button>
                          )}
                          {order.status === 'delivering' && (
                            <button onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'delivered'); }} className="btn btn-success btn-full">✓ Livrée</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="card available-orders-card">
                    <h2 style={{color: '#17a2b8', marginBottom: '15px'}}>📦 Commandes Disponibles ({availableOrders.length})</h2>
                    {availableOrders.length === 0 ? (
                      <div className="empty-state"><p>Aucune nouvelle commande.</p></div>
                    ) : (
                      <div className="orders-queue-list">
                        {availableOrders.map(order => (
                          <div key={order.id} className="queue-order-line">
                            <div className="queue-order-address">📍 {order.delivery_address}</div>
                            <div className="queue-order-actions">
                              <span className="price-tag">{order.total_price.toFixed(2)} DT</span>
                              <button onClick={() => acceptOrder(order.id)} className="btn btn-success btn-sm">Accepter</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="livreur-location-section card" style={{marginTop: '20px'}}>
                <button onClick={getCurrentLocation} className="btn btn-primary btn-locate-main">Me localiser maintenant</button>
                {position && <div className="loc-footer-address"><p>{positionLabel}</p></div>}
                <div className="map-view-section" style={{height: '350px', marginTop: '15px'}}>
                  {typeof window !== 'undefined' && typeof L !== 'undefined' ? (
                    <MapContainer 
                      center={(Array.isArray(mapCenter) && mapCenter.length === 2) ? mapCenter : (Array.isArray(position) && position.length === 2) ? position : [33.8083, 10.8533]} 
                      zoom={mapZoom} 
                      style={{ height: '100%', width: '100%' }} 
                      ref={mapRef}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      {Array.isArray(position) && position.length === 2 && !isNaN(position[0]) && !isNaN(position[1]) && (
                        <>
                          <RecenterMap center={mapCenter || position} zoom={15} />
                          <Marker position={position}><Popup>Vous êtes ici</Popup></Marker>
                        </>
                      )}
                      {(markers || []).map(marker => {
                        if (!marker || !marker.position || !Array.isArray(marker.position) || marker.position.length !== 2) {
                          return null;
                        }
                        try {
                          return (
                            <Marker key={marker.id} position={marker.position} icon={L.icon({
                              iconUrl: marker.type === 'my' ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png' : 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
                              iconSize: [25, 41], iconAnchor: [12, 41]
                            })}>
                              <Popup>Commande #{marker.id}</Popup>
                            </Marker>
                          );
                        } catch (e) {
                          console.error('Erreur création marker:', e);
                          return null;
                        }
                      })}
                    </MapContainer>
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0' }}>
                      <p>Carte non disponible</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="livreur-stats-dashboard" style={{marginTop: '20px'}}>
                <h2 className="section-title">📊 Mon Tableau de Bord</h2>
                <div className="stats-grid">
                  <div className="stat-card-livreur"><h3>{stats.totalAccepted}</h3><p>Acceptées</p></div>
                  <div className="stat-card-livreur"><h3>{stats.totalDelivered}</h3><p>Livrées</p></div>
                  <div className="stat-card-livreur" onClick={() => setShowEarningsDetails(true)}><h3>{stats.totalEarnings.toFixed(2)} DT</h3><p>Gagné</p></div>
                </div>
              </div>
            </>
          )}
        </div>
      </PullToRefresh>

      <nav className="mobile-bottom-nav">
        <button className={`mobile-nav-item ${!showProfile ? 'active' : ''}`} onClick={() => { setShowProfile(false); setShowHistory(false); setShowEarningsDetails(false); }}>🏠 <span>Accueil</span></button>
        <button className={`mobile-nav-item ${showProfile ? 'active' : ''}`} onClick={() => setShowProfile(true)}>👤 <span>Profil</span></button>
      </nav>

      {showEarningsDetails && (
        <div className="modal-overlay" onClick={() => setShowEarningsDetails(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>💰 Gains Détails</h3><button onClick={() => setShowEarningsDetails(false)}>×</button></div>
            <div className="modal-body">
              <input type="date" value={earningsDateFilter} onChange={(e) => setEarningsDateFilter(e.target.value)} className="input" />
              <table className="admin-table">
                <thead><tr><th>ID</th><th>Total</th><th>Date</th></tr></thead>
                <tbody>
                  {deliveredOrders.map(order => (
                    <tr key={order.id}><td>#{order.id}</td><td>{order.total_price.toFixed(2)} DT</td><td>{new Date(order.created_at).toLocaleDateString()}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LivreurDashboard;
